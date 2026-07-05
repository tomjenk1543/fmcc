// Regression/coverage test for the Performance Data feature v2 (Squad section) — a
// multi-category squad performance tracker built from FM's own 5 Squad-screen stat filters
// (Attacking/xG, Goalkeeping, Discipline, General Play, Goal Attempts), same screenshot ->
// Claude -> paste-JSON import pattern as the Scouting shortlist. Covers:
//   - validatePerformanceSnapshots(): date + season + non-empty players array required, each
//     player needing "name"; every other field optional.
//   - addPerformanceSnapshots()/removePerformanceSnapshot(): unchanged upsert-by-date behaviour.
//   - getPerformanceSeasons()/sortedPerformanceSnapshotsForSeason()/getSnapshotSeason(): season
//     grouping, the season <select>, and a legacy snapshot missing "season" entirely falling
//     back to a shared "Unspecified Season" bucket instead of crashing.
//   - renderPerformanceData(): a new season's first snapshot never gets trend-compared against
//     the previous season's final totals (performancePreviousSnapshot === null at a season's
//     own start, same as a save's very first snapshot ever).
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

// ---- validatePerformanceSnapshots ----
check('rejects a snapshot missing "date"',
  validatePerformanceSnapshots({ players: [{ name: 'A' }] }).some(e => /missing "date"/.test(e)));
check('rejects a snapshot missing "players"',
  validatePerformanceSnapshots({ date: '2037-04-11' }).some(e => /"players" must be a non-empty array/.test(e)));
check('rejects a player missing "name"',
  validatePerformanceSnapshots({ date: '2037-04-11', players: [{ goals: 1 }] }).some(e => /missing "name"/.test(e)));
check('accepts a snapshot with only date + name + a couple of stat fields — "season" is not required',
  validatePerformanceSnapshots({ date: '2037-04-11', players: [{ name: 'Player A', goals: 3 }] }).length === 0);

// ---- deriveSeasonFromDate: FM's own 1 July – 30 June season calendar ----
// A month-based bucket, not a specific day cutoff, so the two days actually either side of
// the real boundary (30 June / 1 July) land in different seasons with no off-by-one risk —
// exactly the scenario an end-of-season review snapshot followed by the new season's first
// snapshot would produce.
check('a date well into a season (November) derives that season', deriveSeasonFromDate('2037-11-05') === '2037/38');
check('a date early in the following calendar year (March) still derives the SAME season', deriveSeasonFromDate('2038-03-12') === '2037/38');
check('30 June derives the OLD (ending) season', deriveSeasonFromDate('2038-06-30') === '2037/38');
check('1 July derives the NEW season — one day later than 30 June, different season', deriveSeasonFromDate('2038-07-01') === '2038/39');
check('1 July and 31 December of the same calendar year derive the same (new) season', deriveSeasonFromDate('2038-12-31') === '2038/39');
check('deriveSeasonFromDate returns null for an unparseable date', deriveSeasonFromDate('not-a-date') === null && deriveSeasonFromDate(undefined) === null);

