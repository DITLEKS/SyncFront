import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Link2, StickyNote, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  defaultSourceName,
  NOTE_MAX_LENGTH,
  SOURCE_NAME_MAX_LENGTH,
  type SourceDraft,
  validateSourceUrl,
} from '@/domain/source/sourceDraft';
import { acceptAttribute, validateUploadFile } from '@/domain/upload/fileValidation';
import { useUploadRules } from '@/features/system';
import { formatBytes } from '@/lib/format';
import { uuidV4 } from '@/lib/id';

interface SourceDraftFormProps {
  /**
   * Вызывается с готовым черновиком. false — источник не принят (ошибка уже показана),
   * форма сохраняет введённое, чтобы пользователь мог исправить и повторить.
   */
  onSubmit: (draft: SourceDraft) => Promise<boolean> | boolean;
  disabled?: boolean;
}

const nameField = z.string().trim().max(SOURCE_NAME_MAX_LENGTH, 'Не длиннее 255 символов');

const urlSchema = z.object({
  url: z.string().superRefine((value, ctx) => {
    const error = validateSourceUrl(value);
    if (error) ctx.addIssue({ code: 'custom', message: error });
  }),
  name: nameField,
});

const noteSchema = z.object({
  name: nameField.min(1, 'Укажите название заметки'),
  text: z
    .string()
    .trim()
    .min(1, 'Заметка пустая')
    .max(NOTE_MAX_LENGTH, `Не длиннее ${NOTE_MAX_LENGTH.toLocaleString('ru-RU')} символов`),
});

/** Добавление одного источника: файл, ссылка или текстовая заметка. */
export function SourceDraftForm({ onSubmit, disabled = false }: SourceDraftFormProps) {
  return (
    <Tabs defaultValue="file">
      <TabsList aria-label="Тип источника">
        <TabsTrigger value="file">
          <FileText aria-hidden />
          Файл
        </TabsTrigger>
        <TabsTrigger value="url">
          <Link2 aria-hidden />
          Ссылка
        </TabsTrigger>
        <TabsTrigger value="note">
          <StickyNote aria-hidden />
          Заметка
        </TabsTrigger>
      </TabsList>
      <TabsContent value="file">
        <FileSourceForm onSubmit={onSubmit} disabled={disabled} />
      </TabsContent>
      <TabsContent value="url">
        <UrlSourceForm onSubmit={onSubmit} disabled={disabled} />
      </TabsContent>
      <TabsContent value="note">
        <NoteSourceForm onSubmit={onSubmit} disabled={disabled} />
      </TabsContent>
    </Tabs>
  );
}

function FileSourceForm({ onSubmit, disabled }: SourceDraftFormProps) {
  const rules = useUploadRules();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (next: File | undefined) => {
    if (!next || !rules) return;
    const result = validateUploadFile(next, rules);
    setFile(result.ok ? next : null);
    setError(result.ok ? null : result.message);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const accepted = await onSubmit({
        id: uuidV4(),
        kind: 'file',
        name: defaultSourceName({ file }),
        file,
      });
      if (accepted) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !rules}
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden />
          Выбрать файл
        </Button>
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {file ? `${file.name} · ${formatBytes(file.size)}` : 'Файл не выбран'}
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Файл источника"
          accept={rules ? acceptAttribute(rules.extensions) : undefined}
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </div>
      {rules ? (
        <p className="text-xs text-muted-foreground">
          {rules.extensions.join(', ')}, до {rules.maxSizeMb} МБ
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={!file || disabled}
        loading={busy}
        onClick={() => void submit()}
      >
        Добавить файл
      </Button>
    </div>
  );
}

function UrlSourceForm({ onSubmit, disabled }: SourceDraftFormProps) {
  const form = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: '', name: '' },
  });

  const submit = form.handleSubmit(async ({ url, name }) => {
    const accepted = await onSubmit({
      id: uuidV4(),
      kind: 'url',
      url: url.trim(),
      name: name || defaultSourceName({ url }),
    });
    if (accepted) form.reset();
  });

  return (
    <div className="space-y-3">
      <FormField label="Адрес ссылки" error={form.formState.errors.url?.message}>
        <Input
          type="url"
          inputMode="url"
          placeholder="https://confluence.example.com/…"
          disabled={disabled}
          {...form.register('url')}
        />
      </FormField>
      <FormField label="Название" hint="Необязательно" error={form.formState.errors.name?.message}>
        <Input disabled={disabled} {...form.register('name')} />
      </FormField>
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        loading={form.formState.isSubmitting}
        onClick={() => void submit()}
      >
        Добавить ссылку
      </Button>
    </div>
  );
}

function NoteSourceForm({ onSubmit, disabled }: SourceDraftFormProps) {
  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: { name: '', text: '' },
  });

  const submit = form.handleSubmit(async ({ name, text }) => {
    const accepted = await onSubmit({ id: uuidV4(), kind: 'note', name, text });
    if (accepted) form.reset();
  });

  return (
    <div className="space-y-3">
      <FormField label="Название" error={form.formState.errors.name?.message}>
        <Input disabled={disabled} {...form.register('name')} />
      </FormField>
      <FormField label="Текст заметки" error={form.formState.errors.text?.message}>
        <Textarea rows={4} disabled={disabled} {...form.register('text')} />
      </FormField>
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        loading={form.formState.isSubmitting}
        onClick={() => void submit()}
      >
        Добавить заметку
      </Button>
    </div>
  );
}
