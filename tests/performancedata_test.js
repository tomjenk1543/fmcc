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
      // Six more shot-takers with no other signal, purely to push the number of
      // chart-eligible attacking players (has goals+xG, shots >= 1) to 8 — past the inline
      // chart's topN of 6 — so the "Full Overview" modal's uncapped chart can be checked
      // against the capped inline one.
      { name: 'Extra Player One', apps: '10 (2)', goals: 1, shots: 5, xG: 1 },
      { name: 'Extra Player Two', apps: '9 (1)', goals: 0, shots: 3, xG: 0.4 },
      { name: 'Extra Player Three', apps: '8 (4)', goals: 2, shots: 6, xG: 1.5 },
      { name: 'Extra Player Four', apps: '12 (0)', goals: 1, shots: 4, xG: 0.8 },
      { name: 'Extra Player Five', apps: '6 (3)', goals: 0, shots: 2, xG: 0.3 },
      { name: 'Extra Player Six', apps: '15 (2)', goals: 3, shots: 9, xG: 2.2 },
    ],
  },
]);

// Total players in the latest snapshot: Musolino, Ndo, Pol, Acosta, Botha + 6 extras = 11.
// Chart-eligible for Attacking specifically (needs goals+xG, shots>=1): Musolino, Ndo, +6
// extras = 8 — deliberately more than the inline chart's topN (6), see below.
const LATEST_SNAPSHOT_PLAYER_COUNT = 11;
const ATTACKING_CHART_ELIGIBLE_COUNT = 8;

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

// ---- The Analysis tile re-renders (via renderPerformanceCategoryView -> renderPerformanceInsights)
// scoped to whichever category the dropdown is on — this is the actual feature being tested:
// picking Goalkeeping should surface goalkeeping-only observations, not the Attacking ones.
// The inline tile shows Assumptions + Areas for Improvement; only Over/Underperforming
// Players (the one section whose row count can grow unbounded) lives behind the "View full
// breakdown" click — see the gaps-modal checks below. ----
const gkInsightsTitle = document.getElementById('performance-insights-title').innerHTML;
check('Analysis title reflects the Goalkeeping category', /Goalkeeping/.test(gkInsightsTitle));
const gkInlineHtml = document.getElementById('performance-insights-content').innerHTML;
check('inline Analysis tile has an Assumptions section', /Assumptions/.test(gkInlineHtml));
check('inline Analysis tile has an Areas for Improvement section', /Areas for Improvement/.test(gkInlineHtml));
check('inline Analysis tile has no Over/Under section (that stays behind the click)', !/Over \/ Underperforming/.test(gkInlineHtml));
check('inline Analysis tile includes the goalkeeping depth-gap improvement naming both keepers', /Pol/.test(gkInlineHtml) && /goalkeeping depth/.test(gkInlineHtml));
check('inline Analysis tile does NOT show the Discipline dirty-tackler improvement', !/Michael Botha/.test(gkInlineHtml));
check('inline Analysis tile has a "View full breakdown" button', /View full breakdown/.test(gkInlineHtml));

document.getElementById('performance-insights-panel').fire('click');
check('clicking the Analysis tile opens the shared gaps-modal', document.getElementById('gaps-modal-backdrop').classList.contains('open'));
check('the gaps-modal title names the Goalkeeping category', /Goalkeeping/.test(document.getElementById('gaps-modal-title').textContent));
const gkModalHtml = document.getElementById('gaps-modal-body').innerHTML;
check('goalkeeping full breakdown flags Sergio Acosta as underperforming xSv%', /Sergio Acosta/.test(gkModalHtml) && /underperforming xSv%/.test(gkModalHtml));
check('goalkeeping full breakdown includes the depth-gap improvement naming both keepers', /Pol/.test(gkModalHtml) && /goalkeeping depth/.test(gkModalHtml));
check('goalkeeping full breakdown does NOT show the Attacking category\'s over/underperformer labels', !/overperforming xG/.test(gkModalHtml) && !/underperforming xG/.test(gkModalHtml));
check('goalkeeping full breakdown does NOT show the Discipline dirty-tackler improvement', !/Michael Botha/.test(gkModalHtml));
closeGapsModal();

