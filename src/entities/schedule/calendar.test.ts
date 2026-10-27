import { describe, expect, it } from 'vitest';
import { PlannedSessionSchema } from '../user-data/schema';
import { generateCalendar, stageOfWeek, weekOfDate } from './calendar';

// Вт/Чт — секция, Пн/Ср/Сб — дома. Старт в понедельник 2 ноября 2026.
const base = { startDate: '2026-11-02', clubDays: [2, 4], homeDays: [1, 3, 6], weeks: 12 };
const dates = (list: { date: string }[]) => list.map((s) => s.date);

describe('stageOfWeek', () => {
  it('недели 1–4 → этап 1, 5–8 → 2, 9–12 → 3', () => {
    const stages = Array.from({ length: 12 }, (_, i) => stageOfWeek(i + 1));
    expect(stages).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
  });

  it('после недели 12 остаётся этап 3', () => {
    expect(stageOfWeek(13)).toBe(3);
    expect(stageOfWeek(52)).toBe(3);
  });
});

describe('weekOfDate', () => {
  it('неделя календарная Пн–Вс, считается от недели старта', () => {
    expect(weekOfDate('2026-11-02', '2026-11-02')).toBe(1);
    expect(weekOfDate('2026-11-02', '2026-11-08')).toBe(1); // воскресенье
    expect(weekOfDate('2026-11-02', '2026-11-09')).toBe(2); // понедельник
  });

  it('старт в середине недели: первая неделя неполная', () => {
    expect(weekOfDate('2026-11-04', '2026-11-08')).toBe(1);
    expect(weekOfDate('2026-11-04', '2026-11-09')).toBe(2);
  });

  it('переход года', () => {
    expect(weekOfDate('2026-12-28', '2027-01-03')).toBe(1);
    expect(weekOfDate('2026-12-28', '2027-01-04')).toBe(2);
  });
});

describe('generateCalendar', () => {
  const plan = generateCalendar(base);

  it('12 недель × (3 домашних + 2 секции) = 60 занятий', () => {
    expect(plan).toHaveLength(60);
    expect(plan.filter((s) => s.kind === 'club')).toHaveLength(24);
  });

  it('даты по возрастанию, без дублей; первая — старт, последняя — воскресенье недели 12', () => {
    const d = dates(plan);
    expect(d).toEqual([...d].sort());
    expect(new Set(d).size).toBe(d.length);
    expect(d[0]).toBe('2026-11-02');
    expect(d.at(-1)).toBe('2027-01-23'); // суббота; воскресенье 24-го — день отдыха
  });

  it('дни недели соответствуют расписанию', () => {
    const iso = (date: string) => ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) + 1;
    for (const s of plan) {
      expect(s.kind === 'club' ? base.clubDays : base.homeDays).toContain(iso(s.date));
    }
  });

  it('этап по номеру недели', () => {
    const stageOn = (date: string) => plan.find((s) => s.date === date)?.stage;
    expect(stageOn('2026-11-02')).toBe(1); // неделя 1
    expect(stageOn('2026-11-28')).toBe(1); // сб, неделя 4
    expect(stageOn('2026-11-30')).toBe(2); // пн, неделя 5
    expect(stageOn('2026-12-26')).toBe(2); // сб, неделя 8
    expect(stageOn('2026-12-28')).toBe(3); // пн, неделя 9
  });

  it('мини-тест заменяет занятие: стартовое и последнее домашнее недель 4, 8, 12', () => {
    const tests = plan.filter((s) => s.kind === 'test');
    expect(dates(tests)).toEqual(['2026-11-02', '2026-11-28', '2026-12-26', '2027-01-23']);
    expect(plan.filter((s) => s.kind === 'home')).toHaveLength(32);
  });

  it('все занятия — «запланировано», id детерминированный по дате', () => {
    for (const s of plan) {
      expect(s.status).toBe('planned');
      expect(s.id).toBe(`ps-${s.date}`);
    }
    expect(generateCalendar(base)).toEqual(plan);
  });

  it('результат проходит схему PlannedSession', () => {
    for (const s of plan) {
      expect(PlannedSessionSchema.safeParse({ ...s, updatedAt: '2026-11-01T00:00:00.000Z' }).success).toBe(
        true,
      );
    }
  });
});

