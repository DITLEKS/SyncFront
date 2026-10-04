import { z } from 'zod';

/** Ограничения совпадают с ProjectCreateRequest бэкенда. */
export const projectNameSchema = z
  .string()
  .trim()
  .min(1, 'Укажите название проекта')
  .max(255, 'Не длиннее 255 символов');

export const projectFormSchema = z.object({
  name: projectNameSchema,
  description: z.string().trim().max(2000, 'Не длиннее 2000 символов'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
