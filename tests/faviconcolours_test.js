// Regression test for updateFaviconColours() — Tom asked for the browser tab icon (the FMCC
// badge, see #fmcc-favicon in <head>) to track the loaded club's actual colours rather than
// always sitting on the app's default black-and-red theme. applyClubColours() (the single
// function everything else already calls whenever club colours change — boot, an import,
// Clear All Data, restoring a backup) rebuilds the favicon's data: URI on every call, since a
// <link> favicon can't read this page's CSS custom properties the way the in-page .fmcc-badge
// does. The badge's centre is a football icon matching a reference photo Tom supplied: a
// solid black ball with a central pentagon and 5 straight, symmetric lines running out to the
// ball's edge (an earlier pass tried curved/bowed lines with extra rim-connector arcs, but Tom
// preferred the straight symmetric look of the original reference). The pentagon is VERTEX-UP
// (a single point at the top, not a flat top edge) and centred slightly above the ball's own
// centre — see .fmcc-badge's own comment for the exact geometry — matching the reference
// photo's actual orientation; an earlier pass used a flat-top pentagon centred lower down,
// which Tom flagged didn't match the photo he'd sent.
//
// The "FMCC" monogram and its black equator band were added, then removed again — see
// .fmcc-badge's own comment for the full story. The band (even narrowed) was fighting with
// the two nearly-horizontal side spokes, and Tom asked to pull the monogram/band back out
// until the pentagon/spoke artwork itself reads correctly as a football, rather than keep
// tuning the band around it. These checks reflect that current, text-and-band-free state.

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
// and carries the football ball artwork (black ball, pentagon + 5 straight panel lines) in the
// club's actual primary colour, with no FMCC monogram and no equator band any more -----------
{
  applyClubColours('#14305A', '#4C7CBE');
  const href = document.getElementById('fmcc-favicon').href;
  const decoded = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  check('the decoded favicon SVG starts with an <svg> tag', decoded.trim().startsWith('<svg'));
  check('the decoded favicon SVG ends with a closing </svg> tag', decoded.trim().endsWith('</svg>'));
  check('the decoded favicon SVG has the black ball circle', decoded.includes("r='34' fill='#000'"));
  check('the decoded favicon SVG has the central pentagon panel outline', decoded.includes('<polygon points='));
  check('the pentagon is vertex-up (top vertex at 50,32, not a flat-top edge)', decoded.includes("<polygon points='50,32"));
  check('the pentagon\'s top vertex has a spoke running straight up to the rim (50,16)', decoded.includes("x1='50' y1='32' x2='50' y2='16'"));
  check('the decoded favicon SVG has no curved <path> ball artwork (straight spokes, not curves)', !decoded.includes("<path d='M42.36"));
  check('the decoded favicon SVG has all 5 straight radiating panel lines in the primary colour', (decoded.match(/<line [^>]*stroke='#14305A'/g) || []).length === 5);
  check('the pentagon outline itself is also in the primary colour', decoded.includes("stroke='#14305A'") && decoded.includes('<polygon'));
  check('the "FMCC" monogram has been removed for now', !decoded.includes('>FMCC<'));
  check('the black equator band has been removed for now', !decoded.includes("fill='#000' clip-path='url(#fmccBallClipFavicon)'"));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
