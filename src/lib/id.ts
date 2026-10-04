/** UUID v4 для Idempotency-Key и локальных идентификаторов черновиков. */
export function uuidV4(): string {
  return crypto.randomUUID();
}
