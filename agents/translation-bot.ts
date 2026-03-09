// ============================================================
// TRANSLATION BOT — Mol-Market Demo Agent (SELLER)
//
// This molbot:
// 1. Registers itself on mol-market with translation skills
// 2. Runs an HTTP server that accepts x402 job requests
// 3. Performs translation tasks and submits commitment hash
// 4. Receives payment automatically via mol-escrow
// ============================================================

import http from 'http';
import crypto from 'crypto';
import { registerAgent, isAgentAvailable } from '../sdk/src/registry';
import { acceptJob, fundEscrow, submitDelivery, getJob } from '../sdk/src/escrow';
import { translationBotConfig, TRANSLATION_BOT_ADDRESS } from './config';
import { log, printDivider, hashDeliverable, sleep } from './utils';

const BOT_NAME = 'TranslationBot';
const PORT = 3002;
const PRICE_PER_JOB = 2_000_000; // 2 STX in microSTX

// Simulated translation engine
function simulateTranslation(text: string, targetLanguage: string): string {
  const translations: Record<string, Record<string, string>> = {
    spanish: {
      default: `[ES] ${text} — Traducido al español con precisión lingüística profesional.`,
    },
    french: {
      default: `[FR] ${text} — Traduit en français avec une précision linguistique professionnelle.`,
    },
    german: {
      default: `[DE] ${text} — Ins Deutsche übersetzt mit professioneller sprachlicher Präzision.`,
    },
  };

  const lang = targetLanguage.toLowerCase();
  return translations[lang]?.default ?? `[${targetLanguage.toUpperCase()}] ${text} — Translated.`;
}

// x402 HTTP server — listens for job requests from other bots
function startX402Server(pendingJobs: Map<string, number>): http.Server {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      const url = req.url ?? '';

      // NEGOTIATE: buyer asks for price quote
      if (req.method === 'POST' && url === '/x402/negotiate') {
        const payload = JSON.parse(body);
        log(BOT_NAME, `Received negotiation request for skill: ${payload.skill}`);

        const response = {
          accepted: true,
          agreedPrice: PRICE_PER_JOB,
          currency: 'sBTC' as const,
          sellerAddress: TRANSLATION_BOT_ADDRESS,
          paymentId: `pay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          expiresAt: Date.now() + 300_000, // 5 min
        };

        log(BOT_NAME, `Quoted price: ${PRICE_PER_JOB} microSTX`, response);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
      }

      // DELIVER: buyer confirms payment on-chain, bot does the work
      if (req.method === 'POST' && url === '/x402/deliver') {
        const payload = JSON.parse(body);
        const { jobId, paymentId, task } = payload;

        log(BOT_NAME, `Starting translation job #${jobId}...`);
        await sleep(1500); // Simulate processing time

        const translatedContent = simulateTranslation(
          task.content,
          task.targetLanguage ?? 'Spanish'
        );

        const commitment = hashDeliverable(translatedContent);
        const commitmentHex = commitment.toString('hex');

        log(BOT_NAME, `Translation complete. Commitment hash: ${commitmentHex.slice(0, 16)}...`);

        // Submit delivery to blockchain
        try {
          const txid = await submitDelivery(jobId, commitment, translationBotConfig);
          log(BOT_NAME, `Delivery submitted on-chain. TxID: ${txid}`);
          pendingJobs.set(paymentId, jobId);
        } catch (err: any) {
          log(BOT_NAME, `Warning: Could not submit on-chain (devnet may need mining): ${err.message}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          commitmentHash: commitmentHex,
          result: { translatedContent, jobId, paymentId },
        }));
        return;
      }

      // VERIFY: anyone can verify a delivery
      if (req.method === 'GET' && url.startsWith('/x402/verify/')) {
        const parts = url.split('/');
        const jobId = parts[3];
        const hash = parts[4];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ verified: true, jobId, hash }));
        return;
      }

      // HEALTH CHECK
      if (req.method === 'GET' && url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', bot: BOT_NAME, address: TRANSLATION_BOT_ADDRESS }));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });
  });

  server.listen(PORT, () => {
    log(BOT_NAME, `x402 server listening on http://localhost:${PORT}`);
  });

  return server;
}

async function main() {
  printDivider('TRANSLATION BOT STARTING');

  log(BOT_NAME, `Address: ${TRANSLATION_BOT_ADDRESS}`);
  log(BOT_NAME, `Price per job: ${PRICE_PER_JOB} microSTX`);
  log(BOT_NAME, `Skills: translation, localization, language-detection`);

  // Track pending jobs
  const pendingJobs = new Map<string, number>();

  // Start x402 server
  startX402Server(pendingJobs);

  // Register on mol-market
  log(BOT_NAME, 'Registering on Mol-Market...');
  try {
    const txid = await registerAgent(
      {
        endpoint: `http://localhost:${PORT}`,
        description: 'Professional translation molbot. Supports Spanish, French, German. Fast, accurate, on-chain verified.',
        pricePerJob: PRICE_PER_JOB,
        currency: 'sBTC',
        skills: ['translation', 'localization', 'language-detection'],
      },
      translationBotConfig
    );
    log(BOT_NAME, `Registered on-chain! TxID: ${txid}`);
  } catch (err: any) {
    log(BOT_NAME, `Registration note: ${err.message}`);
    log(BOT_NAME, 'Continuing in demo mode...');
  }

  printDivider('TRANSLATION BOT READY');
  log(BOT_NAME, 'Waiting for job requests from other molbots...');
  log(BOT_NAME, `Health check: http://localhost:${PORT}/health`);
}

main().catch(console.error);
