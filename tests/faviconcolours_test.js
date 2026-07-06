// Regression test for updateFaviconColours() — Tom asked for the browser tab icon (the FMCC
// badge, see #fmcc-favicon in <head>) to track the loaded club's actual colours rather than
// always sitting on the app's default black-and-red theme. applyClubColours() (the single
// function everything else already calls whenever club colours change — boot, an import,
// Clear All Data, restoring a backup) rebuilds the favicon's data: URI on every call, since a
// <link> favicon can't read this page's CSS custom properties the way the in-page .fmcc-badge
// does. The badge's centre is a football icon matching a reference photo Tom supplied: a
// solid black ball with a central pentagon and 5 straight, symmetric lines running out to the
// ball's edge (an earlier pass tried curved/bowed lines with extra rim-connector arcs, but Tom
// preferred the straight symmetric look of the original reference) — a black equator band and
// plain white "FMCC" text sit on top — see updateFaviconColours()'s own comment. The band is
// narrow (46 wide) rather than spanning the ball's full width: an earlier, wider version of
// the band completely erased the two nearly-horizontal side spokes (they only ever poke out
// past a band's *sides*, never its top/bottom), which made the badge stop reading as a
// football — Tom caught this ("still missing some of the spokes"). Narrowing the band instead
// of shortening it keeps the FMCC text fully covered while letting the outer half of every
// spoke reach the rim. The ball's black background/band/text stay fixed regardless of club
// colours, but the panel lines (the polygon plus all 5 straight lines) are drawn in the actual
// primary colour passed in, so the favicon's panel-line colour changes whenever a different
// club's colours load.

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
// white "FMCC" text) plus the pentagon/straight panel lines in the club's actual primary colour
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
  check('the decoded favicon SVG has no curved <path> ball artwork any more (straight spokes, not curves)', !decoded.includes("<path d='M42.36"));
  check('the decoded favicon SVG has all 5 straight radiating panel lines in the primary colour', (decoded.match(/<line [^>]*stroke='#14305A'/g) || []).length === 5);
  check('the pentagon outline itself is also in the primary colour', decoded.includes("stroke='#14305A'") && decoded.includes('<polygon'));
  check('the decoded favicon SVG has the black equator band clipped to the ball', decoded.includes("clip-path='url(#fmccBallClipFavicon)'"));
  check('the equator band is narrow (46 wide), not spanning the ball\'s full width', decoded.includes("x='27' y='41' width='46' height='18'"));
  // Regression guard for the actual bug: both side spokes' rim endpoints (x=16.69 and x=83.31)
  // must fall outside the band's x-range (27 to 73), otherwise the band would be wide enough
  // to swallow those spokes completely again, same as the earlier 80-wide version did.
  const bandX0 = 27, bandX1 = 27 + 46;
  check('the left spoke\'s rim endpoint sits outside the band\'s x-range (would vanish otherwise)', decoded.includes("x2='16.69'") && 16.69 < bandX0);
  check('the right spoke\'s rim endpoint sits outside the band\'s x-range (would vanish otherwise)', decoded.includes("x2='83.31'") && 83.31 > bandX1);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
