// Regression test for the "pages/popups shouldn't just pop in" transition polish: a quick
// opacity fade on .view.active when switchToView() shows a page, and a fade+scale on
// .player-modal-backdrop (shared by every popup in the app — player/scout detail, gaps
// view-all, every Import & Reload box, Performance Data's Full Overview, etc.) instead of the
// old instant display:none/flex swap. Both are real animations/transitions that only actually
// play in a real browser — the mock DOM harness has no CSS engine at all, so this reads the
// app's raw <style> text (same technique as recruitmentmissions_test.js) rather than trying to
// observe rendered motion, just to lock in that the rules are present and shaped the way the
// comments next to them say they should be.
//
// viewFadeIn was originally opacity+translateY ("fade + slight rise"), but Tom reported the
// Scouting page picking up a persistent sliver of scroll after that shipped. Every .view is a
// direct child of main (overflow-y:auto), and a transformed child's post-transform geometry
// counts toward its scroll-container ancestor's scrollable overflow per the CSS Transforms
// spec — invisible on most pages, but Scouting's tiles measure their own real rendered height
// at the exact moment switchToView() adds the animated class, so it could bake in a
// slightly-too-tall measurement. Dropped the transform entirely; opacity alone can't affect
// layout/scrollable overflow, so this class of bug can't recur here regardless of which page
// is switched to. The check below locks in that it stays opacity-only.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

const fs = require('fs');
const appHtml = fs.readFileSync(process.env.FMCC_APP_HTML, 'utf8');
const styleBlock = appHtml.match(/<style>([\s\S]*?)<\/style>/)[1];

