import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/tokens.css';
import './styles/floating-chip.css';
import './styles/bring-layout.css';
import './index.css';
import { UIProvider } from './context/UIContext.tsx';
import { applyTheme, getStoredTheme } from './lib/theme';

applyTheme(getStoredTheme()); // applica tema prima del primo paint

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <App />
    </UIProvider>
  </StrictMode>,
);

// I listener onSnapshot Firestore si auto-riconnettono al ritorno in foreground —
// nessun reload manuale necessario grazie a persistentLocalCache().
