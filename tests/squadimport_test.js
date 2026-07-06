// Regression test for the Squad List page's own "Import Squad Data" popup
// (#squad-import-modal-backdrop) — splitting the old combined "Import Save Data" blob into
// three scoped imports (club/squad/tactic) so updating just the squad partway through a save
// doesn't require re-pasting club or tactic data too. Covers: the modal opens/closes, its
// Validate/Import & Reload/Load Example Template/Upload buttons behave the same way the other
// two import boxes' do (via the same shared parseImportTextareaValue()/setImportStatusFor()/
// wireImportFileUpload() plumbing), and — the one behaviour unique to a SCOPED import —
// applying it merges onto whatever club/tactic data is already stored instead of replacing
// the whole blob.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// "Import & Reload" now goes through runImportThenReload() (FM_Command_Centre.html — added
// for the brief loading-spinner feature), which defers the actual merge + location.reload()
// by IMPORT_SPINNER_DELAY_MS via a real setTimeout rather than running them synchronously in
// the click handler. A real setTimeout only fires once this script's synchronous portion
// finishes and control returns to Node's event loop — so the one check below that depends on
// the merge/reload having actually happened needs to await past that delay first.
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
const IMPORT_WAIT_MS = 2000 + 150;

// --- Opening/closing the modal, from both entry points -------------------------------------
{
  const backdrop = document.getElementById('squad-import-modal-backdrop');
  document.getElementById('squad-import-toggle-btn').fire('click');
  check('the panel-title-row button opens the modal', backdrop.classList.contains('open'));
  document.getElementById('squad-import-modal-close').fire('click');
  check('the close (&times;) button closes the modal', !backdrop.classList.contains('open'));

  document.getElementById('squad-import-toggle-btn-empty').fire('click');
  check('the empty-state button also opens the modal', backdrop.classList.contains('open'));
  backdrop.fire('click', { target: backdrop });
  check('clicking the backdrop itself closes the modal', !backdrop.classList.contains('open'));
}

// --- Validate: invalid JSON ------------------------------------------------------------------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = '{not valid json';
  document.getElementById('squad-import-validate-btn').fire('click');
  check('invalid JSON reports an error', status.className.includes('is-error'));
  check('invalid JSON error message mentions "Invalid JSON"', status.innerHTML.includes('Invalid JSON'));
}

// --- Validate: missing "squad" key -----------------------------------------------------------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({});
  document.getElementById('squad-import-validate-btn').fire('click');
  check('a missing "squad" key reports an error', status.className.includes('is-error'));
  check('the error message mentions "squad"', status.innerHTML.includes('squad'));
}

// --- Validate: a player missing "name" --------------------------------------------------------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({ squad: [{ position: 'GK' }] });
  document.getElementById('squad-import-validate-btn').fire('click');
  check('a player missing "name" reports an error', status.className.includes('is-error'));
  check('the error message mentions the missing name', status.innerHTML.includes('is missing "name"'));
}

// --- Validate: wrong-length attribute array ---------------------------------------------------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({ squad: [{ name: 'Bad Attrs', attributes: { technical: [1, 2, 3] } }] });
  document.getElementById('squad-import-validate-btn').fire('click');
  check('a wrong-length technical array reports an error', status.className.includes('is-error'));
  check('the error message names the expected length', status.innerHTML.includes('should have 14 values'));
}

// --- Validate: a club-shaped paste is hinted at, not silently accepted as squad data ----------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({ club: { name: 'Oops FC' } });
  document.getElementById('squad-import-validate-btn').fire('click');
  check('a club-only paste (no squad) still reports an error here', status.className.includes('is-error'));
  check('the message hints this belongs in the club import instead', status.innerHTML.includes('club'));
}

// --- Validate: a valid payload reports ok ------------------------------------------------------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({ squad: [{ name: 'Test Player' }, { name: 'Second Player' }] });
  document.getElementById('squad-import-validate-btn').fire('click');
  check('a valid squad payload reports ok', status.className.includes('is-ok'));
  check('the ok message names the player count', status.innerHTML.includes('2 player'));
}

