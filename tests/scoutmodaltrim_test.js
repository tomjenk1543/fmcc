// Regression test for the trimmed scouted-player fit summary (openScoutProfile) — the tier
// line now shows just the label (Perfect Fit / Nearly There / Potential / Not currently in a
// tile) with no trailing description, the "<group> fit score: N (Key×2 + Preferred...)"
// sentence is gone entirely, and the squad-status sentence is kept. The old separate
// "This player would address a current squad need" <div class="scout-gap-line"> was later
// merged into the SAME sentence as the squad-status line (see openScoutProfile()'s
// isHeadcountGap branch) — two boxes/lines making related, sometimes seemingly-contradictory
// claims (e.g. "Well Stocked" right above "addresses a current squad need") read as
// disjointed, so it's now one coherent sentence instead. #sm-tactic-fit (the active-tactic
// fit line) was also merged from its own separate box into a nested div inside
// #sm-fit-summary at the same time — checked here too.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

scoutShortlist.length = 0;

// A striker with every Technical/Mental/Physical attribute maxed at 20 — guarantees
// scoutRequirementMatch's pct is 1.0 for whatever ST(C)'s key/preferred attributes are,
// i.e. scoutFitTier(...) === 'perfect', regardless of which attributes that group actually
// references or how the currently-loaded squad happens to be shaped.
const perfectTarget = {
  name: 'Test Perfect Striker',
  position: 'ST (C)',
  age: 24,
  nation: 'BRA',
  club: 'Test FC',
  ability: '4★',
  potential: '4★',
  // addScoutedPlayers() expects already-FLATTENED attributes (name -> value), same as what
  // the real "Add to Shortlist" import path produces via flattenScoutAttributes() before
  // calling this — so build the raw nested shape and flatten it here too, rather than handing
  // over the arrays directly (which evaluateScoutTarget/scoutRequirementMatch would silently
  // fail to match against, since they look up target.attributes['Finishing'] etc., not
  // target.attributes.technical[...]).
  attributes: flattenScoutAttributes({
    technical: Array(14).fill(20),
    mental: Array(14).fill(20),
    physical: Array(8).fill(20),
  }),
};
addScoutedPlayers([perfectTarget]);
const idx = scoutShortlist.findIndex(p => p.name === 'Test Perfect Striker');

// Work out, independently of the DOM, whether this target SHOULD address a current squad
// need against whatever squad is actually loaded right now — so the gap-line assertion below
// is a real check against the app's own logic rather than an assumption about squad content.
const evaluation = evaluateScoutTarget(scoutShortlist[idx]);

openScoutProfile(idx);

const tierEl = document.querySelector ? null : null; // mockdom querySelector is a stub; use getElementById-based lookup instead
const fitSummaryHtml = document.getElementById('sm-fit-summary').innerHTML;

check('tier line is just the label with no trailing description', /Perfect Fit<\/div>/.test(fitSummaryHtml));
check('does NOT contain the old "meets X% of the ... role requirements" phrasing', !/role requirements/i.test(fitSummaryHtml));
check('does NOT contain the removed fit-score sentence', !/fit score:/i.test(fitSummaryHtml));
check('does NOT contain the Key×2 formula explanation', !/Key(&times;|×|x)2/i.test(fitSummaryHtml));
check('still contains the squad-status sentence', /Squad status there:/.test(fitSummaryHtml));

check('the old standalone scout-gap-line div is gone (merged into the status sentence)', !/scout-gap-line/.test(fitSummaryHtml));

if (evaluation.addressesGap) {
  check('addresses-gap highlight is present when addressesGap is true', /scout-addresses-gap/.test(fitSummaryHtml));
  // Whichever wording applies (headcount gap vs attribute-quality gap — see
  // openScoutProfile()'s isHeadcountGap branch), it must be part of the SAME sentence as
  // "Squad status there:", not a separate line/div below it.
  const statusIdx = fitSummaryHtml.indexOf('Squad status there:');
  const addressesIdx = fitSummaryHtml.indexOf('scout-addresses-gap');
  check('addresses-gap highlight appears after "Squad status there:" in the same sentence',
    statusIdx >= 0 && addressesIdx > statusIdx && fitSummaryHtml.slice(statusIdx, addressesIdx).indexOf('</div>') === -1);
} else {
  check('no addresses-gap highlight rendered when addressesGap is false', !/scout-addresses-gap/.test(fitSummaryHtml));
}

// #sm-fit-summary and #sm-tactic-fit used to be two separate boxes stacked back to back —
// merged into one box, with the tactic-fit line nested inside #sm-fit-summary's own
// innerHTML (see openScoutProfile()'s own comment for why it can't be statically nested in
// the HTML instead).
check('#sm-tactic-fit is nested inside #sm-fit-summary\'s own innerHTML', /scout-tactic-fit-line/.test(fitSummaryHtml));
check('the nested #sm-tactic-fit has real content (active-tactic fit line rendered)', document.getElementById('sm-tactic-fit') && document.getElementById('sm-tactic-fit').innerHTML.length > 0);

// A "Very Suited" player (every attribute maxed) has nothing dragging their fit down, so no
// "Held back by" clause should render at all.
check('a Very Suited player gets no "Held back by" clause', !/Held back by/.test(fitSummaryHtml));

// --- System-specific negative flags: a striker who is deliberately weak in the two
// attributes ('Finishing', 'Off The Ball') shared as Key by both default ST(C) IP roles
// (Target Forward and Channel Forward), everything else held at a moderate 12, so the fit
// lands short of "Very Suited" and the weakest Key attributes for whichever role wins are
// exactly those two, deterministically.
//
// The app boots blank-slate in this test harness (no save imported, so activeTacticIP is
// [] rather than its TACTIC_ROLES_METALUL_BUZAU default) — set it explicitly here so this
// check has a real active tactic with real ST(C) slots to match against, rather than always
// hitting the "No tactic set yet" branch.
activeTacticIP = TACTIC_ROLES_METALUL_BUZAU;

const technicalWeak = Array(14).fill(12);
technicalWeak[TECHNICAL_ATTR_NAMES.indexOf('Finishing')] = 3;
const mentalWeak = Array(14).fill(12);
mentalWeak[MENTAL_ATTR_NAMES.indexOf('Off The Ball')] = 3;
const physicalWeak = Array(8).fill(12);

const weakFitTarget = {
  name: 'Test Weak-Fit Striker',
  position: 'ST (C)',
  age: 24,
  nation: 'BRA',
  club: 'Test FC',
  ability: '3★',
  potential: '3★',
  attributes: flattenScoutAttributes({
    technical: technicalWeak,
    mental: mentalWeak,
    physical: physicalWeak,
  }),
};
addScoutedPlayers([weakFitTarget]);
const weakIdx = scoutShortlist.findIndex(p => p.name === 'Test Weak-Fit Striker');
openScoutProfile(weakIdx);
const weakFitSummaryHtml = document.getElementById('sm-fit-summary').innerHTML;

check('a less-than-Very-Suited player gets a "Held back by" clause', /Held back by/.test(weakFitSummaryHtml));
check('the clause names Finishing, the deliberately weak shared Key attribute', /Held back by[^.]*Finishing/.test(weakFitSummaryHtml));
check('the clause names Off The Ball, the other deliberately weak shared Key attribute', /Held back by[^.]*Off The Ball/.test(weakFitSummaryHtml));
check('the fit label itself is not Very Suited (confirms the clause condition is doing real work)', /scout-tactic-fit-highlight (mid|weak|very-weak)"/.test(weakFitSummaryHtml));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
