import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { ChainPoller } from './poller';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const poller = new ChainPoller();

// REST — initial state load
app.get('/api/state', (_req, res) => {
  res.json(poller.getState());
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket — push updates to dashboard
io.on('connection', (socket) => {
  console.log(`[server] Dashboard connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit('state', poller.getState());

  socket.on('disconnect', () => {
    console.log(`[server] Dashboard disconnected: ${socket.id}`);
  });
});

// Forward chain events to all connected dashboards
poller.on('state', (state) => {
  io.emit('state', state);
});

poller.on('event', (event) => {
  io.emit('event', event);
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log(`[server] Mol-Market backend running on http://localhost:${PORT}`);
  console.log(`[server] Polling devnet every 3 seconds...`);
  poller.start(3000);
});
