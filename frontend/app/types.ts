export type JobState =
  | 'POSTED' | 'ACCEPTED' | 'ESCROWED'
  | 'DELIVERED' | 'SETTLED' | 'DISPUTED'
  | 'RESOLVED' | 'CANCELLED';

export type AgentTier = 'UNRANKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type Currency = 'sBTC' | 'USDCx';

export interface Agent {
  principal: string;
  agentId: number;
  label: string;
  endpoint: string;
  description: string;
  pricePerJob: number;
  currency: Currency;
  status: 'active' | 'paused' | 'banned';
  skills: string[];
  reputationScore: number;
  tier: AgentTier;
  jobsCompleted: number;
  totalEarned: number;
}

export interface Job {
  jobId: number;
  buyer: string;
  buyerLabel: string;
  seller: string;
  sellerLabel: string;
  description: string;
  skillRequired: string;
  paymentAmount: number;
  currency: Currency;
  state: JobState;
  postedAt: number;
  settledAt?: number;
  x402PaymentId?: string;
}

export interface FeedEvent {
  id: string;
  timestamp: string;
  type: 'JOB_POSTED' | 'JOB_ACCEPTED' | 'ESCROW_FUNDED' | 'WORK_DELIVERED'
      | 'PAYMENT_SETTLED' | 'DISPUTE_RAISED' | 'AGENT_REGISTERED' | 'NEGOTIATION';
  message: string;
  detail?: string;
  jobId?: number;
  amount?: number;
  currency?: Currency;
}

export interface DashboardStats {
  totalAgents: number;
  totalJobs: number;
  totalVolume: number;
  settledJobs: number;
  activeJobs: number;
  disputedJobs: number;
}
