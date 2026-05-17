interface Props {
  steps: string[];
  currentStep: number; // 0-based
}

export default function StepIndicator({ steps, currentStep }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 0 }}>
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 700,
                background: done ? '#22c55e' : active ? '#6366f1' : '#e2e8f0',
                color: done || active ? '#fff' : '#94a3b8',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#6366f1' : done ? '#22c55e' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : '#e2e8f0', margin: '0 6px', marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