// --- Load Example Template fills this modal's own textarea -------------------------------------
{
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = '';
  document.getElementById('squad-import-load-example-btn').fire('click');
  check('Load Example Template fills the textarea', ta.value.includes('Example Goalkeeper'));
  check('the loaded example is valid squad JSON', (() => {
    try { return Array.isArray(JSON.parse(ta.value).squad); } catch (e) { return false; }
  })());
}

(async () => {

// --- Import & Reload: merges onto existing club/tactic data instead of replacing it -----------
{
  localStorage.setItem('fmCommandCentre.importedSaveData', JSON.stringify({
    club: { name: 'Existing Club' },
    tacticIP: [{ position: 'GK', ipRole: 'Sweeper Keeper', pitchPos: { x: 50, y: 90 } }],
    squad: [{ name: 'Old Player' }]
  }));

  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({ squad: [{ name: 'New Player One' }, { name: 'New Player Two' }] });

  let reloaded = false;
  global.location.reload = () => { reloaded = true; };
  document.getElementById('squad-import-apply-btn').fire('click');
  check('clicking Import & Reload shows the loading spinner first', status.className.includes('is-loading'));
  await sleep(IMPORT_WAIT_MS);

  const stored = JSON.parse(localStorage.getItem('fmCommandCentre.importedSaveData'));
  check('Import & Reload replaces the "squad" key with the new data', stored.squad.length === 2 && stored.squad[0].name === 'New Player One');
  check('Import & Reload leaves "club" from the earlier import untouched', stored.club && stored.club.name === 'Existing Club');
  check('Import & Reload leaves "tacticIP" from the earlier import untouched', Array.isArray(stored.tacticIP) && stored.tacticIP.length === 1);
  check('Import & Reload reloads the page', reloaded);
}

// --- Import & Reload: an invalid payload is blocked, not silently merged ----------------------
// Unaffected by the spinner delay — a validation failure returns before ever reaching
// runImportThenReload(), so this stays fully synchronous with no wait needed.
{
  localStorage.setItem('fmCommandCentre.importedSaveData', JSON.stringify({ club: { name: 'Guard Club' }, squad: [{ name: 'Guard Player' }] }));
  const ta = document.getElementById('squad-import-textarea');
  const status = document.getElementById('squad-import-status');
  ta.value = JSON.stringify({ squad: [] });

  let reloaded = false;
  global.location.reload = () => { reloaded = true; };
  document.getElementById('squad-import-apply-btn').fire('click');

  check('an empty squad array is blocked from importing', !reloaded);
  check('the blocked import reports an error', status.className.includes('is-error'));
  const stored = JSON.parse(localStorage.getItem('fmCommandCentre.importedSaveData'));
  check('the previously-stored squad is untouched after a blocked import', stored.squad.length === 1 && stored.squad[0].name === 'Guard Player');
}

// --- Upload wiring is independent of the other two import boxes -------------------------------
{
  const settingsTa = document.getElementById('import-json-textarea');
  const landingTa = document.getElementById('landing-import-textarea');
  const squadTa = document.getElementById('squad-import-textarea');
  settingsTa.value = 'settings-sentinel';
  landingTa.value = 'landing-sentinel';
  squadTa.value = '';

  global.__fileReaderText = JSON.stringify({ squad: [{ name: 'Uploaded Player' }] });
  global.__fileReaderShouldError = false;
  const fileInput = document.getElementById('squad-import-file-input');
  fileInput.files = [{ name: 'squad.json' }];
  fileInput.fire('change', { target: fileInput });

  check('uploading a file fills the squad modal\'s own textarea', squadTa.value.includes('Uploaded Player'));
  check('uploading a file does not touch the Settings tile\'s textarea', settingsTa.value === 'settings-sentinel');
  check('uploading a file does not touch the landing modal\'s textarea', landingTa.value === 'landing-sentinel');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;

})();
