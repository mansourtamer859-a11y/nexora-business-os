import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary';
import { LocaleProvider } from './i18n/LocaleProvider';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Nexus could not start because the root element is missing.');
  const fallback = document.createElement('main');
  fallback.setAttribute('role', 'alert');
  fallback.textContent = 'Nexus could not start. Reload the page or contact your administrator.';
  document.body.replaceChildren(fallback);
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ModuleErrorBoundary label="Application">
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </ModuleErrorBoundary>
    </React.StrictMode>,
  );
}
