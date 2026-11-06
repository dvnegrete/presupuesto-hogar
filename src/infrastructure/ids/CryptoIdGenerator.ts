import type { IdGenerator } from '@domain/ports';

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
