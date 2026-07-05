// Populates the mock `document.body` from this app's REAL index.html markup before its
// <script> body runs, so every document.getElementById()/querySelectorAll() call the app
// makes at load time (and every test makes afterwards) resolves against the actual page
// structure rather than an empty shell. Concatenated between mockdom.js and appjs.js when
// assembling a test run (see tests/run-all.sh) — relies on Element/parseHtmlInto/document
// already being in scope from mockdom.js above it in the same file.
//
// Reads the FMCC_INDEX_HTML env var (set by run-all.sh) for index.html's real path, rather
// than deriving it from __dirname/this file's own location — once mockdom.js/domsetup.js/
// appjs.js/a test file are all concatenated into ONE temp script (see run-all.sh), they
// share a single __dirname (the temp file's own folder), so this file can no longer find
// its original location that way.
(function () {
  const fs = require('fs');
  const indexPath = process.env.FMCC_INDEX_HTML;
  if (!indexPath) throw new Error('domsetup: FMCC_INDEX_HTML env var not set — run via tests/run-all.sh');
  const html = fs.readFileSync(indexPath, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!bodyMatch) throw new Error('domsetup: could not find <body> in index.html at ' + indexPath);
  let bodyHtml = bodyMatch[1];
  // The real <script> block is run separately as appjs.js (extracted straight from the
  // same index.html) — strip it here so it isn't ALSO parsed as inert markup.
  bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '');
  parseHtmlInto(document.body, bodyHtml);
})();
