# Presupuesto del hogar

SPA local-first (React 18 + TypeScript + Vite) para presupuestar ingresos y gastos del hogar, con compras a meses sin intereses vinculadas a tarjetas de crédito y una proyección de lo que queda a fin de mes.

## Uso

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # pruebas de dominio, casos de uso e IndexedDB
npm run build        # dist/ → listo para Vercel, Netlify o cualquier hosting estático
npm run build:single # dist-single/index.html → un solo archivo autocontenido
```

Los datos viven en IndexedDB del navegador. En **Respaldo** puedes exportar/importar un JSON para moverlos entre navegadores o dispositivos.

## Reglas de negocio

- **Ingresos fijos** por persona: mensual (día de la fecha de inicio), quincenal (días 15 y último del mes) o semanal (cada 7 días desde la fecha de inicio). Vigencia con fecha de inicio y fin opcional.
- **Ingresos variables**: solo cuentan los registrados como recibidos en el mes.
- **Gastos fijos** con vigencia por mes (inicio y fin opcional) y **gastos variables** por fecha.
- **MSI**: la compra entra al primer corte en o después de la fecha de compra (el mismo día del corte cuenta). Cada mensualidad se asigna al mes de su **fecha de pago**: mismo mes del corte si el día de pago es mayor al de corte; si no, el mes siguiente. Días inexistentes se recortan al fin de mes (corte 31 → 28 en febrero). El residuo de centavos se reparte en las primeras mensualidades.
- **Saldo del mes** = ingresos − (fijos + variables + mensualidades). También se muestra cuánto se libera el mes siguiente por mensualidades que terminan y una proyección de 6 meses.

## Arquitectura

Clean Architecture con dependencias apuntando hacia el dominio:

```
src/
  domain/           Reglas de negocio puras, sin React ni IndexedDB
    entities/       Entidades inmutables + fábricas que validan invariantes
    value-objects/  Money (centavos enteros), YearMonth, CalendarDate (sin zona horaria)
    services/       InstallmentScheduler, IncomeSchedule (estrategias por frecuencia), BudgetCalculator
    ports/          Repository<T>, Repositories, IdGenerator
  application/      Casos de uso: SaveEntity, DeleteEntity (+ guards), consultas y respaldo
  infrastructure/   Adaptadores: IndexedDbRepository, InMemoryRepository, CryptoIdGenerator
  composition/      Composition root: único lugar que conoce las implementaciones concretas
  presentation/     React: contexto, páginas y componentes
```

Decisiones SOLID:

- **S**: cada caso de uso hace una cosa; el cálculo de MSI, el de ingresos y el resumen son servicios separados.
- **O**: nuevas frecuencias de ingreso = nueva `FrequencyPolicy`; nuevas reglas al guardar/borrar = nuevos guards, sin tocar `SaveEntity`/`DeleteEntity`.
- **L**: `IndexedDbRepository` e `InMemoryRepository` son intercambiables (las pruebas usan ambos).
- **I**: los casos de uso reciben solo el repositorio que necesitan.
- **D**: dominio y aplicación dependen de los puertos; la infraestructura se inyecta en `composition/container.ts`.

## Migrar a un backend (si algún día hace falta)

1. Crear `infrastructure/persistence/HttpRepository.ts` que implemente `Repository<T>` contra una API (por ejemplo NestJS + PostgreSQL en Railway).
2. Cambiar `createIndexedDbRepositories()` por `createHttpRepositories()` en `src/main.tsx`.
3. Importar el respaldo JSON en la nueva base.

Dominio, casos de uso y UI no cambian.
