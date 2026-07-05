// Regression test for Task #132 — hero card kit display (Home/Away/Third next to
// Manager+Division, with a name label under each image). Covers: setKitImage() mirroring
// into the hero card's own image/item elements, the "no third kit" case collapsing that
// item rather than showing a broken image, and the "nothing loaded yet" placeholder
// showing/hiding correctly as kits come and go.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

// Start from a clean slate for all three kit slots.
KIT_TYPES.forEach(t => setKitImage(t, null, false));

// --- Nothing loaded: hero card shows the empty placeholder, no kit items visible ---------
{
  check('hero-kits-empty is visible when no kits are loaded', document.getElementById('hero-kits-empty').style.display === 'block');
  KIT_TYPES.forEach(t => {
    check(`hero-kit-${t}-item is hidden when no kits are loaded`, document.getElementById(`hero-kit-${t}-item`).style.display === 'none');
  });
}

// --- Home + Away only (the common "no third kit" case) -----------------------------------
{
  setKitImage('home', 'data:image/png;base64,HOMEDATA');
  setKitImage('away', 'data:image/png;base64,AWAYDATA');

  check('hero-kit-home-item shown once a home kit is set', document.getElementById('hero-kit-home-item').style.display === 'flex');
  check('hero-kit-home-img gets the right src', document.getElementById('hero-kit-home-img').src === 'data:image/png;base64,HOMEDATA');
  check('hero-kit-away-item shown once an away kit is set', document.getElementById('hero-kit-away-item').style.display === 'flex');
  check('hero-kit-away-img gets the right src', document.getElementById('hero-kit-away-img').src === 'data:image/png;base64,AWAYDATA');
  check('hero-kit-third-item stays hidden (no third kit) — collapses instead of showing a gap', document.getElementById('hero-kit-third-item').style.display === 'none');
  check('hero-kits-empty hides once at least one kit is loaded', document.getElementById('hero-kits-empty').style.display === 'none');
}

// --- All three present ---------------------------------------------------------------------
{
  setKitImage('third', 'data:image/png;base64,THIRDDATA');
  check('hero-kit-third-item shows once a third kit is set', document.getElementById('hero-kit-third-item').style.display === 'flex');
  check('hero-kit-third-img gets the right src', document.getElementById('hero-kit-third-img').src === 'data:image/png;base64,THIRDDATA');
}

// --- Clearing a kit hides it again, and re-shows the empty message once ALL are cleared ---
{
  setKitImage('home', null);
  setKitImage('away', null);
  check('hero-kits-empty stays hidden while third kit is still loaded', document.getElementById('hero-kits-empty').style.display === 'none');
  setKitImage('third', null);
  check('hero-kits-empty reappears once every kit has been cleared', document.getElementById('hero-kits-empty').style.display === 'block');
  KIT_TYPES.forEach(t => {
    check(`hero-kit-${t}-item is hidden again after clearing`, document.getElementById(`hero-kit-${t}-item`).style.display === 'none');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
