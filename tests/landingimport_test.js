// Regression test for the blank-dashboard landing state's "Import Save Data" popup
// (#landing-import-modal-backdrop) — Tom wanted a button there that pops up the import
// screen directly instead of sending him to Settings. This modal shares its
// Validate/Import & Reload/Load Example Template logic with the Settings > New Save Setup
// tile via parseImportTextareaValue()/setImportStatusFor() rather than a duplicated copy,
// so this covers: the modal opens/closes correctly, each of its three buttons behaves the
// same way the Settings tile's equivalent buttons do (just against its own elements), and
// that the two textareas/statuses stay fully independent of each other.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- Opening/closing the modal ------------------------------------------------------------
{
  const backdrop = document.getElementById('landing-import-modal-backdrop');
  document.getElementById('dashboard-empty-import-btn').fire('click');
  check('clicking "Import Save Data" opens the modal', backdrop.classList.contains('open'));

  document.getElementById('landing-import-modal-close').fire('click');
  check('the close (&times;) button closes the modal', !backdrop.classList.contains('open'));

  document.getElementById('dashboard-empty-import-btn').fire('click');
  backdrop.fire('click', { target: backdrop });
  check('clicking the backdrop itself closes the modal', !backdrop.classList.contains('open'));
}

// --- Validate: invalid JSON ----------------------------------------------------------------
{
  const ta = document.getElementById('landing-import-textarea');
  const status = document.getElementById('landing-import-status');
  ta.value = '{not valid json';
  document.getElementById('landing-import-validate-btn').fire('click');
  check('invalid JSON in the modal reports an error', status.className.includes('is-error'));
  check('invalid JSON error message mentions "Invalid JSON"', status.innerHTML.includes('Invalid JSON'));
}

// --- Validate: valid JSON but missing required fields --------------------------------------
{
  const ta = document.getElementById('landing-import-textarea');
  const status = document.getElementById('landing-import-status');
  ta.value = JSON.stringify({ club: {} });
  document.getElementById('landing-import-validate-btn').fire('click');
  check('missing squad/club.name reports issues', status.className.includes('is-error'));
  check('missing-field message mentions squad', status.innerHTML.includes('squad'));
}

// --- Validate: a fully valid payload ---------------------------------------------------
{
  const ta = document.getElementById('landing-import-textarea');
  const status = document.getElementById('landing-import-status');
  const validData = {
    club: { name: 'Test FC' },
    squad: [{ name: 'Test Player' }]
  };
  ta.value = JSON.stringify(validData);
  document.getElementById('landing-import-validate-btn').fire('click');
  check('a valid payload reports ok', status.className.includes('is-ok'));
  check('the ok message names the club', status.innerHTML.includes('Test FC'));
}

// --- Load Example Template fills the modal's OWN textarea, not the Settings tile's one -----
{
  const landingTa = document.getElementById('landing-import-textarea');
  const settingsTa = document.getElementById('import-json-textarea');
  settingsTa.value = 'untouched-sentinel';
  landingTa.value = '';
  document.getElementById('landing-import-load-example-btn').fire('click');
  check('Load Example Template fills the modal\'s own textarea', landingTa.value.includes('Your Club Name'));
  check('Load Example Template does NOT touch the Settings tile\'s textarea', settingsTa.value === 'untouched-sentinel');
}

// --- Import & Reload: same validation gate as Settings, doesn't throw before it fails -------
{
  const ta = document.getElementById('landing-import-textarea');
  const status = document.getElementById('landing-import-status');
  ta.value = '{}'; // no club, no squad
  let threw = false;
  try {
    document.getElementById('landing-import-apply-btn').fire('click');
  } catch (e) { threw = true; console.error(e); }
  check('Import & Reload does not throw on an invalid payload', !threw);
  check('Import & Reload blocks an invalid payload with an error message', status.className.includes('is-error'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
