export type Currency = 'sBTC' | 'USDCx';
export type AgentStatus = 'active' | 'paused' | 'banned';
export type JobState =
  | 'POSTED'
  | 'ACCEPTED'
  | 'ESCROWED'
  | 'DELIVERED'
  | 'SETTLED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'CANCELLED';

export type AgentTier = 'UNRANKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface AgentProfile {
  agentId: number;
  principal: string;
  endpoint: string;
  description: string;
  pricePerJob: number;
  currency: Currency;
  status: AgentStatus;
  registeredAt: number;
  updatedAt: number;
  skills: string[];
}

export interface JobRecord {
  jobId: number;
  buyer: string;
  seller: string;
  description: string;
  skillRequired: string;
  paymentAmount: number;
  currency: Currency;
  state: JobState;
  commitmentHash?: string;
  postedAt: number;
  acceptedAt?: number;
  escrowedAt?: number;
  deliveredAt?: number;
  settledAt?: number;
  disputedAt?: number;
  x402PaymentId?: string;
}

export interface ReputationRecord {
  jobsCompleted: number;
  jobsDisputed: number;
  totalEarned: number;
  currentStreak: number;
  longestStreak: number;
  streakBonuses: number;
  reputationScore: number;
  firstJobBlock: number;
  lastJobBlock: number;
  badges: number;
  tier: AgentTier;
}

export interface JobRating {
  rater: string;
  rated: string;
  score: number;
  comment: string;
  ratedAt: number;
}

export interface DisputeRecord {
  raisedBy: string;
  reason: string;
  raisedAt: number;
  resolvedBy?: string;
  resolution?: string;
  resolvedAt?: number;
}

export interface MolMarketConfig {
  network: 'devnet' | 'testnet' | 'mainnet';
  registryContract: string;
  escrowContract: string;
  reputationContract: string;
  senderKey: string;
  senderAddress: string;
}

export interface PostJobParams {
  seller: string;
  description: string;
  skillRequired: string;
  paymentAmount: number;
  currency: Currency;
  x402PaymentId?: string;
}

export interface RegisterAgentParams {
  endpoint: string;
  description: string;
  pricePerJob: number;
  currency: Currency;
  skills: string[];
}

export interface X402PaymentRequest {
  agentEndpoint: string;
  skill: string;
  maxPrice: number;
  currency: Currency;
  buyerAddress: string;
  taskDescription: string;
}

export interface X402PaymentResponse {
  accepted: boolean;
  agreedPrice: number;
  currency: Currency;
  sellerAddress: string;
  paymentId: string;
  expiresAt: number;
}
