// Regression test for isFullBackupShape() — Tom saved a Full Backup, cleared his data, then
// pasted/uploaded that same backup file into "Import Save Data" (Settings tile and the
// landing modal both accept a .json file now, and it's an easy mix-up with "Load Backup
// File" under Save/Load Full Backup) and got confusing "Missing club object"/"Missing squad
// array" errors — a backup wraps club/squad one level deeper, under importedSaveData,
// alongside the scouting shortlist, position overrides, Tactic Builder tactic, crest/kit
// images and gap threshold. Both import boxes should now recognize a backup file and offer
// to restore everything from it via restoreFullBackup(), rather than erroring.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

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

// --- Settings tile: Import & Reload restores everything via restoreFullBackup() -----------
{
  const textarea = document.getElementById('import-json-textarea');
  const status = document.getElementById('import-status');
  textarea.value = BACKUP_JSON;
  global.__confirmResult = true;
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };

  document.getElementById('import-apply-btn').fire('click');

  check('Import & Reload restores the club/squad from inside the backup', localStorage.getItem('fmCommandCentre.importedSaveData') === JSON.stringify({ club: { name: 'Backup FC' }, squad: [{ name: 'Backup Player' }] }));
  check('Import & Reload also restores the scouting shortlist from the backup', localStorage.getItem('fmCommandCentre.scoutingShortlist') === JSON.stringify([{ name: 'ShortlistedPlayer' }]));
  check('Import & Reload also restores the gap threshold from the backup', localStorage.getItem('fmCommandCentre.gapThreshold') === '12');
  check('Import & Reload reloads after restoring a backup', reloaded);
  check('Import & Reload does not report an error for a backup file', !status.className.includes('is-error'));
}

// --- Settings tile: declining the confirm() does not restore anything ---------------------
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

  check('a normal save-data import still works exactly as before', localStorage.getItem('fmCommandCentre.importedSaveData') === JSON.stringify({ club: { name: 'Plain FC' }, squad: [{ name: 'Plain Player' }] }));
  check('a normal save-data import still reloads', reloaded);
  check('a normal save-data import does not go through the backup confirm() gate', !status.innerHTML.includes('Full Backup'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
