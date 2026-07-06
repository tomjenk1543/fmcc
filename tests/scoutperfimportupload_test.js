// Regression test for the new Validate + Upload JSON File support added to the Scouting
// "Add to Shortlist" modal and the Performance Data "Add Snapshot" modal. Both used to be the
// only two import screens in the app with just a single combined validate-and-apply button and
// no file-upload option — every other import screen (Squad, Tactic, Club Data landing/Settings)
// already had a dedicated Validate button plus an "Upload JSON File" button wired through
// wireImportFileUpload(). This brings both up to the same pattern: paste or upload, Validate to
// check it first, then click the actual apply button (Add to Shortlist / Add Snapshot).

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- Scouting: Validate reports invalid JSON without touching the shortlist -------------------
{
  const ta = document.getElementById('scout-json-textarea');
  const status = document.getElementById('scout-import-status');
  ta.value = '{not valid json';
  document.getElementById('scout-add-validate-btn').fire('click');
  check('scout Validate reports invalid JSON as an error', status.className.includes('is-error'));
  check('scout Validate\'s error message mentions "Invalid JSON"', status.innerHTML.includes('Invalid JSON'));
}

// --- Scouting: Validate reports shape errors (e.g. missing "name") -----------------------------
{
  const ta = document.getElementById('scout-json-textarea');
  const status = document.getElementById('scout-import-status');
  ta.value = JSON.stringify([{ age: 21 }]);
  document.getElementById('scout-add-validate-btn').fire('click');
  check('scout Validate reports a missing "name" as an error', status.className.includes('is-error'));
  check('scout Validate\'s error message mentions "name"', status.innerHTML.includes('name'));
}

// --- Scouting: Validate on good data reports success and doesn't add the player itself ---------
{
  const ta = document.getElementById('scout-json-textarea');
  const status = document.getElementById('scout-import-status');
  const before = scoutShortlist.length;
  ta.value = JSON.stringify([{ name: 'Validate Only Player' }]);
  document.getElementById('scout-add-validate-btn').fire('click');
  check('scout Validate on good data reports ok', status.className.includes('is-ok'));
  check('scout Validate mentions clicking "Add to Shortlist" next', status.innerHTML.includes('Add to Shortlist'));
  check('scout Validate alone does not add the player to the shortlist', scoutShortlist.length === before);
  check('the textarea is untouched by Validate (still has the pasted JSON)', ta.value.includes('Validate Only Player'));
}

// --- Scouting: Add to Shortlist still works after validating -----------------------------------
{
  const ta = document.getElementById('scout-json-textarea');
  const status = document.getElementById('scout-import-status');
  const before = scoutShortlist.length;
  ta.value = JSON.stringify([{ name: 'Actually Added Player' }]);
  document.getElementById('scout-add-validate-btn').fire('click');
  document.getElementById('scout-add-btn').fire('click');
  check('Add to Shortlist adds the player after a successful Validate', scoutShortlist.length === before + 1);
  check('the new player is on the shortlist by name', scoutShortlist.some(p => p.name === 'Actually Added Player'));
}

// --- Scouting: Upload wiring fills the textarea, independent of the other import boxes --------
{
  const settingsTa = document.getElementById('import-json-textarea');
  const scoutTa = document.getElementById('scout-json-textarea');
  settingsTa.value = 'settings-sentinel';
  scoutTa.value = '';

  global.__fileReaderText = JSON.stringify([{ name: 'Uploaded Scout Target' }]);
  global.__fileReaderShouldError = false;
  const fileInput = document.getElementById('scout-add-file-input');
  fileInput.files = [{ name: 'scouts.json' }];
  fileInput.fire('change', { target: fileInput });

  check('uploading a file fills the scout modal\'s own textarea', scoutTa.value.includes('Uploaded Scout Target'));
  check('uploading a file does not touch the Settings tile\'s textarea', settingsTa.value === 'settings-sentinel');
}

// --- Performance: Validate reports invalid JSON -------------------------------------------------
{
  const ta = document.getElementById('performance-json-textarea');
  const status = document.getElementById('performance-import-status');
  ta.value = '{not valid json';
  document.getElementById('performance-validate-btn').fire('click');
  check('performance Validate reports invalid JSON as an error', status.className.includes('is-error'));
  check('performance Validate\'s error message mentions "Invalid JSON"', status.innerHTML.includes('Invalid JSON'));
}

// --- Performance: Validate on good data reports success without adding a snapshot --------------
{
  const ta = document.getElementById('performance-json-textarea');
  const status = document.getElementById('performance-import-status');
  const before = performanceSnapshots.length;
  ta.value = JSON.stringify({ date: '01/06/2027', players: [{ name: 'Validate Only Player' }] });
  document.getElementById('performance-validate-btn').fire('click');
  check('performance Validate on good data reports ok', status.className.includes('is-ok'));
  check('performance Validate mentions clicking "Add Snapshot" next', status.innerHTML.includes('Add Snapshot'));
  check('performance Validate alone does not add a snapshot', performanceSnapshots.length === before);
}

// --- Performance: Upload wiring fills the textarea, independent of the other import boxes ------
{
  const squadTa = document.getElementById('squad-import-textarea');
  const perfTa = document.getElementById('performance-json-textarea');
  squadTa.value = 'squad-sentinel';
  perfTa.value = '';

  global.__fileReaderText = JSON.stringify({ date: '01/07/2027', players: [{ name: 'Uploaded Snapshot Player' }] });
  global.__fileReaderShouldError = false;
  const fileInput = document.getElementById('performance-file-input');
  fileInput.files = [{ name: 'snapshot.json' }];
  fileInput.fire('change', { target: fileInput });

  check('uploading a file fills the performance modal\'s own textarea', perfTa.value.includes('Uploaded Snapshot Player'));
  check('uploading a file does not touch the Squad tile\'s textarea', squadTa.value === 'squad-sentinel');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
