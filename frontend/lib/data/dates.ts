const DAY_MS = 24 * 60 * 60 * 1000;

/** Next occurrence of weekday (0 = Sun … 6 = Sat) at hour:minute IST. */
export function nextWeekday(weekday: number, hour: number, minute = 0): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const daysAhead = (weekday - nowIst.getUTCDay() + 7) % 7 || 7;
  const target = new Date(nowIst.getTime() + daysAhead * DAY_MS);
  target.setUTCHours(hour, minute, 0, 0);
  return new Date(target.getTime() - IST_OFFSET_MS).toISOString();
}
