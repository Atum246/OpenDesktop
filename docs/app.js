/* ============================================================
   OpenDesktop :: Hacker Command Center — Frontend JS
   ============================================================ */

(function () {
  'use strict';

  // ── DOM Refs ────────────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const chatInput    = $('#chat-input');
  const chatMessages = $('#chat-messages');
  const sendBtn      = $('#send-btn');
  const matrixCanvas = $('#matrix-canvas');
  const hamburger    = $('#hamburger');
  const sidebar      = $('#sidebar');
  const toastBox     = $('#toast-container');

  // Top bar
  const topCPU  = $('#top-cpu');
  const topRAM  = $('#top-ram');
  const topDisk = $('#top-disk');
  const clockEl = $('#clock');
  const kernelEl = $('#kernel-ver');

  // System tab
  const cpuBar   = $('#cpu-bar');
  const ramBar   = $('#ram-bar');
  const diskBar  = $('#disk-bar');
  const cpuPct   = $('#cpu-pct');
  const ramPct   = $('#ram-pct');
  const diskPct  = $('#disk-pct');
  const cpuDetail = $('#cpu-detail');
  const ramDetail = $('#ram-detail');
  const diskDetail = $('#disk-detail');
  const sysInfo  = $('#sys-info');
  const procInfo = $('#proc-info');

  // Sidebar
  const wsStatus = $('#ws-status');
  const sessionId = $('#session-id');
  const wsSettingStatus = $('#ws-setting-status');

  // Settings toggles
  const toggleMatrix   = $('#toggle-matrix');
  const toggleScanline = $('#toggle-scanline');
  const toggleGlitch   = $('#toggle-glitch');
  const toggleCRT      = $('#toggle-crt');

  // ── State ───────────────────────────────────────────────────
  let ws = null;
  let commandHistory = [];
  let historyIndex = -1;
  let matrixAnimId = null;

  // ── Utilities ───────────────────────────────────────────────
  function formatBytes(b) {
    if (b === 0) return '0 B';
    const k = 1024, u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + u[i];
  }

  function timeStr() {
    return new Date().toLocaleTimeString('en-GB', { hour12: false });
  }

  function sessionIdGen() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // ── Toast System ────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    toastBox.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toast-out 0.3s ease-out forwards';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  // ── Chat ────────────────────────────────────────────────────
  function addMessage(text, type = 'system') {
    const div = document.createElement('div');
    div.className = 'msg-' + type;
    const prefix = type === 'user' ? '[YOU]' : type === 'response' ? '[ACK]' : '[SYS]';
    div.innerHTML = `<span class="msg-prefix">${prefix}</span><span class="msg-time">${timeStr()}</span><span class="msg-body">${escHtml(text)}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    addMessage(msg, 'user');
    commandHistory.push(msg);
    historyIndex = commandHistory.length;
    chatInput.value = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      addMessage(data.reply || 'No response', 'response');
    } catch (e) {
      addMessage('[ERR] Connection failed: ' + e.message, 'system');
    }
  }

  // ── Command History (Up/Down arrows) ────────────────────────
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) { historyIndex--; chatInput.value = commandHistory[historyIndex]; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) { historyIndex++; chatInput.value = commandHistory[historyIndex]; }
      else { historyIndex = commandHistory.length; chatInput.value = ''; }
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // ── Tab Switching ───────────────────────────────────────────
  $$('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = $('#panel-' + tab);
      if (panel) panel.classList.add('active');
      // Close mobile sidebar
      sidebar.classList.remove('open');
    });
  });

  // ── Hamburger (Mobile) ──────────────────────────────────────
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  // ── Clock ───────────────────────────────────────────────────
  function updateClock() {
    clockEl.textContent = timeStr();
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ── WebSocket ───────────────────────────────────────────────
  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host);

    ws.onopen = () => {
      wsStatus.textContent = 'CONNECTED';
      sessionId.textContent = sessionIdGen();
      wsSettingStatus.textContent = '● Connected';
      wsSettingStatus.style.color = 'var(--green)';
      document.querySelector('.connection-indicator').classList.add('connected');
      document.querySelector('.connection-indicator').classList.remove('disconnected');
      toast('Secure channel established', 'info');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'stats') updateStats(msg.data);
        if (msg.type === 'connected') addMessage(msg.msg, 'system');
      } catch (_) {}
    };

    ws.onclose = () => {
      wsStatus.textContent = 'DISCONNECTED';
      wsSettingStatus.textContent = '○ Disconnected';
      wsSettingStatus.style.color = 'var(--red)';
      document.querySelector('.connection-indicator').classList.add('disconnected');
      document.querySelector('.connection-indicator').classList.remove('connected');
      toast('Channel lost. Reconnecting...', 'error');
      setTimeout(connectWS, 3000);
    };

    ws.onerror = () => ws.close();
  }

  // ── Stats Update ────────────────────────────────────────────
  function updateStats(d) {
    // Top bar chips
    topCPU.textContent  = d.cpu + '%';
    topRAM.textContent  = d.memory.percent + '%';
    topDisk.textContent = d.disk.percent + '%';

    // Color warnings
    colorChip(topCPU, d.cpu);
    colorChip(topRAM, d.memory.percent);
    colorChip(topDisk, d.disk.percent);

    // Bars
    cpuBar.style.width   = d.cpu + '%';
    ramBar.style.width   = d.memory.percent + '%';
    diskBar.style.width  = d.disk.percent + '%';
    cpuPct.textContent   = d.cpu + '%';
    ramPct.textContent   = d.memory.percent + '%';
    diskPct.textContent  = d.disk.percent + '%';

    // Details
    cpuDetail.textContent  = d.cpus + ' cores | load: ' + d.load['1m'];
    ramDetail.textContent  = formatBytes(d.memory.used) + ' / ' + formatBytes(d.memory.total);
    diskDetail.textContent = formatBytes(d.disk.used) + ' / ' + formatBytes(d.disk.total);

    // System info
    sysInfo.textContent =
      `Hostname : ${d.hostname}
Platform : ${d.platform} (${d.arch})
CPUs     : ${d.cpus}
Uptime   : ${formatUptime(d.uptime)}
Load     : ${d.load['1m']} / ${d.load['5m']} / ${d.load['15m']}`;

    kernelEl.textContent = d.platform + '/' + d.arch;
  }

  function colorChip(el, pct) {
    if (pct >= 90) el.style.color = 'var(--red)';
    else if (pct >= 70) el.style.color = 'var(--amber)';
    else el.style.color = 'var(--green)';
  }

  function formatUptime(s) {
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
          m = Math.floor(s % 3600 / 60);
    return (d ? d + 'd ' : '') + h + 'h ' + m + 'm';
  }

  // ── Process Polling ─────────────────────────────────────────
  async function pollProcesses() {
    try {
      const res = await fetch('/api/processes');
      const data = await res.json();
      procInfo.textContent = data.processes || 'No data';
    } catch (_) {}
  }
  setInterval(pollProcesses, 5000);
  pollProcesses();

  // ── Matrix Rain (Canvas) ────────────────────────────────────
  function initMatrix() {
    const ctx = matrixCanvas.getContext('2d');
    let w, h, columns, drops;

    function resize() {
      w = matrixCanvas.width  = window.innerWidth;
      h = matrixCanvas.height = window.innerHeight;
      columns = Math.floor(w / 14);
      drops = Array(columns).fill(1);
    }

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\+=~!@#$%^&*';

    function draw() {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#00ff41';
      ctx.font = '14px Fira Code, monospace';

      for (let i = 0; i < columns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 14;
        const y = drops[i] * 14;

        // Vary brightness
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.fillText(char, x, y);
        ctx.globalAlpha = 1;

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      matrixAnimId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  function stopMatrix() {
    if (matrixAnimId) { cancelAnimationFrame(matrixAnimId); matrixAnimId = null; }
  }

  // ── Settings Toggles ────────────────────────────────────────
  toggleMatrix.addEventListener('change', () => {
    if (toggleMatrix.checked) { initMatrix(); matrixCanvas.style.display = ''; }
    else { stopMatrix(); matrixCanvas.style.display = 'none'; }
  });

  toggleScanline.addEventListener('change', () => {
    $('.scanline-overlay').style.display = toggleScanline.checked ? '' : 'none';
  });

  toggleCRT.addEventListener('change', () => {
    $('.crt-overlay').style.display = toggleCRT.checked ? '' : 'none';
  });

  toggleGlitch.addEventListener('change', () => {
    document.querySelectorAll('.glitch-text, .glitch-text-sm').forEach(el => {
      el.style.animation = toggleGlitch.checked ? '' : 'none';
    });
  });

  // ── Theme Color Buttons ─────────────────────────────────────
  $$('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const color = btn.dataset.color;
      if (color === 'green') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', color);
      toast('Theme: ' + color.toUpperCase(), 'info');
    });
  });

  // ── Keyboard Shortcut: Ctrl+K → focus chat ──────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      chatInput.focus();
    }
  });

  // ── Init ────────────────────────────────────────────────────
  initMatrix();
  connectWS();
  addMessage('Type a command below. Use ↑↓ for history. Ctrl+K to focus.', 'system');
  toast('Command center online', 'info');

})();
