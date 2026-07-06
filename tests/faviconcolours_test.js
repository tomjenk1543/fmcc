// Regression test for updateFaviconColours() — Tom asked for the browser tab icon (the FMCC
// badge, see #fmcc-favicon in <head>) to track the loaded club's actual colours rather than
// always sitting on the app's default black-and-red theme. applyClubColours() (the single
// function everything else already calls whenever club colours change — boot, an import,
// Clear All Data, restoring a backup) rebuilds the favicon's data: URI on every call, since a
// <link> favicon can't read this page's CSS custom properties the way the in-page .fmcc-badge
// does. The badge's centre is a football icon matching a detailed reference photo Tom supplied
// (a stitched-seam soccer ball with a full pentagon/hexagon panel layout): a solid black ball
// with a pentagon EXACTLY CENTRED on the ball itself (pentagon centre (50,50), same as the
// ball's own centre — two earlier passes had it offset upward at (50,44)/(50,46), which Tom
// flagged as still not centre-aligned), VERTEX-UP (a single point at the top), with 5 straight
// spokes running from its vertices to the ball's r=34 rim, plus 5 more straight lines chaining
// those rim endpoints together — representing the visible edges of the neighbouring hexagon
// panels near the rim, per Tom's "include the parts of the other pentagons that we can see"
// request. All 10 lines are straight, never curved (an earlier pass tried curved/bowed lines
// with extra rim-connector arcs, but Tom preferred the straight symmetric look).
//
// The "FMCC" monogram and its black equator band were added, then temporarily removed while
// the football shape itself was being iterated on, and are now back — see .fmcc-badge's own
// comment for the full story, including why the band stays narrow (46 wide, not the ball's
// full width) rather than short: a full-width band would swallow the two spokes running close
// to the ball's vertical middle entirely, so narrowing it instead lets the outer half of every
// spoke/chord still reach the rim while the band still fully covers the "FMCC" text underneath
// it. These checks reflect that current, band-and-text-restored state.

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
// and carries the football ball artwork (black ball, centred pentagon + 10 straight panel
// lines) in the club's actual primary colour, plus the black equator band and white "FMCC"
// monogram on top -----------------------------------------------------------------------------
{
  applyClubColours('#14305A', '#4C7CBE');
  const href = document.getElementById('fmcc-favicon').href;
  const decoded = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  check('the decoded favicon SVG starts with an <svg> tag', decoded.trim().startsWith('<svg'));
  check('the decoded favicon SVG ends with a closing </svg> tag', decoded.trim().endsWith('</svg>'));
  check('the decoded favicon SVG has the black ball circle', decoded.includes("r='34' fill='#000'"));
  check('the decoded favicon SVG has the central pentagon panel outline', decoded.includes('<polygon points='));
  check('the pentagon is vertex-up and exactly centred on the ball (top vertex at 50,37, ball centre 50,50)', decoded.includes("<polygon points='50,37"));
  check('the pentagon\'s top vertex has a spoke running straight up to the rim (50,16)', decoded.includes("x1='50' y1='37' x2='50' y2='16'"));
  check('the decoded favicon SVG has no curved <path> ball artwork (straight spokes, not curves)', !decoded.includes("<path d='M42.36"));
  check('the decoded favicon SVG has all 10 straight lines (5 spokes + 5 rim chords) in the primary colour', (decoded.match(/<line [^>]*stroke='#14305A'/g) || []).length === 10);
  check('the pentagon outline itself is also in the primary colour', decoded.includes("stroke='#14305A'") && decoded.includes('<polygon'));
  check('the rim chords connect adjacent spoke endpoints (e.g. 82.34,39.49 -> 69.98,77.51)', decoded.includes("x1='82.34' y1='39.49' x2='69.98' y2='77.51'"));
  check('the rim chords close the loop back to the top spoke endpoint (17.66,39.49 -> 50,16)', decoded.includes("x1='17.66' y1='39.49' x2='50' y2='16'"));
  check('the "FMCC" monogram is present, in plain white, centred on the ball', decoded.includes(">FMCC<") && decoded.includes("x='50' y='50' dy='0.35em'") && decoded.includes("fill='#fff'>FMCC<"));
  check('the black equator band is present, narrow (46 wide) rather than spanning the full ball', decoded.includes("<rect x='27' y='41' width='46' height='18' fill='#000' clip-path='url(#fmccBallClipFavicon)'/>"));
  check('the equator band sits on top of the pentagon/spoke group but before the outer ring', decoded.indexOf("</g>") < decoded.indexOf("<rect x='27'") && decoded.indexOf("<rect x='27'") < decoded.indexOf("r='47' fill='none'"));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
