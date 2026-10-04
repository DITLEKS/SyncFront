import { cn } from '@/lib/cn';

/** Фирменный знак из UI-референса: источники синхронизируются с документом. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 ring-1 ring-indigo-500/20',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[56%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="5" cy="6" r="2" />
        <circle cx="5" cy="18" r="2" />
        <path d="M7 6C10 6 10 9 13 9M7 18C10 18 10 15 13 15" strokeLinecap="round" />
        <rect x="13" y="4" width="8" height="16" rx="2" />
        <path d="M15.5 11.5h3M15.5 15.5h3" strokeLinecap="round" />
        <path d="m18.5 2 1.5 1.5 1.5-1.5-1.5-1.5Z" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
