"""Warstwa SQLite: rezerwacje i wolne terminy."""
import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import business

DB_PATH = os.getenv("DB_PATH", "bookings.db")
TZ = ZoneInfo(os.getenv("TZ_NAME", "Europe/Warsaw"))


def now() -> datetime:
    return datetime.now(TZ)


@contextmanager
def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init() -> None:
    with _conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                username TEXT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                service_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                day TEXT NOT NULL,
                slot TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL
            )"""
        )
        c.execute("CREATE INDEX IF NOT EXISTS idx_day ON bookings(day, slot, status)")


def _to_min(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def open_days() -> list[date]:
    """Najbliższe dni, w których lokal jest otwarty."""
    today = now().date()
    days = []
    for i in range(business.DAYS_AHEAD):
        d = today + timedelta(days=i)
        if business.HOURS.get(d.weekday()) and free_slots(d):
            days.append(d)
    return days


def free_slots(day: date) -> list[str]:
    hours = business.HOURS.get(day.weekday())
    if not hours:
        return []
    with _conn() as c:
        rows = c.execute(
            "SELECT slot, COUNT(*) n FROM bookings WHERE day=? AND status='active' GROUP BY slot",
            (day.isoformat(),),
        ).fetchall()
    taken = {r["slot"]: r["n"] for r in rows}
    cutoff = now() + timedelta(minutes=30)
    out = []
    t = _to_min(hours[0])
    end = _to_min(hours[1])
    while t + business.SLOT_MIN <= end:
        label = f"{t // 60:02d}:{t % 60:02d}"
        starts = datetime.combine(day, datetime.min.time(), tzinfo=TZ) + timedelta(minutes=t)
        if starts > cutoff and taken.get(label, 0) < business.CAPACITY:
            out.append(label)
        t += business.SLOT_MIN
    return out


def add_booking(user_id: int, username: str | None, name: str, phone: str,
                service_id: str, service_name: str, day: str, slot: str) -> int | None:
    """Zapisuje rezerwację; None, jeśli termin w międzyczasie się zapełnił."""
    with _conn() as c:
        c.execute("BEGIN IMMEDIATE")
        n = c.execute(
            "SELECT COUNT(*) FROM bookings WHERE day=? AND slot=? AND status='active'",
            (day, slot),
        ).fetchone()[0]
        if n >= business.CAPACITY:
            return None
        cur = c.execute(
            """INSERT INTO bookings (user_id, username, name, phone, service_id, service_name,
                                     day, slot, created_at) VALUES (?,?,?,?,?,?,?,?,?)""",
            (user_id, username, name, phone, service_id, service_name, day, slot,
             now().isoformat(timespec="seconds")),
        )
        return cur.lastrowid


def upcoming(limit: int = 30) -> list[sqlite3.Row]:
    today = now().date().isoformat()
    with _conn() as c:
        return c.execute(
            "SELECT * FROM bookings WHERE status='active' AND day>=? ORDER BY day, slot LIMIT ?",
            (today, limit),
        ).fetchall()


def by_user(user_id: int) -> list[sqlite3.Row]:
    today = now().date().isoformat()
    with _conn() as c:
        return c.execute(
            "SELECT * FROM bookings WHERE user_id=? AND status='active' AND day>=? ORDER BY day, slot",
            (user_id, today),
        ).fetchall()


def get(booking_id: int) -> sqlite3.Row | None:
    with _conn() as c:
        return c.execute("SELECT * FROM bookings WHERE id=?", (booking_id,)).fetchone()


def cancel(booking_id: int) -> bool:
    with _conn() as c:
        cur = c.execute(
            "UPDATE bookings SET status='cancelled' WHERE id=? AND status='active'", (booking_id,)
        )
        return cur.rowcount > 0
