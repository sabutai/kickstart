import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../user-data/schema';
import { markDone, moveToSunday, resetStatus, skip } from './actions';
import { generateCalendar } from './calendar';

const stamp = '2026-11-01T00:00:00.000Z';
const session = (date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `ps-${date}`,
  updatedAt: stamp,
  date,
  stage: 1,
  kind: 'home',
  status: 'planned',
  ...over,
});

// 2026-11-07 — суббота, 2026-11-08 — воскресенье.
const SAT = '2026-11-07';
const SUN = '2026-11-08';

describe('markDone («Был» / выполнено)', () => {
  it('отмечает сегодняшнее и прошедшее занятие', () => {
    expect(markDone(session(SAT), SAT)).toEqual({
      ok: true,
      session: expect.objectContaining({ status: 'done' }),
    });
    expect(markDone(session('2026-11-03', { kind: 'club' }), SAT)).toMatchObject({ ok: true });
  });

  it('будущее занятие отметить нельзя', () => {
    expect(markDone(session(SAT), '2026-11-06')).toEqual({ ok: false, reason: 'future' });
  });

  it('только из «запланировано»', () => {
    expect(markDone(session(SAT, { status: 'done' }), SAT)).toEqual({ ok: false, reason: 'wrong-status' });
    expect(markDone(session(SAT, { status: 'skipped' }), SAT)).toEqual({ ok: false, reason: 'wrong-status' });
  });

  it('не меняет исходный объект и остальные поля', () => {
    const original = session(SAT, { kind: 'test', stage: 2 });
    const result = markDone(original, SAT);
    expect(original.status).toBe('planned');
    expect(result).toMatchObject({ session: { id: original.id, date: SAT, kind: 'test', stage: 2 } });
  });
});

describe('skip (пропуск)', () => {
  it('пропускает запланированное, в том числе будущее; дата и соседи не меняются', () => {
    const r = skip(session('2026-11-20'));
    expect(r).toEqual({
      ok: true,
      session: expect.objectContaining({ status: 'skipped', date: '2026-11-20' }),
    });
  });

  it('не пропускает уже отмеченное', () => {
    expect(skip(session(SAT, { status: 'done' }))).toEqual({ ok: false, reason: 'wrong-status' });
    expect(skip(session(SAT, { status: 'skipped' }))).toEqual({ ok: false, reason: 'wrong-status' });
  });

  it('пропуск не создаёт «долг»: календарь не сдвигается', () => {
    const plan = generateCalendar({ startDate: '2026-11-02', clubDays: [2], homeDays: [1, 3], weeks: 2 }).map(
      (s) => ({
        ...s,
        updatedAt: stamp,
      }),
    );
    const before = plan.map((s) => s.date);
    const skipped = plan.map((s) =>
      s.id === 'ps-2026-11-04' ? (skip(s) as { session: PlannedSession }).session : s,
    );
    expect(skipped.map((s) => s.date)).toEqual(before);
    expect(skipped.filter((s) => s.status === 'skipped')).toHaveLength(1);
  });
});

describe('resetStatus (отмена отметки)', () => {
  it('возвращает «выполнено» и «пропущено» в «запланировано»', () => {
    expect(resetStatus(session(SAT, { status: 'done' }))).toMatchObject({
      ok: true,
      session: { status: 'planned' },
    });
    expect(resetStatus(session(SAT, { status: 'skipped' }))).toMatchObject({
      ok: true,
      session: { status: 'planned' },
    });
  });

  it('запланированное сбрасывать нечего', () => {
    expect(resetStatus(session(SAT))).toEqual({ ok: false, reason: 'wrong-status' });
  });
});

describe('moveToSunday (перенос сб → вс)', () => {
  const today = '2026-11-05';

  it('переносит субботнее домашнее занятие на воскресенье и помнит откуда', () => {
    const r = moveToSunday(session(SAT), [session(SAT)], today);
    expect(r).toEqual({
      ok: true,
      session: expect.objectContaining({
        id: `ps-${SAT}`,
        date: SUN,
        movedFrom: SAT,
        status: 'planned',
        stage: 1,
      }),
    });
  });

  it('переносит и мини-тест', () => {
    expect(moveToSunday(session(SAT, { kind: 'test' }), [], today)).toMatchObject({ ok: true });
  });

  it('только суббота', () => {
    expect(moveToSunday(session('2026-11-06'), [], today)).toEqual({ ok: false, reason: 'not-saturday' });
    expect(moveToSunday(session(SUN), [], today)).toEqual({ ok: false, reason: 'not-saturday' });
  });

  it('занятие секции не переносится', () => {
    expect(moveToSunday(session(SAT, { kind: 'club' }), [], today)).toEqual({
      ok: false,
      reason: 'club-session',
    });
  });

  it('воскресенье занято — отказ', () => {
    const plan = [session(SAT), session(SUN, { kind: 'club' })];
    expect(moveToSunday(plan[0]!, plan, today)).toEqual({ ok: false, reason: 'sunday-occupied' });
  });

  it('воскресенье уже прошло — отказ', () => {
    expect(moveToSunday(session(SAT), [], '2026-11-09')).toEqual({ ok: false, reason: 'past' });
  });

  it('в субботу и в воскресенье перенос ещё возможен', () => {
    expect(moveToSunday(session(SAT), [], SAT)).toMatchObject({ ok: true });
    expect(moveToSunday(session(SAT), [], SUN)).toMatchObject({ ok: true });
  });

  it('только запланированное', () => {
    expect(moveToSunday(session(SAT, { status: 'done' }), [], today)).toEqual({
      ok: false,
      reason: 'wrong-status',
    });
    expect(moveToSunday(session(SAT, { status: 'skipped' }), [], today)).toEqual({
      ok: false,
      reason: 'wrong-status',
    });
  });

  it('уже перенесённое занятие (теперь в воскресенье) повторно не переносится', () => {
    const moved = (moveToSunday(session(SAT), [], today) as { session: PlannedSession }).session;
    expect(moveToSunday(moved, [moved], today)).toEqual({ ok: false, reason: 'not-saturday' });
  });

  it('работает через границу года (суббота 2026-12-26 → воскресенье 12-27; суббота 2027-01-02 → 01-03)', () => {
    expect(moveToSunday(session('2027-01-02'), [], '2027-01-01')).toMatchObject({
      ok: true,
      session: { date: '2027-01-03' },
    });
    expect(moveToSunday(session('2026-12-26'), [], '2026-12-20')).toMatchObject({
      ok: true,
      session: { date: '2026-12-27' },
    });
  });

  it('другие занятия плана не затрагиваются: календарь не сдвигается', () => {
    const plan = [session('2026-11-04'), session(SAT), session('2026-11-09')];
    const r = moveToSunday(plan[1]!, plan, today) as { session: PlannedSession };
    const next = plan.map((s) => (s.id === r.session.id ? r.session : s));
    expect(next.map((s) => s.date)).toEqual(['2026-11-04', SUN, '2026-11-09']);
  });
});
