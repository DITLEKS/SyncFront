import * as React from 'react';

import { cn } from '@/lib/cn';

import { Label } from './label';

interface FormFieldProps {
  /** Без id используется сгенерированный useId. */
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactElement;
  className?: string;
}

/**
 * Поле формы: подпись, контрол, подсказка и ошибка, связанные через aria-атрибуты.
 * Контрол получает id, aria-invalid и aria-describedby автоматически.
 */
export function FormField({
  id: explicitId,
  label,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const generatedId = React.useId();
  const id = explicitId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  const control = React.cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
