interface PageHeaderProps {
  title: string;
  /** Счётчик или подзаголовок рядом с названием раздела. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {meta ? <span className="text-sm text-muted-foreground">{meta}</span> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
