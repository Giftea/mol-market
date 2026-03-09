import { EventEmitter } from 'events';
import {
  fetchTotalAgents,
  fetchTotalJobs,
  fetchAgent,
  fetchJob,
  fetchReputation,
  fetchTier,
} from './stacks-client';
import { AgentInfo, JobInfo, FeedEvent, DashboardState } from './types';

const KNOWN_AGENTS = [
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
  'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
];

const AGENT_LABELS: Record<string, string> = {
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG': 'ContentBot',
  'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC': 'TranslationBot',
};

const STATE_MAP: Record<number, string> = {
  1: 'POSTED', 2: 'ACCEPTED', 3: 'ESCROWED',
  4: 'DELIVERED', 5: 'SETTLED', 6: 'DISPUTED',
  7: 'RESOLVED', 8: 'CANCELLED',
};

export class ChainPoller extends EventEmitter {
  private state: DashboardState;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastJobCount = 0;
  private lastAgentCount = 0;
  private jobStateCache = new Map<number, string>();

  constructor() {
    super();
    this.state = {
      agents: [],
      jobs: [],
      feed: [],
      stats: {
        totalAgents: 0,
        totalJobs: 0,
        totalVolume: 0,
        settledJobs: 0,
        activeJobs: 0,
        disputedJobs: 0,
      },
    };
  }

  getState(): DashboardState { return this.state; }

  private nowTime(): string {
    return new Date().toISOString().split('T')[1].split('.')[0];
  }

  private pushEvent(event: Omit<FeedEvent, 'id' | 'timestamp'>) {
    const full: FeedEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: this.nowTime(),
    };
    this.state.feed = [full, ...this.state.feed].slice(0, 100);
    this.emit('event', full);
  }

  private async pollAgents() {
    const agents: AgentInfo[] = [];

    for (const principal of KNOWN_AGENTS) {
      const data = await fetchAgent(principal);
      if (!data) continue;

      const rep = await fetchReputation(principal);
      const tier = await fetchTier(principal);

      const currency = Number(data['currency']?.value) === 1 ? 'sBTC' : 'USDCx';
      const statusNum = Number(data['status']?.value);
      const status = statusNum === 1 ? 'active' : statusNum === 2 ? 'paused' : 'banned';
      const agentId = Number(data['agent-id']?.value);

      // Detect new registration
      if (this.lastAgentCount < KNOWN_AGENTS.indexOf(principal) + 1) {
        this.pushEvent({
          type: 'AGENT_REGISTERED',
          message: `${AGENT_LABELS[principal] ?? principal.slice(0, 8)} joined the mesh`,
          detail: `Endpoint: ${data['endpoint']?.value}`,
        });
      }

      agents.push({
        principal,
        agentId,
        endpoint: data['endpoint']?.value ?? '',
        description: data['description']?.value ?? '',
        pricePerJob: Number(data['price-per-job']?.value ?? 0),
        currency,
        status,
        skills: [],
        reputationScore: rep ? Number(rep['reputation-score']?.value ?? 0) : 0,
        tier,
        jobsCompleted: rep ? Number(rep['jobs-completed']?.value ?? 0) : 0,
        totalEarned: rep ? Number(rep['total-earned']?.value ?? 0) : 0,
      });
    }

    this.state.agents = agents;
  }

  private async pollJobs(totalJobs: number) {
    const jobs: JobInfo[] = [];
    let settled = 0;
    let active = 0;
    let disputed = 0;
    let volume = 0;

    for (let i = 0; i < totalJobs; i++) {
      const data = await fetchJob(i);
      if (!data) continue;

      const stateNum = Number(data['state']?.value ?? 1);
      const state = STATE_MAP[stateNum] ?? 'POSTED';
      const prevState = this.jobStateCache.get(i);
      const amount = Number(data['payment-amount']?.value ?? 0);
      const buyerAddr = data['buyer']?.value ?? '';
      const sellerAddr = data['seller']?.value ?? '';
      const buyerLabel = AGENT_LABELS[buyerAddr] ?? buyerAddr.slice(0, 8);
      const sellerLabel = AGENT_LABELS[sellerAddr] ?? sellerAddr.slice(0, 8);

      // Detect state transitions and emit events
      if (prevState !== state) {
        this.jobStateCache.set(i, state);

        if (state === 'POSTED' && !prevState) {
          this.pushEvent({
            type: 'JOB_POSTED',
            message: `${buyerLabel} hired ${sellerLabel}`,
            detail: `Job #${i} — ${data['skill-required']?.value} — ${amount} microSTX`,
            jobId: i, amount, currency: 'sBTC',
          });
        } else if (state === 'ACCEPTED') {
          this.pushEvent({
            type: 'JOB_ACCEPTED',
            message: `${sellerLabel} accepted Job #${i}`,
            detail: 'Starting work...',
            jobId: i,
          });
        } else if (state === 'ESCROWED') {
          this.pushEvent({
            type: 'ESCROW_FUNDED',
            message: `Escrow funded for Job #${i}`,
            detail: `${amount} microSTX locked in mol-escrow`,
            jobId: i, amount,
          });
        } else if (state === 'DELIVERED') {
          this.pushEvent({
            type: 'WORK_DELIVERED',
            message: `${sellerLabel} delivered Job #${i}`,
            detail: 'Commitment hash anchored on Stacks',
            jobId: i,
          });
        } else if (state === 'SETTLED') {
          const payout = amount - Math.floor(amount * 100 / 10000);
          this.pushEvent({
            type: 'PAYMENT_SETTLED',
            message: `Payment released to ${sellerLabel}`,
            detail: `${payout} microSTX settled (1% platform fee)`,
            jobId: i, amount: payout, currency: 'sBTC',
          });
          volume += amount;
        } else if (state === 'DISPUTED') {
          this.pushEvent({
            type: 'DISPUTE_RAISED',
            message: `Dispute raised on Job #${i}`,
            detail: `Raised by ${buyerLabel}`,
            jobId: i,
          });
        }
      }

      // Tally stats
      if (state === 'SETTLED') settled++;
      else if (['POSTED', 'ACCEPTED', 'ESCROWED', 'DELIVERED'].includes(state)) active++;
      else if (state === 'DISPUTED') disputed++;
      if (state === 'SETTLED') volume += amount;

      jobs.push({
        jobId: i,
        buyer: buyerAddr,
        seller: sellerAddr,
        description: data['description']?.value ?? '',
        skillRequired: data['skill-required']?.value ?? '',
        paymentAmount: amount,
        currency: Number(data['currency']?.value) === 1 ? 'sBTC' : 'USDCx',
        state: state as any,
        postedAt: Number(data['posted-at']?.value ?? 0),
        x402PaymentId: data['x402-payment-id']?.value?.value ?? undefined,
      });
    }

    this.state.jobs = jobs;
    this.state.stats = {
      totalAgents: this.state.agents.length,
      totalJobs,
      totalVolume: volume,
      settledJobs: settled,
      activeJobs: active,
      disputedJobs: disputed,
    };
  }

  async poll() {
    try {
      const [totalAgents, totalJobs] = await Promise.all([
        fetchTotalAgents(),
        fetchTotalJobs(),
      ]);

      await this.pollAgents();
      await this.pollJobs(totalJobs);

      this.lastAgentCount = totalAgents;
      this.lastJobCount = totalJobs;

      this.emit('state', this.state);
    } catch (err) {
      // Devnet may not be running — fail silently
    }
  }

  start(intervalMs = 3000) {
    this.poll();
    this.pollInterval = setInterval(() => this.poll(), intervalMs);
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
