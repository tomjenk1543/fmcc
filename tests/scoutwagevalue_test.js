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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
