import React from 'react';
import ReactDOM from 'react-dom/client';
import '../src/styles/fonts.css';
import '../src/styles/tokens.css';
import { TokenPreview } from './TokenPreview';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TokenPreview />
  </React.StrictMode>
);
