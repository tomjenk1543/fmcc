# FMCC screenshot-capture tools

## Club Data (Step 1)

This used to be a standalone terminal script (`capture_club_data.py`) that drove your
mouse via pre-calculated screen coordinates. It's gone now - calibrating those
coordinates to every screen size and FM UI version turned out to be too fragile, and
it needed pyautogui/pillow/pynput installed plus a Screen Recording permission grant
just to run.

Instead, just ask Claude to do the Club Data capture directly: open Football Manager,
have it on the Club Overview screen (or anywhere with the top nav visible), and ask
something like "capture my club data for FMCC." Claude takes control of your screen
for that one step, looks at what's actually on screen instead of guessing coordinates,
navigates to the screens listed below, takes the screenshots, and converts them
straight into the Step 1 JSON without any file handoff. You'll get a one-time prompt
to grant Claude access to Football Manager.

Where to find each field (so Claude doesn't have to hunt around FM's menus every
time):

- League table: `Portal > Stages` (change the dropdown if there's more than one phase,
  e.g. a playoff round)
- Club overview (name/manager/division/stadium/crest): `Club > Club Site`
- Stadium capacity: `Club > Club Site > About Club (click the stadium name) > Facilities`
- All-time club records: `Club > Club Site > Club History (tile) > Club History
  Records (tile) > All Time Records tab > Players` sub-tab (Transfers sub-tab for
  record transfer fee)
- Manager career stats (years managed, win %, transfer spend): `Career > Managerial
  Stats` (the "Current Club" column of the Overall popup)
- Achievements/trophies won at this club: `Career > My History`
- Save file name: `Club > Club Site > FM Menu` (gear icon, top-left header, e.g.
  "Manager Name - Club Name")
- League/competition unique ID (`fmCompetitionId`, powers the league logo lookup):
  `Club > Club Site > Competitions (tile) > click the league's own name` (e.g.
  SuperLiga) - the Competition Overview page that opens shows it directly in its own
  header, e.g. "SuperLiga (ID: 7540024)", no separate preference toggle needed

This only needs to happen once per save, or whenever you want to refresh the numbers.
The finished JSON gets saved to `exports/` in this project (e.g. `exports/club_data_step1.json`),
so it's easy to find again later. That folder isn't tracked in git, since it holds your
own save data rather than app code.

## Squad Data, Tactic Data, Scouting, Performance Data (Steps 2-5)

Still manual for now - see the Setup Guide for what to screenshot and where to paste
the result. Football Manager's CSV export isn't available on Mac yet; once it is,
these steps can likely be automated properly (a real data export instead of screenshot
transcription), so no point building throwaway tooling around screenshots for these in
the meantime.
