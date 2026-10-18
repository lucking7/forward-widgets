const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo = __dirname;
const source = fs.readFileSync(path.join(repo, 'widgets/douban/douban-discovery.js'), 'utf8');
const sourceSha256 = require('node:crypto').createHash('sha256').update(source).digest('hex');
const output = path.resolve(process.argv[2] || 'douban-interface-results.json');
const cases = [];
const caseKeys = new Set();
const requests = new Map();
let active = 0;
const queue = [];
async function limited(fn) {
  if (active < 3) active += 1;
  else await new Promise(resolve => queue.push(resolve));
  try { return await fn(); } finally { if (queue.length) queue.shift()(); else active -= 1; }
}
function request(url, options = {}) {
  if (options.headers && options.headers.Cookie) throw new Error('Authenticated requests excluded from public audit');
  if (!requests.has(url)) requests.set(url, limited(async () => {
    const start = Date.now();
    const response = await fetch(url, { headers: options.headers, redirect: options.allow_redirects === false ? 'manual' : 'follow', signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('HTTP ' + response.status + ': non-JSON response'); }
    return { status: response.status, data, elapsedMs: Date.now() - start };
  }));
  return requests.get(url);
}
function context() {
  const c = { console, Widget: { http: { get: request } } };
  vm.createContext(c);
  vm.runInContext(source, c);
  return c;
}
const metadata = context().WidgetMetadata;
function add(group, fn, params, label) {
  const key = fn + JSON.stringify(params);
  if (caseKeys.has(key)) return;
  caseKeys.add(key); cases.push({ group, fn, params, label: label || key });
}
for (const id of ['doubanMovies', 'doubanTelevision']) {
  const module = metadata.modules.find(m => m.id === id);
  const categories = module.params.find(p => p.name === 'category').enumOptions;
  for (const category of categories) {
    const param = module.params.find(p => p.name === category.value && p.enumOptions);
    for (const option of param ? param.enumOptions : [{ title: '', value: '' }]) {
      const params = { category: category.value, page: 1 };
      if (param) params[param.name] = option.value;
      add(id, module.functionName, params, category.title + '/' + option.title);
    }
  }
  for (const sort of ['T', 'U', 'R', 'S']) add(id, module.functionName, { category: 'all', sort, page: 1 }, '全部排序/' + sort);
}
for (const module of metadata.modules.filter(m => ['doubanPublic', 'doubanRealtime'].includes(m.id))) {
  const param = module.params[0];
  for (const option of param.enumOptions) add(module.id, module.functionName, { [param.name]: option.value, page: 1 }, option.title);
}
const ctx = context();
for (const collection of [...Object.keys(ctx.DOUBAN_COLLECTIONS), 'highlights']) add('legacyPublic', 'loadPublicCollections', { collection, page: 1 }, collection);
for (const category of ctx.MOVIE_RECOMMENDATION_CATEGORIES) for (const region of ctx.MOVIE_RECOMMENDATION_REGIONS) add('recommendations', 'loadRecommendations', { mediaType: 'movie', category, region, page: 1 }, category + '/' + region);
for (const [category, regions] of Object.entries(ctx.TV_RECOMMENDATION_REGIONS)) for (const region of regions) add('recommendations', 'loadRecommendations', { mediaType: 'tv', category, region, page: 1 }, category + '/' + region);
const explore = metadata.modules.find(m => m.id === 'doubanExplore');
for (const mediaType of ['movie', 'tv']) {
  for (const param of explore.params.filter(p => p.enumOptions && p.name !== 'mediaType' && (!p.belongTo || p.belongTo.value.includes(mediaType)))) {
    const name = param.name;
    for (const option of param.enumOptions.filter(o => o.value !== '')) add('explore', 'loadPreferenceExplore', { mediaType, [name]: option.value, offset: 0 }, mediaType + '/' + name + '/' + option.title);
  }
  for (const year of ['2026', '2020年代', '1990年代']) add('explore', 'loadPreferenceExplore', { mediaType, year, offset: 0 }, mediaType + '/year/' + year);
  for (const minRating of ['0', '8', '9']) add('explore', 'loadPreferenceExplore', { mediaType, minRating, offset: 0 }, mediaType + '/rating/' + minRating);
}
for (const value of metadata.modules.find(m => m.id === 'doubanCustomList').params[0].placeholders) add('custom', 'loadCustomList', { url: value.value, page: 1 }, value.title);
for (const sort of ['time', 'vote']) add('people', 'loadPeopleWorks', { person: '1048026', sort, page: 1 }, '影人ID/' + sort);
add('people', 'loadPeopleWorks', { person: '周星驰', page: 1 }, '影人姓名/周星驰');
for (const link of ['https://m.douban.com/movie/1295644', 'https://m.douban.com/tv/36689816', 'https://m.douban.com/book/1007305', 'https://m.douban.com/music/1395042']) add('detail', 'loadDetail', link, link);
for (const collection of ['movie_top250', 'movie_weekly', 'tv_american']) add('pagination', 'loadPublicCollections', { collection, page: 2 }, collection + '/page2');
add('pagination', 'loadMovieCatalog', { category: 'all', page: 2 }, 'movie/all/page2');
add('pagination', 'loadTvCatalog', { category: 'all', page: 2 }, 'tv/all/page2');
add('pagination', 'loadTvCatalog', { category: 'underrated', underrated: '美剧', page: 2 }, 'tv/cold/page2');

(async () => {
  const results = new Array(cases.length);
  let next = 0, done = 0;
  async function worker() {
    while (next < cases.length) {
      const index = next++; const item = cases[index];
      try {
        const value = await context()[item.fn](item.params);
        const rows = Array.isArray(value) ? value : [value];
        results[index] = { ...item, status: rows.length ? 'ok' : 'empty', count: rows.length, ids: rows.slice(0, 20).map(x => x.id), titles: rows.slice(0, 3).map(x => x.title), invalidItems: rows.filter(x => !x.id || !x.title).length };
      } catch (error) { results[index] = { ...item, status: 'error', error: error.message }; }
      done += 1; if (done % 50 === 0) console.log('Completed', done, '/', cases.length, 'unique requests', requests.size);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const summary = { completedAt: new Date().toISOString(), sourceSha256, version: metadata.version, cases: cases.length, uniqueRequests: requests.size, ok: results.filter(x => x.status === 'ok').length, empty: results.filter(x => x.status === 'empty').length, errors: results.filter(x => x.status === 'error').length, notLiveTested: ['Authenticated personalized recommendations', 'Private interests', 'REX Widget.tmdb transport and UI rendering'], results };
  fs.writeFileSync(output, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, results: undefined }));
  console.log('Evidence:', output);
  if (summary.errors || results.some(x => x.invalidItems > 0)) process.exitCode = 1;
  console.log('Errors:', JSON.stringify(results.filter(x => x.status === 'error').map(x => ({ label: x.label, error: x.error }))));
  console.log('Empty:', JSON.stringify(results.filter(x => x.status === 'empty').map(x => ({ group: x.group, label: x.label }))));
})();
