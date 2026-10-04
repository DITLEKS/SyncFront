import { z } from 'zod';

/**
 * Клиентская валидация — только очевидные вещи (формат email, длина пароля 8–128).
 * Политику сложности пароля проверяет сервер и возвращает текст в 422; его показываем как есть.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z.email({ error: 'Некорректный email' }).trim().min(1, 'Укажите email');

const password = z
  .string()
  .min(PASSWORD_MIN, `Минимум ${PASSWORD_MIN} символов`)
  .max(PASSWORD_MAX, `Максимум ${PASSWORD_MAX} символов`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль'),
});

export const registerSchema = z
  .object({
    email,
    password,
    passwordConfirm: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirm'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
