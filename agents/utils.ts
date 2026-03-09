import * as crypto from 'crypto';

export function hashDeliverable(content: string): Buffer {
  return crypto.createHash('sha256').update(content).digest();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function log(botName: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${botName}]`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export function printDivider(label?: string): void {
  const line = '─'.repeat(60);
  if (label) {
    const padding = Math.floor((60 - label.length - 2) / 2);
    const pad = ' '.repeat(padding);
    console.log(`\n┌${line}┐`);
    console.log(`│${pad} ${label} ${pad}│`);
    console.log(`└${line}┘\n`);
  } else {
    console.log(`\n${line}\n`);
  }
}