// ---- Switch to discipline category (single-metric chart, no actual/expected pair) ----
performanceCategory = 'discipline';
renderPerformanceCategoryView();
const discHeadHtml = document.getElementById('performance-table-head').innerHTML;
check('discipline table header includes Tackles Won and Fouls Made', /Tackles Won/.test(discHeadHtml) && /Fouls Made/.test(discHeadHtml));
const discChartHtml = document.getElementById('performance-chart-container').innerHTML;
check('discipline chart renders bars without an actual/expected marker requirement', /perf-chart-row/.test(discChartHtml));

const discInlineHtml = document.getElementById('performance-insights-content').innerHTML;
check('inline Analysis tile flags Michael Botha as a dirty tackler for Discipline', /Michael Botha/.test(discInlineHtml));
check('inline Analysis tile does NOT show goalkeeping or attacking content for Discipline', !/Sergio Acosta/.test(discInlineHtml) && !/overperforming xG/.test(discInlineHtml));

document.getElementById('performance-insights-panel').fire('click');
const discModalHtml = document.getElementById('gaps-modal-body').innerHTML;
check('discipline full breakdown flags Michael Botha as a dirty tackler', /Michael Botha/.test(discModalHtml));
check('discipline full breakdown has no over/underperformer ranking (no expected-value baseline)', /no expected-value baseline/.test(discModalHtml));
check('discipline full breakdown does NOT show goalkeeping or attacking content', !/Sergio Acosta/.test(discModalHtml) && !/overperforming xG/.test(discModalHtml));
closeGapsModal();

// Reset back to the default category so later checks aren't order-dependent.
performanceCategory = 'attacking';
renderPerformanceCategoryView();

// ---- Inline chart is capped (topN) so the page itself never needs to scroll ----
const inlineChartHtml = document.getElementById('performance-chart-container').innerHTML;
const inlineBarCount = (inlineChartHtml.match(/perf-chart-row/g) || []).length;
check('inline attacking chart is capped to the category\'s topN (6), not showing every eligible player',
  inlineBarCount === PERFORMANCE_CATEGORIES.attacking.chart.topN && inlineBarCount < ATTACKING_CHART_ELIGIBLE_COUNT);
check('inline chart caption explains bar length and the expected-value tick',
  /Bar length = Goals/.test(document.getElementById('performance-chart-caption').textContent)
  && /xG/.test(document.getElementById('performance-chart-caption').textContent));

// ---- Full Overview modal: uncapped table + chart for whichever category is selected ----
renderPerformanceOverviewModal();
check('Full Overview modal opens', document.getElementById('performance-overview-modal-backdrop').classList.contains('open'));
check('Full Overview modal title names the category and latest date',
  document.getElementById('performance-overview-modal-title').textContent === 'Attacking (xG) — Full Overview (2037-04-11)');

const overviewBodyHtml = document.getElementById('performance-overview-table-body').innerHTML;
const overviewRowCount = (overviewBodyHtml.match(/<tr>/g) || []).length;
check('Full Overview table shows every player in the snapshot, not just the capped inline set',
  overviewRowCount === LATEST_SNAPSHOT_PLAYER_COUNT);

const overviewChartHtml = document.getElementById('performance-overview-chart-container').innerHTML;
const overviewBarCount = (overviewChartHtml.match(/perf-chart-row/g) || []).length;
check('Full Overview chart shows every chart-eligible player, more than the inline topN cap',
  overviewBarCount > inlineBarCount && overviewBarCount === ATTACKING_CHART_ELIGIBLE_COUNT);
