// Regression test for Recruitment Missions (Scouting page) — structured scouting targets
// (role + optional age/wage ceiling + priority), each showing a live green/amber/red status
// against the current shortlist via evaluateMission()/renderRecruitmentMissions(). Idea from
// the "Mastering FM26" ebook review: Recruitment Focus missions that run all season, rather
// than browsing the shortlist with no explicit target in mind.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- parseWageValue -----------------------------------------------------------------------
check('parseWageValue reads a plain "£NNK p/w" wage', parseWageValue('£15K p/w') === 15);
check('parseWageValue reads a decimal wage', parseWageValue('£15.25K p/w') === 15.25);
check('parseWageValue returns null for missing/unrecognised wage', parseWageValue(undefined) === null && parseWageValue('') === null && parseWageValue('Free') === null);

// --- evaluateMission: no shortlist at all --------------------------------------------------
scoutShortlist.length = 0;
recruitmentMissions.length = 0;

const noCandidateMission = { role: 'Advanced Playmaker', maxAge: null, maxWageK: null, priority: 'high' };
const noCandidateResult = evaluateMission(noCandidateMission);
check('evaluateMission is critical/"No Candidate" when the shortlist is empty', noCandidateResult.status === 'critical' && noCandidateResult.label === 'No Candidate' && noCandidateResult.best === null);

// --- evaluateMission: a strong, in-ceiling candidate should read "Ready" -------------------
// Advanced Playmaker's key attrs (First Touch, Passing, Technique, Composure, Decisions, Off
// The Ball, Teamwork, Vision) all maxed at 18, preferred also high — guarantees a
// "Very Suited" (15+) roleFitScore regardless of the exact weighting.
const readyCandidate = {
  name: 'Test Ready Playmaker',
  position: 'M (C)',
  age: 24,
  club: 'Test FC',
  nation: 'ESP',
  ability: '4★',
  potential: '4★',
  wage: '£10K p/w',
  attributes: {
    'First Touch': 18, Passing: 18, Technique: 18, Composure: 18, Decisions: 18, 'Off The Ball': 18, Teamwork: 18, Vision: 18,
    Crossing: 16, Dribbling: 16, Anticipation: 16, Flair: 16, Acceleration: 16, Agility: 16,
  },
};
addScoutedPlayers([readyCandidate]);

const readyMission = { role: 'Advanced Playmaker', maxAge: 28, maxWageK: 20, priority: 'high' };
const readyResult = evaluateMission(readyMission);
check('evaluateMission is "stocked"/"Ready" for a Very Suited candidate within age/wage ceiling', readyResult.status === 'stocked' && readyResult.label === 'Ready');
check('evaluateMission returns the matching candidate as best', readyResult.best && readyResult.best.name === 'Test Ready Playmaker');

// --- evaluateMission: the same strong candidate but an unreachable wage ceiling -> compromise
const tightWageMission = { role: 'Advanced Playmaker', maxAge: 28, maxWageK: 5, priority: 'medium' };
const tightWageResult = evaluateMission(tightWageMission);
check('evaluateMission is not "stocked" once the candidate breaches the wage ceiling', tightWageResult.status !== 'stocked');
check('evaluateMission still surfaces the closest candidate even when compromised on wage', tightWageResult.best && tightWageResult.best.name === 'Test Ready Playmaker');

// --- evaluateMission: nobody remotely suited for a completely different role --------------
scoutShortlist.length = 0;
const weakCandidate = {
  name: 'Test Weak Keeper Candidate',
  position: 'GK',
  age: 30,
  club: 'Test FC',
  nation: 'ENG',
  ability: '2★',
  potential: '2★',
  wage: '£3K p/w',
  attributes: { Reflexes: 4, Handling: 4, 'One on Ones': 4, Communication: 4, Kicking: 4 },
};
addScoutedPlayers([weakCandidate]);
const mismatchMission = { role: 'Advanced Playmaker', maxAge: null, maxWageK: null, priority: 'low' };
const mismatchResult = evaluateMission(mismatchMission);
check('evaluateMission is critical/"Open" when the only shortlisted player is a poor fit for the role', mismatchResult.status === 'critical' && mismatchResult.label === 'Open');

// --- renderRecruitmentMissions: empty state ------------------------------------------------
recruitmentMissions.length = 0;
renderRecruitmentMissions();
const emptyListHtml = document.getElementById('recruitment-missions-list').innerHTML;
check('the missions list shows an empty-state message with no missions set', /No missions yet/.test(emptyListHtml));

