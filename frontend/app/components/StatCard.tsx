'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 8,
      padding: '16px 20px',
      minWidth: 140,
    }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}
