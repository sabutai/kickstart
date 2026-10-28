/** Остаток времени как «м:сс»; дробные секунды округляются вверх (последняя секунда показывает 0:01, а не 0:00). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Средняя оценка техники одной цифрой после запятой, по-русски: «4,3». null — оценок нет. */
export function averageRating(ratings: (number | null)[]): string | null {
  const given = ratings.filter((r): r is number => r !== null);
  if (given.length === 0) return null;
  const mean = given.reduce((a, b) => a + b, 0) / given.length;
  return (Math.round(mean * 10) / 10).toString().replace('.', ',');
}
