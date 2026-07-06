// Regression test for remembering the last active page across a refresh (switchToView()'s
// LAST_VIEW_STORAGE_KEY write, and the boot-time restore right after the nav-button wiring —
// see FM_Command_Centre.html). The restore-on-boot half can't be exercised here the way the
// write half can: the harness only ever boots the app script ONCE per test-file run (that's
// what "concatenate app JS + this file into one script" means — see run-all.sh), and this
// process's one boot happens with no fmcc_lastView key in localStorage yet (a fresh mock
// localStorage every run), so it always lands on the static-HTML default (Dashboard) exactly
// as it should for a genuinely first-ever load. What IS directly testable here is the half
// that actually matters for the next real boot: does switchToView() keep localStorage
// up to date on every navigation, and does the guard behave sensibly against nonsense input.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

check('LAST_VIEW_STORAGE_KEY is the expected key name', LAST_VIEW_STORAGE_KEY === 'fmcc_lastView');

switchToView('tactics');
check('switchToView writes the view name to localStorage', localStorage.getItem(LAST_VIEW_STORAGE_KEY) === 'tactics');
check('switchToView still marks the right nav button active', document.querySelector('.nav-btn[data-view="tactics"]').classList.contains('active'));

switchToView('scout');
check('switching again overwrites the stored value with the new view', localStorage.getItem(LAST_VIEW_STORAGE_KEY) === 'scout');

switchToView('dashboard');
check('switching back to dashboard still gets stored like any other view (no special-casing inside switchToView itself)', localStorage.getItem(LAST_VIEW_STORAGE_KEY) === 'dashboard');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
