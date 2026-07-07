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
Every checkpoint (calibration points, screenshot confirmations) is a short
COUNTDOWN rather than a keypress - the script tells you what to do, counts
down a few seconds, then acts. That's deliberate: earlier versions of this
script used keyboard hotkeys to confirm each step, but Football Manager
grabs raw keyboard input directly while it's the focused window (common for
fullscreen games), so no key combo actually reached the script while FM had
focus - it only ever reached FM itself. A countdown needs nothing from the
keyboard at all, so it works no matter what FM does with key events.

Every countdown is also SPOKEN OUT LOUD (macOS 'say' command, or a Windows
equivalent) - not just printed - since you can't see the terminal at all
once FM covers the whole screen. You'll hear what to do, then hear the last
few seconds counted down, then hear "capturing" right before a screenshot
actually fires.

To ABORT at any point, move your mouse to any corner of the screen - this is
checked throughout every countdown and click sequence, the same failsafe
pyautogui itself uses.

BEFORE YOU RUN THIS
--------------------
1. Football Manager should already be open, on any screen (the top nav bar
   needs to be visible - that's all that matters for calibration).
2. Set FM's resolution to 1920x1080 (Preferences > Interface > Screen
   Resolution) so the game's own UI layout is always the same shape.
3. If you want fmClubId/fmCompetitionId auto-loaded in FMCC, turn on
   Preferences > Your World > (Show Unique IDs) BEFORE running this - that's
   a one-off toggle this script doesn't touch.
4. pip3 install pyautogui pillow   (one-time)
5. On Mac: System Settings > Privacy & Security > Screen Recording -> turn
   this on for whichever app you're running the script from (Terminal,
   iTerm, etc). Without it, every screenshot fails with "could not create
   image from display". Fully quit and reopen that app after granting it -
   the toggle doesn't take effect until you do.
6. Also on Mac: macOS Sequoia can still show a one-off "is requesting to
   bypass the system private window picker" popup even after you've granted
   Screen Recording above, and if it appears mid-run it'll get captured
   instead of FM. Clear it out of the way before starting for real - run
   `screencapture -x /tmp/test.png` once by hand, click Allow, then run this
   script.

WHAT TO EXPECT WHILE IT RUNS
------------------------------
Football Manager's exact menu state can differ from save to save (mid-season
vs. off-season, whether your league uses playoffs, how many competitions
you're still in, etc.), so this script counts down before every screenshot
and shows you what it's about to capture. If a click landed somewhere odd,
fix it manually with your own mouse before the countdown reaches zero - the
screenshot only fires once the countdown finishes.
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

pyautogui.FAILSAFE = True  # slam mouse into a screen corner to abort
pyautogui.PAUSE = 0.15     # small delay after every pyautogui call

CORNER_MARGIN = 4  # pixels - how close to a corner counts as "hit it"

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


def _mouse_in_a_corner():
    x, y = pyautogui.position()
    w, h = pyautogui.size()
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    return any(abs(x - cx) <= CORNER_MARGIN and abs(y - cy) <= CORNER_MARGIN for cx, cy in corners)


def speak(text):
    """Best-effort, non-blocking text-to-speech - see the module docstring
    ("STAYING ON FM THE WHOLE TIME") for why this exists: once FM covers the
    whole screen, printed terminal text is invisible, but you can still hear
    it. Silently does nothing on platforms without a bundled TTS command."""
    try:
        if sys.platform == "darwin":
            subprocess.Popen(["say", text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform.startswith("win"):
            ps_cmd = ("Add-Type -AssemblyName System.Speech; "
                      f"(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{text}')")
            subprocess.Popen(["powershell", "-Command", ps_cmd],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def countdown(seconds, prompt, announce=None):
    """Doesn't need any keyboard input at all - see the module docstring
    ("STAYING ON FM THE WHOLE TIME") for why. Checked against the same
    screen-corner abort pyautogui's own FAILSAFE uses, every tenth of a
    second, so aborting stays responsive even mid-countdown. Speaks the
    prompt out loud (a short version, via `announce`) plus the final few
    seconds, since the terminal itself is invisible once FM has focus."""
    print(prompt)
    speak(announce or prompt)
    seconds = int(seconds)
    for remaining in range(seconds, 0, -1):
        print(f"  ...{remaining} ", end="\r")
        if remaining <= 3:
            speak(str(remaining))
        for _ in range(10):
            if _mouse_in_a_corner():
                print()
                raise Aborted()
            time.sleep(0.1)
    print(" " * 20, end="\r")


def get_point(label):
    countdown(5, f'Move your mouse to the exact center of "{label}" in FM\'s top navigation bar.',
               announce=f"Move your mouse to {label}")
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


def capture(filename, note, announce):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    countdown(8, f"About to save this screen as {filename} ({note}).\n"
                 f"Check it's showing the right thing - fix it manually first if not.",
              announce=announce)
    speak("capturing")
    img = pyautogui.screenshot()
    img.save(path)
    print(f"  Saved {path}\n")


def main():
    print(__doc__)
    countdown(5, "Ready to start? Make sure Football Manager is the frontmost window.",
              announce="Ready to start. Make sure Football Manager is focused.")
    anchor, scale = calibrate()
    pt = make_pt_fn(anchor, scale)

    # --- Screen 1: Club Overview -----------------------------------------
    print("--- Screen 1: Club Overview ---")
    click(pt, 0.852, 0.000)   # CLUB tab
    click(pt, -0.005, 0.074)  # Overview sub-tab
    capture("club_overview.png",
            "name/division/stadium + Honours + Club History panels",
            announce="Capturing club overview")

    # --- Screen 2: League Table --------------------------------------------
    # This one is manual rather than click-chained: the path from Club
    # Overview to the actual league standings varies too much between FM
    # versions/UI revisions/save states to hardcode reliably (in some UIs the
    # "1st in <League>..." headline opens Club Info instead of the league
    # page). Simpler and more robust to just ask for the screen directly.
    print("--- Screen 2: League Table ---")
    print("This one is manual - navigate to it yourself:")
    print('  Club > your league (or click the league badge/headline on the')
    print('  Overview screen) > Stages tab > pick "League Stage" / "Overall"')
    print("  from the dropdown if it's defaulting to a knockout bracket view.")
    countdown(15, "Navigate to your league's full table screen yourself now.",
              announce="Navigate to your league's full table screen manually. You have 15 seconds.")
    capture("league_table.png",
            "full standings (covers Season Stats + League Table)",
            announce="Capturing league table")

    # --- Screen 3: Career History -------------------------------------------
    print("--- Screen 3: Career History ---")
    click(pt, 1.000, 0.000)   # CAREER tab
    click(pt, 0.970, 0.074, settle=1.0)  # My History sub-tab (opens a popup)
    capture("career_history.png", "year-by-year history + manager bio",
            announce="Capturing career history")

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
        print("\nAborted (mouse hit a screen corner).")
    except KeyboardInterrupt:
        print("\nAborted (Ctrl+C).")
