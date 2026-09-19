// Asigna autor + 1 reviewer (el de menor carga) cruzando los tres repositorios.
// Uso: node assign-reviewer.mjs   |   node assign-reviewer.mjs --test
//
// Es el mismo archivo en 5to, vocaia-backend y vocaia-frontend. Si se toca,
// se toca en los tres: la carga se cuenta cruzada y dos criterios distintos
// asignarian distinto segun por que repositorio entro el PR.

const REPOS = (process.env.LOAD_REPOS || '').split(',').map(s => s.trim()).filter(Boolean);
const WINDOW_DAYS = 15; // un sprint: el reparto se empareja dentro de cada uno
const TOPE_PENDIENTES = 3;
const PLAZO_HORAS_HABILES = 24; // acuerdos.md §1.4
const ARGENTINA = -3 * 3600e3;

// Horas de lunes a viernes, hora argentina, entre dos instantes.
// ponytail: cuenta de a una hora; una revision de un mes son ~700 vueltas.
export const horasHabiles = (desde, hasta) => {
  let h = 0;
  for (let t = +desde; t + 3600e3 <= +hasta; t += 3600e3) {
    const dia = new Date(t + ARGENTINA).getUTCDay();
    if (dia !== 0 && dia !== 6) h++;
  }
  return h;
};

// Una revision vencida no cuenta ni para el tope ni para el total: si contara,
// acumular revisiones sin hacer seria la forma de dejar de recibir.
export const vencida = (pedidaEn, ahora = new Date()) =>
  horasHabiles(new Date(pedidaEn), ahora) >= PLAZO_HORAS_HABILES;

// Se reparten revisiones, no trabajo: el trabajo propio ya se balancea al
// planificar el sprint. Contar PRs mergeados como carga libraba de revisar a
// quien parte su trabajo en PRs chicos, y con 30-50 en la ventana tapaban a
// los pendientes: el 16/09 a Luca le toco la novena revision sin hacer.
//
// pendingReview son solo las pendientes dentro del plazo.
// Asignadas = pendientes + hechas, para que revisar rapido no te traiga mas:
// la revision solo pasa de una columna a la otra. Contar solo pendientes le
// daria todo al que revisa en el dia.
export const asignadas = (c) => c.pendingReview + c.doneReviews;

// Con el tope no se le apilan revisiones a quien no las esta sacando, salvo
// que todos esten en el tope. Empate -> menos pendientes -> alfabetico.
export const pick = (loads) => {
  const bajoTope = loads.filter(c => c.pendingReview < TOPE_PENDIENTES);
  return [...(bajoTope.length ? bajoTope : loads)].sort((a, b) =>
    asignadas(a) - asignadas(b) ||
    a.pendingReview - b.pendingReview ||
    a.login.localeCompare(b.login))[0];
};

// Un reviewer que cuenta es una persona. Copilot se pide solo al abrir el PR y
// deja su review en segundos; contarlo dejaba el PR sin revision humana y el
// script informando "ya tiene reviewer" (paso en 5to#52 a #55).
const esPersona = (u) => !!u?.login && u.type !== 'Bot' && !u.login.endsWith('[bot]');

// GitHub saca a quien revisa de requested_reviewers apenas manda su review, asi
// que la lista vacia no significa "nadie lo reviso" sino "no queda nada pedido".
// Sin mirar tambien las reviews, el push siguiente veia el PR sin reviewer y le
// encajaba un segundo revisor encima del que ya venia trabajando (paso en 5to#40).
// Comentarse el propio PR no cuenta como revisado.
export const yaTieneReviewer = (pr, reviews = []) =>
  !!pr.requested_reviewers?.some(esPersona) ||
  reviews.some(r => esPersona(r.user) && r.user.login !== pr.user.login);

// ---------------------------------------------------------------------------

