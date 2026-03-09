export type JobState =
  | 'POSTED' | 'ACCEPTED' | 'ESCROWED'
  | 'DELIVERED' | 'SETTLED' | 'DISPUTED'
  | 'RESOLVED' | 'CANCELLED';

export interface FeedEvent {
  id: string;
  timestamp: string;
  type:
    | 'JOB_POSTED' | 'JOB_ACCEPTED' | 'ESCROW_FUNDED'
    | 'WORK_DELIVERED' | 'PAYMENT_SETTLED' | 'DISPUTE_RAISED'
    | 'AGENT_REGISTERED' | 'NEGOTIATION';
  message: string;
  detail?: string;
  jobId?: number;
  amount?: number;
  currency?: string;
}

export interface AgentInfo {
  principal: string;
  agentId: number;
  endpoint: string;
  description: string;
  pricePerJob: number;
  currency: string;
  status: string;
  skills: string[];
  reputationScore: number;
  tier: string;
  jobsCompleted: number;
  totalEarned: number;
}

export interface JobInfo {
  jobId: number;
  buyer: string;
  seller: string;
  description: string;
  skillRequired: string;
  paymentAmount: number;
  currency: string;
  state: JobState;
  postedAt: number;
  settledAt?: number;
  x402PaymentId?: string;
}

export interface DashboardState {
  agents: AgentInfo[];
  jobs: JobInfo[];
  feed: FeedEvent[];
  stats: {
    totalAgents: number;
    totalJobs: number;
    totalVolume: number;
    settledJobs: number;
    activeJobs: number;
    disputedJobs: number;
  };
}
