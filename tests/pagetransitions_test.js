// Regression test for the "pages/popups shouldn't just pop in" transition polish: a quick
// fade+rise on .view.active when switchToView() shows a page, and a fade+scale on
// .player-modal-backdrop (shared by every popup in the app — player/scout detail, gaps
// view-all, every Import & Reload box, Performance Data's Full Overview, etc.) instead of the
// old instant display:none/flex swap. Both are real animations/transitions that only actually
// play in a real browser — the mock DOM harness has no CSS engine at all, so this reads the
// app's raw <style> text (same technique as recruitmentmissions_test.js) rather than trying to
// observe rendered motion, just to lock in that the rules are present and shaped the way the
// comments next to them say they should be.

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
  check('viewFadeIn animates from transparent+offset to visible+settled', /from\s*\{\s*opacity:\s*0;\s*transform:\s*translateY/.test(styleBlock));
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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
