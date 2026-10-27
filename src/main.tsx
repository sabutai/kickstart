import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyDevFrame } from './app/devFrame';
import './shared/styles/fonts';
import './shared/styles/global.scss';

applyDevFrame();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
