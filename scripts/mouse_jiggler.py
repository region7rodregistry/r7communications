#!/usr/bin/env python3
"""
Keep the PC active while a long-running job (e.g. a billing script) runs:
- Windows: ES_SYSTEM_REQUIRED so the session is less likely to sleep.
- Each --cycle-minutes window uses a random activity ratio between --activity-min and --activity-max.
  That share is spread *evenly* across the whole window: every --spread-seconds block repeats
  (active for ratio × block, quiet for the rest), so motion is not bunched at the start or end.
- Alt+Tab on a timer switches the focused Windows application (MRU order).
- Optional Ctrl+Tab for browser tabs.

Install:  pip install pyautogui

Examples:
  python scripts/mouse_jiggler.py
  python scripts/mouse_jiggler.py --billing path/to/billing.py
"""

from __future__ import annotations

import argparse
import ctypes
import math
import random
import subprocess
import sys
import threading
import time
from typing import Optional

try:
    import pyautogui
except ImportError:
    print("Missing dependency: pip install pyautogui", file=sys.stderr)
    sys.exit(1)

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0

ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001

MOVE_INTERVAL_S = 0.04


def _prevent_idle_sleep(enable: bool) -> None:
    if sys.platform != "win32":
        return
    kernel32 = ctypes.windll.kernel32
    if enable:
        kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
    else:
        kernel32.SetThreadExecutionState(ES_CONTINUOUS)


def switch_application() -> None:
    """Switch to the next app in Windows Alt+Tab order (previous window in MRU stack)."""
    pyautogui.keyDown("alt")
    time.sleep(0.04)
    pyautogui.press("tab")
    time.sleep(0.04)
    pyautogui.keyUp("alt")


def cycle_browser_tab() -> None:
    pyautogui.hotkey("ctrl", "tab")


class ContinuousMover:
    """Small figure-8 style motion so the cursor keeps moving without drifting away."""

    def __init__(self, amplitude: int = 2) -> None:
        self._amp = max(1, amplitude)
        self._t = 0.0

    def step(self) -> None:
        self._t += 0.12
        dx = int(round(math.sin(self._t) * self._amp))
        dy = int(round(math.sin(self._t * 2) * self._amp * 0.5))
        pyautogui.moveRel(dx, dy, duration=0)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Evenly spread 45–55% mouse activity per cycle; Alt+Tab apps; optional browser tabs."
    )
    p.add_argument(
        "--billing",
        metavar="SCRIPT",
        help="Run this Python script as a subprocess; jiggler stops when it exits.",
    )
    p.add_argument(
        "--cycle-minutes",
        type=float,
        default=10.0,
        help="Length of each planning window in minutes (default: 10).",
    )
    p.add_argument(
        "--spread-seconds",
        type=float,
        default=30.0,
        help="Repeat this many seconds: active slice then quiet slice, across the whole cycle (default: 30).",
    )
    p.add_argument(
        "--activity-min",
        type=float,
        default=0.45,
        help="Minimum fraction of each cycle with continuous mouse motion (default: 0.45).",
    )
    p.add_argument(
        "--activity-max",
        type=float,
        default=0.55,
        help="Maximum fraction of each cycle with continuous mouse motion (default: 0.55).",
    )
    p.add_argument(
        "--app-switch-seconds",
        type=float,
        default=60.0,
        help="Alt+Tab this often to switch applications (default: 60). Use 0 to disable.",
    )
    p.add_argument(
        "--browser-tab-seconds",
        type=float,
        default=0.0,
        help="Ctrl+Tab this often for browser tabs (default: 0 = off).",
    )
    p.add_argument(
        "--move-pixels",
        type=int,
        default=2,
        help="Amplitude of continuous motion in pixels (default: 2).",
    )
    return p.parse_args()


def _validate(args: argparse.Namespace) -> None:
    if args.cycle_minutes <= 0:
        print("--cycle-minutes must be positive.", file=sys.stderr)
        sys.exit(1)
    cycle_s = args.cycle_minutes * 60.0
    if args.spread_seconds <= 0:
        print("--spread-seconds must be positive.", file=sys.stderr)
        sys.exit(1)
    if args.spread_seconds > cycle_s:
        print(
            "--spread-seconds must be <= cycle length (in seconds) so activity can repeat across the window.",
            file=sys.stderr,
        )
        sys.exit(1)
    if args.spread_seconds < 5:
        print("--spread-seconds should be at least 5 (avoid tiny active/idle slices).", file=sys.stderr)
        sys.exit(1)
    if not (0 < args.activity_min <= args.activity_max < 1):
        print("--activity-min/--activity-max must satisfy 0 < min <= max < 1.", file=sys.stderr)
        sys.exit(1)
    if args.app_switch_seconds < 0 or args.browser_tab_seconds < 0:
        print("--app-switch-seconds and --browser-tab-seconds must be >= 0.", file=sys.stderr)
        sys.exit(1)


