import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
}

/** Последний рубеж: ошибки рендера вне маршрутов (ошибки внутри маршрутов ловит RouteErrorPage). */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Необработанная ошибка рендера', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {getErrorMessage(this.state.error)}
        </p>
        <Button onClick={() => window.location.reload()}>Перезагрузить страницу</Button>
      </div>
    );
  }
}
