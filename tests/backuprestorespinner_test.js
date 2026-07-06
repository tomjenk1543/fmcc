// Regression test for "Load Backup File" (Settings → Save/Load Full Backup) going through the
// same spinner-then-reload path as every other import/restore button. Tom reported that
// restoring a backup showed the native confirm() popup, then reloaded the page immediately
// with no loading spinner in between — unlike Squad/Tactic/Club Data imports and the
// backup-shape detection inside "Import Save Data" (see backupinimport_test.js), which already
// deferred their restoreFullBackup()/mergeAndSaveImportedData() + location.reload() by
// IMPORT_SPINNER_DELAY_MS via runImportThenReload() so the spinner gets a paint frame first.
// "Load Backup File" used to call restoreFullBackup() and location.reload() directly, right
// after confirm() closed, skipping that entirely.
//
// A real setTimeout only fires once this script's synchronous portion finishes and control
// returns to Node's event loop, so every check below that depends on the restore/reload having
// actually happened awaits sleep(IMPORT_WAIT_MS) first — same pattern as backupinimport_test.js.
//
// Also covers the follow-up: Tom still didn't notice the (now bigger/brighter) inline spinner
// even after the above fix, so runImportThenReload now also opens a dead-center full-screen
// #import-loading-overlay — checked below alongside the inline spinner.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
// Matches IMPORT_SPINNER_DELAY_MS in FM_Command_Centre.html (1300ms) plus a buffer so a slow
// CI machine scheduling the timer a little late still passes.
const IMPORT_WAIT_MS = 1300 + 150;

const BACKUP_JSON = JSON.stringify({
  _meta: { app: 'FM Command Centre', kind: 'full-backup', exportedAt: '2026-07-01T00:00:00.000Z' },
  importedSaveData: { club: { name: 'Restored FC' }, squad: [{ name: 'Restored Player' }] },
  scoutingShortlist: [{ name: 'Restored Shortlist Player' }],
  performanceSnapshots: [{ date: '01/06/2027', players: [{ name: 'Restored Player' }] }],
  gapThreshold: '9',
});

(async () => {

// --- Picking a valid backup file shows the spinner before reloading, not an instant reload ---
{
  localStorage.removeItem('fmCommandCentre.importedSaveData');
  const status = document.getElementById('backup-status');
  global.__confirmResult = true;
  global.__fileReaderText = BACKUP_JSON;
  global.__fileReaderShouldError = false;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  const fileInput = document.getElementById('backup-file-input');
  fileInput.files = [{ name: 'backup.json' }];
  fileInput.fire('change', { target: fileInput });

  check('the loading spinner shows immediately, before the reload fires', status.className.includes('is-loading') && status.innerHTML.includes('import-spinner'));
  check('the full-screen loading overlay also opens immediately', document.getElementById('import-loading-overlay').classList.contains('open'));
  check('the page has not reloaded yet on the same tick', !reloaded);

  await sleep(IMPORT_WAIT_MS);

  check('the backup is restored after the spinner delay', localStorage.getItem('fmCommandCentre.importedSaveData') === JSON.stringify({ club: { name: 'Restored FC' }, squad: [{ name: 'Restored Player' }] }));
  check('the scouting shortlist is restored too', localStorage.getItem('fmCommandCentre.scoutingShortlist') === JSON.stringify([{ name: 'Restored Shortlist Player' }]));
  check('the performance snapshots are restored too', localStorage.getItem('fmCommandCentre.performanceSnapshots') === JSON.stringify([{ date: '01/06/2027', players: [{ name: 'Restored Player' }] }]));
  check('the gap threshold is restored too', localStorage.getItem('fmCommandCentre.gapThreshold') === '9');
  check('the page reloads once the restore is done', reloaded);
}

// --- Declining the confirm() does not restore anything and needs no wait ---------------------
{
  localStorage.removeItem('fmCommandCentre.importedSaveData');
  global.__confirmResult = false;
  global.__fileReaderText = BACKUP_JSON;
  global.__fileReaderShouldError = false;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  const fileInput = document.getElementById('backup-file-input');
  fileInput.files = [{ name: 'backup.json' }];
  fileInput.fire('change', { target: fileInput });

  check('declining the confirm() does not restore the backup', localStorage.getItem('fmCommandCentre.importedSaveData') === null);
  check('declining the confirm() does not reload', !reloaded);
  global.__confirmResult = true;
}

// --- A file that isn't a recognizable backup reports an error, synchronously -----------------
{
  const status = document.getElementById('backup-status');
  global.__fileReaderText = JSON.stringify({ not: 'a backup' });
  global.__fileReaderShouldError = false;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  const fileInput = document.getElementById('backup-file-input');
  fileInput.files = [{ name: 'not-a-backup.json' }];
  fileInput.fire('change', { target: fileInput });

  check('a non-backup file reports an error', status.className.includes('is-error'));
  check('a non-backup file does not reload', !reloaded);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;

})();
