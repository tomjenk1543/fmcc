// Regression test for the 3 Out of Possession Role Synergy pairings (Dropping Defensive
// Midfielder + Pressing Full-Back, Stopping Centre-Back + Covering Centre-Back, Stopping
// Centre-Back + Holding Full-Back) added after the user confirmed the source guide's own OOP
// section from its real text — and for the OOP synergy panel actually rendering now, instead
// of the earlier hard "if (phase !== 'ip') return;" that always left it empty. All three now
// have a real "diagram" field (coordinates Tom marked up himself, since the source guide's own
// OOP section has none to recreate from). renderSynergyDiagramSvg/openRoleSynergyModal's
// graceful "no diagram" fallback is still covered here too, using a synthetic diagram-less
// pair rather than any of the 3 real ones (since all 3 now have diagrams) — plus a check that
// IP/OOP pairs never cross-fire on the wrong pitch.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

function slot(position, role) {
  return { position, role, pitchPos: { x: 50, y: 50 } };
}

// --- detectRoleSynergies: each of the 3 new OOP pairs fires correctly ---------------------
{
  const slots = [
    slot('DM (C)', 'Dropping Defensive Midfielder'),
    slot('D (R)', 'Pressing Full-Back'),
  ];
  const found = detectRoleSynergies(slots);
  check('DDM + PFB detected', found.some(p => p.label === 'Dropping Defensive Midfielder + Pressing Full-Back'));
}

{
  const slots = [
    slot('D (C)', 'Stopping Centre-Back'),
    slot('D (C)', 'Covering Centre-Back'),
  ];
  const found = detectRoleSynergies(slots);
  check('SCB + CCB detected', found.some(p => p.label === 'Stopping Centre-Back + Covering Centre-Back'));
}

{
  // sameSide: true — same flank (both R) should match. detectRoleSynergies/slotSide only
  // look at slot.position (not whether that role would realistically start there), so this
  // deliberately places "Stopping Centre-Back" itself on a wide slot purely to give it a
  // real, testable L/R side rather than the null side its normal D (C) slot would parse to.
  const sameSideSlots = [
    slot('D (R)', 'Stopping Centre-Back'),
    slot('D (R)', 'Holding Full-Back'),
  ];
  const foundSame = detectRoleSynergies(sameSideSlots);
  check('SCB + HFB detected when both are on the same (right) flank', foundSame.some(p => p.label === 'Stopping Centre-Back + Holding Full-Back'));

  // ...and opposite flanks (L vs R) should NOT match, since sameSide:true is enforced whenever
  // both slots have a real, differing L/R side.
  const oppositeSideSlots = [
    slot('D (L)', 'Stopping Centre-Back'),
    slot('D (R)', 'Holding Full-Back'),
  ];
  const foundOpposite = detectRoleSynergies(oppositeSideSlots);
  check('SCB + HFB does NOT match when they are on opposite flanks (sameSide gate enforced)', !foundOpposite.some(p => p.label === 'Stopping Centre-Back + Holding Full-Back'));
}

// --- IP and OOP pairs never cross-fire on the wrong formation -----------------------------
{
  // An all-OOP-role formation should detect zero IP pairs (every IP pair includes at least
  // one role name that's never valid on an OOP slot, so this should be structurally impossible
  // regardless — this just proves it holds for real IP pair definitions, not merely in theory).
  const oopSlots = [
    slot('D (C)', 'Stopping Centre-Back'),
    slot('D (C)', 'Covering Centre-Back'),
    slot('D (R)', 'Holding Full-Back'),
    slot('DM (C)', 'Dropping Defensive Midfielder'),
    slot('D (L)', 'Pressing Full-Back'),
  ];
  const found = detectRoleSynergies(oopSlots);
  const ipLabels = ['Advanced Centre-Back + Inside Full-Back', 'Half Back + Inside Wing-Back', 'False Nine + Poacher', 'Advanced Playmaker + Poacher'];
  check('no IP pairs detected in an all-OOP formation', !found.some(p => ipLabels.includes(p.label)));
  const oopLabels = ['Dropping Defensive Midfielder + Pressing Full-Back', 'Stopping Centre-Back + Covering Centre-Back', 'Stopping Centre-Back + Holding Full-Back'];
  check('all 3 OOP pairs ARE detected in this all-OOP formation', oopLabels.every(label => found.some(p => p.label === label)));
}

