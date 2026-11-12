"""
MINEARENA 1.0 — BIDMC PhysioNet CSV Replayer.

Replays pre-recorded vital signs from the BIDMC dataset at 1 Hz.
BIDMC provides ONLY: HR, SpO2, RR.  No BP, Temp, or accelerometer data.
"""

from __future__ import annotations

import asyncio
import csv
from pathlib import Path
from typing import AsyncGenerator

from app.config import WS_TICK_INTERVAL_BASE


class BIDMCReplayer:
    """Replays BIDMC PhysioNet sample data from a CSV file.

    CSV columns: ``timestamp``, ``hr``, ``spo2``, ``rr``
    """

    def __init__(self, csv_path: str | Path) -> None:
        self._csv_path = Path(csv_path)
        self._rows: list[dict[str, str]] = []
        self._index: int = 0
        self._load()

    # ── Internal ──────────────────────────────────────────────────────

    def _load(self) -> None:
        """Load all rows from the CSV into memory."""
        with open(self._csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            self._rows = list(reader)
        if not self._rows:
            raise ValueError(f"BIDMC CSV is empty: {self._csv_path}")

    # ── Public API ────────────────────────────────────────────────────

    async def replay(
        self,
        speed_factor: int = 1,
    ) -> AsyncGenerator[dict, None]:
        """Async generator yielding one vital-sign dict per tick.

        Each dict contains ``hr``, ``spo2``, ``rr`` — each tagged with
        ``source="BIDMC"``.

        Parameters
        ----------
        speed_factor : int
            Playback speed multiplier (1 = real-time 1 Hz).
        """
        interval = WS_TICK_INTERVAL_BASE / max(speed_factor, 1)

        while self._index < len(self._rows):
            row = self._rows[self._index]
            self._index += 1

            yield {
                "hr":   {"value": int(row["hr"]),   "source": "BIDMC"},
                "spo2": {"value": int(row["spo2"]), "source": "BIDMC"},
                "rr":   {"value": float(row["rr"]), "source": "BIDMC"},
                "timestamp": row.get("timestamp", ""),
            }

            await asyncio.sleep(interval)

    def reset(self) -> None:
        """Restart playback from the beginning."""
        self._index = 0
