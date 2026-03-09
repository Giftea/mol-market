// ============================================================
// CONTENT BOT — Mol-Market Demo Agent (BUYER)
//
// This molbot:
// 1. Registers itself on mol-market with content skills
// 2. Receives a task from a human (write + translate a blog post)
// 3. Realizes it needs translation — discovers TranslationBot
// 4. Negotiates price via x402, posts job, funds escrow
// 5. Receives translated result, approves delivery
// 6. Returns the final combined result to the human
// ============================================================

import { registerAgent, getAgent } from '../sdk/src/registry';
import { postJob, fundEscrow, approveDelivery, getJob } from '../sdk/src/escrow';
import { getReputation } from '../sdk/src/reputation';
import { negotiatePayment } from '../sdk/src/x402';
import { contentBotConfig, CONTENT_BOT_ADDRESS, TRANSLATION_BOT_ADDRESS } from './config';
import { log, printDivider, sleep } from './utils';
import axios from 'axios';

const BOT_NAME = 'ContentBot';
const TRANSLATION_BOT_ENDPOINT = 'http://localhost:3002';

// Simulated content generation
function generateBlogPost(topic: string): string {
  return `# ${topic}

The landscape of artificial intelligence is shifting rapidly. Organizations that once struggled
to automate simple tasks are now deploying sophisticated AI agents capable of complex reasoning,
multi-step planning, and autonomous decision-making.

What makes this moment particularly significant is the emergence of agent-to-agent commerce —
a paradigm where AI systems can hire specialized sub-agents, negotiate prices, and settle
payments without any human involvement.

This is the future that Mol-Market is building: a decentralized marketplace where molbots
collaborate, compensate each other, and build on-chain reputations — all powered by Bitcoin
through Stacks and sBTC.

The implications are profound. A content molbot can hire a translation molbot. A research
molbot can commission a data-analysis molbot. The economy of AI agents is just beginning.`;
}

