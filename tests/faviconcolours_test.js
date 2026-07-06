// Regression test for updateFaviconColours() — Tom asked for the browser tab icon (the FMCC
// badge, see #fmcc-favicon in <head>) to track the loaded club's actual colours rather than
// always sitting on the app's default black-and-red theme. applyClubColours() (the single
// function everything else already calls whenever club colours change — boot, an import,
// Clear All Data, restoring a backup) now also rebuilds the favicon's data: URI with the
// real hex values baked in, since a <link> favicon can't read this page's CSS custom
// properties the way the in-page .fmcc-badge does.
//
// Two-tone split-circle badge (see .fmcc-badge's own comment) with a plain white "FMCC"
// monogram and a thin black outline stroke (paint-order="stroke" so the stroke sits behind
// the fill) across its middle - club-colour-independent, so it stays readable regardless
// of which two colours the split halves end up using.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- applyClubColours() rebuilds the favicon with the new colours baked in -----------------
{
  applyClubColours('#123456', '#abcdef');
  const href = document.getElementById('fmcc-favicon').href;
  check('favicon href is a data: SVG URI', href.startsWith('data:image/svg+xml,'));
  check('favicon SVG bakes in the primary colour', href.includes(encodeURIComponent('#123456')));
  check('favicon SVG bakes in the secondary colour', href.includes(encodeURIComponent('#abcdef')));
}

// --- Calling it again with different colours (e.g. loading a different save) updates it again
{
  applyClubColours('#d81f2a', '#1a1a1a');
  const href = document.getElementById('fmcc-favicon').href;
  check('a later applyClubColours() call replaces the old colours', !href.includes(encodeURIComponent('#123456')));
  check('a later applyClubColours() call bakes in the new primary colour', href.includes(encodeURIComponent('#d81f2a')));
  check('a later applyClubColours() call bakes in the new secondary colour', href.includes(encodeURIComponent('#1a1a1a')));
}

// --- The favicon SVG decodes back to well-formed markup (not mangled by string concatenation)
{
  applyClubColours('#14305A', '#4C7CBE');
  const href = document.getElementById('fmcc-favicon').href;
  const decoded = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  check('the decoded favicon SVG starts with an <svg> tag', decoded.trim().startsWith('<svg'));
  check('the decoded favicon SVG ends with a closing </svg> tag', decoded.trim().endsWith('</svg>'));
  // Monogram is a single plain "FMCC" text node, filled white with a thin black outline
  // stroke, rather than split into per-half cross-matched tspans - see
  // updateFaviconColours()'s own comment.
  check('the decoded favicon SVG has the plain "FMCC" monogram', decoded.includes(">FMCC</text>"));
  check('the monogram is filled white so it stays readable regardless of club colours', /<text[^>]*fill='#fff'[^>]*>FMCC<\/text>/.test(decoded));
  check('the monogram has a black outline stroke painted behind the fill', /<text[^>]*stroke='#000'[^>]*paint-order='stroke'[^>]*>FMCC<\/text>/.test(decoded));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
