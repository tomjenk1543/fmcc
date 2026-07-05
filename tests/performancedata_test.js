// Regression/coverage test for the new Performance Data feature (Squad section) — a
// standalone, screenshot -> Claude -> paste-JSON page for tracking squad performance stats
// over time, mirroring the Scouting shortlist's own import pattern. Covers:
//   - validatePerformanceSnapshots(): accepts a single snapshot object OR an array of them,
//     requires "date" + a non-empty "players" array, requires each player to have "name".
//   - addPerformanceSnapshots(): upserts by date (same date replaces, not duplicates).
//   - ratingClass(): FM rating-scale thresholds (deliberately different from the 1-20
//     attribute/fit-score scales elsewhere in the app).
//   - renderPerformanceData(): empty-state toggle, table rows, trend-vs-previous-snapshot
//     calculation, position-group averages via the app's own classifyPositions().
//   - removePerformanceSnapshot(): drops one snapshot from history without touching others.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// ---- Start from a clean slate regardless of whatever the bundled save/localStorage left
// performanceSnapshots holding, so this test's assertions are self-contained. ----
performanceSnapshots.length = 0;
savePerformanceSnapshots(performanceSnapshots);

// ---- validatePerformanceSnapshots ----
check('rejects a snapshot missing "date"',
  validatePerformanceSnapshots({ players: [{ name: 'A' }] }).some(e => /missing "date"/.test(e)));

check('rejects a snapshot missing "players"',
  validatePerformanceSnapshots({ date: '2026-01-01' }).some(e => /"players" must be a non-empty array/.test(e)));

check('rejects a snapshot with an empty "players" array',
  validatePerformanceSnapshots({ date: '2026-01-01', players: [] }).some(e => /"players" must be a non-empty array/.test(e)));

check('rejects a player missing "name"',
  validatePerformanceSnapshots({ date: '2026-01-01', players: [{ apps: 1 }] }).some(e => /missing "name"/.test(e)));

check('accepts a single well-formed snapshot object (no errors)',
  validatePerformanceSnapshots({ date: '2026-01-01', players: [{ name: 'Player A' }] }).length === 0);

check('accepts an array of well-formed snapshots (no errors)',
  validatePerformanceSnapshots([
    { date: '2026-01-01', players: [{ name: 'Player A' }] },
    { date: '2026-02-01', players: [{ name: 'Player A' }] },
  ]).length === 0);

// ---- ratingClass ----
check('ratingClass(7.5) is strong', ratingClass(7.5) === 'strong');
check('ratingClass(7.0) is strong (boundary)', ratingClass(7.0) === 'strong');
check('ratingClass(6.8) is mid', ratingClass(6.8) === 'mid');
check('ratingClass(6.2) is weak', ratingClass(6.2) === 'weak');
check('ratingClass(5.5) is very-weak', ratingClass(5.5) === 'very-weak');
check('ratingClass(null) is empty string (no data)', ratingClass(null) === '');
check('ratingClass(NaN) is empty string', ratingClass(NaN) === '');

// ---- addPerformanceSnapshots: add, then upsert-by-date ----
const r1 = addPerformanceSnapshots([{
  date: '2026-05-01',
  players: [
    { name: 'Striker One', position: 'ST (C)', apps: 10, goals: 6, assists: 1, avgRating: 6.90 },
    { name: 'Mid One', position: 'M (C)', apps: 12, goals: 1, assists: 4, avgRating: 6.60 },
  ],
}]);
check('first add reports the date as newly added', r1.added.includes('2026-05-01') && r1.updated.length === 0);
check('performanceSnapshots has 1 entry after first add', performanceSnapshots.length === 1);
check('first add persisted to localStorage under PERFORMANCE_STORAGE_KEY',
  JSON.parse(localStorage.getItem(PERFORMANCE_STORAGE_KEY)).length === 1);

