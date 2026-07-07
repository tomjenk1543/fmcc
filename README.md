# FM Command Centre (FMCC)

A single-file, self-contained companion web app for a Football Manager save — built as
plain HTML/CSS/JS with no build step, no dependencies, and no server. Open
`FM_Command_Centre.html` directly in a browser to run it.

## Getting it

If you only have the single `FM_Command_Centre.html` file, or you want the rest of the
project (setup guide, sample data, screenshot tool) without cloning manually, download
`setup.py` from this repo and run:

```
python3 setup.py
```

It creates `~/Documents/FMCC/`, pulls in the full project (via git if you have it,
otherwise a plain ZIP download), and opens the app for you. No dependencies beyond
Python itself.

If you already know your way around git, cloning the repo directly works too:

```
git clone https://github.com/tomjenk1543/fmcc.git
```

## Layout

- `FM_Command_Centre.html` — the entire app (markup, styles, and script all in one file).
- `setup.py` — first-run installer for someone who only has the HTML file; sets up the
  full project under `~/Documents/FMCC/`. See "Getting it" above.
- `tests/` — a regression test suite run against a small mock-DOM harness under plain
  Node (no browser needed). Not part of the app itself.
- `sample-data/` — small, synthetic example JSON files used by the tests / for trying out
  the Setup Wizard's import feature without needing a real save export.
- `docs/` — setup / data-collection guides.
- `tools/` — optional helper scripts, e.g. `capture_club_data.py`, which automates the
  screenshots for the Setup Guide's Club Data step. Only comes with the full project
  (clone or download the whole repo, or run `setup.py`), not with a standalone copy of
  just the HTML file.

## Running the tests

```
./tests/run-all.sh
```

Runs every `tests/*_test.js` file against `FM_Command_Centre.html`'s real `<script>` body
using the mock DOM in `tests/harness/`. No real browser involved, just plain Node. Each test
file is a standalone script (no framework, just `console.error`/`process.exitCode` on failure).

## Branches

- `main`: the stable version.
- `dev`: active work happens here first. Changes merge to `main` via a Pull Request once
  confirmed working.
