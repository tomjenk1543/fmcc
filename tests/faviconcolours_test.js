// Regression test for updateFaviconColours() — Tom asked for the browser tab icon (the FMCC
// badge, see #fmcc-favicon in <head>) to track the loaded club's actual colours rather than
// always sitting on the app's default black-and-red theme. applyClubColours() (the single
// function everything else already calls whenever club colours change — boot, an import,
// Clear All Data, restoring a backup) rebuilds the favicon's data: URI on every call, since a
// <link> favicon can't read this page's CSS custom properties the way the in-page .fmcc-badge
// does. The badge's centre is a football icon recreated from a reference photo Tom supplied:
// a solid black ball with a central pentagon, 5 curved lines (not straight spokes) bowing out
// to the ball's edge, and 5 more short curves linking those rim points to each other — a black
// equator band and plain white "FMCC" text sit on top — see updateFaviconColours()'s own
// comment. The ball's black background/band/text stay fixed regardless of club colours, but
// the panel lines (the polygon plus all 10 curved paths) are drawn in the actual primary
// colour passed in, so the favicon's panel-line colour changes whenever a different club's
// colours load.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// --- applyClubColours() rebuilds the favicon with the new primary colour baked into the
// pentagon/panel lines -----------------------------------------------------------------------
{
  applyClubColours('#123456', '#abcdef');
  const href = document.getElementById('fmcc-favicon').href;
  check('favicon href is a data: SVG URI', href.startsWith('data:image/svg+xml,'));
  check('favicon SVG bakes in the primary colour on the panel lines', href.includes(encodeURIComponent('#123456')));
}

// --- Calling it again with a different primary colour updates the panel lines, and the old
// colour is gone --------------------------------------------------------------------------
{
  applyClubColours('#d81f2a', '#1a1a1a');
  const href = document.getElementById('fmcc-favicon').href;
  check('a later applyClubColours() call replaces the old primary colour', !href.includes(encodeURIComponent('#123456')));
  check('a later applyClubColours() call bakes in the new primary colour', href.includes(encodeURIComponent('#d81f2a')));
}

// --- The favicon SVG decodes back to well-formed markup (not mangled by string concatenation)
// and carries the fixed football artwork (black ball, black equator band clipped to it, plain
// white "FMCC" text) plus the pentagon/curved panel lines in the club's actual primary colour -
{
  applyClubColours('#14305A', '#4C7CBE');
  const href = document.getElementById('fmcc-favicon').href;
  const decoded = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  check('the decoded favicon SVG starts with an <svg> tag', decoded.trim().startsWith('<svg'));
  check('the decoded favicon SVG ends with a closing </svg> tag', decoded.trim().endsWith('</svg>'));
  check('the decoded favicon SVG still has the "FMCC" monogram as one plain text run', decoded.includes('>FMCC</text>'));
  check('the "FMCC" monogram is filled plain white, not a club colour', decoded.includes("fill='#fff'>FMCC"));
  check('the decoded favicon SVG has the black ball circle', decoded.includes("r='34' fill='#000'"));
  check('the decoded favicon SVG has the central pentagon panel outline', decoded.includes('<polygon points='));
  check('the decoded favicon SVG has all 10 curved panel paths (5 spokes + 5 rim connectors) in the primary colour', (decoded.match(/<path d='[^']*' fill='none' stroke='#14305A'/g) || []).length === 10);
  check('the pentagon outline itself is also in the primary colour', decoded.includes("stroke='#14305A'") && decoded.includes('<polygon'));
  check('the decoded favicon SVG has the black equator band clipped to the ball', decoded.includes("clip-path='url(#fmccBallClipFavicon)'"));
  check('the equator band is the enlarged size (24 tall, not the old 18)', decoded.includes("y='38' width='80' height='24'"));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