function ruleBodyFor(selector) {
  const re = new RegExp(selector.replace(/[.#]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const m = styleBlock.match(re);
  return m ? m[1] : '';
}

// --- Page switches fade in rather than hard-cutting ------------------------------------------
{
  const viewActiveRule = ruleBodyFor('.view.active');
  check('.view.active still switches display to block', /display:\s*block/.test(viewActiveRule));
  check('.view.active plays a fade-in animation', /animation:\s*viewFadeIn/.test(viewActiveRule));
  check('viewFadeIn keyframes exist', /@keyframes viewFadeIn\s*\{/.test(styleBlock));
  const viewFadeInMatch = styleBlock.match(/@keyframes viewFadeIn\s*\{([\s\S]*?)\}\s*\}/);
  const viewFadeInBody = viewFadeInMatch ? viewFadeInMatch[1] : '';
  check('viewFadeIn animates from transparent to visible', /from\s*\{\s*opacity:\s*0;?\s*\}/.test(viewFadeInBody));
  check('viewFadeIn is opacity-only — no transform (would count toward main\'s scrollable overflow, see the comment above)', !/transform/.test(viewFadeInBody));
  check('view fade-in is skipped under prefers-reduced-motion', /prefers-reduced-motion:\s*reduce\)\s*\{\s*\.view\.active\s*\{\s*animation:\s*none/.test(styleBlock));
}

// --- Popup modals fade + scale in and out, instead of an instant display swap ----------------
{
  const backdropRule = ruleBodyFor('.player-modal-backdrop');
  check('closed modals start at opacity 0', /opacity:\s*0\s*;/.test(backdropRule));
  check('closed modals are hidden from tab order/hit-testing (visibility, not display)', /visibility:\s*hidden/.test(backdropRule));
  check('closed modals do not intercept clicks', /pointer-events:\s*none/.test(backdropRule));
  check('closed modals stay display:flex so opacity has something to transition (display cannot animate)', /display:\s*flex/.test(backdropRule));

  const backdropOpenRule = ruleBodyFor('.player-modal-backdrop.open');
  check('open modals fade to fully visible', /opacity:\s*1\s*;/.test(backdropOpenRule));
  check('open modals are interactive again', /pointer-events:\s*auto/.test(backdropOpenRule));

  check('the modal card itself settles in with a transform transition', /\.player-modal-backdrop \.player-modal\s*\{[^}]*transition:\s*transform/.test(styleBlock));
  check('the modal card starts slightly offset\\/scaled down', /\.player-modal-backdrop \.player-modal\s*\{[^}]*transform:\s*translateY\([^)]+\)\s*scale\(/.test(styleBlock));
  check('the modal card settles to its natural position/scale once open', /\.player-modal-backdrop\.open \.player-modal\s*\{[^}]*transform:\s*translateY\(0\)\s*scale\(1\)/.test(styleBlock));

  check('modal transitions are turned off under prefers-reduced-motion', /prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]{0,400}\.player-modal-backdrop/.test(styleBlock));
}

// --- The full-screen import loading overlay also fades in rather than popping ----------------
{
  const overlayOpenRule = ruleBodyFor('.import-loading-overlay.open');
  check('the import loading overlay fades in when opened', /animation:\s*overlayFadeIn/.test(overlayOpenRule));
  check('overlayFadeIn keyframes exist', /@keyframes overlayFadeIn\s*\{/.test(styleBlock));
}

// --- Hover-lift tiles (translateY on hover, used all over the app) can't nudge page scroll ----
// Tom reported the whole page moving a few px on hovering a tile. First attempt was
// overflow-anchor:none on both real scroll containers (main, the fallback; .view-scroll-area,
// the one that actually scrolls day to day) — a hover-lift transform's post-transform
// geometry counts toward its scroll-container ancestor's scrollable overflow, and browsers
// run "scroll anchoring" to keep content stable whenever a scroll container's bounds change,
// which is exactly what a hover-driven scrollHeight blip triggers. That's left in place below
// (harmless, and correct in its own right), but Tom reported the page still moving after it
// shipped — evidently some engines act on a transform-driven scrollHeight change more directly
// than anchoring compensation alone accounts for. The only fix that's correct regardless of
// engine/anchoring-support differences is removing the transform itself: box-shadow and
// border-color changes are pure paint and can never contribute to scrollable overflow, so
// every hover-lift in the app (.best-players-panel, #league-slot, .position-card.gaps-
// clickable, .tb-synergy-panel.clickable, .gaps-clickable) dropped its translateY, keeping
// only the shadow/border-colour half of the "elevated card" hover language.
{
  const mainRule = ruleBodyFor('main');
  check('main opts out of scroll anchoring', /overflow-anchor:\s*none/.test(mainRule));

  // Not ruleBodyFor() here — that helper's selector regex has no boundary check, so it would
  // happily match the FIRST "...\.view-scroll-area\s*\{" it finds in the file, which is the
  // earlier per-ID override "#tacticbuilder .view-scroll-area {" rather than the base rule.
  // Anchored on a line start (or opening brace) immediately before the dot instead, so this
  // targets only the real standalone ".view-scroll-area { ... }" declaration.
  const scrollAreaMatch = styleBlock.match(/[\n{]\s*\.view-scroll-area\s*\{([^}]*)\}/);
  const scrollAreaRule = scrollAreaMatch ? scrollAreaMatch[1] : '';
  check('.view-scroll-area (the real per-page scroll container) opts out of scroll anchoring', /overflow-anchor:\s*none/.test(scrollAreaRule));

  // The actual fix: no hover rule anywhere in the app moves anything via transform any more.
  // Broad on purpose (not scoped to the five known offenders) so a *new* hover-lift added
  // later can't quietly reintroduce this bug class.
  const hoverRuleMatches = styleBlock.match(/:hover(?:,[^{]*)?\s*\{[^}]*\}/g) || [];
  const hoverRulesWithTransform = hoverRuleMatches.filter(r => /transform:\s*(?!none)/.test(r));
  check('no :hover rule in the app sets a transform (translateY/scale/etc. all moved off hover)', hoverRulesWithTransform.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
