import { format, parse } from 'date-fns';

// Даты плана — строки yyyy-MM-dd без времени суток: переход на летнее время ничего не сдвигает.
const DATE_FORMAT = 'yyyy-MM-dd';

export const toDate = (date: string): Date => parse(date, DATE_FORMAT, new Date(2000, 0, 1));
export const toKey = (date: Date): string => format(date, DATE_FORMAT);
/** День недели по ISO: 1 = пн … 7 = вс. */
export const isoWeekday = (date: Date): number => ((date.getDay() + 6) % 7) + 1;
