import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createContainer } from '@composition/container';
import { CryptoIdGenerator } from '@infrastructure/ids/CryptoIdGenerator';
import { createIndexedDbRepositories } from '@infrastructure/persistence/IndexedDbRepository';
import { App } from '@presentation/App';
import { ConfirmProvider } from '@presentation/components/ConfirmProvider';
import { BudgetProvider } from '@presentation/di/BudgetContext';
import '@presentation/styles/app.css';

// Composition root: aquí se elige el adaptador de persistencia.
const services = createContainer(createIndexedDbRepositories(), new CryptoIdGenerator());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BudgetProvider services={services}>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </BudgetProvider>
  </StrictMode>,
);
