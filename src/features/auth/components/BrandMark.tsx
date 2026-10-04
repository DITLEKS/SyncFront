import { cn } from '@/lib/cn';

/** Логотип-плейсхолдер: заменить на фирменный знак, когда он появится. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[55%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="M5 7h14M5 12h9M5 17h14" strokeLinecap="round" />
        <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
