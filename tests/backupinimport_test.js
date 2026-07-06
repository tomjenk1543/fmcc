// Regression test for isFullBackupShape() — Tom saved a Full Backup, cleared his data, then
// pasted/uploaded that same backup file into "Import Save Data" (Settings tile and the
// landing modal both accept a .json file now, and it's an easy mix-up with "Load Backup
// File" under Save/Load Full Backup) and got confusing "Missing club object"/"Missing squad
// array" errors — a backup wraps club/squad one level deeper, under importedSaveData,
// alongside the scouting shortlist, position overrides, Tactic Builder tactic, crest/kit
// images and gap threshold. Both import boxes should now recognize a backup file and offer
// to restore everything from it via restoreFullBackup(), rather than erroring.
//
// Every "Import & Reload" click below now goes through runImportThenReload() (see
// FM_Command_Centre.html — added for the brief loading-spinner feature), which defers the
// actual merge/restore + location.reload() by IMPORT_SPINNER_DELAY_MS via a real setTimeout,
// rather than running them synchronously in the click handler. That's a genuine behaviour
// change the mock-DOM harness's normal synchronous style can't observe on its own — a real
// setTimeout only fires once the surrounding synchronous script finishes and control
// returns to Node's event loop, not partway through it. So every block that clicks an
// "Import & Reload" button now awaits sleep(IMPORT_SPINNER_DELAY_MS + a small buffer) before
// checking the results, inside one shared async IIFE (declining the confirm() dialog is the
// one exception — that path returns before ever reaching runImportThenReload, so it's still
// fully synchronous and needs no wait).

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
// Matches IMPORT_SPINNER_DELAY_MS in FM_Command_Centre.html (900ms) plus a buffer so a slow
// CI machine scheduling the timer a little late still passes.
const IMPORT_WAIT_MS = 900 + 150;

const BACKUP_JSON = JSON.stringify({
  _meta: { app: 'FM Command Centre', kind: 'full-backup', exportedAt: '2026-07-01T00:00:00.000Z' },
  importedSaveData: { club: { name: 'Backup FC' }, squad: [{ name: 'Backup Player' }] },
  scoutingShortlist: [{ name: 'ShortlistedPlayer' }],
  positionOverrides: { 'Some Player': 'DEF' },
  builtTactic: null,
  activeTacticSource: 'fm',
  crestDataUrl: null,
  gapThreshold: '12',
});

// --- Settings tile: Validate recognizes a backup file as ok, not an error ------------------
{
  const textarea = document.getElementById('import-json-textarea');
  const status = document.getElementById('import-status');
  textarea.value = BACKUP_JSON;
  document.getElementById('import-validate-btn').fire('click');
  check('Validate does not treat a backup file as an error', !status.className.includes('is-error'));
  check('Validate identifies it as a Full Backup file', status.innerHTML.includes('Full Backup'));
  check('Validate names the club from inside the backup', status.innerHTML.includes('Backup FC'));
}

(async () => {

// --- Settings tile: Import & Reload restores everything via restoreFullBackup() -----------
{
  const textarea = document.getElementById('import-json-textarea');
  const status = document.getElementById('import-status');
  textarea.value = BACKUP_JSON;
  global.__confirmResult = true;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  document.getElementById('import-apply-btn').fire('click');
  check('clicking Import & Reload shows the loading spinner first', status.className.includes('is-loading') && status.innerHTML.includes('import-spinner'));
  await sleep(IMPORT_WAIT_MS);

  check('Import & Reload restores the club/squad from inside the backup', localStorage.getItem('fmCommandCentre.importedSaveData') === JSON.stringify({ club: { name: 'Backup FC' }, squad: [{ name: 'Backup Player' }] }));
  check('Import & Reload also restores the scouting shortlist from the backup', localStorage.getItem('fmCommandCentre.scoutingShortlist') === JSON.stringify([{ name: 'ShortlistedPlayer' }]));
  check('Import & Reload also restores the gap threshold from the backup', localStorage.getItem('fmCommandCentre.gapThreshold') === '12');
  check('Import & Reload reloads after restoring a backup', reloaded);
}

// --- Settings tile: declining the confirm() does not restore anything ---------------------
// Unaffected by the spinner delay — the click handler returns immediately once confirm()
// comes back false, well before ever reaching runImportThenReload(), so this stays fully
// synchronous with no wait needed.
{
  localStorage.removeItem('fmCommandCentre.importedSaveData');
  const textarea = document.getElementById('import-json-textarea');
  textarea.value = BACKUP_JSON;
  global.__confirmResult = false;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  document.getElementById('import-apply-btn').fire('click');

  check('declining the confirm() does not restore the backup', localStorage.getItem('fmCommandCentre.importedSaveData') === null);
  check('declining the confirm() does not reload', !reloaded);
  global.__confirmResult = true;
}

// --- Landing modal: same behaviour, fully independent of the Settings tile ----------------
{
  const landingTextarea = document.getElementById('landing-import-textarea');
  const landingStatus = document.getElementById('landing-import-status');
  landingTextarea.value = BACKUP_JSON;
  document.getElementById('landing-import-validate-btn').fire('click');
  check('landing modal Validate recognizes a backup file as ok', !landingStatus.className.includes('is-error'));
  check('landing modal Validate identifies it as a Full Backup file', landingStatus.innerHTML.includes('Full Backup'));

  global.__confirmResult = true;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };
  document.getElementById('landing-import-apply-btn').fire('click');
  await sleep(IMPORT_WAIT_MS);

  check('landing modal Import & Reload restores the backup too', localStorage.getItem('fmCommandCentre.importedSaveData') === JSON.stringify({ club: { name: 'Backup FC' }, squad: [{ name: 'Backup Player' }] }));
  check('landing modal Import & Reload reloads after restoring', reloaded);
}

// --- A normal (non-backup) save-data import is completely unaffected ----------------------
{
  localStorage.removeItem('fmCommandCentre.importedSaveData');
  const textarea = document.getElementById('import-json-textarea');
  const status = document.getElementById('import-status');
  textarea.value = JSON.stringify({ club: { name: 'Plain FC' }, squad: [{ name: 'Plain Player' }] });
  global.__confirmResult = true;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  document.getElementById('import-apply-btn').fire('click');
  await sleep(IMPORT_WAIT_MS);

  check('a normal save-data import still works exactly as before', localStorage.getItem('fmCommandCentre.importedSaveData') === JSON.stringify({ club: { name: 'Plain FC' }, squad: [{ name: 'Plain Player' }] }));
  check('a normal save-data import still reloads', reloaded);
  check('a normal save-data import does not go through the backup confirm() gate', !status.innerHTML.includes('Full Backup'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;

})();