// --- diagram coordinates: all 3 OOP pairs Tom marked up render real SVG markup ------------
{
  const ddmPfb = ROLE_SYNERGY_PAIRS.find(p => p.label === 'Dropping Defensive Midfielder + Pressing Full-Back');
  check('DDM + PFB has a diagram field with the coordinates Tom provided', ddmPfb.diagram
    && ddmPfb.diagram.roleA.from.x === 65 && ddmPfb.diagram.roleA.from.y === 55 && ddmPfb.diagram.roleA.to.x === 65 && ddmPfb.diagram.roleA.to.y === 75
    && ddmPfb.diagram.roleB.from.x === 85 && ddmPfb.diagram.roleB.from.y === 75 && ddmPfb.diagram.roleB.to.x === 85 && ddmPfb.diagram.roleB.to.y === 55);
  check('renderSynergyDiagramSvg renders real SVG markup for DDM + PFB', renderSynergyDiagramSvg(ddmPfb).includes('<svg'));

  const scbCcb = ROLE_SYNERGY_PAIRS.find(p => p.label === 'Stopping Centre-Back + Covering Centre-Back');
  check('SCB + CCB has a diagram field with the coordinates Tom provided', scbCcb.diagram
    && scbCcb.diagram.roleA.from.x === 65 && scbCcb.diagram.roleA.from.y === 75 && scbCcb.diagram.roleA.to.x === 65 && scbCcb.diagram.roleA.to.y === 60
    && scbCcb.diagram.roleB.from.x === 35 && scbCcb.diagram.roleB.from.y === 75 && scbCcb.diagram.roleB.to.x === 50 && scbCcb.diagram.roleB.to.y === 80);
  check('renderSynergyDiagramSvg renders real SVG markup for SCB + CCB', renderSynergyDiagramSvg(scbCcb).includes('<svg'));

  const scbHfb = ROLE_SYNERGY_PAIRS.find(p => p.label === 'Stopping Centre-Back + Holding Full-Back');
  check('SCB + HFB has a diagram field with the coordinates Tom provided', scbHfb.diagram
    && scbHfb.diagram.roleA.from.x === 65 && scbHfb.diagram.roleA.from.y === 75 && scbHfb.diagram.roleA.to.x === 65 && scbHfb.diagram.roleA.to.y === 60
    && scbHfb.diagram.roleB.from.x === 85 && scbHfb.diagram.roleB.from.y === 75 && scbHfb.diagram.roleB.to === null);
  check('renderSynergyDiagramSvg renders real SVG markup for SCB + HFB', renderSynergyDiagramSvg(scbHfb).includes('<svg'));
}

// --- renderSynergyDiagramSvg / openRoleSynergyModal handle a missing "diagram" gracefully -
// All 3 real OOP pairs now have diagrams, so this uses a synthetic diagram-less pair purely
// to keep the fallback code path covered rather than repointing at a real entry.
{
  const noDiagramPair = { label: 'Synthetic Diagram-less Pair', tip: 'test only' };
  check('renderSynergyDiagramSvg returns empty string for a pair with no diagram', renderSynergyDiagramSvg(noDiagramPair) === '');

  const ipPair = ROLE_SYNERGY_PAIRS.find(p => p.label === 'Advanced Centre-Back + Inside Full-Back');
  check('renderSynergyDiagramSvg still renders real SVG markup for an IP pair with a diagram', renderSynergyDiagramSvg(ipPair).includes('<svg'));

  // openRoleSynergyModal shouldn't throw when the formation includes an OOP pair.
  let threw = false;
  try {
    openRoleSynergyModal([
      slot('D (R)', 'Stopping Centre-Back'),
      slot('D (R)', 'Holding Full-Back'),
    ]);
  } catch (e) { threw = true; console.error(e); }
  check('openRoleSynergyModal does not throw when rendering an OOP pair', !threw);
}

// --- renderRoleSynergyPanel now actually populates the OOP panel (previously hard-returned) -
{
  const oopSlots = [
    slot('D (C)', 'Stopping Centre-Back'),
    slot('D (C)', 'Covering Centre-Back'),
  ];
  renderRoleSynergyPanel('oop', oopSlots);
  const el = document.getElementById('tb-synergy-panel-oop');
  check('the OOP synergy panel element exists', !!el);
  check('the OOP panel is populated (not left as the old empty no-op)', el.innerHTML.includes('Stopping Centre-Back + Covering Centre-Back'));
  check('the OOP panel becomes clickable once a pair is detected', el.classList.contains('clickable'));

  // And the IP panel still works exactly as before, on its own element.
  const ipSlots = [
    slot('D (C)', 'Advanced Centre-Back'),
    slot('D (R)', 'Inside Full-Back'),
  ];
  renderRoleSynergyPanel('ip', ipSlots);
  const ipEl = document.getElementById('tb-synergy-panel');
  check('the IP synergy panel still populates on its own element', ipEl.innerHTML.includes('Advanced Centre-Back + Inside Full-Back'));
}

// --- applyRoleSynergyBias now also runs for OOP (no more IP-only guard) -------------------
{
  // Two DM(C)-eligible slots where slot 0 is anchored as DDM and slot 1's own top pick is
  // something else, but Dropping Defensive Midfielder is a very close (near-zero-cost)
  // second choice — applyRoleSynergyBias should nudge slot 1 onto DDM's OOP partner role
  // (Pressing Full-Back) if it's a close second there instead, proving the bias pass runs at
  // all for OOP slots now (previously this whole call was skipped for phase 'oop').
  const slots = [
    slot('DM (C)', 'Dropping Defensive Midfielder'),
    slot('D (R)', 'Full-Back'),
  ];
  const slotCandidates = [
    [{ roleName: 'Dropping Defensive Midfielder', score: 85 }],
    [{ roleName: 'Full-Back', score: 80 }, { roleName: 'Pressing Full-Back', score: 79 }],
  ];
  applyRoleSynergyBias(slots, slotCandidates);
  check('applyRoleSynergyBias nudges an OOP slot toward completing a known OOP synergy', slots[1].role === 'Pressing Full-Back');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
