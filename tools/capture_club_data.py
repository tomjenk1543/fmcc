#!/usr/bin/env python3
"""
FMCC Club Data screenshot capture macro.

Walks Football Manager to the three screens the "Step 1: Club Data" section of
the FMCC Setup Guide needs, and screenshots each one for you:

  1. Club Overview   (Club > Overview)              -> club_overview.png
  2. League Table    (Club > your league > Stages)  -> league_table.png
  3. Career History  (Career > My History)           -> career_history.png

Those three screenshots cover all five bullet points from the guide (Club
Overview, Season Stats, Trophy Cabinet/Achievements, Career History, and the
full League Table) - a couple of them share a screen once you actually look
at FM's menus.

WHY THIS NEEDS A ONE-TIME "CALIBRATION" STEP
---------------------------------------------
This script doesn't know your screen resolution, whether FM is windowed or
fullscreen, or where its window sits - and hardcoding pixel coordinates for
one specific setup would just break on anyone else's. Instead, every click
target below is stored as a RATIO relative to two points that are always on
screen in FM: the words "PORTAL" and "CAREER" in the top navigation bar. At
the start of each run, you point at those two words once; every other click
is computed from that, so it self-adjusts to your resolution, your window
position, and Mac or Windows alike.

STAYING ON FM THE WHOLE TIME
------------------------------
Every checkpoint (calibration points, screenshot confirmations) is confirmed
with a HOTKEY - Ctrl+Option+C - rather than pressing Enter in the terminal.
That's a global hotkey, so you never need to alt-tab back to this terminal
window to continue - keep Football Manager focused the entire time. Press
Ctrl+Option+X instead at any checkpoint to abort cleanly. (A single function
key like F8 seems simpler, but on most Mac keyboards F-keys double as
hardware media/brightness/volume controls, which macOS intercepts before
any app - including this one - ever sees the keypress. A three-key modifier
combo sidesteps that, and is unlikely to collide with any of FM's own
single-key shortcuts.)

BEFORE YOU RUN THIS
--------------------
1. Football Manager should already be open, on any screen (the top nav bar
   needs to be visible - that's all that matters for calibration).
2. Set FM's resolution to 1920x1080 (Preferences > Interface > Screen
   Resolution) so the game's own UI layout is always the same shape.
3. If you want fmClubId/fmCompetitionId auto-loaded in FMCC, turn on
   Preferences > Your World > (Show Unique IDs) BEFORE running this - that's
   a one-off toggle this script doesn't touch.
4. pip3 install pyautogui pynput pillow   (one-time)
5. On Mac, the first run will prompt you to grant your terminal app
   Accessibility AND Input Monitoring permissions (System Settings > Privacy
   & Security). Both are needed - Accessibility for the clicks/screenshots,
   Input Monitoring for the hotkey to work while FM has focus. If the hotkey
   doesn't seem to register, check both of those lists, and make sure you
   fully quit and reopened your terminal app after granting them.

WHAT TO EXPECT WHILE IT RUNS
------------------------------
Football Manager's exact menu state can differ from save to save (mid-season
vs. off-season, whether your league uses playoffs, how many competitions
you're still in, etc.), so this script pauses before every screenshot and
shows you what it's about to capture. If a click landed somewhere odd, fix
it manually with your own mouse before pressing Ctrl+Option+C to continue -
the screenshot only fires once you confirm.

Move your mouse to any corner of the screen at any time to trigger
pyautogui's built-in failsafe and abort immediately. Ctrl+Option+X at any
checkpoint aborts too.
"""

import subprocess
import sys
import time
from pathlib import Path

try:
    import pyautogui
except ImportError:
    print("This script needs the pyautogui package. Install it with:")
    print("    pip3 install pyautogui")
    sys.exit(1)

try:
    from pynput import keyboard
except ImportError:
    print("This script needs the pynput package (for the F8 hotkey). Install it with:")
    print("    pip3 install pynput")
    sys.exit(1)

pyautogui.FAILSAFE = True  # slam mouse into a screen corner to abort
pyautogui.PAUSE = 0.15     # small delay after every pyautogui call

# Modifier combo rather than a single function key - see the module docstring
# ("STAYING ON FM THE WHOLE TIME") for why F8 alone doesn't reliably work on
# Mac keyboards (media-key interception).
CONFIRM_CHAR = "c"
ABORT_CHAR = "x"
_CTRL_KEYS = (keyboard.Key.ctrl, keyboard.Key.ctrl_l, keyboard.Key.ctrl_r)
_ALT_KEYS = (keyboard.Key.alt, keyboard.Key.alt_l, keyboard.Key.alt_r)

# Lives inside the FMCC project itself (tools/../screenshots), right next to
# FM_Command_Centre.html, rather than off on the Desktop somewhere - the idea
# being that everything for the app lives under one folder. Same 3 filenames
# every run, so a fresh capture just overwrites the last one instead of
# piling up dated subfolders.
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "screenshots"


class Aborted(Exception):
    pass


def open_in_file_manager(path):
    """Best-effort - if neither works, the printed path still gets you there."""
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", str(path)], check=False)
        elif sys.platform.startswith("win"):
            subprocess.run(["explorer", str(path)], check=False)
        else:
            subprocess.run(["xdg-open", str(path)], check=False)
    except Exception:
        pass


