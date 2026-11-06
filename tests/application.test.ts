import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createContainer } from '@composition/container';
import { DomainError } from '@domain/errors/DomainError';
import type { Repositories } from '@domain/ports';
import { createIndexedDbRepositories } from '@infrastructure/persistence/IndexedDbRepository';
import { InMemoryRepository } from '@infrastructure/persistence/InMemoryRepository';

let n = 0;
const ids = { next: () => `id-${++n}` };

const memoryRepos = (): Repositories => ({
  people: new InMemoryRepository(),
  cards: new InMemoryRepository(),
  purchases: new InMemoryRepository(),
  fixedIncomes: new InMemoryRepository(),
  variableIncomes: new InMemoryRepository(),
  fixedExpenses: new InMemoryRepository(),
  variableExpenses: new InMemoryRepository(),
});

describe('casos de uso', () => {
  it('no permite MSI en una tarjeta inexistente', async () => {
    const c = createContainer(memoryRepos(), ids);
    await expect(
      c.savePurchase.execute({ cardId: 'nope', description: 'TV', totalCents: 1000, months: 3, purchaseDate: '2026-11-01' }),
    ).rejects.toThrow('La tarjeta no existe');
  });

  it('no permite borrar una tarjeta con compras a MSI', async () => {
    const c = createContainer(memoryRepos(), ids);
    const card = await c.saveCard.execute({ name: 'Oro', cutoffDay: 10, paymentDay: 30 });
    await c.savePurchase.execute({ cardId: card.id, description: 'TV', totalCents: 1000, months: 3, purchaseDate: '2026-11-01' });
    await expect(c.deleteCard.execute(card.id)).rejects.toBeInstanceOf(DomainError);
  });

  it('no permite borrar una persona con ingresos', async () => {
    const c = createContainer(memoryRepos(), ids);
    const p = await c.savePerson.execute({ name: 'Ana' });
    await c.saveFixedIncome.execute({ personId: p.id, name: 'Sueldo', amountCents: 100, frequency: 'monthly', startDate: '2026-01-01' });
    await expect(c.deletePerson.execute(p.id)).rejects.toThrow(/ingreso/);
  });

  it('actualiza cuando se pasa el id', async () => {
    const repos = memoryRepos();
    const c = createContainer(repos, ids);
    const p = await c.savePerson.execute({ name: 'Ana' });
    await c.savePerson.execute({ id: p.id, name: 'Ana María' });
    expect(await repos.people.findAll()).toEqual([{ id: p.id, name: 'Ana María' }]);
  });
});

describe('IndexedDB + respaldo', () => {
  it('persiste, exporta e importa validando con el dominio', async () => {
    const source = createContainer(createIndexedDbRepositories('db-a'), ids);
    const card = await source.saveCard.execute({ name: 'Oro', cutoffDay: 10, paymentDay: 30 });
    await source.savePurchase.execute({ cardId: card.id, description: 'TV', totalCents: 90000, months: 3, purchaseDate: '2026-11-01' });
    const backup = await source.exportBackup.execute();

    const target = createContainer(createIndexedDbRepositories('db-b'), ids);
    await target.importBackup.execute(JSON.parse(JSON.stringify(backup)));
    const data = await target.loadData.execute();
    expect(data.cards).toHaveLength(1);
    expect(target.getMonthlySummary.execute('2026-11', data).expenses.installmentsCents).toBe(30000);
  });

  it('rechaza un respaldo inválido sin tocar los datos', async () => {
    const repos = createIndexedDbRepositories('db-c');
    const c = createContainer(repos, ids);
    await c.savePerson.execute({ name: 'Damian' });
    const bad = { app: 'presupuesto-hogar', version: 1, data: { people: [{ id: 'x', name: '' }] } };
    await expect(c.importBackup.execute(bad)).rejects.toThrow('El nombre es obligatorio');
    expect(await repos.people.findAll()).toHaveLength(1);
  });
});
