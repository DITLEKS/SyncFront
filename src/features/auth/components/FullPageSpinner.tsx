import { Loader2 } from 'lucide-react';

export function FullPageSpinner({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
