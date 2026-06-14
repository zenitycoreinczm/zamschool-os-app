export function resolveLessonDayOfWeek(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().getUTCDay();
  }

  return parsed.getUTCDay();
}
