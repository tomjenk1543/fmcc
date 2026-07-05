// Regression test for the trimmed scouted-player fit summary (openScoutProfile) — the tier
// line now shows just the label (Perfect Fit / Nearly There / Potential / Not currently in a
// tile) with no trailing description, the "<group> fit score: N (Key×2 + Preferred...)"
// sentence is gone entirely, the squad-status sentence is kept, and "This player would
// address a current squad need" now sits in its own <div> on a new line rather than running
// on inline after the squad-status sentence.

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

if (evaluation.addressesGap) {
  check('gap line is present when addressesGap is true', /would address a current squad need/.test(fitSummaryHtml));
  check('gap line is wrapped in its own scout-gap-line div (own line, not inline)', /<div class="scout-gap-line"><span class="scout-addresses-gap">This player would address a current squad need\.<\/span><\/div>/.test(fitSummaryHtml));
  // The gap-line div must come AFTER the squad-status div, i.e. genuinely "a new line"
  // below it rather than merged into the same sentence.
  const statusIdx = fitSummaryHtml.indexOf('Squad status there:');
  const gapIdx = fitSummaryHtml.indexOf('scout-gap-line');
  check('gap-line div appears after the squad-status line', statusIdx >= 0 && gapIdx > statusIdx);
} else {
  check('no gap line rendered when addressesGap is false', !/would address a current squad need/.test(fitSummaryHtml));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
