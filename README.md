# FM Command Centre (FMCC)

A single-file, self-contained companion web app for a Football Manager save — built as
plain HTML/CSS/JS with no build step, no dependencies, and no server. Open
`FM_Command_Centre.html` directly in a browser to run it.

## Getting it

If you only have the single `FM_Command_Centre.html` file, or you want the rest of the
project (setup guide, sample data) without cloning manually, download `setup.py` from
this repo and run:

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

## Running it as a desktop app (Mac)

`FM Command Centre.app` opens the HTML file in a plain, tab-free browser window
(Chrome/Edge/Brave app mode) instead of a normal browser tab, so it looks and behaves
like a standalone app rather than a webpage. Double-click it, or drag it to the Dock.
It always points at `~/Documents/FMCC/FM_Command_Centre.html`, so it works from
wherever you move the launcher itself. It shows up as "Google Chrome" in the Dock and
Cmd+Tab, since it's Chrome running without its normal window chrome rather than a
fully separate program.

## Layout

- `FM_Command_Centre.html` — the entire app (markup, styles, and script all in one file).
- `FM Command Centre.app` — Mac desktop-app launcher. See above.
- `setup.py` — first-run installer for someone who only has the HTML file; sets up the
  full project under `~/Documents/FMCC/`. See "Getting it" above.
- `tests/` — a regression test suite run against a small mock-DOM harness under plain
  Node (no browser needed). Not part of the app itself, and not tracked in git, so it
  won't be there if you got FMCC via `setup.py` or a fresh clone — it's a dev-only
  folder for anyone working on FMCC's own code.
- `sample-data/` — small, synthetic example JSON files used by the tests / for trying out
  the Setup Wizard's import feature without needing a real save export.
- `docs/` — setup / data-collection guides.
- `tools/` — notes on the Setup Guide's data-collection steps. Club Data (Step 1) is
  captured live by asking Claude to take screen control rather than running a script;
  see `tools/README.md`.

## Running the tests

Dev-only — `tests/` isn't tracked in git (see "Layout" above), so this only applies if
you're working on FMCC's own code with that folder present locally.

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