check('Full Overview chart caption reflects the full eligible-player count, not "Top N"',
  new RegExp(`All ${ATTACKING_CHART_ELIGIBLE_COUNT} eligible players`).test(document.getElementById('performance-overview-chart-caption').textContent));

const overviewInsightsHtml = document.getElementById('performance-overview-insights-content').innerHTML;
check('Full Overview modal includes the same Assumptions/Improvement analysis', /Assumptions/.test(overviewInsightsHtml) && /Areas for Improvement/.test(overviewInsightsHtml));

closePerformanceOverviewModal();
check('Full Overview modal closes', !document.getElementById('performance-overview-modal-backdrop').classList.contains('open'));

// ---- Insights: assumptions / improvements / over-underperformers (back on Attacking, per the reset above) ----
// Inline tile shows Assumptions + Areas for Improvement; only Over/Underperforming Players
// is checked via the gaps-modal the tile opens on click, same as the goalkeeping/discipline
// checks above.
const insightsHtml = document.getElementById('performance-insights-content').innerHTML;
check('inline Analysis tile has an Assumptions section here too', /Assumptions/.test(insightsHtml));
check('inline Analysis tile has an Areas for Improvement section here too', /Areas for Improvement/.test(insightsHtml));
check('inline Analysis tile has no Over/Under section here either', !/Over \/ Underperforming/.test(insightsHtml));
check('inline Analysis tile names Ndo in the finishing improvement text (underperformer)', /Arthur Ndo/.test(insightsHtml));
check('Analysis title reflects the Attacking category', /Attacking/.test(document.getElementById('performance-insights-title').innerHTML));

document.getElementById('performance-insights-panel').fire('click');
const attackingModalHtml = document.getElementById('gaps-modal-body').innerHTML;
check('attacking full breakdown has an Assumptions section', /Assumptions/.test(attackingModalHtml));
check('attacking full breakdown has an Areas for Improvement section', /Areas for Improvement/.test(attackingModalHtml));
check('attacking full breakdown has an Over\/Underperforming Players section', /Over \/ Underperforming Players/.test(attackingModalHtml));
check('Musolino listed as an overperformer', /Samuel Musolino/.test(attackingModalHtml) && /overperforming xG/.test(attackingModalHtml));
check('Ndo listed as an underperformer', /Arthur Ndo/.test(attackingModalHtml) && /underperforming xG/.test(attackingModalHtml));
check('attacking full breakdown does NOT show the goalkeeping depth-gap improvement', !/goalkeeping depth/.test(attackingModalHtml));
check('attacking full breakdown does NOT show the discipline dirty-tackler improvement', !/Michael Botha/.test(attackingModalHtml));
closeGapsModal();

// ---- computePerformanceInsights is category-scoped: same snapshot, different categoryKey ----
const attackingInsights = computePerformanceInsights(performanceLatestSnapshot, 'attacking');
check('attacking insights rank Musolino as the top overperformer', attackingInsights.overUnderOver[0] && attackingInsights.overUnderOver[0].name === 'Samuel Musolino');
check('attacking insights rank Ndo as the top underperformer', attackingInsights.overUnderUnder[0] && attackingInsights.overUnderUnder[0].name === 'Arthur Ndo');

const goalkeepingInsights = computePerformanceInsights(performanceLatestSnapshot, 'goalkeeping');
check('goalkeeping insights flag Sergio Acosta as an underperformer', goalkeepingInsights.overUnderUnder.some(p => p.name === 'Sergio Acosta'));
check('goalkeeping insights carry no attacking over/underperformers', goalkeepingInsights.overUnderKind === 'goalkeeping');

const disciplineInsights = computePerformanceInsights(performanceLatestSnapshot, 'discipline');
check('discipline insights have no over/underperformer ranking (no expected-value baseline for this category)', disciplineInsights.overUnderKind === null && disciplineInsights.overUnderOver.length === 0);

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
