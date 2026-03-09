'use client';
import { FeedEvent } from '../types';

const EVENT_STYLES: Record<string, { color: string; icon: string; bg: string }> = {
  AGENT_REGISTERED: { color: 'var(--blue)',   icon: '⬡', bg: '#4d9eff18' },
  NEGOTIATION:      { color: 'var(--purple)', icon: '⇄', bg: '#9b59ff18' },
  JOB_POSTED:       { color: 'var(--accent)', icon: '📋', bg: '#f7931a18' },
  JOB_ACCEPTED:     { color: 'var(--green)',  icon: '✓', bg: '#00d4aa18' },
  ESCROW_FUNDED:    { color: 'var(--accent)', icon: '🔒', bg: '#f7931a18' },
  WORK_DELIVERED:   { color: 'var(--blue)',   icon: '📦', bg: '#4d9eff18' },
  PAYMENT_SETTLED:  { color: 'var(--green)',  icon: '⚡', bg: '#00d4aa18' },
  DISPUTE_RAISED:   { color: 'var(--red)',    icon: '⚠', bg: '#ff4d4d18' },
};

interface Props { event: FeedEvent; isNew?: boolean; }

export default function FeedItem({ event, isNew }: Props) {
  const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.JOB_POSTED;

  return (
    <div
      className={isNew ? 'animate-slide-in' : ''}
      style={{
        background: style.bg,
        border: `1px solid ${style.color}33`,
        borderLeft: `3px solid ${style.color}`,
        borderRadius: 6,
        padding: '10px 14px',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{style.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: style.color }}>{event.message}</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
          {event.timestamp}
        </span>
      </div>
      {event.detail && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 22, marginTop: 2 }}>
          {event.detail}
        </div>
      )}
      {event.jobId !== undefined && (
        <div style={{ marginLeft: 22, marginTop: 4 }}>
          <span style={{
            fontSize: 10, background: 'var(--surface-2)',
            color: 'var(--text-dim)', padding: '1px 6px', borderRadius: 3,
          }}>
            JOB #{event.jobId}
          </span>
        </div>
      )}
    </div>
  );
}
