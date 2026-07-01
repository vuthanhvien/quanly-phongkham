import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { loadCachedAppUiSettings, syncDocumentBranding } from './app-ui';
import 'antd/dist/reset.css';
import './styles.css';

syncDocumentBranding(loadCachedAppUiSettings());
const routerBase = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBase}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
