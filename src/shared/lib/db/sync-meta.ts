import { z } from 'zod';

/** Служебные поля любой пользовательской записи (под будущую синхронизацию). */
export const SyncMetaSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().optional(),
});
export type SyncMeta = z.infer<typeof SyncMetaSchema>;
