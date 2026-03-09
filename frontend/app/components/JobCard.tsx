'use client';
import { Job, JobState } from '../types';

const STATE_COLOR: Record<JobState, string> = {
  POSTED:    '#f7931a',
  ACCEPTED:  '#4d9eff',
  ESCROWED:  '#9b59ff',
  DELIVERED: '#00d4aa',
  SETTLED:   '#00d4aa',
  DISPUTED:  '#ff4d4d',
  RESOLVED:  '#7070a0',
  CANCELLED: '#7070a0',
};

const STATE_STEPS: JobState[] = ['POSTED', 'ACCEPTED', 'ESCROWED', 'DELIVERED', 'SETTLED'];

function microToDisplay(micro: number): string {
  return (micro / 1_000_000).toFixed(4);
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface Props { job: Job; }

export default function JobCard({ job }: Props) {
  const currentStep = STATE_STEPS.indexOf(job.state as JobState);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Job #{job.jobId}</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: STATE_COLOR[job.state],
              background: `${STATE_COLOR[job.state]}22`,
              border: `1px solid ${STATE_COLOR[job.state]}44`,
              padding: '1px 8px', borderRadius: 10,
            }}>{job.state}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, maxWidth: 340 }}>
            {job.description}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
            {microToDisplay(job.paymentAmount)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{job.currency}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{job.buyerLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--accent)' }}>→</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{job.sellerLabel}</span>
        <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 7px', borderRadius: 4 }}>
          {job.skillRequired}
        </span>
      </div>

      {/* State progress bar */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {STATE_STEPS.map((step, i) => {
          const done = currentStep >= i;
          const active = currentStep === i;
          return (
            <div key={step} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 3, borderRadius: 2,
                background: done ? STATE_COLOR[job.state] : 'var(--border)',
                marginBottom: 4,
                boxShadow: active ? `0 0 6px ${STATE_COLOR[job.state]}` : 'none',
              }} />
              <div style={{ fontSize: 9, color: done ? STATE_COLOR[job.state] : 'var(--text-dim)', textTransform: 'uppercase' }}>
                {step}
              </div>
            </div>
          );
        })}
      </div>

      {job.x402PaymentId && (
        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-dim)' }}>
          x402: <span style={{ color: 'var(--purple)' }}>{job.x402PaymentId}</span>
        </div>
      )}
    </div>
  );
}