// --- renderRecruitmentMissions: one real mission renders its role, priority, and status ----
scoutShortlist.length = 0;
addScoutedPlayers([readyCandidate]);
recruitmentMissions.push({ role: 'Advanced Playmaker', maxAge: 28, maxWageK: 20, priority: 'high' });
renderRecruitmentMissions();
const oneRowHtml = document.getElementById('recruitment-missions-list').innerHTML;
check('the mission row shows the role name', /Advanced Playmaker/.test(oneRowHtml));
check('the mission row shows the high-priority pill', /mission-priority-high/.test(oneRowHtml) && />high</.test(oneRowHtml));
check('the mission row shows the "Ready" status badge for a Very Suited in-ceiling candidate', /depth-badge stocked">Ready</.test(oneRowHtml));
check('the mission row names the best candidate', /Test Ready Playmaker/.test(oneRowHtml));
check('the mission row has a delete control', /data-mission-delete="0"/.test(oneRowHtml));

// --- Delete control removes the mission ----------------------------------------------------
const deleteBtn = document.querySelector('[data-mission-delete="0"]');
check('the delete button exists in the mock DOM', !!deleteBtn);
if (deleteBtn) deleteBtn.fire('click');
check('deleting the mission empties recruitmentMissions', recruitmentMissions.length === 0);
check('the list re-renders to the empty state after deleting the only mission', /No missions yet/.test(document.getElementById('recruitment-missions-list').innerHTML));

// --- Add-mission form wiring: picking values and clicking "+ Add Mission" adds a mission ---
recruitmentMissions.length = 0;
document.getElementById('mission-role-select').value = 'Deep-Lying Playmaker';
document.getElementById('mission-age-input').value = '26';
document.getElementById('mission-wage-input').value = '18';
document.getElementById('mission-priority-select').value = 'medium';
document.getElementById('mission-add-btn').fire('click');
check('clicking "+ Add Mission" adds one mission', recruitmentMissions.length === 1);
const addedMission = recruitmentMissions[0] || {};
check('the new mission captured the selected role', addedMission.role === 'Deep-Lying Playmaker');
check('the new mission captured the age ceiling as a number', addedMission.maxAge === 26);
check('the new mission captured the wage ceiling as a number', addedMission.maxWageK === 18);
check('the new mission captured the selected priority', addedMission.priority === 'medium');
check('the age input is cleared after adding', document.getElementById('mission-age-input').value === '');

// --- Persistence: missions survive a reload of loadRecruitmentMissions() from localStorage --
const reloaded = loadRecruitmentMissions();
check('recruitmentMissions persists to localStorage and reloads correctly', Array.isArray(reloaded) && reloaded.length === 1 && reloaded[0] && reloaded[0].role === 'Deep-Lying Playmaker');

// Role select is populated from ROLE_CATEGORIES_IP (real named roles with optgroups), not the
// generic OOP sub-roles.
const roleSelectHtml = document.getElementById('mission-role-select').innerHTML;
check('the mission role select offers real IP roles (e.g. Advanced Playmaker)', /Advanced Playmaker/.test(roleSelectHtml));
check('the mission role select is grouped into optgroups', /<optgroup/.test(roleSelectHtml));
check('the mission role select does NOT offer generic OOP-only stub roles', !/Pressing Central Midfielder/.test(roleSelectHtml));

// --- Layout regression guard -----------------------------------------------------------
// The panel was originally given the .scout-tile class (flex: 1 1 280px), the same sizing
// the three triage tiles inside .scout-tiles-row use to share THAT row's own flex:1 budget
// (see getScoutTilesRowBudget()). Giving this panel — a separate sibling of .scout-tiles-row
// in the page's flex column, not a child of it — that same competing flex sizing corrupted
// the tiles' own budget math and made them visually overlap this panel. Guards against that
// class creeping back in, and confirms the dedicated non-competing class is present instead.
const missionsPanelEl = document.getElementById('recruitment-missions-panel');
check('the Recruitment Missions panel does NOT carry .scout-tile (which caused the overlap bug)', !missionsPanelEl.className.split(/\s+/).includes('scout-tile'));
check('the Recruitment Missions panel carries its own non-competing layout class', missionsPanelEl.className.split(/\s+/).includes('recruitment-missions-panel'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
