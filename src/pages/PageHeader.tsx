interface PageHeaderProps {
  title: string;
  /** Счётчик или подзаголовок под названием раздела. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold tracking-tight">{title}</h1>
        {meta ? (
          <div className="mt-0.5 break-words text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
