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
import { PASSWORD_MIN, registerSchema, type RegisterFormValues } from '../model/schemas';

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await registerUser({ email, password });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id="register-email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" autoFocus {...form.register('email')} />
      </FormField>
      <FormField
        id="register-password"
        label="Пароль"
        hint={`От ${PASSWORD_MIN} символов. Требования к сложности проверяет сервер.`}
        error={errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <FormField
        id="register-password-confirm"
        label="Повторите пароль"
        error={errors.passwordConfirm?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('passwordConfirm')} />
      </FormField>
      {serverError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Создать аккаунт
      </Button>
    </form>
  );
}