def run_timed_phase(
    duration_s: float,
    is_active: bool,
    stop: threading.Event,
    mover: ContinuousMover,
    next_app: float,
    app_interval: float,
    next_browser: float,
    browser_interval: float,
) -> tuple[float, float]:
    """Run mouse phase; fire Alt+Tab / Ctrl+Tab when due. Returns updated next_app, next_browser."""
    if duration_s <= 0:
        return next_app, next_browser
    phase_end = time.monotonic() + duration_s
    while not stop.is_set():
        now = time.monotonic()
        if now >= phase_end:
            break
        if is_active:
            mover.step()
        now = time.monotonic()
        if app_interval > 0:
            while now >= next_app:
                switch_application()
                next_app += app_interval
                now = time.monotonic()
        if browser_interval > 0:
            while now >= next_browser:
                cycle_browser_tab()
                next_browser += browser_interval
                now = time.monotonic()
        now = time.monotonic()
        time.sleep(min(MOVE_INTERVAL_S, max(0.0, phase_end - now)))
    return next_app, next_browser


def main() -> None:
    args = parse_args()
    _validate(args)

    cycle_s = args.cycle_minutes * 60.0
    spread_s = args.spread_seconds
    billing_proc: Optional[subprocess.Popen] = None
    if args.billing:
        billing_proc = subprocess.Popen([sys.executable, args.billing])
        print(f"Started billing: {args.billing} (PID {billing_proc.pid})")

    _prevent_idle_sleep(True)
    stop = threading.Event()

    def watch_billing() -> None:
        if billing_proc is None:
            return
        billing_proc.wait()
        stop.set()

    threading.Thread(target=watch_billing, daemon=True).start()

    mover = ContinuousMover(amplitude=args.move_pixels)
    app_interval = args.app_switch_seconds
    browser_interval = args.browser_tab_seconds
    now0 = time.monotonic()
    next_app = now0 + app_interval if app_interval > 0 else float("inf")
    next_browser = now0 + browser_interval if browser_interval > 0 else float("inf")

    try:
        print(
            f"Each {args.cycle_minutes:g} min window: {args.activity_min:.0%}–{args.activity_max:.0%} "
            f"active time, spread evenly every {spread_s:g}s (active slice + quiet slice)."
        )
        if app_interval > 0:
            print(f"Alt+Tab (applications) every {app_interval:g}s.")
        if browser_interval > 0:
            print(f"Ctrl+Tab (browser tabs) every {browser_interval:g}s.")
        print(
            "Ctrl+C to stop"
            + (" (or wait for billing to finish)." if billing_proc else ".")
        )

        while not stop.is_set():
            ratio = random.uniform(args.activity_min, args.activity_max)
            n_full = int(cycle_s // spread_s)
            remainder = cycle_s - n_full * spread_s
            active_total = cycle_s * ratio
            print(
                f"Cycle: {ratio:.1%} active (~{active_total / 60:.1f} min total motion), "
                f"{n_full}×{spread_s:g}s blocks"
                + (f" + {remainder:g}s remainder" if remainder > 0 else "")
                + "."
            )

            def run_block(active_d: float, idle_d: float) -> None:
                nonlocal next_app, next_browser
                next_app, next_browser = run_timed_phase(
                    active_d,
                    True,
                    stop,
                    mover,
                    next_app,
                    app_interval,
                    next_browser,
                    browser_interval,
                )
                if stop.is_set():
                    return
                next_app, next_browser = run_timed_phase(
                    idle_d,
                    False,
                    stop,
                    mover,
                    next_app,
                    app_interval,
                    next_browser,
                    browser_interval,
                )

            for _ in range(n_full):
                if stop.is_set():
                    break
                run_block(spread_s * ratio, spread_s * (1.0 - ratio))

            if not stop.is_set() and remainder > 0:
                run_block(remainder * ratio, remainder * (1.0 - ratio))

    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        _prevent_idle_sleep(False)
        if billing_proc is not None and billing_proc.poll() is None:
            billing_proc.terminate()
            try:
                billing_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                billing_proc.kill()


if __name__ == "__main__":
    main()
