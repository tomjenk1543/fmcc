# FMCC screenshot-capture tools

## capture_club_data.py

Walks Football Manager to the three screens needed for the Setup Guide's
"Step 1: Club Data" and screenshots each one, saving them to a
`screenshots/` folder inside the FMCC project itself (next to
`FM_Command_Centre.html`), then opens that folder for you once done. The
same three filenames get overwritten each run rather than piling up dated
copies - it's meant to hold one fresh set for whatever save you're
currently working with.

**Setup (one-time):**
1. `pip3 install pyautogui pillow`
2. In FM: Preferences > Interface > Screen Resolution -> set to 1920x1080.
3. If you want fmClubId/fmCompetitionId auto-loaded in FMCC: Preferences >
   Your World > turn on "Show Unique IDs" before running the script.
4. On Mac: System Settings > Privacy & Security > Screen Recording -> turn
   this on for whichever app you're running the script from (Terminal,
   iTerm, etc). Without it every screenshot fails with "could not create
   image from display". Fully quit and reopen that app afterward, the
   toggle doesn't take effect until you do.
5. Also on Mac: macOS Sequoia can still show a one-off "is requesting to
   bypass the system private window picker" popup even with Screen
   Recording already granted, and if it lands mid-run it gets captured
   instead of FM. Clear it first: run `screencapture -x /tmp/test.png` by
   hand, click Allow, then run the real script.

**Running it:**
```
python3 capture_club_data.py
```
Switch to Football Manager and leave it focused - the whole run is driven by
short countdowns rather than any keypress, so you never need to alt-tab back
to the terminal. The script tells you what to do, counts down a few seconds,
then acts (clicking, or taking a screenshot). If a click landed somewhere
odd, fix it manually with your own mouse before the countdown for that step
runs out. To abort at any point, move your mouse into any corner of the
screen (the same failsafe pyautogui itself uses).

The league table screen (2 of 3) is fully manual - the script asks you to
navigate there yourself rather than trying to click through to it, since
that path varies too much between FM versions and save states to hardcode
reliably. It gives you 15 seconds, then captures whatever's on screen.

Every countdown is also spoken out loud (macOS `say`, or a Windows
equivalent), not just printed to the terminal, since the terminal is
completely hidden once FM covers the screen. You'll hear what's about to
happen, hear the last few seconds counted down, and hear "capturing" right
before each screenshot fires - so you never need to see the terminal at all.

Earlier versions of this script used a keyboard hotkey to confirm each step
instead of a countdown, but Football Manager grabs raw keyboard input
directly while it's the focused window (common for fullscreen games), so no
key combo ever reached the script while FM had focus, only FM itself saw it.
A countdown needs nothing from the keyboard, so it's not affected by that.

Works on both Mac and Windows - it calibrates itself against your actual
screen/window by asking you to point at two fixed landmarks (the words
"PORTAL" and "CAREER" in FM's own top nav) at the start of each run, rather
than relying on hardcoded pixel coordinates tied to one specific screen.

**If a click ends up in the wrong place:** the ratios inside the script
(the `pt(dx, dy)` calls) are all relative to the PORTAL-CAREER gap, so tweak
those numbers rather than trying to hardcode absolute coordinates. Send me
a screenshot of where it landed vs. where it should have, and I can adjust
the ratios for you.

**Known limitations:**
- If your league's Stages screen doesn't have a "League Stage" option in the
  position this script expects (leagues without playoffs, or a very
  different competition structure), the League Table step may land on the
  wrong sub-view - just switch it manually with the dropdowns before
  confirming the screenshot.
- Only covers Step 1 (Club Data) for now, not Squad/Scouting/Performance
  Data, since those need a screenshot per player rather than a fixed set of
  screens.
