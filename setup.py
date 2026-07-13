#!/usr/bin/env python3
"""
FMCC first-run setup.

This is the ONE file worth sharing with someone who wants FM Command Centre,
instead of just the raw HTML link - running it pulls down the whole project
(the app, the Setup Guide, the sample data, and the optional screenshot-
capture tool) into a single ~/Documents/FMCC folder, so everything the
guide references actually exists on their machine afterwards.

No pip installs needed - only uses Python's standard library, plus git if
it's available (falls back to downloading a plain ZIP from GitHub if not).

Usage:
    python3 setup.py
"""

import shutil
import subprocess
import sys
import urllib.request
import webbrowser
import zipfile
from pathlib import Path

REPO_URL = "https://github.com/tomjenk1543/fmcc.git"
ZIP_URL = "https://github.com/tomjenk1543/fmcc/archive/refs/heads/main.zip"
TARGET = Path.home() / "Documents" / "FMCC"


def have_git():
    return shutil.which("git") is not None


def clone_with_git():
    print(f"Found git - cloning into {TARGET} ...")
    subprocess.run(["git", "clone", REPO_URL, str(TARGET)], check=True)


def clone_with_zip():
    print("git not found - downloading a ZIP of the project instead ...")
    zip_path = TARGET.parent / "_fmcc_download.zip"
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(ZIP_URL, zip_path)

    extract_dir = TARGET.parent / "_fmcc_extract"
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)
    zip_path.unlink()

    # GitHub's ZIP puts everything under a single "fmcc-main" subfolder.
    inner = next(extract_dir.iterdir())
    shutil.move(str(inner), str(TARGET))
    shutil.rmtree(extract_dir)


def open_in_file_manager(path):
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", str(path)], check=False)
        elif sys.platform.startswith("win"):
            subprocess.run(["explorer", str(path)], check=False)
        else:
            subprocess.run(["xdg-open", str(path)], check=False)
    except Exception:
        pass


def main():
    print(__doc__)

    if TARGET.exists() and any(TARGET.iterdir()):
        print(f"{TARGET} already exists and isn't empty - leaving it alone.")
        print("Delete or rename it first if you want a fresh copy.")
        sys.exit(0)

    try:
        if have_git():
            clone_with_git()
        else:
            clone_with_zip()
    except Exception as exc:
        print(f"\nSomething went wrong: {exc}")
        print("You can also just download the project manually from:")
        print(f"  {REPO_URL}")
        sys.exit(1)

    html_path = TARGET / "FM_Command_Centre.html"
    print(f"\nDone. FMCC is now set up at:\n  {TARGET}\n")
    print("Next steps:")
    print(f"  1. Open {html_path.name} in your browser to start the app.")
    print('  2. Read docs/"FMCC Setup Guide.docx" for how to get your Football')
    print("     Manager save's data into it.")
    print("  3. (Optional) Ask Claude to capture your Club Data screen-by-screen")
    print("     instead of doing it by hand - see tools/README.md.")

    open_in_file_manager(TARGET)
    try:
        webbrowser.open(html_path.resolve().as_uri())
    except Exception:
        pass


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAborted (Ctrl+C).")
