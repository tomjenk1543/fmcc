// Regression test for adding Wage to the Scouting table + scouted-player modal, and adding a
// Max Transfer Value ceiling to Recruitment Missions — follow-ups to Recruitment Missions
// (the wage/age ceilings only worked as filters if the underlying data was ever visible/
// usable anywhere, and Transfer Value is as natural a recruitment constraint as wage/age).

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

scoutShortlist.length = 0;
recruitmentMissions.length = 0;

// --- Scouting table: Wage column ------------------------------------------------------------
check('the Scouting table header has a sortable Wage column', /data-sort-key="wage">Wage</.test(document.body.innerHTML || ''));

const wagedPlayer = {
  name: 'Test Waged Target',
  position: 'M (C)',
  age: 24,
  club: 'Test FC',
  nation: 'ESP',
  ability: '3.5★',
  potential: '4★',
  wage: '£15.5K p/w',
  value: '£4.2M',
  attributes: {
    'First Touch': 14, Passing: 14, Technique: 13, Composure: 12, Decisions: 13, 'Off The Ball': 12, Teamwork: 13, Vision: 13,
  },
};
addScoutedPlayers([wagedPlayer]);

const tableBodyHtml = document.getElementById('scout-table-body').innerHTML;
check('the Scouting table row shows the wage string', /£15\.5K p\/w/.test(tableBodyHtml));
check('the Scouting table row still shows the transfer value string', /£4\.2M/.test(tableBodyHtml));

// Sorting by wage uses parseWageValue under the hood (see SCOUT_TABLE_COLUMNS.wage) — add a
// second player with a lower wage and confirm ascending sort puts them first.
const lowerWagePlayer = Object.assign({}, wagedPlayer, { name: 'Test Lower Wage Target', wage: '£5K p/w' });
addScoutedPlayers([lowerWagePlayer]);
scoutSortKey = 'wage';
scoutSortDir = 1;
renderScoutTable();
const sortedHtml = document.getElementById('scout-table-body').innerHTML;
check('sorting ascending by wage puts the lower-wage player first', sortedHtml.indexOf('Test Lower Wage Target') < sortedHtml.indexOf('Test Waged Target'));

// --- Scouted-player modal: Wage line ---------------------------------------------------------
const idx = scoutShortlist.findIndex(p => p.name === 'Test Waged Target');
openScoutProfile(idx);
check('the scouted-player modal shows the Wage line', document.getElementById('sm-wage').textContent === '£15.5K p/w');
check('the scouted-player modal still shows the Transfer Value line', document.getElementById('sm-value').textContent === '£4.2M');

// --- Recruitment Missions: Max Transfer Value ceiling ---------------------------------------
scoutShortlist.length = 0;

// Advanced Playmaker, Very Suited fit, comfortably within age/wage but a transfer value well
// above a tight ceiling — proves the value ceiling is actually load-bearing on its own, not
// just piggybacking on the existing age/wage checks.
const expensiveCandidate = {
  name: 'Test Expensive Playmaker',
  position: 'M (C)',
  age: 24,
  club: 'Test FC',
  nation: 'ESP',
  ability: '4★',
  potential: '4★',
  wage: '£10K p/w',
  value: '£25M',
  attributes: {
    'First Touch': 18, Passing: 18, Technique: 18, Composure: 18, Decisions: 18, 'Off The Ball': 18, Teamwork: 18, Vision: 18,
    Crossing: 16, Dribbling: 16, Anticipation: 16, Flair: 16, Acceleration: 16, Agility: 16,
  },
};
addScoutedPlayers([expensiveCandidate]);

const noValueCeilingMission = { role: 'Advanced Playmaker', maxAge: null, maxWageK: null, maxValueM: null, priority: 'high' };
check('with no value ceiling set, an expensive but Very Suited candidate still reads "Ready"', evaluateMission(noValueCeilingMission).status === 'stocked');

const tightValueCeilingMission = { role: 'Advanced Playmaker', maxAge: null, maxWageK: null, maxValueM: 10, priority: 'high' };
const tightValueResult = evaluateMission(tightValueCeilingMission);
check('a tight £10M value ceiling against a £25M candidate is not "Ready"', tightValueResult.status !== 'stocked');
check('the tight-ceiling mission still surfaces the closest candidate', tightValueResult.best && tightValueResult.best.name === 'Test Expensive Playmaker');

const looseValueCeilingMission = { role: 'Advanced Playmaker', maxAge: null, maxWageK: null, maxValueM: 30, priority: 'high' };
check('a £30M value ceiling against a £25M candidate reads "Ready"', evaluateMission(looseValueCeilingMission).status === 'stocked');

// Ceiling text in the rendered mission row includes the value ceiling.
recruitmentMissions.length = 0;
recruitmentMissions.push(tightValueCeilingMission);
renderRecruitmentMissions();
const missionRowHtml = document.getElementById('recruitment-missions-list').innerHTML;
check('the mission row shows the value ceiling in its label', /£10M-/.test(missionRowHtml));

