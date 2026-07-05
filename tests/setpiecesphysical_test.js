// Regression test: Set Pieces now sits underneath Physical in col-3 (not underneath
// Technical in col-1) for both the squad player-modal (#pm-*) and the scouted-player
// modal (#sm-*), for outfield players — and still hides correctly (without breaking the
// Technical<->Goalkeeping column swap) for goalkeepers, whose set-piece attributes get
// folded into their trimmed Technical group instead.
//
// NOTE: the mock DOM used by this harness has no real HTML parser — elements only track
// parent/child relationships that JS itself sets up via appendChild (see mockdom.js), so
// it can't see the static HTML order of Physical/Set Pieces/Goalkeeping as written in
// index.html. That order was verified directly by reading the edited markup (Set Pieces
// now sits in the col-3 block, immediately after Physical, in both modals). What CAN be
// verified here — and is the actual behavioural risk of this change — is that col-1 only
// ever contains Technical (never Set Pieces alongside it, since Set Pieces moved out of
// col-1 entirely) and that Set Pieces' show/hide toggle plus the Technical<->Goalkeeping
// column swap still work correctly with the simplified appendChild-only logic.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function childIds(el) {
  return Array.from(el.children || []).map(c => c.id).filter(Boolean);
}

const outfieldAttrs = {};
TECHNICAL_ATTR_NAMES.forEach(n => outfieldAttrs[n] = 12);
MENTAL_ATTR_NAMES.forEach(n => outfieldAttrs[n] = 12);
PHYSICAL_ATTR_NAMES.forEach(n => outfieldAttrs[n] = 12);

const keeperAttrs = {};
TECHNICAL_ATTR_NAMES.forEach(n => keeperAttrs[n] = 10);
MENTAL_ATTR_NAMES.forEach(n => keeperAttrs[n] = 10);
PHYSICAL_ATTR_NAMES.forEach(n => keeperAttrs[n] = 10);
GOALKEEPING_ATTR_NAMES.forEach(n => keeperAttrs[n] = 14);

// --- Squad player-modal (#pm-*) -----------------------------------------------------------
currentSquad.length = 0;
currentSquad.push({ name: 'Outfield Test', position: 'ST (C)', age: 24, nation: 'ENG', contract: '2027', ability: '4', attributes: outfieldAttrs });
currentSquad.push({ name: 'Keeper Test', position: 'GK', age: 26, nation: 'ENG', contract: '2027', ability: '4', attributes: keeperAttrs });

openPlayerProfile(0);
{
  const col1 = childIds(document.getElementById('pm-attr-col-1'));
  check('pm outfield: col-1 contains only Technical (Set Pieces is no longer there)', col1.length === 1 && col1[0] === 'pm-technical-group');
  check('pm outfield: Set Pieces group is visible', document.getElementById('pm-set-pieces-group').style.display !== 'none');
  check('pm outfield: Goalkeeping group is hidden', document.getElementById('pm-goalkeeping-group').style.display === 'none');
  check('pm outfield: Set Pieces attribute rows rendered', document.getElementById('pm-set-pieces').innerHTML.includes('Corners'));
}

openPlayerProfile(1);
{
  const col1 = childIds(document.getElementById('pm-attr-col-1'));
  check('pm keeper: col-1 becomes Goalkeeping only', col1.length === 1 && col1[0] === 'pm-goalkeeping-group');
  check('pm keeper: Set Pieces group is hidden', document.getElementById('pm-set-pieces-group').style.display === 'none');
  check('pm keeper: Goalkeeping group is visible', document.getElementById('pm-goalkeeping-group').style.display !== 'none');
}

// Reopen the outfield player to confirm everything swaps back correctly (not a one-way move).
openPlayerProfile(0);
{
  const col1 = childIds(document.getElementById('pm-attr-col-1'));
  check('pm outfield (after keeper): col-1 is Technical only again', col1.length === 1 && col1[0] === 'pm-technical-group');
  check('pm outfield (after keeper): Set Pieces visible again', document.getElementById('pm-set-pieces-group').style.display !== 'none');
}

// --- Scouted-player modal (#sm-*) ---------------------------------------------------------
scoutShortlist.length = 0;
addScoutedPlayers([
  { name: 'Scout Outfield', position: 'ST (C)', age: 22, nation: 'ENG', club: 'Test FC', ability: '4', potential: '4', attributes: outfieldAttrs },
  { name: 'Scout Keeper', position: 'GK', age: 22, nation: 'ENG', club: 'Test FC', ability: '4', potential: '4', attributes: keeperAttrs },
]);

openScoutProfile(0);
{
  const col1 = childIds(document.getElementById('sm-attr-col-1'));
  check('sm outfield: col-1 contains only Technical', col1.length === 1 && col1[0] === 'sm-technical-group');
  check('sm outfield: Set Pieces group is visible', document.getElementById('sm-set-pieces-group').style.display !== 'none');
  check('sm outfield: Goalkeeping group is hidden', document.getElementById('sm-goalkeeping-group').style.display === 'none');
}

openScoutProfile(1);
{
  const col1 = childIds(document.getElementById('sm-attr-col-1'));
  check('sm keeper: col-1 becomes Goalkeeping only', col1.length === 1 && col1[0] === 'sm-goalkeeping-group');
  check('sm keeper: Set Pieces group is hidden', document.getElementById('sm-set-pieces-group').style.display === 'none');
  check('sm keeper: Goalkeeping group is visible', document.getElementById('sm-goalkeeping-group').style.display !== 'none');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
