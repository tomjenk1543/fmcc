// Regression/coverage test for the Performance Data feature v2 (Squad section) — a
// multi-category squad performance tracker built from FM's own 5 Squad-screen stat filters
// (Attacking/xG, Goalkeeping, Discipline, General Play, Goal Attempts), same screenshot ->
// Claude -> paste-JSON import pattern as the Scouting shortlist. Covers:
//   - validatePerformanceSnapshots(): unchanged shape checks (date + non-empty players array,
//     each player needing "name"; every other field optional).
//   - addPerformanceSnapshots()/removePerformanceSnapshot(): unchanged upsert-by-date behaviour.
//   - parseAppsTotal(): "39 (1)"-style FM appearance strings -> a single volume number.
//   - normalizeNameForMatch()/findSquadPosition(): diacritic-insensitive name matching against
//     the loaded squad, since position isn't part of the snapshot schema at all.
//   - computeDerivedStats(): Goals-xG, Sv%-xSv%, shot conversion %.
//   - renderPerformanceCategoryView(): category-driven table columns, sorting, and trend cells.
//   - computePerformanceChartRows()/renderPerformanceBarChart(): both chart shapes (actual-vs-
//     expected pair, and single ranked metric).
//   - computePerformanceInsights(): assumptions, improvement flags, and over/underperformer
//     ranking, all against a small synthetic snapshot with obvious signal.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// The app now boots to a blank landing state by default (no auto-loaded save) — this test
// needs a real currentSquad to exercise findSquadPosition()'s name lookup, so it loads the
// bundled Metalul Buzau save explicitly, same as leaguetable_test.js/snapshot_test.js do.
loadSaveData_MetaluBuzau();

// ---- Start from a clean slate ----
performanceSnapshots.length = 0;
savePerformanceSnapshots(performanceSnapshots);

// ---- validatePerformanceSnapshots (schema itself didn't change) ----
check('rejects a snapshot missing "date"',
  validatePerformanceSnapshots({ players: [{ name: 'A' }] }).some(e => /missing "date"/.test(e)));
check('rejects a snapshot missing "players"',
  validatePerformanceSnapshots({ date: '2037-04-11' }).some(e => /"players" must be a non-empty array/.test(e)));
check('rejects a player missing "name"',
  validatePerformanceSnapshots({ date: '2037-04-11', players: [{ goals: 1 }] }).some(e => /missing "name"/.test(e)));
check('accepts a snapshot with only name + a couple of stat fields (everything else optional)',
  validatePerformanceSnapshots({ date: '2037-04-11', players: [{ name: 'Player A', goals: 3 }] }).length === 0);

// ---- parseAppsTotal ----
check('parseAppsTotal parses "39 (1)" as 40', parseAppsTotal('39 (1)') === 40);
check('parseAppsTotal parses a bare "44" as 44', parseAppsTotal('44') === 44);
check('parseAppsTotal accepts a plain number', parseAppsTotal(7) === 7);
check('parseAppsTotal returns 0 for missing/unparseable input', parseAppsTotal(undefined) === 0 && parseAppsTotal('') === 0);

// ---- normalizeNameForMatch / findSquadPosition (currentSquad is whatever the bundled save
// loaded at boot — Samuel Musolino is one of its real players, per FM_Command_Centre.html's
// own renderSquad() call). ----
check('normalizeNameForMatch lowercases and strips accents',
  normalizeNameForMatch('Aurelio Eguía') === normalizeNameForMatch('AURELIO EGUIA'));
check('findSquadPosition resolves an exact-name match from currentSquad',
  !!findSquadPosition('Samuel Musolino'));
check('findSquadPosition resolves a name differing only by accent',
  findSquadPosition('Aurelio Eguía') === findSquadPosition('Aurelio Eguia'));
check('findSquadPosition returns null for a name not in the squad',
  findSquadPosition('Totally Made Up Player') === null);

