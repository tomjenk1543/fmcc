// Regression test for the Tactical Analysis page's own "Import Tactic Data" popup
// (#tactics-import-modal-backdrop) — the third and last piece of splitting the old combined
// "Import Save Data" blob into three scoped imports (club/squad/tactic). Entirely optional for
// the app as a whole (the Tactic Builder can construct a tactic from the squad instead), so
// this covers: the modal opens/closes, tacticIP is required and shape-checked when the box IS
// used, and applying it merges onto existing club/squad data rather than replacing it.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- Opening/closing the modal ----------------------------------------------------------------
{
  const backdrop = document.getElementById('tactics-import-modal-backdrop');
  document.getElementById('tactics-import-toggle-btn').fire('click');
  check('the toggle button opens the modal', backdrop.classList.contains('open'));
  document.getElementById('tactics-import-modal-close').fire('click');
  check('the close (&times;) button closes the modal', !backdrop.classList.contains('open'));

  document.getElementById('tactics-import-toggle-btn').fire('click');
  backdrop.fire('click', { target: backdrop });
  check('clicking the backdrop itself closes the modal', !backdrop.classList.contains('open'));
}

// --- Validate: invalid JSON ---------------------------------------------------------------------
{
  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = '{not valid json';
  document.getElementById('tactics-import-validate-btn').fire('click');
  check('invalid JSON reports an error', status.className.includes('is-error'));
}

// --- Validate: missing tacticIP entirely ---------------------------------------------------------
{
  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = JSON.stringify({});
  document.getElementById('tactics-import-validate-btn').fire('click');
  check('a missing "tacticIP" key reports an error', status.className.includes('is-error'));
  check('the error message mentions "tacticIP"', status.innerHTML.includes('tacticIP'));
}

// --- Validate: an empty tacticIP array ------------------------------------------------------------
{
  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = JSON.stringify({ tacticIP: [] });
  document.getElementById('tactics-import-validate-btn').fire('click');
  check('an empty "tacticIP" array reports an error', status.className.includes('is-error'));
  check('the error message says it is empty', status.innerHTML.includes('empty'));
}

// --- Validate: a tacticIP entry missing required fields -------------------------------------------
{
  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = JSON.stringify({ tacticIP: [{ position: 'GK' }] });
  document.getElementById('tactics-import-validate-btn').fire('click');
  check('an entry missing ipRole/pitchPos reports errors', status.className.includes('is-error'));
  check('the error message mentions ipRole', status.innerHTML.includes('ipRole'));
  check('the error message mentions pitchPos', status.innerHTML.includes('pitchPos'));
}

// --- Validate: a valid minimal payload reports ok ---------------------------------------------------
{
  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = JSON.stringify({
    tacticIP: [
      { position: 'GK', ipRole: 'Sweeper Keeper', pitchPos: { x: 50, y: 90 } },
      { position: 'D (C)', ipRole: 'Ball-Playing Centre-Back', pitchPos: { x: 50, y: 74 } }
    ]
  });
  document.getElementById('tactics-import-validate-btn').fire('click');
  check('a valid tacticIP-only payload reports ok', status.className.includes('is-ok'));
  check('the ok message names the position count', status.innerHTML.includes('2 position'));
}

// --- Load Example Template fills this modal's own textarea -----------------------------------------
{
  const ta = document.getElementById('tactics-import-textarea');
  ta.value = '';
  document.getElementById('tactics-import-load-example-btn').fire('click');
  check('Load Example Template fills the textarea', ta.value.includes('Ball-Playing Goalkeeper'));
  check('the loaded example has a tacticOOP array too', (() => {
    try { return Array.isArray(JSON.parse(ta.value).tacticOOP); } catch (e) { return false; }
  })());
}

// --- Import & Reload: merges onto existing club/squad data instead of replacing it -----------------
{
  localStorage.setItem('fmCommandCentre.importedSaveData', JSON.stringify({
    club: { name: 'Existing Club' },
    squad: [{ name: 'Existing Player' }],
    tacticIP: [{ position: 'GK', ipRole: 'Old Role', pitchPos: { x: 50, y: 90 } }]
  }));

  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = JSON.stringify({
    tacticIP: [{ position: 'GK', ipRole: 'New Role', pitchPos: { x: 50, y: 90 } }],
    fmTacticSummary: { formation: '4-4-2', mentality: 'Balanced', style: 'Direct' }
  });

  let reloaded = false;
  global.location.reload = () => { reloaded = true; };
  document.getElementById('tactics-import-apply-btn').fire('click');

  const stored = JSON.parse(localStorage.getItem('fmCommandCentre.importedSaveData'));
  check('Import & Reload replaces "tacticIP" with the new data', stored.tacticIP[0].ipRole === 'New Role');
  check('Import & Reload stores the new fmTacticSummary', stored.fmTacticSummary && stored.fmTacticSummary.formation === '4-4-2');
  check('Import & Reload leaves "club" untouched', stored.club && stored.club.name === 'Existing Club');
  check('Import & Reload leaves "squad" untouched', stored.squad.length === 1 && stored.squad[0].name === 'Existing Player');
  check('Import & Reload reloads the page', reloaded);
  check('Import & Reload does not report an error', !status.className.includes('is-error'));
}

// --- Import & Reload: an invalid payload is blocked, not silently merged ---------------------------
{
  localStorage.setItem('fmCommandCentre.importedSaveData', JSON.stringify({ club: { name: 'Guard Club' }, squad: [{ name: 'Guard Player' }] }));
  const ta = document.getElementById('tactics-import-textarea');
  const status = document.getElementById('tactics-import-status');
  ta.value = JSON.stringify({ tacticIP: [{ position: 'GK' }] }); // missing ipRole/pitchPos

  let reloaded = false;
  global.location.reload = () => { reloaded = true; };
  document.getElementById('tactics-import-apply-btn').fire('click');

  check('an invalid tacticIP entry is blocked from importing', !reloaded);
  check('the blocked import reports an error', status.className.includes('is-error'));
  const stored = JSON.parse(localStorage.getItem('fmCommandCentre.importedSaveData'));
  check('no tacticIP was written from the blocked import', stored.tacticIP === undefined);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