const r2 = addPerformanceSnapshots([{
  date: '2026-06-01',
  players: [
    { name: 'Striker One', position: 'ST (C)', apps: 12, goals: 9, assists: 2, avgRating: 7.30 },
    { name: 'Mid One', position: 'M (C)', apps: 14, goals: 1, assists: 5, avgRating: 6.55 },
  ],
}]);
check('second (different-date) add reports newly added, not updated', r2.added.includes('2026-06-01') && r2.updated.length === 0);
check('performanceSnapshots has 2 entries after second add', performanceSnapshots.length === 2);

const r3 = addPerformanceSnapshots([{
  date: '2026-06-01',
  players: [
    { name: 'Striker One', position: 'ST (C)', apps: 13, goals: 10, assists: 2, avgRating: 7.35 },
  ],
}]);
check('re-adding the same date reports it as updated, not added', r3.updated.includes('2026-06-01') && r3.added.length === 0);
check('upsert-by-date replaces, does not duplicate (still 2 entries)', performanceSnapshots.length === 2);
check('upsert-by-date fully replaced the snapshot contents (only 1 player now)',
  performanceSnapshots.find(s => s.date === '2026-06-01').players.length === 1);

// ---- renderPerformanceData: rebuild proper 2-snapshot history for render checks ----
performanceSnapshots.length = 0;
addPerformanceSnapshots([
  {
    date: '2026-05-01',
    players: [
      { name: 'Striker One', position: 'ST (C)', apps: 10, goals: 6, assists: 1, avgRating: 6.50 },
      { name: 'Mid One', position: 'M (C)', apps: 12, goals: 1, assists: 4, avgRating: 6.80 },
    ],
  },
  {
    date: '2026-06-01',
    players: [
      { name: 'Striker One', position: 'ST (C)', apps: 12, goals: 9, assists: 2, avgRating: 7.30 }, // up
      { name: 'Mid One', position: 'M (C)', apps: 14, goals: 1, assists: 5, avgRating: 6.55 },        // down
    ],
  },
]);

check('empty state hidden once snapshots exist', document.getElementById('performance-empty-state').style.display === 'none');
check('table panel shown once snapshots exist', document.getElementById('performance-table-panel').style.display === '');
check('secondary row (position averages + history) shown once snapshots exist', document.getElementById('performance-secondary-row').style.display === '');
check('subtitle reflects the latest date and snapshot count', /2026-06-01/.test(document.getElementById('performance-subtitle').textContent) && /2 snapshots/.test(document.getElementById('performance-subtitle').textContent));

const tableHtml = document.getElementById('performance-table-body').innerHTML;
check('table body renders both players from the latest snapshot', /Striker One/.test(tableHtml) && /Mid One/.test(tableHtml));
check('rising rating gets an up-trend badge', /perf-trend-up/.test(tableHtml));
check('falling rating gets a down-trend badge', /perf-trend-down/.test(tableHtml));
check('latest avg rating is colour-classed via perf-rating', /perf-rating strong/.test(tableHtml) || /perf-rating mid/.test(tableHtml));

const positionsHtml = document.getElementById('performance-positions-list').innerHTML;
check('position-averages list shows the Striker group (via classifyPositions)', /Striker/.test(positionsHtml));
check('position-averages list shows the Central Mid group (via classifyPositions)', /Central Mid/.test(positionsHtml));

const historyHtml = document.getElementById('performance-history-list').innerHTML;
check('history list shows both captured dates', /2026-05-01/.test(historyHtml) && /2026-06-01/.test(historyHtml));
check('history list shows newest snapshot first', historyHtml.indexOf('2026-06-01') < historyHtml.indexOf('2026-05-01'));

// ---- removePerformanceSnapshot ----
removePerformanceSnapshot('2026-05-01');
check('removePerformanceSnapshot drops just that one snapshot', performanceSnapshots.length === 1 && performanceSnapshots[0].date === '2026-06-01');

removePerformanceSnapshot('2026-06-01');
check('removing the last snapshot brings back the empty state', document.getElementById('performance-empty-state').style.display === '');
check('subtitle reverts to the no-snapshots message', document.getElementById('performance-subtitle').textContent === 'No snapshots captured yet');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
