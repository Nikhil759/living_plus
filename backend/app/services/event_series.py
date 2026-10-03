import calendar
from datetime import date, datetime, timedelta

from app.core.errors import AppError
from app.models.enums import EventRecurrence

_MAX_OCCURRENCES = 12


def add_months(value: datetime, months: int) -> datetime:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def advance(start: datetime, recurrence: EventRecurrence, steps: int) -> datetime:
    if steps <= 0:
        return start
    if recurrence == EventRecurrence.weekly:
        return start + timedelta(days=7 * steps)
    if recurrence == EventRecurrence.biweekly:
        return start + timedelta(days=14 * steps)
    if recurrence == EventRecurrence.monthly:
        return add_months(start, steps)
    return start


def series_windows(
    starts: datetime,
    ends: datetime,
    recurrence: EventRecurrence,
    *,
    count: int | None,
    ends_on: date | None,
) -> list[tuple[datetime, datetime]]:
    if recurrence == EventRecurrence.none:
        return [(starts, ends)]
    if count is None and ends_on is None:
        count = 4
    if count is not None and count < 2:
        raise AppError("validation_error", "A series needs at least two occurrences.", 422)
    if ends_on is not None and ends_on < starts.date():
        raise AppError("validation_error", "The series cannot end before it starts.", 422)

    duration = ends - starts
    windows = [(starts, ends)]
    step = 1
    while len(windows) < _MAX_OCCURRENCES:
        next_start = advance(starts, recurrence, step)
        if count is not None and len(windows) >= count:
            break
        if ends_on is not None and next_start.date() > ends_on:
            break
        windows.append((next_start, next_start + duration))
        step += 1
    return windows
