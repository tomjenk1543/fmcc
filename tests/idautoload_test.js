// Regression test for Task #129 — club.fmClubId/fmCompetitionId auto-load.
// An imported save can now optionally carry its own FM unique IDs (captured from the Club
// Site / Competition Overview screens with "Show Unique IDs" on — see Section 6 of the
// guide). Covers: validateClubImportData's light type-check on these fields,
// applyFullSaveData prefilling the Settings ID inputs from them, and activateDirHandle
// picking up whatever's in those inputs to auto-load the crest/kits/league logo the moment
// a folder becomes usable — without requiring the two events (import, folder connect) to
// happen in any particular order.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- validateClubImportData: fmClubId/fmCompetitionId type-checking ---------------------
{
  const validString = { club: { name: 'Test FC', fmClubId: '57050239', fmCompetitionId: '7540024' }, squad: [{ name: 'P1' }] };
  check('valid string IDs produce no errors', validateClubImportData(validString).length === 0);

  const validNumber = { club: { name: 'Test FC', fmClubId: 57050239, fmCompetitionId: 7540024 }, squad: [{ name: 'P1' }] };
  check('valid number IDs produce no errors', validateClubImportData(validNumber).length === 0);

  const missing = { club: { name: 'Test FC' }, squad: [{ name: 'P1' }] };
  check('omitting both ID fields produces no errors (optional)', validateClubImportData(missing).length === 0);

  const badClubId = { club: { name: 'Test FC', fmClubId: { oops: true } }, squad: [{ name: 'P1' }] };
  const badErrors = validateClubImportData(badClubId);
  check('an object fmClubId is flagged', badErrors.some(e => e.includes('fmClubId')));

  const badCompId = { club: { name: 'Test FC', fmCompetitionId: [1, 2, 3] }, squad: [{ name: 'P1' }] };
  const badErrors2 = validateClubImportData(badCompId);
  check('an array fmCompetitionId is flagged', badErrors2.some(e => e.includes('fmCompetitionId')));
}

// --- applyFullSaveData: prefills the Settings ID inputs -----------------------------------
{
  document.getElementById('crest-club-id').value = '';
  document.getElementById('league-logo-id').value = '';
  applyFullSaveData({
    club: { name: 'Test FC', fmClubId: '111222', fmCompetitionId: '333444' },
    squad: [],
  });
  check('applyFullSaveData prefills crest-club-id from club.fmClubId', document.getElementById('crest-club-id').value === '111222');
  check('applyFullSaveData prefills league-logo-id from club.fmCompetitionId', document.getElementById('league-logo-id').value === '333444');
}

// --- applyFullSaveData: leaves inputs alone when the import has no IDs -------------------
{
  document.getElementById('crest-club-id').value = 'existing-value';
  document.getElementById('league-logo-id').value = 'existing-league-value';
  applyFullSaveData({ club: { name: 'No ID Club' }, squad: [] });
  check('applyFullSaveData does not clear crest-club-id when import has no fmClubId', document.getElementById('crest-club-id').value === 'existing-value');
  check('applyFullSaveData does not clear league-logo-id when import has no fmCompetitionId', document.getElementById('league-logo-id').value === 'existing-league-value');
}

// --- activateDirHandle: auto-loads using whatever's already in the ID inputs --------------
{
  (async () => {
    document.getElementById('crest-club-id').value = '';
    document.getElementById('league-logo-id').value = '';
    document.getElementById('crest-status').textContent = '';
    document.getElementById('league-logo-status').textContent = '';

    // Prefill the inputs the way applyFullSaveData would on boot, BEFORE any folder is
    // connected — this is the exact race the split between applyFullSaveData (prefill only)
    // and activateDirHandle (actual load) exists to handle.
    applyFullSaveData({
      club: { name: 'Race Condition FC', fmClubId: '778899', fmCompetitionId: '990011' },
      squad: [],
    });

    // A minimal fake directory with no config.xml and no matching files anywhere — the point
    // isn't that a crest/logo is actually found, just that activateDirHandle() actually
    // ATTEMPTS the lookup (proving the auto-trigger fired) rather than leaving the status
    // text untouched (which would mean nothing happened at all).
    const emptyDir = { kind: 'directory', entries: async function*() {} };
    await activateDirHandle(emptyDir, { rescan: true });

    check('activateDirHandle auto-attempts a crest lookup using the prefilled club ID', document.getElementById('crest-status').textContent.includes('778899'));
    check('activateDirHandle auto-attempts a league logo lookup using the prefilled competition ID', document.getElementById('league-logo-status').textContent.includes('990011'));

    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail > 0) process.exitCode = 1;
  })().catch(err => { console.error('async section threw:', err); fail++; console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = 1; });
}
