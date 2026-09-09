// Asigna autor + 1 reviewer (el de menor carga) cruzando los tres repositorios.
// Uso: node assign-reviewer.mjs   |   node assign-reviewer.mjs --test
//
// Es el mismo archivo en 5to, vocaia-backend y vocaia-frontend. Si se toca,
// se toca en los tres: la carga se cuenta cruzada y dos criterios distintos
// asignarian distinto segun por que repositorio entro el PR.

const REPOS = (process.env.LOAD_REPOS || '').split(',').map(s => s.trim()).filter(Boolean);
const WINDOW_DAYS = 30;

// Carga = trabajo pendiente + trabajo ya hecho en la ventana. Lo hecho pesa
// menos que lo pendiente, pero pesa: quien revisó 20 PRs esta semana no está libre.
const W = { pendingReview: 3, openAuthored: 2, doneReviews: 1, mergedPRs: 1 };

export const score = (c) =>
  c.pendingReview * W.pendingReview +
  c.openAuthored * W.openAuthored +
  c.doneReviews * W.doneReviews +
  c.mergedPRs * W.mergedPRs;

// Menor carga gana. Empate -> orden alfabético, para que sea determinístico.
export const pick = (loads) =>
  [...loads].sort((a, b) => score(a) - score(b) || a.login.localeCompare(b.login))[0];

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

  const loads = await Promise.all(candidates.map(async login => ({
    login,
    pendingReview: await count(`${scope} is:pr is:open review-requested:${login}`),
    openAuthored: await count(`${scope} is:pr is:open author:${login}`),
    doneReviews: await count(`${scope} is:pr reviewed-by:${login} updated:>=${since}`),
    mergedPRs: await count(`${scope} is:pr is:merged author:${login} merged:>=${since}`),
  })));

  console.table(loads.map(l => ({ ...l, score: score(l) })));
  const winner = pick(loads);

  await api(`/repos/${repo}/pulls/${pr.number}/requested_reviewers`, {
    method: 'POST',
    body: JSON.stringify({ reviewers: [winner.login] }),
  });
  console.log(`Reviewer: ${winner.login} (score ${score(winner)})`);
}

async function test() {
  const { strict: assert } = await import('node:assert');
  const z = { pendingReview: 0, openAuthored: 0, doneReviews: 0, mergedPRs: 0 };

  // Sin trabajo pendiente pero con mucho hecho != libre.
  const ocupado = { ...z, login: 'a', doneReviews: 12 };
  const conUnPr = { ...z, login: 'b', pendingReview: 3 };
  assert.equal(pick([ocupado, conUnPr]).login, 'b', 'histórico alto debe perder contra 3 pendientes');

  // Pendiente pesa más que hecho a igual cantidad.
  assert.ok(score({ ...z, pendingReview: 2 }) > score({ ...z, doneReviews: 2 }));

  // Empate -> alfabético, determinístico.
  assert.equal(pick([{ ...z, login: 'z' }, { ...z, login: 'a' }]).login, 'a');

  // El menos cargado gana con métricas mezcladas.
  assert.equal(pick([
    { login: 'x', pendingReview: 1, openAuthored: 1, doneReviews: 0, mergedPRs: 0 }, // 5
    { login: 'y', pendingReview: 0, openAuthored: 1, doneReviews: 1, mergedPRs: 1 }, // 4
  ]).login, 'y');

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
