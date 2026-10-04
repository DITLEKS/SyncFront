import { client, ok } from '../client';
import type { CapabilitiesResponse } from '../types';

/** Единственный адаптер к /system/capabilities; читается один раз за сессию. */
export async function getCapabilities(): Promise<CapabilitiesResponse> {
  return ok(await client.GET('/api/v1/system/capabilities'));
}
