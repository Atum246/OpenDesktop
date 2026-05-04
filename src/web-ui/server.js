const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── System Stats ──────────────────────────────────────────────
function getCPU() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const c of cpus) {
    for (const t in c.times) total += c.times[t];
    idle += c.times.idle;
  }
  return { idle: idle / cpus.length, total: total / cpus.length };
}
let prevCPU = getCPU();

function cpuPercent() {
  const cur = getCPU();
  const dIdle = cur.idle - prevCPU.idle;
  const dTotal = cur.total - prevCPU.total;
  prevCPU = cur;
  return dTotal === 0 ? 0 : Math.round((1 - dIdle / dTotal) * 100);
}

function getStats() {
  const totalMem = os.totalmem(), freeMem = os.freemem(), usedMem = totalMem - freeMem;
  let disk = { total: 0, used: 0, free: 0 };
  try {
    const parts = execSync('df -B1 / 2>/dev/null | tail -1', { encoding: 'utf8' }).trim().split(/\s+/);
    disk = { total: +parts[1], used: +parts[2], free: +parts[3] };
  } catch (_) {}
  const load = os.loadavg();
  return {
    cpu: cpuPercent(),
    memory: { total: totalMem, used: usedMem, free: freeMem, percent: Math.round(usedMem / totalMem * 100) },
    disk: { ...disk, percent: disk.total ? Math.round(disk.used / disk.total * 100) : 0 },
    uptime: os.uptime(),
    load: { '1m': load[0].toFixed(2), '5m': load[1].toFixed(2), '15m': load[2].toFixed(2) },
    hostname: os.hostname(), platform: os.platform(), arch: os.arch(), cpus: os.cpus().length,
    timestamp: Date.now()
  };
}

// ── API Routes ────────────────────────────────────────────────
app.get('/api/stats', (_, res) => res.json(getStats()));

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });
  const replies = [
    `[ACK] Processing: "${message}"`,
    `[SYS] Command received. Awaiting kernel response...`,
    `[NET] Routing through encrypted tunnel...`,
    `[CORE] Task queued at priority level 3`,
    `[OK] Command executed. Output buffered.`,
    `[WARN] Unrecognized directive. Logging for analysis.`,
    `[SEC] Authentication verified. Proceeding.`,
    `[MEM] Allocating resources for request...`,
  ];
  setTimeout(() => res.json({ reply: replies[Math.floor(Math.random() * replies.length)], timestamp: Date.now() }), 300 + Math.random() * 700);
});

app.get('/api/processes', (_, res) => {
  try { res.json({ processes: execSync('ps aux --sort=-%mem | head -11', { encoding: 'utf8' }) }); }
  catch (_) { res.json({ processes: 'Unable to fetch' }); }
});

app.get('/api/network', (_, res) => {
  const ifaces = os.networkInterfaces(), out = {};
  for (const [name, addrs] of Object.entries(ifaces))
    out[name] = addrs.filter(a => !a.internal).map(a => ({ address: a.address, family: a.family }));
  res.json(out);
});

// ── WebSocket ─────────────────────────────────────────────────
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', msg: '[SYS] Secure channel established.' }));
  const iv = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'stats', data: getStats() }));
  }, 2000);
  ws.on('message', (raw) => { try { const m = JSON.parse(raw); if (m.type === 'ping') ws.send(JSON.stringify({ type: 'pong' })); } catch (_) {} });
  ws.on('close', () => { clients.delete(ws); clearInterval(iv); });
});

// ── Start ─────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[32m  ╔══════════════════════════════════════╗`);
  console.log(`  ║  OpenDesktop Web UI :: ACTIVE        ║`);
  console.log(`  ║  Port: ${PORT}                         ║`);
  console.log(`  ║  Status: LISTENING                   ║`);
  console.log(`  ╚══════════════════════════════════════╝\x1b[0m`);
});
