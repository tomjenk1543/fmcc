// Verifies findFileByIdInTree() — the fallback used when a pack's config.xml registers a
// resource under a path that doesn't match where the file actually is on disk (the real bug
// report: "FMG Standard Logos 2026.00" registers "graphics/pictures/club/ID/logo" but the
// actual file lives at "FMG Standard Logos 2026.00/Clubs/Normal/ID.png").
//
// NOTE: findFileByIdInTree()'s 2nd parameter changed from a single id string to an array of
// id VARIANTS as part of Task #131 (league logo packs naming files "<id>_comp.png" rather
// than plain "<id>.png") — calls below pass a one-element array for the plain-ID cases; see
// idvariants_test.js for dedicated multi-variant coverage.

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

function makeFile(name) {
  return { kind: 'file', name, async getFile() { return { name }; } };
}
function makeDir(name, children) {
  return {
    kind: 'directory',
    name,
    async *entries() {
      for (const child of children) yield [child.name, child];
    },
  };
}

(async () => {
  const normalFile = makeFile('13172353.PNG'); // uppercase extension, on purpose
  const otherFile = makeFile('999999.jpg');
  const normalDir = makeDir('Normal', [normalFile, otherFile]);
  const clubsDir = makeDir('Clubs', [normalDir]);
  const packDir = makeDir('FMG Standard Logos 2026.00', [clubsDir]);
  const root = makeDir('graphics', [packDir]);

  const found = await findFileByIdInTree(root, ['13172353'], ['.png', '.jpg', '.jpeg']);
  assert(found === normalFile, 'finds a deeply-nested file by ID, case-insensitively on extension');

  const foundOther = await findFileByIdInTree(root, ['999999'], ['.png', '.jpg', '.jpeg']);
  assert(foundOther === otherFile, 'finds a second file by a different ID in the same folder');

  const notFound = await findFileByIdInTree(root, ['000000'], ['.png', '.jpg', '.jpeg']);
  assert(notFound === null, 'returns null for an ID that does not exist anywhere in the tree');

  if (process.exitCode === 1) console.error('SOME TESTS FAILED');
  else console.log('ALL TESTS PASSED');
})();
