// Regression test for Task #125 — league/competition logo lookup + display.
// Covers: parseConfigRecords routing club vs competition vs ignored suffixes,
// setLeagueLogo's display/persist behaviour, loadImageById's generic path working for
// the league-logo case, openLeagueTableModal's logo-injection, and the
// buildFullBackup/restoreFullBackup round-trip for leagueLogoDataUrl.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- parseConfigRecords -----------------------------------------------------------
{
  const clubMap = new Map();
  const competitionMap = new Map();
  const xml = `
    <list id="maps">
      <record from="13172353_club" to="graphics/pictures/club/13172353/logo"/>
      <record from="999_competition" to="graphics/pictures/competition/999/logo"/>
      <record from="52063863" to="graphics/pictures/club/52063863/logo"/>
      <record from="4242_person" to="graphics/pictures/person/4242/photo"/>
      <record from="7_nation" to="graphics/pictures/nation/7/flag"/>
    </list>`;
  parseConfigRecords(xml, clubMap, competitionMap);
  check('club with _club suffix routed to clubMap', clubMap.get('13172353') === 'graphics/pictures/club/13172353/logo');
  check('competition with _competition suffix routed to competitionMap', competitionMap.get('999') === 'graphics/pictures/competition/999/logo');
  check('bare unsuffixed ID treated as club (back-compat)', clubMap.get('52063863') === 'graphics/pictures/club/52063863/logo');
  check('_person suffix ignored (not stored in either map)', !clubMap.has('4242') && !competitionMap.has('4242'));
  check('_nation suffix ignored (not stored in either map)', !clubMap.has('7') && !competitionMap.has('7'));
  check('competitionMap did not pick up club records', !competitionMap.has('13172353') && !competitionMap.has('52063863'));
  check('clubMap did not pick up the competition record', !clubMap.has('999'));
}

// --- setLeagueLogo -----------------------------------------------------------------
{
  localStorage.removeItem(LEAGUE_LOGO_STORAGE_KEY);
  setLeagueLogo('data:image/png;base64,ABC123', true);
  const img = document.getElementById('hero-division-logo');
  check('setLeagueLogo sets img src', img.src === 'data:image/png;base64,ABC123');
  check('setLeagueLogo shows the img', img.style.display === 'inline-block');
  check('setLeagueLogo persists a data: URL to localStorage', localStorage.getItem(LEAGUE_LOGO_STORAGE_KEY) === 'data:image/png;base64,ABC123');

  setLeagueLogo(null, true);
  check('setLeagueLogo(null) hides the img', img.style.display === 'none');
  check('setLeagueLogo(null) clears localStorage', localStorage.getItem(LEAGUE_LOGO_STORAGE_KEY) === null);

  // persist = false should update the DOM but not touch storage
  setLeagueLogo('data:image/png;base64,DEF456', false);
  check('setLeagueLogo with persist=false still updates the img', img.src === 'data:image/png;base64,DEF456');
  check('setLeagueLogo with persist=false does not write localStorage', localStorage.getItem(LEAGUE_LOGO_STORAGE_KEY) === null);
}

// --- loadImageById (generic — exercised via the league-logo case) ------------------
{
  (async () => {
    // Fake directory tree: fmGraphicsDirHandle needs getDirectoryHandle/getFileHandle for the
    // config-path branch, and entries() for the findFileByIdInTree fallback branch.
    function makeFakeFileHandle(name) {
      return { kind: 'file', name, getFile: async () => ({ name, type: 'image/png', async arrayBuffer(){ return new ArrayBuffer(4); } }) };
    }
    const fakeRoot = {
      kind: 'directory',
      getDirectoryHandle: async () => { throw new Error('no such directory'); },
      getFileHandle: async () => { throw new Error('no such file'); },
      entries: async function*() {
        yield ['888.png', makeFakeFileHandle('888.png')];
      },
    };
    // NOTE: fmGraphicsDirHandle is declared with `let` at module scope in appjs.js — since
    // mockdom.js/appjs.js/this test are concatenated into one top-level script, a plain
    // reassignment (not global.fmGraphicsDirHandle = ...) is what actually reaches it, because
    // `let`/`const` top-level bindings are NOT properties of the global object even in a
    // non-module script.
    fmGraphicsDirHandle = fakeRoot;

    const competitionMap = new Map(); // no mapping for '888' — forces the fallback search
    let capturedUrl = null;
    const statusEl = document.getElementById('league-logo-status-test');
    await loadImageById('888', competitionMap, statusEl, (url) => { capturedUrl = url; }, 'league logo');
    check('loadImageById falls back to whole-tree search and finds the file', capturedUrl !== null);
    check('loadImageById status reflects fallback success', /found by filename search/i.test(statusEl.textContent));
  })().then(() => finishAsync()).catch(err => { console.error('async section threw:', err); fail++; finishAsync(); });
}

let asyncDone = false;
function finishAsync() {
  asyncDone = true;

  // --- openLeagueTableModal logo injection ------------------------------------------
  {
    document.getElementById('hero-division').textContent = 'Liga I';
    const logoImg = document.getElementById('hero-division-logo');
    logoImg.src = 'data:image/png;base64,LOGO';
    logoImg.style.display = 'inline-block';
    openLeagueTableModal();
    const titleHtml = document.getElementById('gaps-modal-title').innerHTML;
    check('openLeagueTableModal injects the logo img into the modal title', titleHtml.includes('modal-title-logo') && titleHtml.includes('Liga I'));

    // When no logo is loaded, title should remain plain text (textContent set by openGapsModal,
    // innerHTML from a previous run must not leak through) — reset and re-check.
    logoImg.style.display = 'none';
    logoImg.src = '';
    openLeagueTableModal();
    const titleTextAfter = document.getElementById('gaps-modal-title').textContent;
    check('openLeagueTableModal leaves plain title text when no logo loaded', titleTextAfter === 'Liga I');
  }

  // --- buildFullBackup / restoreFullBackup round-trip -------------------------------
  {
    localStorage.setItem(LEAGUE_LOGO_STORAGE_KEY, 'data:image/png;base64,BACKUPTEST');
    const backup = buildFullBackup();
    check('buildFullBackup includes leagueLogoDataUrl', backup.leagueLogoDataUrl === 'data:image/png;base64,BACKUPTEST');

    localStorage.removeItem(LEAGUE_LOGO_STORAGE_KEY);
    restoreFullBackup(backup);
    check('restoreFullBackup writes leagueLogoDataUrl back to storage', localStorage.getItem(LEAGUE_LOGO_STORAGE_KEY) === 'data:image/png;base64,BACKUPTEST');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

// Give the async loadImageById section a chance to run before the process would otherwise
// exit — Node keeps the event loop alive while the promise chain above is pending, so this
// isn't strictly needed, but guards against a silent no-op if something above throws
// synchronously before scheduling the .then().
setTimeout(() => { if (!asyncDone) { console.error('FAIL: async section never completed'); process.exitCode = 1; } }, 2000);
