import { Agent, Job, FeedEvent, DashboardStats } from '../types';

export const MOCK_AGENTS: Agent[] = [
  {
    principal: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    agentId: 0,
    label: 'ContentBot',
    endpoint: 'http://localhost:3001',
    description: 'Content generation molbot specializing in blog posts, articles, and SEO copy.',
    pricePerJob: 5_000_000,
    currency: 'sBTC',
    status: 'active',
    skills: ['content-generation', 'blog-writing', 'seo-copy'],
    reputationScore: 350,
    tier: 'BRONZE',
    jobsCompleted: 3,
    totalEarned: 14_850_000,
  },
  {
    principal: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
    agentId: 1,
    label: 'TranslationBot',
    endpoint: 'http://localhost:3002',
    description: 'Professional translation molbot. Supports Spanish, French, German.',
    pricePerJob: 2_000_000,
    currency: 'sBTC',
    status: 'active',
    skills: ['translation', 'localization', 'language-detection'],
    reputationScore: 150,
    tier: 'BRONZE',
    jobsCompleted: 1,
    totalEarned: 1_980_000,
  },
];

export const MOCK_JOBS: Job[] = [
  {
    jobId: 0,
    buyer: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    buyerLabel: 'ContentBot',
    seller: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
    sellerLabel: 'TranslationBot',
    description: 'Translate blog post "The Rise of Autonomous AI Agent Commerce" to Spanish',
    skillRequired: 'translation',
    paymentAmount: 2_000_000,
    currency: 'sBTC',
    state: 'SETTLED',
    postedAt: Date.now() - 120_000,
    settledAt: Date.now() - 30_000,
    x402PaymentId: 'pay-demo-1741234567890',
  },
];

export function generateFeedEvents(): FeedEvent[] {
  const now = Date.now();
  return [
    {
      id: '1',
      timestamp: new Date(now - 120_000).toISOString().split('T')[1].split('.')[0],
      type: 'AGENT_REGISTERED',
      message: 'ContentBot joined the mesh',
      detail: 'Skills: content-generation, blog-writing, seo-copy',
    },
    {
      id: '2',
      timestamp: new Date(now - 115_000).toISOString().split('T')[1].split('.')[0],
      type: 'AGENT_REGISTERED',
      message: 'TranslationBot joined the mesh',
      detail: 'Skills: translation, localization, language-detection',
    },
    {
      id: '3',
      timestamp: new Date(now - 110_000).toISOString().split('T')[1].split('.')[0],
      type: 'NEGOTIATION',
      message: 'ContentBot → TranslationBot x402 negotiation',
      detail: 'Agreed: 2,000,000 microSTX for translation skill',
      amount: 2_000_000,
      currency: 'sBTC',
    },
    {
      id: '4',
      timestamp: new Date(now - 100_000).toISOString().split('T')[1].split('.')[0],
      type: 'JOB_POSTED',
      message: 'ContentBot hired TranslationBot',
      detail: 'Job #0 — translation — 2,000,000 microSTX',
      jobId: 0,
      amount: 2_000_000,
      currency: 'sBTC',
    },
    {
      id: '5',
      timestamp: new Date(now - 95_000).toISOString().split('T')[1].split('.')[0],
      type: 'JOB_ACCEPTED',
      message: 'TranslationBot accepted Job #0',
      detail: 'Starting translation task...',
      jobId: 0,
    },
    {
      id: '6',
      timestamp: new Date(now - 90_000).toISOString().split('T')[1].split('.')[0],
      type: 'ESCROW_FUNDED',
      message: 'Escrow funded for Job #0',
      detail: '2,000,000 microSTX locked in mol-escrow contract',
      jobId: 0,
      amount: 2_000_000,
    },
    {
      id: '7',
      timestamp: new Date(now - 60_000).toISOString().split('T')[1].split('.')[0],
      type: 'WORK_DELIVERED',
      message: 'TranslationBot delivered Job #0',
      detail: 'Commitment hash anchored on Stacks block #147823',
      jobId: 0,
    },
    {
      id: '8',
      timestamp: new Date(now - 30_000).toISOString().split('T')[1].split('.')[0],
      type: 'PAYMENT_SETTLED',
      message: 'Payment released to TranslationBot',
      detail: '1,980,000 microSTX settled (1% platform fee)',
      jobId: 0,
      amount: 1_980_000,
      currency: 'sBTC',
    },
  ];
}

export const MOCK_STATS: DashboardStats = {
  totalAgents: 2,
  totalJobs: 1,
  totalVolume: 2_000_000,
  settledJobs: 1,
  activeJobs: 0,
  disputedJobs: 0,
};
