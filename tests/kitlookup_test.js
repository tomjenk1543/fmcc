// Regression test for Task #127 — kit image lookup (home/away/third), keyed off the same
// club ID as the crest lookup, using the "<id>_<home|away|third>.<ext>" convention Tom
// confirmed from his actual kit pack.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function makeFakeFileHandle(name) {
  return { kind: 'file', name, getFile: async () => ({ name, type: 'image/png', async arrayBuffer(){ return new ArrayBuffer(4); } }) };
}

// --- findFilesByNamesInTree ---------------------------------------------------------
{
  (async () => {
    // Nested tree: root/Kits/Metalul/13172353_home.png, .../13172353_away.jpg, and an
    // unrelated file that should be ignored.
    const homeFile = makeFakeFileHandle('13172353_home.png');
    const awayFile = makeFakeFileHandle('13172353_away.jpg');
    const otherFile = makeFakeFileHandle('99999_home.png');
    const metaluDir = {
      kind: 'directory',
      entries: async function*() {
        yield ['13172353_home.png', homeFile];
        yield ['13172353_away.jpg', awayFile];
        yield ['99999_home.png', otherFile];
      },
    };
    const kitsDir = {
      kind: 'directory',
      entries: async function*() {
        yield ['Metalul', metaluDir];
      },
    };
    const root = {
      kind: 'directory',
      entries: async function*() {
        yield ['Kits', kitsDir];
      },
    };
    const wanted = new Set(['13172353_home.png', '13172353_away.png', '13172353_away.jpg', '13172353_third.png']);
    const found = await findFilesByNamesInTree(root, wanted);
    check('finds nested home kit file', found.get('13172353_home.png') === homeFile);
    check('finds nested away kit file (different extension)', found.get('13172353_away.jpg') === awayFile);
    check('does not find third kit (not present)', !found.has('13172353_third.png'));
    check('does not pick up a different club ID with the same suffix', found.size === 2);
    return true;
  })().then(() => runLoadKitImagesTest()).catch(err => { console.error('findFilesByNamesInTree section threw:', err); fail++; runLoadKitImagesTest(); });
}

let asyncDone = false;
function runLoadKitImagesTest() {
  (async () => {
    // --- loadKitImages: full integration through the real DOM/localStorage mocks --------
    const homeFile = makeFakeFileHandle('555_home.png');
    const thirdFile = makeFakeFileHandle('555_third.jpeg');
    const fakeRoot = {
      kind: 'directory',
      entries: async function*() {
        yield ['555_home.png', homeFile];
        yield ['555_third.jpeg', thirdFile];
        // no away kit for this ID — exercises the "not found" path for one of the three
      },
    };
    fmGraphicsDirHandle = fakeRoot;

    const statusEl = document.getElementById('kit-status-test');
    await loadKitImages('555', statusEl);

    check('loadKitImages reports 2 of 3 found', /2 of 3/.test(statusEl.textContent));

    // No settings-page thumbnail row any more — a found kit shows on the hero card instead
    // (see setKitImage()/herokits_test.js), so check those elements got updated here too.
    const homeHeroItem = document.getElementById('hero-kit-home-item');
    const awayHeroItem = document.getElementById('hero-kit-away-item');
    const thirdHeroItem = document.getElementById('hero-kit-third-item');
    check('hero home kit item shown', homeHeroItem.style.display === 'flex' && !!document.getElementById('hero-kit-home-img').src);
    check('hero away kit item hidden (not found)', awayHeroItem.style.display === 'none');
    check('hero third kit item shown', thirdHeroItem.style.display === 'flex' && !!document.getElementById('hero-kit-third-img').src);

    check('home kit persisted to localStorage', !!localStorage.getItem(KIT_STORAGE_KEYS.home));
    check('away kit NOT persisted (never found)', localStorage.getItem(KIT_STORAGE_KEYS.away) === null);
    check('third kit persisted to localStorage', !!localStorage.getItem(KIT_STORAGE_KEYS.third));

    // --- loadKitImages: nothing found at all --------------------------------------------
    const emptyRoot = { kind: 'directory', entries: async function*() {} };
    fmGraphicsDirHandle = emptyRoot;
    const statusEl2 = document.getElementById('kit-status-test-2');
    await loadKitImages('000', statusEl2);
    check('loadKitImages reports none found when nothing matches', /No kit images found/.test(statusEl2.textContent));

    // --- buildFullBackup / restoreFullBackup round-trip for kits ------------------------
    localStorage.setItem(KIT_STORAGE_KEYS.home, 'data:image/png;base64,HOMETEST');
    localStorage.setItem(KIT_STORAGE_KEYS.away, 'data:image/png;base64,AWAYTEST');
    localStorage.setItem(KIT_STORAGE_KEYS.third, 'data:image/png;base64,THIRDTEST');
    const backup = buildFullBackup();
    check('buildFullBackup includes kitHomeDataUrl', backup.kitHomeDataUrl === 'data:image/png;base64,HOMETEST');
    check('buildFullBackup includes kitAwayDataUrl', backup.kitAwayDataUrl === 'data:image/png;base64,AWAYTEST');
    check('buildFullBackup includes kitThirdDataUrl', backup.kitThirdDataUrl === 'data:image/png;base64,THIRDTEST');

    localStorage.removeItem(KIT_STORAGE_KEYS.home);
    localStorage.removeItem(KIT_STORAGE_KEYS.away);
    localStorage.removeItem(KIT_STORAGE_KEYS.third);
    restoreFullBackup(backup);
    check('restoreFullBackup writes kitHomeDataUrl back', localStorage.getItem(KIT_STORAGE_KEYS.home) === 'data:image/png;base64,HOMETEST');
    check('restoreFullBackup writes kitAwayDataUrl back', localStorage.getItem(KIT_STORAGE_KEYS.away) === 'data:image/png;base64,AWAYTEST');
    check('restoreFullBackup writes kitThirdDataUrl back', localStorage.getItem(KIT_STORAGE_KEYS.third) === 'data:image/png;base64,THIRDTEST');

    asyncDone = true;
    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail > 0) process.exitCode = 1;
  })().catch(err => { console.error('loadKitImages section threw:', err); fail++; asyncDone = true; console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = 1; });
}

setTimeout(() => { if (!asyncDone) { console.error('FAIL: async section never completed'); process.exitCode = 1; } }, 2000);
