import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { BrandMark } from './BrandMark';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-accent/60 to-background px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <BrandMark className="size-10" />
        <div>
          <p className="text-lg font-semibold leading-tight">SyncScribe</p>
          <p className="text-xs text-muted-foreground">Документация всегда актуальна</p>
        </div>
      </div>
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
    </main>
  );
}
