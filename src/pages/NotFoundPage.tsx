import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Страница не найдена</h1>
      <Button asChild>
        <Link to="/">На главную</Link>
      </Button>
    </main>
  );
}
