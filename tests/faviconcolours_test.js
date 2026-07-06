// Regression test for updateFaviconColours() — Tom asked for the browser tab icon (the FMCC
// badge, see #fmcc-favicon in <head>) to track the loaded club's actual colours rather than
// always sitting on the app's default black-and-red theme. applyClubColours() (the single
// function everything else already calls whenever club colours change — boot, an import,
// Clear All Data, restoring a backup) rebuilds the favicon's data: URI on every call, since a
// <link> favicon can't read this page's CSS custom properties the way the in-page .fmcc-badge
// does. The badge's centre was later redesigned to a fixed football look (white ball, black
// seam curves, black equator band, plain white "FMCC" text) that's the same no matter which
// club is loaded — see updateFaviconColours()'s own comment. Its primary/secondary parameters
// are kept only so every existing call site keeps working; nothing in the SVG string actually
// varies with them any more, so — unlike before this redesign — the rebuilt favicon href is
// now identical across different club colours. These checks confirm that's genuinely the case
// (rather than a leftover reference to club colours some other check would have caught) and
// that the fixed football artwork itself decodes to well-formed, present markup.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- applyClubColours() still runs updateFaviconColours() and leaves a valid data: URI ------
{
  applyClubColours('#123456', '#abcdef');
  const href = document.getElementById('fmcc-favicon').href;
  check('favicon href is a data: SVG URI', href.startsWith('data:image/svg+xml,'));
}

// --- Calling it again with different colours doesn't change the favicon at all any more,
// since the centre artwork is now fixed and nothing else in the SVG reads primary/secondary --
{
  applyClubColours('#d81f2a', '#1a1a1a');
  const href1 = document.getElementById('fmcc-favicon').href;
  applyClubColours('#14305A', '#4C7CBE');
  const href2 = document.getElementById('fmcc-favicon').href;
  check('the rebuilt favicon is identical across different club colours (fixed football design)', href1 === href2);
}

// --- The favicon SVG decodes back to well-formed markup (not mangled by string concatenation)
// and carries the fixed football design: white ball, black seam curves, black equator band
// clipped to the ball, plain white "FMCC" text — none of it tied to club colours any more.
{
  applyClubColours('#14305A', '#4C7CBE');
  const href = document.getElementById('fmcc-favicon').href;
  const decoded = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  check('the decoded favicon SVG starts with an <svg> tag', decoded.trim().startsWith('<svg'));
  check('the decoded favicon SVG ends with a closing </svg> tag', decoded.trim().endsWith('</svg>'));
  check('the decoded favicon SVG still has the "FMCC" monogram as one plain text run', decoded.includes('>FMCC</text>'));
  check('the "FMCC" monogram is filled plain white, not a club colour', decoded.includes("fill='#fff'>FMCC"));
  check('the decoded favicon SVG has the white ball circle', decoded.includes("r='34' fill='#fff'"));
  check('the decoded favicon SVG has the two black seam-curve paths', (decoded.match(/stroke='#000'/g) || []).length === 2);
  check('the decoded favicon SVG has the black equator band clipped to the ball', decoded.includes("clip-path='url(#fmccBallClipFavicon)'"));
  check('the favicon no longer bakes club colours into the centre artwork', !decoded.includes('#14305A') && !decoded.includes('#4C7CBE'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
