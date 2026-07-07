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
1. `pip3 install pyautogui pynput pillow`
2. In FM: Preferences > Interface > Screen Resolution -> set to 1920x1080.
3. If you want fmClubId/fmCompetitionId auto-loaded in FMCC: Preferences >
   Your World > turn on "Show Unique IDs" before running the script.
4. On Mac, the first run prompts you to grant your terminal app both
   Accessibility and Input Monitoring permissions (System Settings > Privacy
   & Security). Both are needed - Accessibility for the clicks/screenshots,
   Input Monitoring for the hotkey below to register while FM has focus. If
   it doesn't seem to register, fully quit and reopen your terminal app
   after granting both.

**Running it:**
```
python3 capture_club_data.py
```
Switch to Football Manager, then press Ctrl+Option+C at every checkpoint to
confirm and move on (Ctrl+Option+X aborts). That's a global hotkey, so you
never need to alt-tab back to the terminal - just keep FM focused the whole
time. It's a three-key combo rather than something simpler like F8 because
Mac keyboards route F-keys through hardware media/brightness/volume
controls first, which never reach a script at all, and a modifier combo
also won't collide with any of FM's own single-key shortcuts (like Space).
The script pauses before every screenshot so you can double-check (and
manually fix, if needed) what's on screen before it captures - Football
Manager's exact menu state varies by save (mid-season vs. off-season,
whether your league has playoffs, etc.), so this isn't fully blind
automation, but it does the clicking for you.

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
