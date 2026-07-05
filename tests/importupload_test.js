// Regression test for "Upload JSON File" — Tom asked to be able to pick a .json save-data
// file directly instead of opening it and pasting the contents into the textarea. Covers
// both places wireImportFileUpload() is wired up: the Settings > New Save Setup tile
// (import-upload-btn/import-file-input/import-json-textarea) and the landing screen's
// Import Save Data modal (landing-import-upload-btn/landing-import-file-input/
// landing-import-textarea) — proving the two stay fully independent of each other, same as
// the existing paste-based Validate/Import & Reload/Load Example Template buttons already do.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

const SAMPLE_JSON = JSON.stringify({ club: { name: 'Uploaded FC' }, squad: [{ name: 'Uploaded Player' }] }, null, 2);

// --- Settings tile: clicking "Upload JSON File" opens the file picker (the hidden input) ---
{
  const fileInput = document.getElementById('import-file-input');
  let clicked = false;
  fileInput.addEventListener('click', () => { clicked = true; });
  document.getElementById('import-upload-btn').fire('click');
  check('clicking "Upload JSON File" (Settings tile) triggers the hidden file input', clicked);
}

// --- Settings tile: picking a valid .json file fills the textarea and reports ok status ---
{
  const textarea = document.getElementById('import-json-textarea');
  const status = document.getElementById('import-status');
  textarea.value = '';
  global.__fileReaderText = SAMPLE_JSON;
  global.__fileReaderShouldError = false;

  const fileInput = document.getElementById('import-file-input');
  fileInput.files = [{ name: 'my-save.json' }];
  fileInput.fire('change', { target: fileInput });

  check('uploading a file fills the Settings tile textarea with its contents', textarea.value === SAMPLE_JSON);
  check('uploading a file reports the file name in the status line', status.innerHTML.includes('my-save.json'));
  check('uploading a file does not itself report an error', !status.className.includes('is-error'));
}

// --- Settings tile: a file read error is surfaced, not thrown ---
{
  const status = document.getElementById('import-status');
  global.__fileReaderShouldError = true;
  let threw = false;
  try {
    const fileInput = document.getElementById('import-file-input');
    fileInput.files = [{ name: 'broken.json' }];
    fileInput.fire('change', { target: fileInput });
  } catch (e) { threw = true; console.error(e); }
  global.__fileReaderShouldError = false;

  check('a file read error does not throw', !threw);
  check('a file read error reports is-error status', status.className.includes('is-error'));
}

// --- Landing modal: its own upload button/input/textarea are fully independent -------------
{
  const settingsTextarea = document.getElementById('import-json-textarea');
  const landingTextarea = document.getElementById('landing-import-textarea');
  const landingStatus = document.getElementById('landing-import-status');
  settingsTextarea.value = 'untouched-sentinel';
  landingTextarea.value = '';

  const landingSample = JSON.stringify({ club: { name: 'Landing FC' }, squad: [{ name: 'Landing Player' }] });
  global.__fileReaderText = landingSample;
  global.__fileReaderShouldError = false;

  let clicked = false;
  const landingFileInput = document.getElementById('landing-import-file-input');
  landingFileInput.addEventListener('click', () => { clicked = true; });
  document.getElementById('landing-import-upload-btn').fire('click');
  check('clicking "Upload JSON File" (landing modal) triggers its own hidden file input', clicked);

  landingFileInput.files = [{ name: 'landing-save.json' }];
  landingFileInput.fire('change', { target: landingFileInput });

  check('uploading a file fills the landing modal\'s own textarea', landingTextarea.value === landingSample);
  check('uploading a file in the landing modal reports its file name', landingStatus.innerHTML.includes('landing-save.json'));
  check('uploading a file in the landing modal does NOT touch the Settings tile\'s textarea', settingsTextarea.value === 'untouched-sentinel');
}

// --- Uploading doesn't auto-import — Validate/Import & Reload still require an explicit click
{
  const textarea = document.getElementById('import-json-textarea');
  let reloaded = false;
  global.location.reload = () => { reloaded = true; };
  global.__fileReaderText = SAMPLE_JSON;
  global.__fileReaderShouldError = false;

  const fileInput = document.getElementById('import-file-input');
  fileInput.files = [{ name: 'my-save.json' }];
  fileInput.fire('change', { target: fileInput });

  check('uploading a file alone does not trigger a reload/import', !reloaded);
  check('the textarea is still ready for Validate/Import & Reload after an upload', textarea.value === SAMPLE_JSON);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
