import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';

import { useAuth } from '../AuthProvider';
import { loginSchema, type LoginFormValues } from '../model/schemas';

export function LoginForm() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
    } catch (error) {
      // 429 (rate limit или блокировка входа) — показываем текст, не повторяем запрос сами.
      setServerError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id="login-email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" autoFocus {...form.register('email')} />
      </FormField>
      <FormField id="login-password" label="Пароль" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register('password')} />
      </FormField>
      {serverError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Войти
      </Button>
    </form>
  );
}
