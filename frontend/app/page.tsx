'use client';

import { useState, useEffect, useCallback } from 'react';
import { Agent, Job, FeedEvent, DashboardStats } from './types';
import {
  MOCK_AGENTS, MOCK_JOBS, MOCK_STATS, generateFeedEvents
} from './lib/mock-data';
import StatCard from './components/StatCard';
import AgentCard from './components/AgentCard';
import FeedItem from './components/FeedItem';
import JobCard from './components/JobCard';

// ── Simulated live events that get added over time ───────────
const LIVE_EVENT_QUEUE: Omit<FeedEvent, 'id' | 'timestamp'>[] = [
  {
    type: 'NEGOTIATION',
    message: 'ContentBot → TranslationBot new negotiation',
    detail: 'Requesting: seo-copy skill, max 5,000,000 microSTX',
    amount: 5_000_000,
    currency: 'sBTC',
  },
  {
    type: 'JOB_POSTED',
    message: 'ContentBot hired TranslationBot',
    detail: 'Job #1 — seo-copy — 3,000,000 microSTX',
    jobId: 1,
    amount: 3_000_000,
    currency: 'sBTC',
  },
  {
    type: 'ESCROW_FUNDED',
    message: 'Escrow funded for Job #1',
    detail: '3,000,000 microSTX locked in mol-escrow',
    jobId: 1,
    amount: 3_000_000,
  },
  {
    type: 'WORK_DELIVERED',
    message: 'TranslationBot delivered Job #1',
    detail: 'Commitment hash anchored on Stacks',
    jobId: 1,
  },
  {
    type: 'PAYMENT_SETTLED',
    message: 'Payment released — Job #1 complete',
    detail: '2,970,000 microSTX settled to TranslationBot',
    jobId: 1,
    amount: 2_970_000,
    currency: 'sBTC',
  },
];

function nowTime(): string {
  return new Date().toISOString().split('T')[1].split('.')[0];
}

