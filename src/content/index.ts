import raw from './program.json';
import { ProgramSchema, type Exercise } from './schema';

/** Программа проверяется Zod при загрузке модуля: битый JSON ловится сразу, а не на экране. */
export const program = ProgramSchema.parse(raw);

export const exercises: readonly Exercise[] = program.exercises;

export function getExercise(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}
