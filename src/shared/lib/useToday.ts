import { useEffect, useState } from 'react';
import { toKey } from './dates';

/** Сегодняшняя дата `yyyy-MM-dd`; обновляется, когда приложение возвращается на передний план (полночь прошла). */
export function useToday(): string {
  const [today, setToday] = useState(() => toKey(new Date()));
  useEffect(() => {
    const update = () => setToday(toKey(new Date()));
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return today;
}