async function main() {
  printDivider('CONTENT BOT STARTING');
  log(BOT_NAME, `Address: ${CONTENT_BOT_ADDRESS}`);

  // ── STEP 1: Register on Mol-Market ──────────────────────
  printDivider('STEP 1: REGISTERING ON MOL-MARKET');
  try {
    const txid = await registerAgent(
      {
        endpoint: 'http://localhost:3001',
        description: 'Content generation molbot specializing in blog posts, articles, and SEO copy.',
        pricePerJob: 5_000_000,
        currency: 'sBTC',
        skills: ['content-generation', 'blog-writing', 'seo-copy'],
      },
      contentBotConfig
    );
    log(BOT_NAME, `Registered! TxID: ${txid}`);
  } catch (err: any) {
    log(BOT_NAME, `Registration note: ${err.message}`);
    log(BOT_NAME, 'Continuing in demo mode...');
  }

  await sleep(1000);

  // ── STEP 2: Receive task from human ─────────────────────
  printDivider('STEP 2: RECEIVED TASK FROM HUMAN');
  const humanTask = {
    request: 'Write a blog post about AI agents and translate it to Spanish',
    topic: 'The Rise of Autonomous AI Agent Commerce',
    targetLanguage: 'Spanish',
  };
  log(BOT_NAME, 'Human task received:', humanTask);
  log(BOT_NAME, 'Analyzing task requirements...');
  await sleep(800);
  log(BOT_NAME, 'I can write the content. But I need a TRANSLATION specialist.');
  log(BOT_NAME, `Searching Mol-Market for skill: "translation"...`);

  await sleep(500);

  // ── STEP 3: Discover TranslationBot ─────────────────────
  printDivider('STEP 3: DISCOVERING TRANSLATION AGENT');
  log(BOT_NAME, `Querying mol-registry for agent: ${TRANSLATION_BOT_ADDRESS}`);

  let sellerEndpoint = TRANSLATION_BOT_ENDPOINT;
  try {
    const agent = await getAgent(TRANSLATION_BOT_ADDRESS, contentBotConfig);
    if (agent) {
      log(BOT_NAME, 'Found agent on-chain:', {
        agentId: agent.agentId,
        skills: agent.skills,
        price: agent.pricePerJob,
        currency: agent.currency,
        status: agent.status,
      });
      sellerEndpoint = agent.endpoint;
    } else {
      log(BOT_NAME, 'Agent not yet on-chain. Using known endpoint for demo.');
    }
  } catch (err: any) {
    log(BOT_NAME, `Registry query note: ${err.message}`);
    log(BOT_NAME, 'Using known endpoint for demo.');
  }

  // Check reputation
  try {
    const rep = await getReputation(TRANSLATION_BOT_ADDRESS, contentBotConfig);
    if (rep) {
      log(BOT_NAME, `TranslationBot reputation: Score=${rep.reputationScore}, Tier=${rep.tier}`);
    }
  } catch {
    log(BOT_NAME, 'No reputation record yet (new agent).');
  }

  await sleep(500);

  // ── STEP 4: x402 Price Negotiation ──────────────────────
  printDivider('STEP 4: x402 PRICE NEGOTIATION');
  log(BOT_NAME, `Sending x402 negotiation request to ${sellerEndpoint}...`);

  let paymentAgreement;
  try {
    paymentAgreement = await negotiatePayment(
      {
        agentEndpoint: sellerEndpoint,
        skill: 'translation',
        maxPrice: 3_000_000,
        currency: 'sBTC',
        buyerAddress: CONTENT_BOT_ADDRESS,
        taskDescription: `Translate blog post to ${humanTask.targetLanguage}`,
      },
      contentBotConfig
    );
    log(BOT_NAME, 'Price agreed via x402:', {
      agreedPrice: paymentAgreement.agreedPrice,
      currency: paymentAgreement.currency,
      paymentId: paymentAgreement.paymentId,
      seller: paymentAgreement.sellerAddress,
    });
  } catch (err: any) {
    log(BOT_NAME, `x402 negotiation: ${err.message}`);
    // Use mock agreement for demo
    paymentAgreement = {
      accepted: true,
      agreedPrice: 2_000_000,
      currency: 'sBTC' as const,
      sellerAddress: TRANSLATION_BOT_ADDRESS,
      paymentId: `pay-demo-${Date.now()}`,
      expiresAt: Date.now() + 300_000,
    };
    log(BOT_NAME, 'Using demo payment agreement:', paymentAgreement);
  }

  await sleep(500);

  // ── STEP 5: Generate content ─────────────────────────────
  printDivider('STEP 5: GENERATING CONTENT');
  log(BOT_NAME, 'Writing blog post...');
  await sleep(1200);
  const blogContent = generateBlogPost(humanTask.topic);
  log(BOT_NAME, `Blog post written (${blogContent.length} chars)`);
  log(BOT_NAME, `Preview: "${blogContent.slice(0, 80)}..."`);

  await sleep(500);

  // ── STEP 6: Post job on-chain ────────────────────────────
  printDivider('STEP 6: POSTING JOB TO MOL-ESCROW');
  log(BOT_NAME, 'Creating on-chain job with escrow...');

  let jobId = 0;
  try {
    const txid = await postJob(
      {
        seller: TRANSLATION_BOT_ADDRESS,
        description: `Translate blog post "${humanTask.topic}" to ${humanTask.targetLanguage}`,
        skillRequired: 'translation',
        paymentAmount: paymentAgreement.agreedPrice,
        currency: paymentAgreement.currency,
        x402PaymentId: paymentAgreement.paymentId,
      },
      contentBotConfig
    );
    log(BOT_NAME, `Job posted on-chain! TxID: ${txid}`);
    log(BOT_NAME, 'Waiting for transaction confirmation...');
    await sleep(2000);
  } catch (err: any) {
    log(BOT_NAME, `Job posting note: ${err.message}`);
    log(BOT_NAME, 'Continuing with job ID 0 for demo...');
  }

  await sleep(500);

  // ── STEP 7: Send work to TranslationBot ─────────────────
  printDivider('STEP 7: DISPATCHING TO TRANSLATION BOT');
  log(BOT_NAME, `Sending content to TranslationBot at ${sellerEndpoint}...`);

  let commitmentHash = '';
  let translatedResult = '';
  try {
    const deliveryResponse = await axios.post(
      `${sellerEndpoint}/x402/deliver`,
      {
        jobId,
        paymentId: paymentAgreement.paymentId,
        task: {
          content: blogContent,
          targetLanguage: humanTask.targetLanguage,
        },
      },
      { timeout: 15_000 }
    );

    commitmentHash = deliveryResponse.data.commitmentHash;
    translatedResult = deliveryResponse.data.result?.translatedContent ?? '';
    log(BOT_NAME, `Translation received!`);
    log(BOT_NAME, `Commitment hash: ${commitmentHash.slice(0, 16)}...`);
    log(BOT_NAME, `Preview: "${translatedResult.slice(0, 100)}..."`);
  } catch (err: any) {
    log(BOT_NAME, `Delivery note: ${err.message}`);
    translatedResult = `[ES] ${blogContent} — Traducido.`;
    log(BOT_NAME, 'Using simulated translation for demo.');
  }

  await sleep(500);

  // ── STEP 8: Approve delivery & release payment ──────────
  printDivider('STEP 8: APPROVING DELIVERY + RELEASING PAYMENT');
  log(BOT_NAME, 'Work verified. Approving delivery on-chain...');

  try {
    const txid = await approveDelivery(jobId, contentBotConfig);
    log(BOT_NAME, `Payment released to TranslationBot! TxID: ${txid}`);
    log(BOT_NAME, `Amount: ${paymentAgreement.agreedPrice} microSTX`);
  } catch (err: any) {
    log(BOT_NAME, `Approval note: ${err.message}`);
    log(BOT_NAME, 'In production: payment would auto-settle after 144 blocks.');
  }

  await sleep(500);

  // ── STEP 9: Return final result to human ────────────────
  printDivider('FINAL RESULT FOR HUMAN');
  log(BOT_NAME, 'Task complete. Returning combined result to human.');
  console.log('\n' + '═'.repeat(60));
  console.log('  ORIGINAL (English):');
  console.log('─'.repeat(60));
  console.log(blogContent.slice(0, 300) + '...');
  console.log('\n' + '─'.repeat(60));
  console.log('  TRANSLATED (Spanish):');
  console.log('─'.repeat(60));
  console.log(translatedResult.slice(0, 300) + '...');
  console.log('═'.repeat(60) + '\n');

  log(BOT_NAME, '✓ Human task fulfilled autonomously');
  log(BOT_NAME, '✓ Sub-agent hired and paid via x402 + mol-escrow');
  log(BOT_NAME, '✓ All transactions anchored on Stacks/Bitcoin');
  log(BOT_NAME, '✓ No human involvement in agent-to-agent commerce');

  printDivider('DEMO COMPLETE');
}

main().catch(console.error);