def wait_for_hotkey(prompt):
    """Blocks until Ctrl+Option+C is pressed, WITHOUT needing this terminal
    to be focused - a global hotkey listener, so Football Manager can stay
    the frontmost window the entire time. Ctrl+Option+X aborts instead.
    Tracks modifier state manually (rather than using a single key like F8)
    since Mac keyboards route F-keys through the hardware media-key layer,
    which never reaches a normal key listener."""
    print(f"{prompt}\n>>> Press Ctrl+Option+C when ready (keep FM focused - no need to alt-tab). "
          f"Ctrl+Option+X to abort.")
    result = {"aborted": False}
    held = {"ctrl": False, "alt": False}

    def on_press(key):
        if key in _CTRL_KEYS:
            held["ctrl"] = True
            return None
        if key in _ALT_KEYS:
            held["alt"] = True
            return None
        if held["ctrl"] and held["alt"]:
            ch = getattr(key, "char", None)
            if ch and ch.lower() == CONFIRM_CHAR:
                return False
            if ch and ch.lower() == ABORT_CHAR:
                result["aborted"] = True
                return False
        return None

    def on_release(key):
        if key in _CTRL_KEYS:
            held["ctrl"] = False
        elif key in _ALT_KEYS:
            held["alt"] = False

    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()

    if result["aborted"]:
        raise Aborted()


def get_point(label):
    wait_for_hotkey(f'Move your mouse to the exact center of "{label}" in FM\'s top navigation bar.')
    pos = pyautogui.position()
    print(f"  Got {label} at {pos}")
    return pos


def calibrate():
    print("\n--- Calibration (one-time per run) ---")
    portal = get_point("PORTAL")
    career = get_point("CAREER")
    dx = career.x - portal.x
    dy = career.y - portal.y
    distance = (dx ** 2 + dy ** 2) ** 0.5
    if distance < 50:
        print("\nThat's a suspiciously small gap between PORTAL and CAREER.")
        print("Double check FM's nav bar is visible and try again.")
        sys.exit(1)
    print(f"  Reference distance (PORTAL -> CAREER): {distance:.1f}px\n")
    return portal, distance


def make_pt_fn(anchor, scale):
    """Returns a function that converts a (dx_ratio, dy_ratio) pair - both
    expressed as a fraction of the PORTAL->CAREER distance - into a real
    screen coordinate for this machine's actual window/resolution."""
    def pt(dx_ratio, dy_ratio):
        return (round(anchor.x + dx_ratio * scale), round(anchor.y + dy_ratio * scale))
    return pt


def click(pt_fn, dx_ratio, dy_ratio, settle=0.6):
    x, y = pt_fn(dx_ratio, dy_ratio)
    pyautogui.click(x, y)
    time.sleep(settle)


def capture(filename, note):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    wait_for_hotkey(f"About to save this screen as {filename} ({note}).\n"
                     f"Check it's showing the right thing - fix it manually first if not.")
    img = pyautogui.screenshot()
    img.save(path)
    print(f"  Saved {path}\n")


def main():
    print(__doc__)
    wait_for_hotkey("Ready to start? Make sure Football Manager is the frontmost window")
    anchor, scale = calibrate()
    pt = make_pt_fn(anchor, scale)

    # --- Screen 1: Club Overview -----------------------------------------
    print("--- Screen 1: Club Overview ---")
    click(pt, 0.852, 0.000)   # CLUB tab
    click(pt, -0.005, 0.074)  # Overview sub-tab
    capture("club_overview.png",
            "name/division/stadium + Honours + Club History panels")

    # --- Screen 2: League Table --------------------------------------------
    print("--- Screen 2: League Table ---")
    click(pt, 0.614, 0.215, settle=1.0)   # the "1st in <League>..." headline -> competition page
    click(pt, 0.7275, 0.074)              # Stages tab
    click(pt, 0.2587, 0.2587)             # stage picker dropdown
    click(pt, 0.6605, 0.2587, settle=1.0)  # "League Stage" option
    print('If your save is mid-playoffs, the table may default to a knockout')
    print('bracket instead of the full standings - use the dropdowns at the')
    print('top-left of the table panel to switch to "League Table" / "Overall"')
    print('yourself before continuing, if needed.')
    capture("league_table.png",
            "full standings (covers Season Stats + League Table)")

    # --- Screen 3: Career History -------------------------------------------
    print("--- Screen 3: Career History ---")
    click(pt, 1.000, 0.000)   # CAREER tab
    click(pt, 0.970, 0.074, settle=1.0)  # My History sub-tab (opens a popup)
    capture("career_history.png", "year-by-year history + manager bio")

    # Close the popup so FM is left in a tidy state.
    click(pt, 1.759, 0.3187)

    print("Done. Three screenshots are in:")
    print(f"  {OUTPUT_DIR}")
    print("\nAttach all three to a Claude chat along with the Step 1: Club Data")
    print("JSON template from the FMCC Setup Guide, and ask Claude to fill it in.")
    open_in_file_manager(OUTPUT_DIR)


if __name__ == "__main__":
    try:
        main()
    except pyautogui.FailSafeException:
        print("\nAborted (mouse hit a screen corner).")
    except Aborted:
        print("\nAborted (Ctrl+Option+X pressed).")
    except KeyboardInterrupt:
        print("\nAborted (Ctrl+C).")