// --- Add-mission form: the Max Value field is wired in ---------------------------------------
recruitmentMissions.length = 0;
document.getElementById('mission-role-select').value = 'Advanced Playmaker';
document.getElementById('mission-value-input').value = '15';
document.getElementById('mission-add-btn').fire('click');
const newMission = recruitmentMissions[0] || {};
check('clicking "+ Add Mission" captures the Max Value field', newMission.maxValueM === 15);
check('the Max Value input clears after adding', document.getElementById('mission-value-input').value === '');

// --- formatWage: object-shaped wage values must never render as "[object Object]" -----------
// Real-world scouting JSON is sometimes hand-built or screenshot-transcribed rather than
// following SCOUT_EXAMPLE_TEMPLATE's flat "£15K p/w" string exactly, so a wage value can show
// up as a small object instead. Before formatWage() existed, the table cell interpolated
// p.wage directly into a template literal, which doesn't throw for an object — it just
// silently stringifies it to "[object Object]".
check('formatWage passes through a normal wage string unchanged', formatWage('£15K p/w') === '£15K p/w');
check('formatWage falls back to a dash for undefined/null', formatWage(undefined) === '—' && formatWage(null) === '—');
check('formatWage never returns the literal "[object Object]"', formatWage({ foo: 'bar' }) !== '[object Object]');
check('formatWage extracts a {text: ...} shape', formatWage({ text: '£20K p/w' }) === '£20K p/w');
check('formatWage extracts a {value: ...} shape', formatWage({ value: '£22K p/w' }) === '£22K p/w');
check('formatWage builds a display string from a {amount, period} shape', formatWage({ amount: '£25K', period: 'p/w' }) === '£25K p/w');

const objectWagePlayer = {
  name: 'Test Object Wage Target',
  position: 'M (C)',
  age: 25,
  club: 'Test FC',
  nation: 'ESP',
  ability: '3★',
  potential: '3★',
  wage: { amount: '£30K', period: 'p/w' },
  attributes: {
    'First Touch': 12, Passing: 12, Technique: 12, Composure: 12, Decisions: 12, 'Off The Ball': 12, Teamwork: 12, Vision: 12,
  },
};
addScoutedPlayers([objectWagePlayer]);
const objectWageRowHtml = document.getElementById('scout-table-body').innerHTML;
check('the Scouting table never renders the literal "[object Object]" for an object-shaped wage', !/\[object Object\]/.test(objectWageRowHtml));
check('the Scouting table row instead shows the extracted wage text', /£30K p\/w/.test(objectWageRowHtml));

const objectWageIdx = scoutShortlist.findIndex(p => p.name === 'Test Object Wage Target');
openScoutProfile(objectWageIdx);
check('the scouted-player modal also normalises an object-shaped wage instead of showing "[object Object]"', document.getElementById('sm-wage').textContent === '£30K p/w');

// --- formatWage/parseWageValue: the {min, max} range shape a real bulk scouting export uses
// (FM shows a wage range rather than one figure when the exact demand isn't known yet, and a
// bulk export can carry that through as {min, max} rather than collapsing to one number) ----
check('formatWage builds a "min - max" display string from a {min, max} shape', formatWage({ min: '£6K', max: '£8.27K' }) === '£6K - £8.27K p/w');
check('parseWageValue on a {min, max} shape takes the HIGH end, not the low end', parseWageValue({ min: '£6K', max: '£8.27K' }) === 8.27);

const rangeWagePlayer = {
  name: 'Test Range Wage Target',
  position: 'D (C)',
  age: 20,
  club: 'Test FC',
  nation: 'COL',
  ability: '2★',
  potential: '3.5★',
  wage: { min: '£6K', max: '£8.27K' },
  attributes: {
    'First Touch': 10, Passing: 10, Technique: 10, Composure: 10, Decisions: 10, 'Off The Ball': 10, Teamwork: 10, Vision: 10,
  },
};
addScoutedPlayers([rangeWagePlayer]);
const rangeWageRowHtml = document.getElementById('scout-table-body').innerHTML;
check('the Scouting table shows the full wage range, not a blank dash', /£6K - £8\.27K p\/w/.test(rangeWageRowHtml));

const rangeWageIdx = scoutShortlist.findIndex(p => p.name === 'Test Range Wage Target');
openScoutProfile(rangeWageIdx);
check('the scouted-player modal shows the full wage range', document.getElementById('sm-wage').textContent === '£6K - £8.27K p/w');

