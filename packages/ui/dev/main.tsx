import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../src/styles/fonts.css';
import '../src/styles/tokens.css';
import '../src/styles/utilities.css';
import './dev.css';
import { TokenPreview } from './TokenPreview';
import { ComponentPreview } from './ComponentPreview';
import { SegmentedTab, SegmentedTabGroup } from '../src/components';

const App: React.FC = () => {
  const [page, setPage] = useState<'tokens' | 'components'>('tokens');
  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e3df', padding: '12px 32px', background: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
        <SegmentedTabGroup value={page} onValueChange={(v) => setPage(v as 'tokens' | 'components')}>
          <SegmentedTab value="tokens">Tokens</SegmentedTab>
          <SegmentedTab value="components">Components</SegmentedTab>
        </SegmentedTabGroup>
      </div>
      {page === 'tokens' ? <TokenPreview /> : <ComponentPreview />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
