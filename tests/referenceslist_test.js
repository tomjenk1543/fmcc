// Regression test for Settings > Data Sources' reference-list — Tom asked for the "Mastering
// FM26" eBook (the one FM26 Ebook - Ideas for FMCC.docx drew on) to be added here as a link out
// to buy it, not bundled with the app itself (it's a paid guide, not something FMCC can ship a
// copy of). Reads the app's raw HTML the same way pagetransitions_test.js/
// recruitmentmissions_test.js read raw CSS, since this is static markup content rather than
// DOM state any interaction produces.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}

const fs = require('fs');
const appHtml = fs.readFileSync(process.env.FMCC_APP_HTML, 'utf8');
const listMatch = appHtml.match(/<ul class="reference-list">([\s\S]*?)<\/ul>/);
const listHtml = listMatch ? listMatch[1] : '';

check('the reference-list is found at all', !!listMatch);
check('links out to the Mastering FM26 eBook purchase page', listHtml.includes('https://www.footballmanagerblog.org/p/mastering-fm26-ebook.html'));
check('opens in a new tab like every other reference link', /href="https:\/\/www\.footballmanagerblog\.org\/p\/mastering-fm26-ebook\.html" target="_blank" rel="noopener"/.test(listHtml));
check('makes clear it is a paid eBook, not bundled with the app', /Mastering FM26.*paid eBook/.test(listHtml));
check('the description explicitly says it is not bundled with FMCC', listHtml.includes('Not bundled with FMCC'));

// The other three references should still be intact — this is an addition, not a replacement.
check('sortitoutsi attributes reference is still there', listHtml.includes('sortitoutsi.net'));
check('fmsidekick formations reference is still there', listHtml.includes('fmsidekick.com'));
check('FM Blog Role Synergy reference is still there', listHtml.includes('fm26-role-synergy-best-player-role-combinations'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