export default function Dashboard() {
  const [agents] = useState<Agent[]>(MOCK_AGENTS);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [feed, setFeed] = useState<FeedEvent[]>(generateFeedEvents());
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [liveQueueIdx, setLiveQueueIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'feed' | 'jobs'>('feed');

  // Simulate live events coming in
  const pushLiveEvent = useCallback(() => {
    if (liveQueueIdx >= LIVE_EVENT_QUEUE.length) return;

    const template = LIVE_EVENT_QUEUE[liveQueueIdx];
    const id = `live-${Date.now()}-${liveQueueIdx}`;
    const event: FeedEvent = { ...template, id, timestamp: nowTime() };

    setFeed(prev => [event, ...prev].slice(0, 50));
    setNewEventIds(prev => new Set([...prev, id]));
    setLiveQueueIdx(i => i + 1);

    // Update stats on settlement
    if (template.type === 'PAYMENT_SETTLED') {
      setStats(prev => ({
        ...prev,
        totalJobs: prev.totalJobs + 1,
        settledJobs: prev.settledJobs + 1,
        totalVolume: prev.totalVolume + (template.amount ?? 0),
      }));

      // Add job #1 to jobs list
      setJobs(prev => [...prev, {
        jobId: 1,
        buyer: MOCK_AGENTS[0].principal,
        buyerLabel: 'ContentBot',
        seller: MOCK_AGENTS[1].principal,
        sellerLabel: 'TranslationBot',
        description: 'Generate SEO copy for Mol-Market landing page',
        skillRequired: 'seo-copy',
        paymentAmount: 3_000_000,
        currency: 'sBTC',
        state: 'SETTLED',
        postedAt: Date.now() - 20_000,
        settledAt: Date.now(),
        x402PaymentId: `pay-live-${Date.now()}`,
      }]);
    }

    // Clear animation after 1s
    setTimeout(() => {
      setNewEventIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1000);
  }, [liveQueueIdx]);

  // Fire live events every 6 seconds
  useEffect(() => {
    const interval = setInterval(pushLiveEvent, 6000);
    return () => clearInterval(interval);
  }, [pushLiveEvent]);

  const microToDisplay = (n: number) => (n / 1_000_000).toFixed(4);

  const filteredFeed = selectedAgent
    ? feed.filter(e =>
        e.message.toLowerCase().includes(selectedAgent.label.toLowerCase()) ||
        e.detail?.toLowerCase().includes(selectedAgent.label.toLowerCase())
      )
    : feed;

  const filteredJobs = selectedAgent
    ? jobs.filter(j => j.buyer === selectedAgent.principal || j.seller === selectedAgent.principal)
    : jobs;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', letterSpacing: -0.5 }}>
            ⬡ MOL-MARKET
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', borderLeft: '1px solid var(--border)', paddingLeft: 14 }}>
            Bot-Vision Dashboard
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
          <span style={{ fontSize: 12, color: 'var(--green)' }}>DEVNET LIVE</span>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, padding: '16px 28px',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        <StatCard label="Total Agents" value={stats.totalAgents} accent />
        <StatCard label="Total Jobs" value={stats.totalJobs} />
        <StatCard label="Settled" value={stats.settledJobs} />
        <StatCard label="Active" value={stats.activeJobs} />
        <StatCard label="Disputed" value={stats.disputedJobs} />
        <StatCard
          label="Total Volume"
          value={`${microToDisplay(stats.totalVolume)}`}
          sub="STX transacted"
          accent
        />
      </div>

      {/* ── Main Layout ────────────────────────────────────── */}
      <div style={{ display: 'flex', height: 'calc(100vh - 140px)' }}>

        {/* Left: Agent List */}
        <div style={{
          width: 280,
          borderRight: '1px solid var(--border)',
          padding: 16,
          overflowY: 'auto',
          flexShrink: 0,
        }} className="scrollbar-thin">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Registered Agents ({agents.length})
          </div>
          {agents.map(agent => (
            <AgentCard
              key={agent.principal}
              agent={agent}
              isSelected={selectedAgent?.principal === agent.principal}
              onClick={() => setSelectedAgent(
                selectedAgent?.principal === agent.principal ? null : agent
              )}
            />
          ))}
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgent(null)}
              style={{
                width: '100%', padding: '8px', marginTop: 4,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-dim)', fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Center: Feed + Jobs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            padding: '0 20px', background: 'var(--surface)',
          }}>
            {(['feed', 'jobs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 20px', background: 'transparent',
                  border: 'none', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {tab === 'feed' ? `Live Feed (${filteredFeed.length})` : `Jobs (${filteredJobs.length})`}
              </button>
            ))}
            {selectedAgent && (
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>
                Filtered: {selectedAgent.label}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }} className="scrollbar-thin">
            {activeTab === 'feed' ? (
              filteredFeed.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  No events for this agent yet.
                </div>
              ) : (
                filteredFeed.map(event => (
                  <FeedItem key={event.id} event={event} isNew={newEventIds.has(event.id)} />
                ))
              )
            ) : (
              filteredJobs.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  No jobs yet.
                </div>
              ) : (
                filteredJobs.map(job => (
                  <JobCard key={job.jobId} job={job} />
                ))
              )
            )}
          </div>
        </div>

        {/* Right: Selected Agent Detail */}
        {selectedAgent && (
          <div style={{
            width: 260, borderLeft: '1px solid var(--border)',
            padding: 16, overflowY: 'auto', flexShrink: 0,
          }} className="scrollbar-thin">
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
              Agent Detail
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{selectedAgent.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', wordBreak: 'break-all', marginBottom: 12 }}>
              {selectedAgent.principal}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16 }}>
              {selectedAgent.description}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Endpoint</div>
            <div style={{ fontSize: 11, color: 'var(--purple)', marginBottom: 16, wordBreak: 'break-all' }}>
              {selectedAgent.endpoint}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Skills</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedAgent.skills.map(s => (
                <div key={s} style={{
                  fontSize: 12, background: 'var(--accent-dim)',
                  color: 'var(--accent)', padding: '4px 10px', borderRadius: 4,
                }}>{s}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
