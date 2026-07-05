// Regression test for the Dashboard's genuine "nothing loaded" empty state — Tom noticed
// that after "Clear All Data", the Dashboard was still showing a page full of "Not set"
// placeholders instead of reading as an intentionally blank app. Fix: #dashboard-normal-content
// (the hero tile + both tile rows) is hidden and #dashboard-empty-state (logo + a message
// pointing at Settings + a button straight there) is shown instead, only on Dashboard —
// every other page keeps its normal placeholder-based empty look.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- resetToBlankSlate() shows the empty state and hides the normal dashboard content ------
{
  resetToBlankSlate();
  const emptyState = document.getElementById('dashboard-empty-state');
  const normalContent = document.getElementById('dashboard-normal-content');
  check('dashboard-empty-state is shown (display:flex) after resetToBlankSlate()', emptyState.style.display === 'flex');
  check('dashboard-normal-content is hidden after resetToBlankSlate()', normalContent.style.display === 'none');
}

// --- The empty state's own "Go to Settings" button navigates to Settings -------------------
{
  document.getElementById('dashboard-empty-settings-btn').fire('click');
  check('clicking "Go to Settings" activates the settings view', document.getElementById('settings').classList.contains('active'));
  check('clicking "Go to Settings" marks the Settings nav button active', document.querySelector('.nav-btn[data-view="settings"]').classList.contains('active'));
  // Switch back to dashboard so this test doesn't leak state into anything run after it.
  switchToView('dashboard');
}

// --- Fresh-boot state (as the static HTML has it, before any of the three boot branches
// run) is "normal content visible, empty state hidden" — resetToBlankSlate() is the ONLY
// one of the three that ever needs to touch these two elements, since in the real app
// loadSaveData_MetaluBuzau()/applyFullSaveData() only ever run on a fresh page load (every
// state change reloads the page — see the Setup Wizard/Clear All Data/Load Backup handlers),
// never right after resetToBlankSlate() in the same session. Simulating that fresh-HTML
// starting point explicitly here (rather than trusting whatever the previous test left
// behind) confirms loadSaveData_MetaluBuzau() doesn't itself have to do anything special
// with these two elements to leave the normal dashboard showing. ------------------------
{
  document.getElementById('dashboard-empty-state').style.display = 'none';
  document.getElementById('dashboard-normal-content').style.display = '';

  loadSaveData_MetaluBuzau();
  const emptyState = document.getElementById('dashboard-empty-state');
  const normalContent = document.getElementById('dashboard-normal-content');
  check('dashboard-empty-state stays hidden once real save data loads', emptyState.style.display !== 'flex');
  check('dashboard-normal-content stays visible once real save data loads', normalContent.style.display !== 'none');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
