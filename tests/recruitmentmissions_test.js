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

// --- Equal-height guard: all three Scouting page panels (the Scouted Players table, the
// triage tiles row, and Recruitment Missions) must share the same flex-grow and min-height
// floor -------------------------------------------------------------------------------------
// mockdom doesn't run a real layout engine, so this can't check actual rendered pixel
// heights (see getScoutTilesRowBudget()'s own comments on that limitation) — instead this
// reads the app's own CSS source and checks all three rules declare matching flex/min-height,
// which is what actually makes the browser split the view-scroll-area's height three ways
// evenly. Guards against any one of them drifting apart again (e.g. going back to a fixed
// height while the others stay flex:1), which is what caused Missions to look oversized
// relative to the triage tiles right after Missions was first made the sole elastic element,
// and separately what left the table panel out of the equal-height split entirely.
const fs = require('fs');
const appHtml = fs.readFileSync(process.env.FMCC_APP_HTML, 'utf8');
const styleBlock = appHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
function ruleBodyFor(selector) {
  const re = new RegExp(selector.replace(/[.#]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const m = styleBlock.match(re);
  return m ? m[1] : '';
}
const tablePanelRule = ruleBodyFor('.scout-table-panel');
const tilesRowRule = ruleBodyFor('.scout-tiles-row');
const missionsPanelRule = ruleBodyFor('.recruitment-missions-panel');
check('.scout-table-panel is flex:1', /flex:\s*1\s*;/.test(tablePanelRule));
check('.scout-tiles-row is flex:1', /flex:\s*1\s*;/.test(tilesRowRule));
check('.recruitment-missions-panel is flex:1', /flex:\s*1\s*;/.test(missionsPanelRule));
const tableMinHeight = (tablePanelRule.match(/min-height:\s*([\d.]+)px/) || [])[1];
const tilesMinHeight = (tilesRowRule.match(/min-height:\s*([\d.]+)px/) || [])[1];
const missionsMinHeight = (missionsPanelRule.match(/min-height:\s*([\d.]+)px/) || [])[1];
check('.scout-table-panel, .scout-tiles-row and .recruitment-missions-panel all share the same min-height floor',
  !!tableMinHeight && tableMinHeight === tilesMinHeight && tilesMinHeight === missionsMinHeight);
check('.recruitment-missions-panel keeps a margin-top for spacing below the tiles row', /margin-top:\s*\d+px/.test(missionsPanelRule));

// --- Clicking a mission opens every fitting candidate, not just the single best one --------
// evaluateMission()/the mission row itself only ever surface the single best match — clicking
// the row should open the shared gaps-modal listing every shortlisted player who's at least a
// "Suited" fit for the role (the same 10-point roleFitScore bar evaluateMission itself uses),
// ranked strongest first, each one clickable through to their own profile.
scoutShortlist.length = 0;
recruitmentMissions.length = 0;

// Advanced Playmaker's key attrs (First Touch, Passing, Technique, Composure, Decisions, Off
// The Ball, Teamwork, Vision) and preferred attrs (Crossing, Dribbling, Anticipation, Flair,
// Acceleration, Agility) both need real values — roleFitScore averages preferred attrs same as
// key ones, so leaving preferred attrs out of a fixture entirely scores them as 0 and drags
// the weighted score down further than "key attrs alone" would suggest. Key 18 + preferred 16
// gives a weighted score of (18*2+16)/3 ≈ 17.3 — comfortably "Very Suited" (>=15). Key 13 +
// preferred 8 gives (13*2+8)/3 ≈ 11.3 — solidly "Suited" (10-14), clearly weaker than the
// first candidate but still a real fit for the role. A goalkeeper with none of these
// attributes filled in stays well under the 10-point bar and must NOT appear in the
// candidates list at all.
const strongCandidate = {
  name: 'Test Strong Candidate', position: 'M (C)', age: 23, club: 'Test FC', nation: 'ESP',
  ability: '4★', potential: '4★', wage: '£12K p/w', value: '£5M',
  attributes: {
    'First Touch': 18, Passing: 18, Technique: 18, Composure: 18, Decisions: 18, 'Off The Ball': 18, Teamwork: 18, Vision: 18,
    Crossing: 16, Dribbling: 16, Anticipation: 16, Flair: 16, Acceleration: 16, Agility: 16,
  },
};
const suitedCandidate = {
  name: 'Test Suited Candidate', position: 'M (C)', age: 29, club: 'Test FC', nation: 'ARG',
  ability: '3★', potential: '3★', wage: '£40K p/w', value: '£50M',
  attributes: {
    'First Touch': 13, Passing: 13, Technique: 13, Composure: 13, Decisions: 13, 'Off The Ball': 13, Teamwork: 13, Vision: 13,
    Crossing: 8, Dribbling: 8, Anticipation: 8, Flair: 8, Acceleration: 8, Agility: 8,
  },
};
const unrelatedGoalkeeper = {
  name: 'Test Unrelated Goalkeeper', position: 'GK', age: 24, club: 'Test FC', nation: 'ENG',
  ability: '3★', potential: '3★',
  attributes: { Reflexes: 4, Handling: 4, 'One on Ones': 4, Communication: 4, Kicking: 4 },
};
addScoutedPlayers([strongCandidate, suitedCandidate, unrelatedGoalkeeper]);

const clickableMission = { role: 'Advanced Playmaker', maxAge: 25, maxWageK: 20, maxValueM: 10, priority: 'high' };
recruitmentMissions.push(clickableMission);
renderRecruitmentMissions();

const missionRowEl = document.querySelector('.mission-row[data-mission-index="0"]');
check('the mission row exists and is separately clickable from the delete button', !!missionRowEl);
missionRowEl.fire('click');

check('clicking a mission row opens the shared gaps-modal', document.getElementById('gaps-modal-backdrop').className.includes('open'));
check('the modal title names the mission\'s role', document.getElementById('gaps-modal-title').textContent.includes('Advanced Playmaker'));
check('the modal title includes the mission\'s ceiling text', /Age 25-.*£20K-.*£10M-/.test(document.getElementById('gaps-modal-title').textContent));

const candidatesModalHtml = document.getElementById('gaps-modal-body').innerHTML;
check('the candidates list includes the Very Suited candidate', /Test Strong Candidate/.test(candidatesModalHtml));
check('the candidates list includes the merely-Suited candidate too', /Test Suited Candidate/.test(candidatesModalHtml));
check('the candidates list excludes a shortlisted player who is not a fit for the role at all', !/Test Unrelated Goalkeeper/.test(candidatesModalHtml));
check('the Very Suited candidate is ranked ahead of the merely-Suited one',
  candidatesModalHtml.indexOf('Test Strong Candidate') < candidatesModalHtml.indexOf('Test Suited Candidate'));
check('the merely-Suited candidate has their age flagged as breaching the mission\'s ceiling (29 > 25)',
  /scout-tactic-fit-highlight weak">Age 29/.test(candidatesModalHtml));
check('the merely-Suited candidate has their wage flagged as breaching the mission\'s ceiling (£40K > £20K)',
  /scout-tactic-fit-highlight weak">£40K p\/w/.test(candidatesModalHtml));
check('the Very Suited candidate\'s age is NOT flagged (23 is within the 25 ceiling)',
  !/scout-tactic-fit-highlight weak">Age 23/.test(candidatesModalHtml));

// Clicking a candidate row inside the modal opens that player's own profile.
const candidateRowEl = document.querySelector('#gaps-modal-body .mission-candidate-row');
check('a candidate row exists inside the modal', !!candidateRowEl);
candidateRowEl.fire('click');
check('clicking a candidate opens the scouted-player profile modal', document.getElementById('scout-modal-backdrop').className.includes('open'));
check('the opened profile is for the top-ranked candidate (Very Suited, shown first)', document.getElementById('sm-name').textContent === 'Test Strong Candidate');

// --- Empty state: a mission with no real candidate at all -----------------------------------
scoutShortlist.length = 0;
addScoutedPlayers([unrelatedGoalkeeper]);
const noFitHtml = buildMissionCandidatesHtml({ role: 'Advanced Playmaker', maxAge: null, maxWageK: null, maxValueM: null, priority: 'low' });
check('buildMissionCandidatesHtml explains when nobody shortlisted is even Suited for the role', /No shortlisted player is currently a Suited/.test(noFitHtml));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