// ---- getSnapshotSeason: explicit "season" wins when present; otherwise derives from "date";
// only falls back to a shared bucket when NEITHER is usable (very old/corrupt data). ----
check('getSnapshotSeason returns an explicit season when present, without re-deriving it', getSnapshotSeason({ season: '2037/38', date: '2038-07-01' }) === '2037/38');
check('getSnapshotSeason derives the season from "date" when "season" is absent', getSnapshotSeason({ date: '2037-04-11' }) === '2036/37');
check('getSnapshotSeason falls back to a shared bucket only when date is unparseable too', getSnapshotSeason({ date: 'not-a-date' }) === 'Unspecified Season');

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
// Both share season '2037/38' — the season-boundary behaviour itself (a NEW season's first
// snapshot having no "previous" to trend against) gets its own dedicated block further below.
addPerformanceSnapshots([
  {
    date: '2037-03-11',
    season: '2037/38',
    players: [
      { name: 'Samuel Musolino', apps: '35 (1)', goals: 20, shots: 120, xG: 20, passPct: 88, passesAttempted: 1000, foulsMade: 40, tacklesWon: 5, tacklesAttempted: 8 },
      { name: 'Pol', apps: '40', cleanSheets: 20, goalsConceded: 28, svPct: 84, xSvPct: 84 },
    ],
  },
  {
    date: '2037-04-11',
    season: '2037/38',
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

// ---- Column sorting: every header (Player, Position, each stat column) is clickable ----
check('every header cell carries a data-sort-key (Player/Position + each stat column)',
  (headHtml.match(/data-sort-key="/g) || []).length === 2 + PERFORMANCE_CATEGORIES.attacking.columns.length);
const trendHeaderMatch = headHtml.match(/<th[^>]*>Trend<\/th>/);
check('the Trend header specifically has no data-sort-key', !!trendHeaderMatch && !/data-sort-key/.test(trendHeaderMatch[0]));

// Default (unclicked) state ranks by the category's own sortKey (goals, highest first) —
// Musolino (26 goals) should sort above Ndo (3 goals).
check('default table order ranks Musolino above Ndo (unsorted = cat.sortKey, goals, descending)',
  document.getElementById('performance-table-body').innerHTML.indexOf('Samuel Musolino')
    < document.getElementById('performance-table-body').innerHTML.indexOf('Arthur Ndo'));
check('the Goals header shows the descending-sort arrow by default', document.querySelector('#performance-table-head th[data-sort-key="goals"]').classList.contains('sort-desc'));

// Clicking a fresh column (Player) sorts ascending (alphabetical) — same convention as the
// Squad List table's own sort headers.
document.querySelector('#performance-table-head th[data-sort-key="name"]').fire('click');
const nameAscBody = document.getElementById('performance-table-body').innerHTML;
check('clicking Player sorts alphabetically ascending', nameAscBody.indexOf('Arthur Ndo') < nameAscBody.indexOf('Samuel Musolino'));
check('the Player header now shows the ascending-sort arrow', document.querySelector('#performance-table-head th[data-sort-key="name"]').classList.contains('sort-asc'));
check('the Goals header no longer shows a sort arrow', !document.querySelector('#performance-table-head th[data-sort-key="goals"]').classList.contains('sort-desc'));

// Clicking the SAME column again flips direction.
document.querySelector('#performance-table-head th[data-sort-key="name"]').fire('click');
const nameDescBody = document.getElementById('performance-table-body').innerHTML;
check('clicking Player again flips to descending', nameDescBody.indexOf('Samuel Musolino') < nameDescBody.indexOf('Arthur Ndo'));
check('the Player header now shows the descending-sort arrow', document.querySelector('#performance-table-head th[data-sort-key="name"]').classList.contains('sort-desc'));

// Clicking a stat column (Shots) sorts ascending fresh, independent of the Player sort above.
document.querySelector('#performance-table-head th[data-sort-key="shots"]').fire('click');
check('the Shots header shows the ascending-sort arrow after its first click', document.querySelector('#performance-table-head th[data-sort-key="shots"]').classList.contains('sort-asc'));
check('the Player header no longer shows a sort arrow once Shots takes over', !document.querySelector('#performance-table-head th[data-sort-key="name"]').classList.contains('sort-desc') && !document.querySelector('#performance-table-head th[data-sort-key="name"]').classList.contains('sort-asc'));

// ---- Switch to goalkeeping category ----
// (Mirrors what the category <select>'s own change listener does — reset the sort state
// before re-rendering, since these tests drive performanceCategory/renderPerformanceCategoryView
// directly rather than through the <select> itself. Also doubles as coverage that a fresh
// category starts back at its own natural ranking rather than carrying over 'shots' from
// the block above.)
performanceCategory = 'goalkeeping';
performanceSortKey = null;
performanceSortDir = -1;
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
check('Full Overview modal title names the category, season, and latest date',
  document.getElementById('performance-overview-modal-title').textContent === 'Attacking (xG) — Full Overview (2037/38, 2037-04-11)');

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

// ---- The Full Overview modal's own (uncapped) table is independently sortable too — same
// buildPerformanceTableHtml()/wirePerformanceTableSortHeaders() plumbing as the inline tile,
// just against its own element IDs and re-rendered via renderPerformanceOverviewModal(). Sort
// state is shared with the inline tile (same category, same underlying ranking), so reset it
// afterwards to keep this check from leaking into the ones below. ----
check('Full Overview table headers are sortable too', document.getElementById('performance-overview-table-head').innerHTML.includes('data-sort-key="name"'));
document.querySelector('#performance-overview-table-head th[data-sort-key="name"]').fire('click');
const overviewNameAscBody = document.getElementById('performance-overview-table-body').innerHTML;
check('clicking Player in the Full Overview table sorts it ascending too', overviewNameAscBody.indexOf('Arthur Ndo') < overviewNameAscBody.indexOf('Samuel Musolino'));
performanceSortKey = null;
performanceSortDir = -1;

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

// ---- Season handling: the whole point of tagging snapshots with a season — a new season's
// first snapshot must never get trend-compared against the previous season's (much higher,
// cumulative) final totals. ----
const seasonSelect = document.getElementById('performance-season-select');
check('season select starts with just the one captured season', seasonSelect.children.length === 1 && seasonSelect.value === '2037/38');

// Add the new season's very first snapshot — low, just-reset cumulative stats, the same
// shape FM itself shows right after a new season kicks off.
addPerformanceSnapshots([{
  date: '2038-08-20',
  season: '2038/39',
  players: [
    { name: 'Samuel Musolino', apps: '3', goals: 1, shots: 8, xG: 0.9 },
  ],
}]);

check('adding a new season\'s snapshot jumps the view to that season', performanceSeason === '2038/39');
check('season select now offers both seasons', seasonSelect.children.length === 2);
check('season select is set to the newly added season', seasonSelect.value === '2038/39');
check('the new season\'s only snapshot has no previous snapshot to trend against', performancePreviousSnapshot === null);

const newSeasonBodyHtml = document.getElementById('performance-table-body').innerHTML;
check('the new season\'s table shows only its own (reset) players, not mixed with the old season', /Samuel Musolino/.test(newSeasonBodyHtml) && !/Arthur Ndo/.test(newSeasonBodyHtml));
// With performancePreviousSnapshot === null, buildPerformanceTableHtml doesn't even render a
// Trend column (same as a save's very first-ever snapshot) — no misleading down-arrow, and no
// confusing dash column either.
check('the new season\'s table has no Trend column at all (nothing to compare against yet)', !/perf-trend-down/.test(newSeasonBodyHtml) && !document.getElementById('performance-table-head').innerHTML.includes('Trend'));
check('subtitle names the newly selected season', document.getElementById('performance-subtitle').textContent.startsWith('2038/39'));

const newSeasonHistoryHtml = document.getElementById('performance-history-list').innerHTML;
check('history list is scoped to the selected season only (2038/39 here, not last season\'s dates)',
  /2038-08-20/.test(newSeasonHistoryHtml) && !/2037-03-11/.test(newSeasonHistoryHtml) && !/2037-04-11/.test(newSeasonHistoryHtml));

// Switching back to the old season via the <select> restores its own table/history, untouched
// by the new season's data sitting alongside it.
seasonSelect.value = '2037/38';
seasonSelect.fire('change');
check('switching season via the select updates performanceSeason', performanceSeason === '2037/38');
const oldSeasonBodyHtml = document.getElementById('performance-table-body').innerHTML;
check('switching back to the old season shows its own players again', /Samuel Musolino/.test(oldSeasonBodyHtml) && /Arthur Ndo/.test(oldSeasonBodyHtml));
check('switching back to the old season restores its own real trend comparison (2 snapshots)', /perf-trend-up/.test(oldSeasonBodyHtml));
const oldSeasonHistoryHtml = document.getElementById('performance-history-list').innerHTML;
check('history list for the old season shows its own 2 dates, not the new season\'s',
  /2037-03-11/.test(oldSeasonHistoryHtml) && /2037-04-11/.test(oldSeasonHistoryHtml) && !/2038-08-20/.test(oldSeasonHistoryHtml));

// Removing the new season's only snapshot should fall back to the remaining season automatically.
removePerformanceSnapshot('2038-08-20');
check('removing a season\'s only snapshot falls back to the remaining season', performanceSeason === '2037/38');
check('season select drops back to one option once that season has no data left', document.getElementById('performance-season-select').children.length === 1);

// ---- End-to-end: auto-derivation drives the real season boundary with no "season" field at
// all — the exact scenario it exists for: an end-of-season review snapshot on 30 June,
// followed by the new season's first snapshot on 1 July, with nobody needing to remember to
// change a season label in between. ----
addPerformanceSnapshots([
  { date: '2039-06-30', players: [{ name: 'Samuel Musolino', apps: '38', goals: 22, shots: 118, xG: 19 }] },
]);
check('a snapshot dated 30 June with no explicit "season" is grouped into the ending season', performanceSeason === '2038/39');

addPerformanceSnapshots([
  { date: '2039-07-01', players: [{ name: 'Samuel Musolino', apps: '1', goals: 0, shots: 1, xG: 0.1 }] },
]);
check('a snapshot dated 1 July with no explicit "season" starts a NEW season automatically', performanceSeason === '2039/40');
check('the 1 July snapshot has no previous snapshot to trend against, despite being just one day after 30 June', performancePreviousSnapshot === null);

removePerformanceSnapshot('2039-06-30');
removePerformanceSnapshot('2039-07-01');
check('cleanup: back down to just the one original season', performanceSeason === '2037/38' && document.getElementById('performance-season-select').children.length === 1);

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
