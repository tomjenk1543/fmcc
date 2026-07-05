// Regression test for the "Save data" line under the save name in the sidebar
// (.hotbar-right). It used to store its own "Save data — " prefix baked into the value
// (saveDataLabel); the prefix was dropped since the line now reads as its own subtitle
// directly under the save name. stripSaveDataLabelPrefix() strips that old prefix at render
// time too, so a save imported/backed-up before this change (still carrying the old prefix
// in its own stored data) shows cleanly without needing to be re-captured.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

check('no prefix: passes the label through unchanged', stripSaveDataLabelPrefix('18 Feb 2037') === '18 Feb 2037');
check('em-dash prefix is stripped', stripSaveDataLabelPrefix('Save data — 18 Feb 2037') === '18 Feb 2037');
check('hyphen prefix is stripped', stripSaveDataLabelPrefix('Save data - 18 Feb 2037') === '18 Feb 2037');
check('en-dash prefix is stripped', stripSaveDataLabelPrefix('Save data – 18 Feb 2037') === '18 Feb 2037');
check('colon prefix is stripped', stripSaveDataLabelPrefix('Save data: 18 Feb 2037') === '18 Feb 2037');
check('case-insensitive prefix is stripped', stripSaveDataLabelPrefix('SAVE DATA — 18 Feb 2037') === '18 Feb 2037');
check('extra whitespace around the prefix is tolerated', stripSaveDataLabelPrefix('  Save data   —   18 Feb 2037') === '18 Feb 2037');
check('null/undefined/empty all resolve to an empty string', stripSaveDataLabelPrefix(null) === '' && stripSaveDataLabelPrefix(undefined) === '' && stripSaveDataLabelPrefix('') === '');
check('a label that merely contains "save data" mid-string is left alone (prefix-only match)', stripSaveDataLabelPrefix('Continuing save data from last week') === 'Continuing save data from last week');

// applyClubData() itself: a club payload whose saveDataLabel still carries the old prefix
// (simulating a save imported/backed-up before this change) should render clean.
applyClubData({ club: { name: 'Test FC', saveDataLabel: 'Save data — 18 Feb 2037' } });
check('applyClubData strips an old-style prefixed saveDataLabel when rendering .hotbar-right',
  document.querySelector('.hotbar-right').textContent === '18 Feb 2037');

applyClubData({ club: { name: 'Test FC', saveDataLabel: '18 Feb 2037' } });
check('applyClubData renders an already-clean saveDataLabel unchanged',
  document.querySelector('.hotbar-right').textContent === '18 Feb 2037');

applyClubData({ club: { name: 'Test FC' } });
check('applyClubData renders an empty string (not "null"/"undefined") when saveDataLabel is missing',
  document.querySelector('.hotbar-right').textContent === '');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
