// Regression test for the player profile modal's "Check role fit" picker (Task: "pick a
// position and role on the player pop window and have the key and preferred attributes
// highlighted so you can identify what skills that player has"). Covers: position select
// populated from POSITION_FAMILY_ROLES, role select populated/enabled once a position is
// chosen, highlightRoleAttributesInModal() correctly tagging is-key-attr/is-preferred-attr
// on the right rows (and leaving everything else untouched), clearing back to blank, and
// the picker's selection surviving a switch to a different player's profile (re-applied by
// openPlayerProfile() against the freshly-rendered rows rather than reset).

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function rowFor(name) {
  return document.querySelector(`#pm-attribute-groups .attribute-row[data-attr-name="${name}"]`);
}

const centreBackPlayer = {
  name: 'Test CB', position: 'D (C)', bestPosition: 'D (C)', bestRole: 'CB', age: 24, nation: 'ENG',
  ability: '3★', potential: '3★', appearances: '20', goals: 0, assists: 0, wage: '£10K p/w', contract: '30/6/2030',
  attributes: {
    Heading: 15, Marking: 16, Tackling: 15, Anticipation: 14, Positioning: 15, 'Jumping Reach': 14, Strength: 16,
    Aggression: 12, Bravery: 12, Composure: 11, Concentration: 13, Decisions: 12, Pace: 10,
    Crossing: 4, Dribbling: 5, Finishing: 3, Passing: 9,
  },
};
const secondPlayer = {
  name: 'Test Winger', position: 'AM (R)', bestPosition: 'AM (R)', bestRole: 'W', age: 22, nation: 'ENG',
  ability: '3★', potential: '3.5★', appearances: '18', goals: 4, assists: 6, wage: '£8K p/w', contract: '30/6/2031',
  attributes: {
    Crossing: 15, Dribbling: 16, Pace: 17, Flair: 14, Acceleration: 16, Technique: 13, 'Off The Ball': 12, Agility: 15,
    Heading: 6, Marking: 4, Tackling: 5,
  },
};
renderSquad([centreBackPlayer, secondPlayer]);

// --- Position select is populated with every POSITION_FAMILY_ROLES key -------------------
{
  const posSelect = document.getElementById('pm-position-select');
  const expectedKeys = Object.keys(POSITION_FAMILY_ROLES);
  check('position select has a blank placeholder plus one option per position family',
    posSelect.children.length === expectedKeys.length + 1);
  check('position select includes Centre-Back\'s family key (D-C)',
    Array.from(posSelect.children).some(o => o.value === 'D-C'));
}

// --- Opening a player's profile, then picking Position -> Role highlights the right rows -
openPlayerProfile(0); // Test CB

const roleSelectBefore = document.getElementById('pm-role-select');
check('role select starts disabled before a position is chosen', roleSelectBefore.disabled === true);

const posSelect = document.getElementById('pm-position-select');
posSelect.value = 'D-C';
posSelect.fire('change', { target: posSelect });

const roleSelect = document.getElementById('pm-role-select');
check('role select becomes enabled once a position is chosen', roleSelect.disabled === false);
check('role select is populated with D-C\'s roles',
  Array.from(roleSelect.children).some(o => o.value === 'Centre-Back'));
check('picking a position with no role yet highlights nothing',
  document.querySelectorAll('#pm-attribute-groups .attribute-row.is-key-attr').length === 0);

roleSelect.value = 'Centre-Back';
roleSelect.fire('change', { target: roleSelect });

const cbProfile = ROLE_ATTRIBUTES['Centre-Back'];
cbProfile.key.forEach(name => {
  const row = rowFor(name);
  check(`"${name}" (Centre-Back key attr) row exists and is highlighted as key`,
    !!row && row.classList.contains('is-key-attr'));
});
cbProfile.preferred.forEach(name => {
  const row = rowFor(name);
  check(`"${name}" (Centre-Back preferred attr) row exists and is highlighted as preferred`,
    !!row && row.classList.contains('is-preferred-attr'));
});
['Crossing', 'Dribbling', 'Finishing', 'Passing'].forEach(name => {
  const row = rowFor(name);
  check(`"${name}" (not in Centre-Back's profile) row is NOT highlighted`,
    !!row && !row.classList.contains('is-key-attr') && !row.classList.contains('is-preferred-attr'));
});

// --- Clearing the role select back to blank clears every highlight -----------------------
roleSelect.value = '';
roleSelect.fire('change', { target: roleSelect });
check('clearing the role select removes every is-key-attr highlight',
  document.querySelectorAll('#pm-attribute-groups .attribute-row.is-key-attr').length === 0);
check('clearing the role select removes every is-preferred-attr highlight',
  document.querySelectorAll('#pm-attribute-groups .attribute-row.is-preferred-attr').length === 0);

// --- Re-pick a role, then switch position families: role select resets and re-disables ---
roleSelect.value = 'Centre-Back';
roleSelect.fire('change', { target: roleSelect });
posSelect.value = 'ST';
posSelect.fire('change', { target: posSelect });
check('changing to a new valid position resets the role select value back to blank',
  document.getElementById('pm-role-select').value === '');
check('changing to a new valid position leaves the role select enabled (it has ST\'s roles to offer)',
  document.getElementById('pm-role-select').disabled === false);
check('changing position again clears any highlight from the previous role',
  document.querySelectorAll('#pm-attribute-groups .attribute-row.is-key-attr').length === 0);

// --- The picker's selection survives opening a DIFFERENT player's profile ----------------
posSelect.value = 'D-C';
posSelect.fire('change', { target: posSelect });
document.getElementById('pm-role-select').value = 'Centre-Back';
document.getElementById('pm-role-select').fire('change', { target: document.getElementById('pm-role-select') });

openPlayerProfile(1); // Test Winger — a very different player, same role still selected

check('opening a second player keeps the previously-picked role selected',
  document.getElementById('pm-role-select').value === 'Centre-Back');
// Test Winger has Heading/Marking/Tackling too (all Centre-Back key attrs), so they should
// be highlighted again automatically for THIS player's freshly-rendered rows, with no need
// to re-fire the role select's change event.
['Heading', 'Marking', 'Tackling'].forEach(name => {
  const row = rowFor(name);
  check(`re-opening with a role still selected re-highlights "${name}" for the new player`,
    !!row && row.classList.contains('is-key-attr'));
});
const crossingRow = rowFor('Crossing');
check('an attribute outside the selected role\'s profile stays unhighlighted for the new player too',
  !!crossingRow && !crossingRow.classList.contains('is-key-attr') && !crossingRow.classList.contains('is-preferred-attr'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
