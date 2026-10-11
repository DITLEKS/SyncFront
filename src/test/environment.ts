import { builtinEnvironments, type Environment } from 'vitest/environments';

// Vitest 2 подменяет глобалы jsdom-реализациями, а fetch/Request/Response оставляет из Node (undici).
// На Node 22+ undici проверяет `signal instanceof AbortSignal` своего realm и падает на jsdom-сигнале:
// «RequestInit: Expected signal to be an instance of AbortSignal». Vitest 4 вернул эти глобалы Node
// (vitest-dev/vitest#8390); до обновления Vitest повторяем тот же набор здесь.
const NODE_FETCH_GLOBALS = [
  'Headers',
  'AbortController',
  'AbortSignal',
  'URL',
  'URLSearchParams',
] as const;

const jsdom = builtinEnvironments.jsdom;

export default {
  name: 'jsdom-node-fetch',
  transformMode: 'web',
  async setup(global: typeof globalThis, options) {
    const nodeGlobals = Object.fromEntries(NODE_FETCH_GLOBALS.map((key) => [key, global[key]]));
    const env = await jsdom.setup(global, options);
    Object.assign(global, nodeGlobals);
    return env;
  },
} satisfies Environment;