const TOKEN = process.env.GH_TOKEN;
const api = async (path, init) => {
  const r = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${path}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

const count = (q) =>
  api(`/search/issues?per_page=1&q=${encodeURIComponent(q)}`).then(r => r.total_count);

async function main() {
  if (!TOKEN) throw new Error('Falta GH_TOKEN: crea el secret REVIEW_TOKEN (PAT classic, scope repo) en este repo.');

  const event = JSON.parse(await (await import('node:fs/promises')).readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pr = event.pull_request;
  const repo = process.env.GITHUB_REPOSITORY;
  const author = pr.user.login;

  await api(`/repos/${repo}/issues/${pr.number}/assignees`, {
    method: 'POST',
    body: JSON.stringify({ assignees: [author] }),
  });

  // Si ya hay reviewer —pedido, o que ya dejo su review— no se toca nada. Es lo
  // que hace que la reasignación a mano de acuerdos.md §1.4 —cuando al bot le
  // tocó quien depende de esa historia— no la pise el siguiente push. Asignar de
  // a dos o mas revisores se hace a mano; el script pone uno y solo si no hay.
  const reviews = await api(`/repos/${repo}/pulls/${pr.number}/reviews?per_page=100`);
  if (yaTieneReviewer(pr, reviews)) return console.log('Ya tiene reviewer, no toco nada.');

  const collabs = await api(`/repos/${repo}/collaborators?per_page=100`);
  const candidates = collabs
    .filter(c => c.permissions?.push && c.type === 'User' && c.login !== author)
    .map(c => c.login);
  if (!candidates.length) return console.log('Sin candidatos.');

  const scope = REPOS.map(r => `repo:${r}`).join(' ');
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString().slice(0, 10);

  // Cuando se pidio cada revision pendiente. La busqueda no lo dice; sale del
  // ultimo review_requested a esa persona en el historial del PR. Sin evento
  // (historial de mas de 100) se toma como dentro del plazo.
  const pedidas = async (login) => {
    const q = `${scope} is:pr is:open review-requested:${login}`;
    const { items } = await api(`/search/issues?per_page=100&q=${encodeURIComponent(q)}`);
    return Promise.all(items.map(async it => {
      const repoPr = it.repository_url.split('/repos/')[1];
      const eventos = await api(`/repos/${repoPr}/issues/${it.number}/timeline?per_page=100`);
      return eventos
        .filter(e => e.event === 'review_requested' && e.requested_reviewer?.login === login)
        .at(-1)?.created_at;
    }));
  };

  const loads = await Promise.all(candidates.map(async login => {
    const fechas = await pedidas(login);
    const vencidas = fechas.filter(f => f && vencida(f)).length;
    return {
      login,
      pendingReview: fechas.length - vencidas,
      vencidas,
      doneReviews: await count(`${scope} is:pr reviewed-by:${login} updated:>=${since}`),
    };
  }));

  console.table(loads.map(l => ({ ...l, asignadas: asignadas(l) })));
  const winner = pick(loads);

  await api(`/repos/${repo}/pulls/${pr.number}/requested_reviewers`, {
    method: 'POST',
    body: JSON.stringify({ reviewers: [winner.login] }),
  });
  console.log(`Reviewer: ${winner.login} (${winner.pendingReview} pendientes, ${asignadas(winner)} asignadas)`);
}

async function test() {
  const { strict: assert } = await import('node:assert');
  const c = (login, pendingReview, doneReviews) => ({ login, pendingReview, doneReviews });

  // Casos reales del 15 y 16/09: con la regla vieja, los dos fueron a Luca.
  assert.equal(pick([c('mare', 2, 23), c('luca', 8, 16)]).login, 'mare', 'en el tope no recibe');
  assert.equal(pick([c('fabri', 0, 29), c('luca', 5, 16)]).login, 'fabri');

  // Bajo el tope manda el total: quien reviso menos en el mes recibe.
  assert.equal(pick([c('fabri', 0, 29), c('luca', 0, 16)]).login, 'luca');

  // Revisar rapido no trae mas revisiones: seis PRs seguidos, mare revisa en
  // el dia y luca no revisa ninguno. Se reparten 3 y 3.
  const loads = [c('mare', 0, 20), c('luca', 0, 20)];
  const tocaron = { mare: 0, luca: 0 };
  for (let i = 0; i < 6; i++) {
    const w = pick(loads);
    tocaron[w.login]++;
    if (w.login === 'mare') w.doneReviews++; else w.pendingReview++;
  }
  assert.deepEqual(tocaron, { mare: 3, luca: 3 });
  // Luca quedo en el tope: el septimo va a mare aunque tenga mas asignadas.
  assert.equal(pick([c('mare', 0, 23), c('luca', 3, 0)]).login, 'mare');

  // Acumular no protege: con las 5 vencidas fuera, luca sigue recibiendo.
  assert.equal(pick([c('mare', 1, 15), c('luca', 0, 10)]).login, 'luca');

  // Plazo en horas habiles, hora argentina. Viernes 18:00 -> lunes 18:00 son
  // 24 (6 del viernes + 18 del lunes): vence. Miercoles 10:00 -> jueves 9:00 no.
  assert.equal(horasHabiles(new Date('2026-09-18T21:00Z'), new Date('2026-09-21T21:00Z')), 24);
  assert.equal(vencida('2026-09-18T21:00Z', new Date('2026-09-21T21:00Z')), true);
  assert.equal(vencida('2026-09-18T21:00Z', new Date('2026-09-21T20:00Z')), false);
  assert.equal(vencida('2026-09-16T13:00Z', new Date('2026-09-17T12:00Z')), false);

  // Si todos estan en el tope, igual se asigna a alguien.
  assert.equal(pick([c('a', 4, 10), c('b', 3, 20)]).login, 'a');

  // Empate de asignadas -> menos pendientes -> alfabetico.
  assert.equal(pick([c('a', 1, 20), c('b', 0, 21)]).login, 'b');
  assert.equal(pick([c('z', 0, 5), c('a', 0, 5)]).login, 'a');

  // Ya revisado != sin reviewer: la lista vacia no habilita un segundo revisor.
  const prDe = (login, req = []) => ({ user: { login }, requested_reviewers: req });
  assert.equal(yaTieneReviewer(prDe('luca'), [{ user: { login: 'fabri' } }]), true);
  assert.equal(yaTieneReviewer(prDe('luca'), []), false);
  assert.equal(yaTieneReviewer(prDe('luca'), [{ user: { login: 'luca' } }]), false, 'comentarse el propio PR no es revisarlo');
  assert.equal(yaTieneReviewer(prDe('luca', [{ login: 'x', type: 'User' }]), []), true);

  // Un bot no es reviewer: ni pedido ni habiendo dejado su review.
  const copilot = { login: 'copilot-pull-request-reviewer[bot]', type: 'Bot' };
  assert.equal(yaTieneReviewer(prDe('luca'), [{ user: copilot }]), false, 'la review de Copilot no cuenta');
  assert.equal(yaTieneReviewer(prDe('luca', [{ login: 'Copilot', type: 'Bot' }]), []), false, 'Copilot pedido no cuenta');
  assert.equal(yaTieneReviewer(prDe('luca', [{ login: 'Copilot', type: 'Bot' }]), [{ user: { login: 'fabri', type: 'User' } }]), true);

  console.log('ok');
}

if (process.argv.includes('--test')) await test();
else await main();