// ---- computeDerivedStats ----
const derived1 = computeDerivedStats({ goals: 26, xG: 23, svPct: 84, xSvPct: 90, shots: 134 });
check('computeDerivedStats computes __xgDiff', Math.abs(derived1.__xgDiff - 3) < 0.001);
check('computeDerivedStats computes __svDiff', Math.abs(derived1.__svDiff - (-6)) < 0.001);
check('computeDerivedStats computes __conversion (goals/shots*100)', Math.abs(derived1.__conversion - (26 / 134 * 100)) < 0.001);
check('computeDerivedStats omits __conversion when shots is 0', computeDerivedStats({ goals: 0, shots: 0 }).__conversion === undefined);

// ---- Build a small synthetic 2-snapshot history with clear over/underperformance signal ----
addPerformanceSnapshots([
  {
    date: '2037-03-11',
    players: [
      { name: 'Samuel Musolino', apps: '35 (1)', goals: 20, shots: 120, xG: 20, passPct: 88, passesAttempted: 1000, foulsMade: 40, tacklesWon: 5, tacklesAttempted: 8 },
      { name: 'Pol', apps: '40', cleanSheets: 20, goalsConceded: 28, svPct: 84, xSvPct: 84 },
    ],
  },
  {
    date: '2037-04-11',
    players: [
      // Clear overperformer: 6 more goals than xG suggests, on a real sample of shots.
      { name: 'Samuel Musolino', apps: '39 (1)', goals: 26, shots: 134, xG: 20, passPct: 88, passesAttempted: 1179, foulsMade: 45, tacklesWon: 5, tacklesAttempted: 8 },
      // Clear underperformer: 8 fewer goals than xG on a real sample of shots.
      { name: 'Arthur Ndo', apps: '30 (6)', goals: 3, shots: 74, xG: 11, passPct: 91, passesAttempted: 1024 },
      // Starting keeper performing almost exactly to expectation.
      { name: 'Pol', apps: '44', cleanSheets: 23, goalsConceded: 31, svPct: 84, xSvPct: 84.5 },
      // Backup keeper meaningfully worse than the starter, on a real sample of apps.
      { name: 'Sergio Acosta', apps: '7', cleanSheets: 4, goalsConceded: 5, svPct: 72, xSvPct: 78 },
      // A dirty tackler: more fouls made than successful tackles won, on real volume.
      { name: 'Michael Botha', apps: '35 (6)', foulsMade: 47, tacklesWon: 20, tacklesAttempted: 30, passPct: 87, passesAttempted: 1748 },
    ],
  },
]);

check('two snapshots recorded', performanceSnapshots.length === 2);
check('table panel visible once snapshots exist', document.getElementById('performance-table-panel').style.display === '');
check('chart panel visible once snapshots exist', document.getElementById('performance-chart-panel').style.display === '');
check('empty state hidden once snapshots exist', document.getElementById('performance-empty-state').style.display === 'none');

// ---- Category select is populated from PERFORMANCE_CATEGORIES ----
const categorySelect = document.getElementById('performance-category-select');
check('category select has one option per PERFORMANCE_CATEGORIES entry',
  categorySelect.children.length === Object.keys(PERFORMANCE_CATEGORIES).length);

// ---- Default (attacking) category view ----
const headHtml = document.getElementById('performance-table-head').innerHTML;
check('attacking table header includes Goals and xG columns', /Goals/.test(headHtml) && />xG</.test(headHtml));
check('attacking table header includes a Trend column (2 snapshots exist)', /Trend/.test(headHtml));

const bodyHtml = document.getElementById('performance-table-body').innerHTML;
check('table body renders both attacking-relevant players', /Samuel Musolino/.test(bodyHtml) && /Arthur Ndo/.test(bodyHtml));
check('Musolino\'s position is resolved from currentSquad, not left blank', bodyHtml.indexOf('Samuel Musolino') < bodyHtml.indexOf('AM (RC)/ST (C)'));
check('Goals − xG diff is colour-classed positive for the overperformer', /perf-diff-positive/.test(bodyHtml));
check('rising goal count vs previous snapshot shows an up-trend badge', /perf-trend-up/.test(bodyHtml));

