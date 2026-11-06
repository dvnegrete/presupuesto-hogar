/**
 * Composition root: el único lugar que conoce las implementaciones concretas.
 * Para migrar a un backend (Railway/Vercel) basta con crear `createHttpRepositories()`
 * que implemente `Repositories` y pasarlo aquí; dominio, casos de uso y UI no cambian.
 */
import { ExportBackup, ImportBackup } from '@application/use-cases/Backup';
import { GetMonthlySummary, GetProjection, GetPurchaseStatuses, LoadBudgetData } from '@application/use-cases/BudgetQueries';
import { DeleteEntity } from '@application/use-cases/DeleteEntity';
import { notReferencedBy, referenceMustExist } from '@application/use-cases/guards';
import { SaveEntity } from '@application/use-cases/SaveEntity';
import {
  createCreditCard,
  createFixedExpense,
  createFixedIncome,
  createInstallmentPurchase,
  createPerson,
  createVariableExpense,
  createVariableIncome,
} from '@domain/entities';
import type { IdGenerator, Repositories } from '@domain/ports';
import { BudgetCalculator } from '@domain/services/BudgetCalculator';
import { InstallmentScheduler } from '@domain/services/InstallmentScheduler';

export const createContainer = (repos: Repositories, ids: IdGenerator) => {
  const calculator = new BudgetCalculator();
  const loadData = new LoadBudgetData(repos);
  const personExists = referenceMustExist(repos.people, (e: { personId: string }) => e.personId, 'La persona no existe');
  const cardExists = referenceMustExist(repos.cards, (e: { cardId: string }) => e.cardId, 'La tarjeta no existe');

  return {
    loadData,
    getMonthlySummary: new GetMonthlySummary(calculator),
    getProjection: new GetProjection(calculator),
    getPurchaseStatuses: new GetPurchaseStatuses(new InstallmentScheduler()),
    exportBackup: new ExportBackup(() => loadData.execute()),
    importBackup: new ImportBackup(repos),

    savePerson: new SaveEntity(repos.people, createPerson, ids),
    deletePerson: new DeleteEntity(repos.people, [
      notReferencedBy(repos.fixedIncomes, (e) => e.personId, (n) => `Tiene ${n} ingreso(s) fijo(s) asignado(s)`),
      notReferencedBy(repos.variableIncomes, (e) => e.personId, (n) => `Tiene ${n} ingreso(s) variable(s) registrado(s)`),
    ]),

    saveCard: new SaveEntity(repos.cards, createCreditCard, ids),
    deleteCard: new DeleteEntity(repos.cards, [
      notReferencedBy(repos.purchases, (e) => e.cardId, (n) => `La tarjeta tiene ${n} compra(s) a MSI; elimínalas primero`),
    ]),

    savePurchase: new SaveEntity(repos.purchases, createInstallmentPurchase, ids, [cardExists]),
    deletePurchase: new DeleteEntity(repos.purchases),

    saveFixedIncome: new SaveEntity(repos.fixedIncomes, createFixedIncome, ids, [personExists]),
    deleteFixedIncome: new DeleteEntity(repos.fixedIncomes),
    saveVariableIncome: new SaveEntity(repos.variableIncomes, createVariableIncome, ids, [personExists]),
    deleteVariableIncome: new DeleteEntity(repos.variableIncomes),

    saveFixedExpense: new SaveEntity(repos.fixedExpenses, createFixedExpense, ids),
    deleteFixedExpense: new DeleteEntity(repos.fixedExpenses),
    saveVariableExpense: new SaveEntity(repos.variableExpenses, createVariableExpense, ids),
    deleteVariableExpense: new DeleteEntity(repos.variableExpenses),
  };
};

export type Container = ReturnType<typeof createContainer>;
