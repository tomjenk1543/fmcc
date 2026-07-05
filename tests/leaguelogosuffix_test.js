// Regression test for Task #131 — league logo packs naming files "<id>_comp.png" rather than
// plain "<id>.png" (confirmed against the user's own real pack, same category of "the config
// path doesn't match the real filename" issue as the earlier crest/findFileByIdInTree fix).
// Covers: findFileByIdInTree() searching multiple ID variants in one tree walk, and
// loadImageById() actually finding a "_comp"-suffixed file via its idSuffixes parameter.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function makeFile(name) {
  return { kind: 'file', name, async getFile() { return { name }; } };
}
function makeDir(children) {
  return {
    kind: 'directory',
    async *entries() {
      for (const child of children) yield [child.name, child];
    },
  };
}

// --- findFileByIdInTree: multiple id variants in a single walk ---------------------------
{
  (async () => {
    const compFile = makeFile('7540024_comp.png');
    const unrelatedFile = makeFile('7540024_person.png'); // should NOT match — wrong suffix
    const root = makeDir([compFile, unrelatedFile]);

    const found = await findFileByIdInTree(root, ['7540024', '7540024_comp'], ['.png', '.jpg', '.jpeg']);
    check('findFileByIdInTree matches the _comp-suffixed variant when the plain ID is absent', found === compFile);

    const notFound = await findFileByIdInTree(root, ['9999999', '9999999_comp'], ['.png', '.jpg', '.jpeg']);
    check('findFileByIdInTree returns null when neither variant exists', notFound === null);

    // --- loadImageById: real end-to-end case for the league logo path ----------------------
    fmGraphicsDirHandle = root;
    const emptyCompetitionMap = new Map(); // no config.xml mapping — forces the fallback search
    let capturedUrl = null;
    const statusEl = document.getElementById('comp-suffix-status-test');
    await loadImageById('7540024', emptyCompetitionMap, statusEl, (url) => { capturedUrl = url; }, 'league logo', LEAGUE_LOGO_FILENAME_SUFFIXES);
    check('loadImageById finds a "_comp"-suffixed league logo via the fallback search', capturedUrl !== null);
    check('loadImageById status reflects the fallback-search success', /found by filename search/i.test(statusEl.textContent));

    // --- crest lookups are unaffected — they still only try the plain (unsuffixed) ID -------
    const clubRoot = makeDir([makeFile('13172353.png'), makeFile('13172353_comp.png')]);
    fmGraphicsDirHandle = clubRoot;
    let capturedCrestUrl = null;
    const crestStatusEl = document.getElementById('crest-unaffected-status-test');
    await loadImageById('13172353', new Map(), crestStatusEl, (url) => { capturedCrestUrl = url; }, 'crest');
    check('a plain crest lookup (no idSuffixes passed) still finds the unsuffixed file', capturedCrestUrl !== null);

    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail > 0) process.exitCode = 1;
  })().catch(err => { console.error('async section threw:', err); fail++; console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = 1; });
}
