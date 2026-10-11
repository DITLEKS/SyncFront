import { Skeleton } from '@/components/ui/skeleton';

/** Заглушка на время загрузки chunk страницы: повторяет ритм заголовок + контент. */
export function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка страницы">
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
