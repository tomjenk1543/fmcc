// Verifies the league table popup: empty-state when no data captured, populated table with
// our-row highlighting when leagueTableData is set, and that clicking the season-stats pill
// (#league-slot) triggers the popup via the shared gaps-modal.

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Boot now always lands on the true landing screen unless a save was actually imported
// (see enterLandingMode()/resetToBlankSlate()) — the bundled Metalul Buzau example is no
// longer auto-loaded, so this test explicitly loads it itself to exercise its real data
// shape (16-club table, achievements, etc.).
loadSaveData_MetaluBuzau();

// 1. The bundled Metalul Buzau save now ships with the real captured 16-club table.
assert(Array.isArray(leagueTableData), 'leagueTableData is an array after boot');
assert(leagueTableData.length === 16, 'leagueTableData has all 16 SuperLiga clubs for the bundled save');
const bootHtml = buildLeagueTableHtml();
assert(bootHtml.includes('<table class="league-table-full">'), 'bundled save renders a real table, not the empty state');
const bootOurRow = bootHtml.split('<tr class="').slice(1).map(s => '<tr class="' + s).find(r => r.includes('Metalul Buz'));
assert(bootOurRow && bootOurRow.split('>')[0].includes('is-us'), 'bundled save highlights Metalul Buzau as our row');
assert(bootHtml.includes('>1<') && bootHtml.includes('72'), 'bundled save shows Metalul Buzau top of the table on 72 points');

// 1b. Empty-state fallback still works when leagueTableData has nothing in it (e.g. an
// import that omitted the optional field).
leagueTableData = [];
const emptyHtml = buildLeagueTableHtml();
assert(emptyHtml.includes('empty-state'), 'empty state uses .empty-state styling');
assert(emptyHtml.includes('not captured yet'), 'empty state explains data is not captured yet');
assert(emptyHtml.includes('Metalul Buz'), 'empty state mentions the club name');

// 2. Populate a fake table and verify rendering + our-row highlight.
leagueTableData = [
  { pos: 1, club: 'Metalul Buzău', p: 26, w: 23, d: 3, l: 0, f: 65, a: 14, gd: '+51', pts: 72 },
  { pos: 2, club: 'FC Rival', p: 26, w: 18, d: 4, l: 4, f: 50, a: 25, gd: '+25', pts: 58 },
  { pos: 16, club: 'Bottom Club', p: 26, w: 2, d: 3, l: 21, f: 15, a: 60, gd: '-45', pts: 9 },
];

const html = buildLeagueTableHtml();
assert(html.includes('<table class="league-table-full">'), 'renders a table when data is present');
assert((html.match(/<tr class="league-table-row/g) || []).length === 3, 'renders one row per club (3)');
assert(html.includes('FC Rival'), 'includes a non-us club name');
const ourRow = html.split('<tr class="').slice(1).map(s => '<tr class="' + s).find(r => r.includes('Metalul Buz'));
assert(ourRow && ourRow.split('>')[0].includes('is-us'), 'our row (matched by club name) gets the is-us class');
const rows = html.split('<tr class="').slice(1).map(s => '<tr class="' + s);
const rivalRow = rows.find(r => r.includes('FC Rival'));
assert(rivalRow && !rivalRow.split('>')[0].includes('is-us'), 'a rival row does not get is-us');

// 3. isUs flag also works explicitly (not just name-matching).
leagueTableData = [
  { pos: 1, club: 'Some Other Name For Us', p: 10, w: 5, d: 3, l: 2, f: 20, a: 10, gd: '+10', pts: 18, isUs: true },
  { pos: 2, club: 'Rival', p: 10, w: 4, d: 3, l: 3, f: 15, a: 12, gd: '+3', pts: 15 },
];
const html2 = buildLeagueTableHtml();
assert(/<tr class="league-table-row is-us">[\s\S]*?Some Other Name For Us/.test(html2), 'explicit isUs:true flags a row regardless of club-name match');

// 4. Clicking the season-stats pill opens the modal with the league table content.
document.getElementById('gaps-modal-title').textContent = '';
document.getElementById('gaps-modal-body').innerHTML = '';
document.getElementById('league-slot').fire('click');
const title = document.getElementById('gaps-modal-title').textContent;
const body = document.getElementById('gaps-modal-body').innerHTML;
assert(typeof title === 'string' && title.length > 0, 'clicking the pill sets a modal title');
assert(body.includes('league-table-full'), 'clicking the pill fills the modal body with the league table');

if (process.exitCode === 1) {
  console.error('SOME TESTS FAILED');
} else {
  console.log('ALL TESTS PASSED');
}
