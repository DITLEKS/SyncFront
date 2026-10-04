import '@testing-library/jest-dom/vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server';

// fetch в Node (undici) не умеет отправлять FormData/File из jsdom: запрос зависает или
// падает на append. В браузере такой проблемы нет, поэтому в тестах подставляем классы Node.
// FormData из undici достаём через Response, чтобы не зависеть от транзитивного пакета.
const probe = new Response('probe=1', {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});
const NodeFormData = (await probe.formData()).constructor;
Object.assign(globalThis, { File: NodeFile, Blob: NodeBlob, FormData: NodeFormData });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  window.localStorage.clear();
});
afterAll(() => server.close());
