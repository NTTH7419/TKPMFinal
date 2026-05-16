import React, { useState, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import '../src/styles/fonts.css';
import '../src/styles/tokens.css';
import '../src/styles/utilities.css';
import './dev.css';
import { TokenPreview } from './TokenPreview';
import { ComponentPreview } from './ComponentPreview';
import { SegmentedTab, SegmentedTabGroup } from '../src/components';

const LayoutPreview = lazy(() =>
  import('./LayoutPreview').then((m) => ({ default: m.LayoutPreview })),
);

type Page = 'tokens' | 'components' | 'layout';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('tokens');
  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e3df', padding: '12px 32px', background: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
        <SegmentedTabGroup value={page} onValueChange={(v) => setPage(v as Page)}>
          <SegmentedTab value="tokens">Tokens</SegmentedTab>
          <SegmentedTab value="components">Components</SegmentedTab>
          <SegmentedTab value="layout">Layout</SegmentedTab>
        </SegmentedTabGroup>
      </div>
      {page === 'tokens' && <TokenPreview />}
      {page === 'components' && <ComponentPreview />}
      {page === 'layout' && (
        <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
          <LayoutPreview />
        </Suspense>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
