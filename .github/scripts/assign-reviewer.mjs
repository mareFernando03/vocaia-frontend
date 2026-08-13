// Asigna autor + 1 reviewer (el de menor carga) cruzando backend y frontend.
// Uso: node assign-reviewer.mjs   |   node assign-reviewer.mjs --test

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
  const event = JSON.parse(await (await import('node:fs/promises')).readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pr = event.pull_request;
  const repo = process.env.GITHUB_REPOSITORY;
  const author = pr.user.login;

  await api(`/repos/${repo}/issues/${pr.number}/assignees`, {
    method: 'POST',
    body: JSON.stringify({ assignees: [author] }),
  });

  if (pr.requested_reviewers?.length) return console.log('Ya tiene reviewer, no toco nada.');

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

  console.log('ok');
}

if (process.argv.includes('--test')) await test();
else await main();