const chartHtmlAttacking = document.getElementById('performance-chart-container').innerHTML;
check('attacking chart renders at least one bar row', /perf-chart-row/.test(chartHtmlAttacking));
check('attacking chart marks the clear overperformer\'s bar as over', /is-over/.test(chartHtmlAttacking));

// ---- Switch to goalkeeping category ----
performanceCategory = 'goalkeeping';
renderPerformanceCategoryView();
const gkHeadHtml = document.getElementById('performance-table-head').innerHTML;
check('goalkeeping table header includes Sv% and xSv% columns', /Sv%/.test(gkHeadHtml) && /xSv%/.test(gkHeadHtml));
const gkBodyHtml = document.getElementById('performance-table-body').innerHTML;
check('goalkeeping table includes both keepers', /Pol/.test(gkBodyHtml) && /Sergio Acosta/.test(gkBodyHtml));
check('backup keeper\'s Sv%-xSv% diff is colour-classed negative', /perf-diff-negative/.test(gkBodyHtml));

// ---- Switch to discipline category (single-metric chart, no actual/expected pair) ----
performanceCategory = 'discipline';
renderPerformanceCategoryView();
const discHeadHtml = document.getElementById('performance-table-head').innerHTML;
check('discipline table header includes Tackles Won and Fouls Made', /Tackles Won/.test(discHeadHtml) && /Fouls Made/.test(discHeadHtml));
const discChartHtml = document.getElementById('performance-chart-container').innerHTML;
check('discipline chart renders bars without an actual/expected marker requirement', /perf-chart-row/.test(discChartHtml));

// Reset back to the default category so later checks aren't order-dependent.
performanceCategory = 'attacking';
renderPerformanceCategoryView();

// ---- Insights: assumptions / improvements / over-underperformers ----
const insightsHtml = document.getElementById('performance-insights-content').innerHTML;
check('insights panel has an Assumptions section', /Assumptions/.test(insightsHtml));
check('insights panel has an Areas for Improvement section', /Areas for Improvement/.test(insightsHtml));
check('insights panel has an Over\/Underperforming Players section', /Over \/ Underperforming Players/.test(insightsHtml));
check('Musolino listed as an overperformer', /Samuel Musolino/.test(insightsHtml) && /overperforming xG/.test(insightsHtml));
check('Ndo listed as an underperformer', /Arthur Ndo/.test(insightsHtml) && /underperforming xG/.test(insightsHtml));
check('goalkeeping depth gap improvement flag mentions both keepers', /Pol/.test(insightsHtml) && /Sergio Acosta/.test(insightsHtml));
check('dirty-tackler improvement flag names Michael Botha', /Michael Botha/.test(insightsHtml));

const insights = computePerformanceInsights(performanceLatestSnapshot);
check('computePerformanceInsights ranks Musolino as the top overperformer', insights.overperformers[0] && insights.overperformers[0].name === 'Samuel Musolino');
check('computePerformanceInsights ranks Ndo as the top underperformer', insights.underperformers[0] && insights.underperformers[0].name === 'Arthur Ndo');
check('computePerformanceInsights flags Sergio Acosta as a goalkeeping underperformer', insights.gkUnder.some(p => p.name === 'Sergio Acosta'));

// ---- Snapshot history + removal (unchanged behaviour, still worth covering post-rewrite) ----
const historyHtml = document.getElementById('performance-history-list').innerHTML;
check('history list shows both captured dates', /2037-03-11/.test(historyHtml) && /2037-04-11/.test(historyHtml));
check('history list shows newest snapshot first', historyHtml.indexOf('2037-04-11') < historyHtml.indexOf('2037-03-11'));

removePerformanceSnapshot('2037-03-11');
check('removePerformanceSnapshot drops just that one snapshot', performanceSnapshots.length === 1 && performanceSnapshots[0].date === '2037-04-11');

removePerformanceSnapshot('2037-04-11');
check('removing the last snapshot brings back the empty state', document.getElementById('performance-empty-state').style.display === '');
check('subtitle reverts to the no-snapshots message', document.getElementById('performance-subtitle').textContent === 'No snapshots captured yet');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
