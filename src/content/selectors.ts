import { exercises, program } from './index';
import type { Category, Exercise } from './schema';

/** Порядок категорий в интерфейсе. */
export const CATEGORY_ORDER: readonly Category[] = [
  'warmup',
  'balance',
  'strength',
  'technique',
  'games',
  'mobility',
];

export const isCategory = (value: string | null): value is Category =>
  value !== null && (CATEGORY_ORDER as readonly string[]).includes(value);

export function categoryCounts(): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<Category, number>;
  for (const e of exercises) counts[e.category]++;
  return counts;
}

/** Упражнения категории в порядке программы; 'all' — все. */
export function exercisesIn(category: Category | 'all'): Exercise[] {
  return category === 'all' ? [...exercises] : exercises.filter((e) => e.category === category);
}

/** Первое предложение: точка внутри числа («1,5 м.», «2.5») предложение не заканчивает. */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = /^.*?[.!?](?=\s|$)/s.exec(trimmed);
  return match ? match[0] : trimmed;
}

/** Короткое описание для карточки: «Зачем», а если его нет (блоки Б–Г) — первое предложение описания. */
export function describeExercise(exercise: Exercise): string {
  return exercise.why?.ru ?? firstSentence(exercise.levels[0]?.variation.ru ?? '');
}

export const clampLevel = (exercise: Exercise, level: number): number =>
  Math.min(Math.max(Math.round(level), 1), exercise.levels.length);

/** Максимальный уровень, который делаем дома (перекат — не выше 3). */
export const maxHomeLevel = (exercise: Exercise): number =>
  Math.min(exercise.safety?.homeMaxLevel ?? exercise.levels.length, exercise.levels.length);

/** Предложения текста: точка внутри числа («1,5 м.», «2.5») и перед строчной буквой предложение не заканчивает. */
export function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Шаги для нумерованного списка. У блока А шаги заданы в данных; у остальных («Как делать» одним абзацем)
 * абзац делится на предложения — тот же текст, только оформлением. Одно предложение — это не список.
 */
export function stepsFor(exercise: Exercise, levelText: string): string[] | null {
  if (exercise.steps) return exercise.steps.ru;
  if (exercise.levels.length > 1) return null;
  const sentences = splitSentences(levelText);
  return sentences.length >= 2 ? sentences : null;
}

export type RuleGroup = 'ball' | 'feet' | 'mobility';

/** Какому блоку принадлежит упражнение для «общих правил»: Б, В или мобильность; у игр и блока А их нет. */
export function ruleGroup(exercise: Exercise): RuleGroup | null {
  if (exercise.category === 'mobility') return 'mobility';
  if (exercise.partKinds.includes('ball')) return 'ball';
  if (exercise.partKinds.includes('feet')) return 'feet';
  return null;
}

/** Общие правила блока упражнения (дословно из docs/program.md); пусто, если у блока их нет. */
export function rulesFor(exercise: Exercise): string[] {
  const group = ruleGroup(exercise);
  return group ? (program.rules[group]?.ru ?? []) : [];
}
