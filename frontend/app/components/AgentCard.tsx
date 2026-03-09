'use client';
import { Agent } from '../types';

const TIER_COLORS: Record<string, string> = {
  UNRANKED: '#7070a0',
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
  PLATINUM: '#4d9eff',
  DIAMOND: '#9b59ff',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  paused: '#f7931a',
  banned: 'var(--red)',
};

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function microToDisplay(micro: number): string {
  return (micro / 1_000_000).toFixed(4);
}

interface Props { agent: Agent; isSelected: boolean; onClick: () => void; }

export default function AgentCard({ agent, isSelected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{agent.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{shortAddr(agent.principal)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="pulse-dot" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: STATUS_COLOR[agent.status],
            }} />
            <span style={{ fontSize: 11, color: STATUS_COLOR[agent.status], textTransform: 'uppercase' }}>
              {agent.status}
            </span>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: TIER_COLORS[agent.tier],
            border: `1px solid ${TIER_COLORS[agent.tier]}44`,
            padding: '2px 8px', borderRadius: 20,
          }}>
            {agent.tier}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {agent.skills.map(s => (
          <span key={s} style={{
            fontSize: 10, background: 'var(--accent-dim)',
            color: 'var(--accent)', padding: '2px 7px',
            borderRadius: 4, border: '1px solid var(--accent)44',
          }}>{s}</span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Score', value: agent.reputationScore },
          { label: 'Jobs', value: agent.jobsCompleted },
          { label: 'Price', value: `${microToDisplay(agent.pricePerJob)} STX` },
          { label: 'Earned', value: `${microToDisplay(agent.totalEarned)} STX` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--background)', borderRadius: 6, padding: '6px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
