import { createEvent, createStore } from 'effector';
import type { Rejection } from '../../entities/schedule/actions';
import {
  sessionActionRejected,
  sessionDone,
  sessionMovedToSunday,
  sessionSkipped,
  sessionStatusReset,
} from '../../entities/schedule/model';

/** Причина последнего отказа действия над занятием — экран показывает её текстом. */
export const rejectionCleared = createEvent();

export const $rejection = createStore<Rejection | null>(null)
  .on(sessionActionRejected, (_, { reason }) => reason)
  .reset(rejectionCleared, sessionDone, sessionSkipped, sessionStatusReset, sessionMovedToSunday);
