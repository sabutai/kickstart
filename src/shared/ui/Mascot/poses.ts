export type KikPose = 'front' | 'three' | 'side' | 'back' | 'head';

/** Порядок поз для списков: карточки библиотеки чередуют ракурсы (без «головы»). */
export const KIK_POSES: readonly KikPose[] = ['three', 'front', 'side', 'back'];