describe('generateCalendar: старт не с понедельника', () => {
  const plan = generateCalendar({ ...base, startDate: '2026-11-04' }); // среда

  it('нет занятий раньше даты старта; среда старта — стартовый тест', () => {
    expect(plan[0]).toMatchObject({ date: '2026-11-04', kind: 'test', stage: 1 });
    expect(dates(plan).every((d) => d >= '2026-11-04')).toBe(true);
  });

  it('первая неделя неполная: Ср, Чт, Сб', () => {
    expect(dates(plan).filter((d) => d <= '2026-11-08')).toEqual(['2026-11-04', '2026-11-05', '2026-11-07']);
  });

  it('программа всё равно заканчивается в конце 12-й календарной недели', () => {
    expect(dates(plan).at(-1)).toBe('2027-01-23');
    // 1-я неделя неполная (3 занятия) + 11 полных по 5 = 58
    expect(plan).toHaveLength(58);
  });

  it('старт в день без занятий: начинается со следующего занятия', () => {
    const p = generateCalendar({ ...base, startDate: '2026-11-08' }); // воскресенье
    expect(p[0]?.date).toBe('2026-11-09');
    expect(p[0]?.kind).toBe('test');
  });
});

describe('generateCalendar: переход года', () => {
  const plan = generateCalendar({ startDate: '2026-12-28', clubDays: [2], homeDays: [1, 5], weeks: 4 });

  it('даты идут через 1 января без пропусков и дублей', () => {
    expect(dates(plan).slice(0, 5)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2027-01-01',
      '2027-01-04',
      '2027-01-05',
    ]);
    expect(new Set(dates(plan)).size).toBe(plan.length);
  });

  it('тест недели 4 — последний домашний день, даже в новом году', () => {
    const week4 = plan.filter((s) => s.date >= '2027-01-18');
    expect(week4.map((s) => [s.date, s.kind])).toEqual([
      ['2027-01-18', 'home'],
      ['2027-01-19', 'club'],
      ['2027-01-22', 'test'],
    ]);
  });
});

describe('generateCalendar: крайние случаи', () => {
  it('только дни секции — только club, тестов нет', () => {
    const plan = generateCalendar({ startDate: '2026-11-02', clubDays: [2, 4], homeDays: [], weeks: 2 });
    expect(plan.every((s) => s.kind === 'club')).toBe(true);
    expect(plan).toHaveLength(4);
  });

  it('только домашние дни — нет club; одно занятие в неделю', () => {
    const plan = generateCalendar({ startDate: '2026-11-02', clubDays: [], homeDays: [3], weeks: 12 });
    expect(plan).toHaveLength(12);
    expect(plan.filter((s) => s.kind === 'test').map((s) => s.date)).toEqual([
      '2026-11-04',
      '2026-11-25',
      '2026-12-23',
      '2027-01-20',
    ]);
  });

  it('если стартовое занятие — оно же последнее домашнее недели 4, тест один', () => {
    const plan = generateCalendar({ startDate: '2026-11-02', clubDays: [], homeDays: [1], weeks: 1 });
    expect(plan).toEqual([expect.objectContaining({ date: '2026-11-02', kind: 'test' })]);
  });

  it('программа короче 4 недель: только стартовый тест', () => {
    const plan = generateCalendar({ ...base, weeks: 3 });
    expect(plan.filter((s) => s.kind === 'test').map((s) => s.date)).toEqual(['2026-11-02']);
  });

  it('weeks не кратно 4: тесты только на кратные недели в пределах программы', () => {
    const plan = generateCalendar({ ...base, weeks: 10 });
    expect(plan.filter((s) => s.kind === 'test')).toHaveLength(3); // старт, неделя 4, неделя 8
  });

  it('нет дней — пустой план', () => {
    expect(generateCalendar({ startDate: '2026-11-02', clubDays: [], homeDays: [], weeks: 12 })).toEqual([]);
  });

  it('переход на зимнее время не сдвигает даты', () => {
    // В Европе перевод часов 25.10.2026, в США 01.11.2026 — даты считаются без времени суток.
    const plan = generateCalendar({ startDate: '2026-10-26', clubDays: [], homeDays: [1], weeks: 3 });
    expect(dates(plan)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
  });
});
