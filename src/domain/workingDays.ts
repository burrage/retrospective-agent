export function roundHalfUp(n: number): number {
  const floor = Math.floor(n);
  return n - floor >= 0.5 ? floor + 1 : floor;
}

function isWeekend(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export function addWorkingDays(start: Date, days: number): Date {
  const current = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current)) {
      remaining--;
    }
  }
  return current;
}

export function advanceToMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 6) {
    d.setDate(d.getDate() + 2);
  } else if (day === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function workingDaysBetween(start: Date, end: Date): number {
  let current = new Date(start);
  let total = 0;

  while (current < end) {
    const next = new Date(current);
    next.setDate(current.getDate() + 1);

    if (!isWeekend(current)) {
      const diff = Math.min(end.getTime(), next.getTime()) - current.getTime();
      total += diff;
    }

    current = next;
  }

  return total / (1000 * 60 * 60 * 24);
}