// --- FM's "£1"/"£1" undisclosed-wage placeholder: must read as "Undisclosed", not a real
// one-pound wage, and must not affect Recruitment Missions matching -------------------------
// FM shows a flat "£1" for a player whose wage demand hasn't actually been scouted yet - a
// bulk export carries that straight through as {min:"£1", max:"£1"} rather than omitting the
// field entirely, which used to render as the literal, misleading text "£1 p/w".
check('isUndisclosedWageFigure recognises a bare "£1"', isUndisclosedWageFigure('£1'));
check('isUndisclosedWageFigure recognises "£1" with the p/w suffix already on it', isUndisclosedWageFigure('£1 p/w'));
check('isUndisclosedWageFigure does not flag a real low wage', !isUndisclosedWageFigure('£1.5K'));
check('formatWage shows "Undisclosed" for a {min, max} shape that is FM\'s "£1"/"£1" placeholder', formatWage({ min: '£1', max: '£1' }) === 'Undisclosed');
check('formatWage shows "Undisclosed" for a bare "£1" string', formatWage('£1') === 'Undisclosed');
check('parseWageValue still returns null for the "£1" placeholder (unchanged from before)', parseWageValue({ min: '£1', max: '£1' }) === null);

const undisclosedWagePlayer = {
  name: 'Test Undisclosed Wage Target',
  position: 'D (C)',
  age: 21,
  club: 'Test FC',
  nation: 'BRA',
  ability: '2★',
  potential: '3★',
  wage: { min: '£1', max: '£1' },
  attributes: {
    'First Touch': 10, Passing: 10, Technique: 10, Composure: 10, Decisions: 10, 'Off The Ball': 10, Teamwork: 10, Vision: 10,
  },
};
addScoutedPlayers([undisclosedWagePlayer]);
const undisclosedWageRowHtml = document.getElementById('scout-table-body').innerHTML;
check('the Scouting table shows "Undisclosed" rather than the literal "£1 p/w"', /Undisclosed/.test(undisclosedWageRowHtml) && !/£1 p\/w/.test(undisclosedWageRowHtml));

const undisclosedWageIdx = scoutShortlist.findIndex(p => p.name === 'Test Undisclosed Wage Target');
openScoutProfile(undisclosedWageIdx);
check('the scouted-player modal shows "Undisclosed" rather than "£1 p/w"', document.getElementById('sm-wage').textContent === 'Undisclosed');

// A mission with a wage ceiling must still treat an Undisclosed-wage player as viable (same
// "unknown, don't rule them out" logic as before this change) rather than excluding them just
// because their wage reads as "Undisclosed" instead of a plain number.
scoutShortlist.length = 0;
const undisclosedButOtherwiseIdealCandidate = {
  name: 'Test Undisclosed Wage Playmaker',
  position: 'M (C)',
  age: 24,
  club: 'Test FC',
  nation: 'ESP',
  ability: '4★',
  potential: '4★',
  wage: { min: '£1', max: '£1' },
  attributes: {
    'First Touch': 18, Passing: 18, Technique: 18, Composure: 18, Decisions: 18, 'Off The Ball': 18, Teamwork: 18, Vision: 18,
    Crossing: 16, Dribbling: 16, Anticipation: 16, Flair: 16, Acceleration: 16, Agility: 16,
  },
};
addScoutedPlayers([undisclosedButOtherwiseIdealCandidate]);
const undisclosedWageCeilingMission = { role: 'Advanced Playmaker', maxAge: null, maxWageK: 20, priority: 'high' };
const undisclosedWageResult = evaluateMission(undisclosedWageCeilingMission);
// An unknown wage against a set ceiling can't confirm "definitely within budget", so this
// isn't promoted all the way to "Ready" (same "can't confirm either way" treatment a breached
// ceiling gets — see the existing wage-ceiling-breach test above) — but the whole point is
// that it must NOT be excluded ("Open"/no candidate) just because the wage reads as
// "Undisclosed" instead of a plain number. It should still surface as the best candidate.
check('an Undisclosed wage does not get the mission excluded outright ("Open"/critical)', undisclosedWageResult.status !== 'critical');
check('an Undisclosed-wage candidate is still surfaced as the mission\'s best match', undisclosedWageResult.best && undisclosedWageResult.best.name === 'Test Undisclosed Wage Playmaker');

// --- parseValueSortValue: a dash-separated Transfer Value range must use the HIGH end -------
// FM's own "Estimated Transfer Value" is often a range ("£120K - £1.2M") rather than one
// figure, and a bulk scouting export can carry that through as-is — parseValueSortValue used
// to just match the first number+unit in the string, which silently treated a "£120K - £1.2M"
// player as worth only £120K for both sorting and the Max Transfer Value ceiling check.
check('parseValueSortValue on a plain single value is unchanged', parseValueSortValue('£3.5M') === 3500000);
check('parseValueSortValue on a dash range takes the HIGH end, not the low end', parseValueSortValue('£120K - £1.2M') === 1200000);
check('parseValueSortValue on a dash range with both figures in K takes the higher one', parseValueSortValue('£450K - £900K') === 900000);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
