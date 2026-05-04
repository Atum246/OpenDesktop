'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
//  REVERSE ENGINEERING ENGINE — Analyze Anything, Find Patterns 🔍🔬
//  Binary analysis, protocol reverse eng, pattern detection, hardware
// ═══════════════════════════════════════════════════════════════

class ReverseEngineering {
  constructor(config, provider) {
    this.config = config;
    this.provider = provider;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'reverse-eng');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  // ═══ BINARY ANALYSIS ═══

  async analyzeBinary(filePath, options = {}) {
    if (!fs.existsSync(filePath)) return { error: `File not found: ${filePath}` };

    const content = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const analysis = {
      file: filePath,
      size: stat.size,
      sizeHuman: this._formatBytes(stat.size),
      extension: ext,
      magic: this._detectMagic(content),
      entropy: this._calculateEntropy(content),
      hashes: {
        md5: crypto.createHash('md5').update(content).digest('hex'),
        sha1: crypto.createHash('sha1').update(content).digest('hex'),
        sha256: crypto.createHash('sha256').update(content).digest('hex')
      },
      strings: this._extractStrings(content),
      hexDump: this._hexDump(content.slice(0, 1024)),
      structure: this._analyzeStructure(content, ext),
      patterns: this._findPatterns(content),
      metadata: {}
    };

    // Type-specific analysis
    if (analysis.magic.type === 'elf') analysis.metadata = this._analyzeELF(content);
    else if (analysis.magic.type === 'pe') analysis.metadata = this._analyzePE(content);
    else if (analysis.magic.type === 'macho') analysis.metadata = this._analyzeMachO(content);
    else if (analysis.magic.type === 'zip') analysis.metadata = this._analyzeZip(content);
    else if (analysis.magic.type === 'pdf') analysis.metadata = this._analyzePDF(content);
    else if (analysis.magic.type === 'image') analysis.metadata = this._analyzeImage(content, ext);

    // AI analysis for complex files
    if (options.aiAnalysis !== false) {
      try {
        const aiAnalysis = await this.provider.chat(
          `Analyze this binary file:
File: ${filePath}
Size: ${analysis.sizeHuman}
Type: ${analysis.magic.description}
Entropy: ${analysis.entropy.toFixed(2)} (${analysis.entropy > 7 ? 'likely encrypted/compressed' : analysis.entropy > 6 ? 'binary data' : 'structured data'})
MD5: ${analysis.hashes.md5}
SHA256: ${analysis.hashes.sha256}

Extracted strings (first 20):
${analysis.strings.slice(0, 20).join('\n')}

Provide:
1. What this file likely is
2. Its purpose/function
3. Notable findings
4. Security concerns
5. How to further analyze it
6. Related tools for deeper analysis`,
          { maxTokens: 2000 }
        );
        analysis.aiAnalysis = aiAnalysis;
      } catch {}
    }

    return analysis;
  }

  _detectMagic(buffer) {
    const magic = buffer.slice(0, 16).toString('hex');

    const signatures = [
      { hex: '7f454c46', type: 'elf', description: 'ELF Executable (Linux/Unix)' },
      { hex: '4d5a', type: 'pe', description: 'PE Executable (Windows)' },
      { hex: 'cffaedfe', type: 'macho', description: 'Mach-O Executable (macOS)' },
      { hex: 'feedface', type: 'macho', description: 'Mach-O 32-bit (macOS)' },
      { hex: '504b0304', type: 'zip', description: 'ZIP Archive' },
      { hex: '504b0506', type: 'zip', description: 'ZIP Archive (empty)' },
      { hex: '52617221', type: 'rar', description: 'RAR Archive' },
      { hex: '377abcaf', type: '7z', description: '7-Zip Archive' },
      { hex: '1f8b', type: 'gzip', description: 'Gzip Compressed' },
      { hex: '425a68', type: 'bz2', description: 'Bzip2 Compressed' },
      { hex: 'fd377a585a', type: 'xz', description: 'XZ Compressed' },
      { hex: '25504446', type: 'pdf', description: 'PDF Document' },
      { hex: '89504e47', type: 'image', description: 'PNG Image' },
      { hex: 'ffd8ff', type: 'image', description: 'JPEG Image' },
      { hex: '47494638', type: 'image', description: 'GIF Image' },
      { hex: '52494646', type: 'image', description: 'RIFF (WebP/AVI/WAV)' },
      { hex: '49492a00', type: 'image', description: 'TIFF Image (LE)' },
      { hex: '4d4d002a', type: 'image', description: 'TIFF Image (BE)' },
      { hex: '00000100', type: 'image', description: 'ICO Image' },
      { hex: '494433', type: 'audio', description: 'MP3 Audio (ID3)' },
      { hex: 'fff3', type: 'audio', description: 'MP3 Audio' },
      { hex: '4f676753', type: 'audio', description: 'Ogg Audio' },
      { hex: '664c6143', type: 'audio', description: 'FLAC Audio' },
      { hex: '1a45dfa3', type: 'video', description: 'MKV/WebM Video' },
      { hex: '0000001c66747970', type: 'video', description: 'MP4 Video' },
      { hex: '0000002066747970', type: 'video', description: 'MP4 Video' },
      { hex: '464c56', type: 'video', description: 'FLV Video' },
      { hex: '2321', type: 'script', description: 'Shell Script (Shebang)' },
      { hex: '3c3f786d6c', type: 'xml', description: 'XML Document' },
      { hex: '3c21444f43', type: 'html', description: 'HTML Document' },
      { hex: '7b0a', type: 'json', description: 'JSON Data' },
      { hex: '1f9d', type: 'compress', description: 'Unix Compress (.Z)' },
      { hex: '4c5a4950', type: 'lzip', description: 'Lzip Compressed' },
      { hex: 'd0cf11e0', type: 'ole', description: 'OLE (MS Office legacy)' },
      { hex: '504b030414', type: 'office', description: 'MS Office (OOXML)' },
      { hex: 'cafebabe', type: 'java', description: 'Java Class File' },
      { hex: 'deadbeef', type: 'custom', description: 'Custom Magic (0xDEADBEEF)' },
      { hex: 'feff', type: 'utf16', description: 'UTF-16 BOM' },
      { hex: 'efbbbf', type: 'utf8', description: 'UTF-8 BOM' }
    ];

    for (const sig of signatures) {
      if (magic.startsWith(sig.hex)) return sig;
    }

    // Check if text
    const isPrintable = buffer.slice(0, 100).every(b => (b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9);
    if (isPrintable) return { type: 'text', description: 'Plain Text File' };

    return { type: 'unknown', description: 'Unknown file type', magic: magic.slice(0, 20) };
  }

  _calculateEntropy(buffer) {
    const freq = new Uint32Array(256);
    for (const byte of buffer) freq[byte]++;

    let entropy = 0;
    const len = buffer.length;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / len;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  _extractStrings(buffer, minLength = 4) {
    const strings = [];
    let current = '';

    for (const byte of buffer) {
      if (byte >= 32 && byte <= 126) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= minLength) strings.push(current);
        current = '';
      }
    }
    if (current.length >= minLength) strings.push(current);

    return strings.slice(0, 200);
  }

  _hexDump(buffer, bytesPerLine = 16) {
    const lines = [];
    for (let i = 0; i < buffer.length; i += bytesPerLine) {
      const slice = buffer.slice(i, i + bytesPerLine);
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(slice).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
      lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(bytesPerLine * 3)}  |${ascii}|`);
    }
    return lines;
  }

  _analyzeStructure(buffer, ext) {
    const structure = { sections: [], headers: [] };

    // Detect common structures
    if (buffer[0] === 0x7F && buffer[1] === 0x45) {
      structure.type = 'ELF';
      structure.arch = buffer[4] === 1 ? '32-bit' : '64-bit';
      structure.endian = buffer[5] === 1 ? 'Little Endian' : 'Big Endian';
    } else if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
      structure.type = 'PE';
      structure.arch = 'Windows Executable';
    } else if (buffer.slice(0, 4).toString() === 'PK\x03\x04') {
      structure.type = 'ZIP';
      structure.format = 'Archive';
    }

    return structure;
  }

  _findPatterns(buffer) {
    const patterns = [];

    // URLs
    const urlPattern = /https?:\/\/[^\x00-\x1f\x7f-\xff]+/g;
    const urls = buffer.toString('utf8').match(urlPattern) || [];
    if (urls.length) patterns.push({ type: 'urls', count: urls.length, samples: urls.slice(0, 5) });

    // Email addresses
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = buffer.toString('utf8').match(emailPattern) || [];
    if (emails.length) patterns.push({ type: 'emails', count: emails.length, samples: emails.slice(0, 5) });

    // IP addresses
    const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const ips = buffer.toString('utf8').match(ipPattern) || [];
    if (ips.length) patterns.push({ type: 'ip-addresses', count: ips.length, samples: ips.slice(0, 5) });

    // File paths
    const pathPattern = /[A-Z]:\\[^\x00-\x1f]+|\/[\w./-]+/g;
    const paths = buffer.toString('utf8').match(pathPattern) || [];
    if (paths.length) patterns.push({ type: 'file-paths', count: paths.length, samples: paths.slice(0, 5) });

    // Repeated bytes (encryption/compression indicator)
    let maxRepeat = 0;
    let currentRepeat = 1;
    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i] === buffer[i - 1]) {
        currentRepeat++;
        maxRepeat = Math.max(maxRepeat, currentRepeat);
      } else {
        currentRepeat = 1;
      }
    }
    if (maxRepeat > 100) patterns.push({ type: 'repeated-bytes', maxRepeat, indicator: 'possible encryption or compression' });

    // Base64 patterns
    const b64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
    const b64Matches = buffer.toString('utf8').match(b64Pattern) || [];
    if (b64Matches.length) patterns.push({ type: 'base64', count: b64Matches.length, samples: b64Matches.slice(0, 3) });

    // Hex strings
    const hexPattern = /[0-9a-fA-F]{16,}/g;
    const hexMatches = buffer.toString('utf8').match(hexPattern) || [];
    if (hexMatches.length) patterns.push({ type: 'hex-strings', count: hexMatches.length, samples: hexMatches.slice(0, 3) });

    return patterns;
  }

  _analyzeELF(buffer) {
    return {
      format: 'ELF',
      arch: buffer[4] === 1 ? '32-bit' : '64-bit',
      endian: buffer[5] === 1 ? 'Little Endian' : 'Big Endian',
      os: buffer[7] === 0 ? 'System V' : buffer[7] === 3 ? 'Linux' : buffer[7] === 6 ? 'Solaris' : 'Unknown',
      type: buffer[16] === 2 ? 'Executable' : buffer[16] === 3 ? 'Shared Library' : 'Other'
    };
  }

  _analyzePE(buffer) {
    const peOffset = buffer.readUInt32LE(0x3C);
    return {
      format: 'PE',
      peOffset,
      machine: buffer.readUInt16LE(peOffset + 4) === 0x14c ? 'x86' : 'x64',
      sections: buffer.readUInt16LE(peOffset + 6)
    };
  }

  _analyzeMachO(buffer) {
    return {
      format: 'Mach-O',
      arch: buffer[4] === 0 ? 'x86' : buffer[4] === 7 ? 'x86_64' : buffer[4] === 12 ? 'ARM' : 'Unknown',
      endian: buffer[0] === 0xFE ? 'Big Endian' : 'Little Endian'
    };
  }

  _analyzeZip(buffer) {
    return { format: 'ZIP', entries: 'multiple', note: 'Use unzip -l to list contents' };
  }

  _analyzePDF(buffer) {
    const text = buffer.toString('utf8', 0, 1000);
    const version = text.match(/%PDF-(\d+\.\d+)/)?.[1] || 'unknown';
    return { format: 'PDF', version };
  }

  _analyzeImage(buffer, ext) {
    return { format: ext.replace('.', '').toUpperCase(), type: 'image' };
  }

  // ═══ PROTOCOL ANALYSIS ═══

  async analyzeProtocol(data, options = {}) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, options.encoding || 'utf8');

    return {
      size: buffer.length,
      entropy: this._calculateEntropy(buffer),
      structure: this._analyzeStructure(buffer, ''),
      patterns: this._findPatterns(buffer),
      hexDump: this._hexDump(buffer.slice(0, 512)),
      possibleProtocols: this._guessProtocol(buffer)
    };
  }

  _guessProtocol(buffer) {
    const protocols = [];
    const first = buffer.slice(0, 10).toString('ascii');

    if (first.startsWith('GET ') || first.startsWith('POST ') || first.startsWith('HTTP/')) protocols.push('HTTP');
    if (first.startsWith('SSH-')) protocols.push('SSH');
    if (first.startsWith('220 ')) protocols.push('FTP');
    if (first.startsWith('+OK')) protocols.push('POP3');
    if (first.startsWith('EHLO') || first.startsWith('HELO')) protocols.push('SMTP');
    if (buffer[0] === 0x16 && buffer[1] === 0x03) protocols.push('TLS/SSL');
    if (buffer[0] === 0x30) protocols.push('ASN.1/DER');
    if (first.startsWith('PK')) protocols.push('ZIP-based');
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) protocols.push('BMP');

    return protocols;
  }

  // ═══ DIFF ANALYSIS ═══

  async diffFiles(file1, file2, options = {}) {
    const buf1 = fs.readFileSync(file1);
    const buf2 = fs.readFileSync(file2);

    const analysis = {
      file1: { path: file1, size: buf1.length, hash: crypto.createHash('sha256').update(buf1).digest('hex') },
      file2: { path: file2, size: buf2.length, hash: crypto.createHash('sha256').update(buf2).digest('hex') },
      identical: buf1.equals(buf2),
      sizeDiff: buf2.length - buf1.length,
      byteDiffs: []
    };

    if (!analysis.identical) {
      const maxLen = Math.min(buf1.length, buf2.length);
      let diffCount = 0;
      for (let i = 0; i < maxLen; i++) {
        if (buf1[i] !== buf2[i]) {
          diffCount++;
          if (diffCount <= 100) {
            analysis.byteDiffs.push({
              offset: i,
              hex: `0x${i.toString(16)}`,
              file1: `0x${buf1[i].toString(16)}`,
              file2: `0x${buf2[i].toString(16)}`
            });
          }
        }
      }
      analysis.totalByteDiffs = diffCount;
      analysis.diffPercentage = ((diffCount / maxLen) * 100).toFixed(2) + '%';
    }

    return analysis;
  }

  // ═══ HARDWARE ANALYSIS ═══

  async analyzeHardware() {
    const si = require('systeminformation');

    const [cpu, mem, disk, os_info, baseboard, chassis, bios, gpu, net, audio, usb] = await Promise.all([
      si.cpu().catch(() => ({})),
      si.mem().catch(() => ({})),
      si.fsSize().catch(() => []),
      si.osInfo().catch(() => ({})),
      si.baseboard().catch(() => ({})),
      si.chassis().catch(() => ({})),
      si.bios().catch(() => ({})),
      si.graphics().catch(() => ({ controllers: [] })),
      si.networkInterfaces().catch(() => []),
      si.audio().catch(() => []),
      si.usb().catch(() => [])
    ]);

    return {
      cpu: {
        brand: cpu.brand,
        manufacturer: cpu.manufacturer,
        family: cpu.family,
        model: cpu.model,
        speed: cpu.speed + ' GHz',
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        processors: cpu.processors
      },
      memory: {
        total: this._formatBytes(mem.total),
        free: this._formatBytes(mem.free),
        used: this._formatBytes(mem.used),
        swapTotal: this._formatBytes(mem.swaptotal),
        modules: mem.modules?.length || 'unknown'
      },
      storage: disk.map(d => ({
        mount: d.mount,
        type: d.type,
        size: this._formatBytes(d.size),
        used: this._formatBytes(d.used),
        percent: Math.round(d.use) + '%'
      })),
      os: {
        platform: os_info.platform,
        distro: os_info.distro,
        release: os_info.release,
        kernel: os_info.kernel,
        arch: os_info.arch
      },
      motherboard: {
        manufacturer: baseboard.manufacturer,
        model: baseboard.model,
        version: baseboard.version
      },
      chassis: {
        manufacturer: chassis.manufacturer,
        model: chassis.model,
        type: chassis.type
      },
      bios: {
        vendor: bios.vendor,
        version: bios.version,
        releaseDate: bios.releaseDate
      },
      gpu: gpu.controllers?.map(g => ({
        model: g.model,
        vendor: g.vendor,
        vram: g.vram ? this._formatBytes(g.vram * 1024 * 1024) : 'N/A'
      })) || [],
      network: net.filter(n => !n.internal).map(n => ({
        iface: n.iface,
        ip4: n.ip4,
        mac: n.mac,
        speed: n.speed
      })),
      audio: audio.map(a => ({ name: a.name, manufacturer: a.manufacturer })),
      usb: usb.map(u => ({ name: u.name, vendor: u.vendor, type: u.type }))
    };
  }

  // ═══ NETWORK ANALYSIS ═══

  async analyzeNetwork(target, options = {}) {
    const results = { target, timestamp: new Date().toISOString() };

    // Ping
    try {
      const ping = execSync(`ping -c 4 ${target} 2>/dev/null || ping -n 4 ${target}`, { encoding: 'utf8', timeout: 15000 });
      results.ping = { output: ping.trim(), success: true };
    } catch (err) {
      results.ping = { error: err.message, success: false };
    }

    // DNS
    try {
      const dns = execSync(`nslookup ${target} 2>/dev/null || host ${target}`, { encoding: 'utf8', timeout: 10000 });
      results.dns = { output: dns.trim() };
    } catch {}

    // Traceroute
    try {
      const trace = execSync(`traceroute -m 15 ${target} 2>/dev/null || tracert -d -h 15 ${target}`, { encoding: 'utf8', timeout: 30000 });
      results.traceroute = { output: trace.trim().split('\n').slice(0, 20) };
    } catch {}

    // Port scan (common ports)
    const ports = options.ports || [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3306, 3389, 5432, 8080, 8443];
    results.ports = [];

    for (const port of ports) {
      const open = await this._checkPort(target, port);
      if (open) results.ports.push({ port, state: 'open' });
    }

    // Whois
    try {
      const whois = execSync(`whois ${target} 2>/dev/null | head -50`, { encoding: 'utf8', timeout: 15000 });
      results.whois = whois.trim().split('\n').slice(0, 30).join('\n');
    } catch {}

    return results;
  }

  _checkPort(host, port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.connect(port, host);
    });
  }

  // ═══ PATTERN DETECTION ═══

  async findPatterns(data, options = {}) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(fs.readFileSync(data));

    const patterns = {
      entropy: this._calculateEntropy(buffer),
      byteFrequency: this._byteFrequency(buffer),
      sequences: this._findSequences(buffer),
      strings: this._extractStrings(buffer, options.minStringLen || 6),
      urls: this._findPatterns(buffer),
      structure: this._analyzeStructure(buffer, ''),
      recommendation: ''
    };

    // AI pattern analysis
    try {
      const analysis = await this.provider.chat(
        `Analyze these patterns found in binary data:

Entropy: ${patterns.entropy.toFixed(2)}
Byte frequency distribution: ${JSON.stringify(patterns.byteFrequency.slice(0, 10))}
Repeating sequences: ${JSON.stringify(patterns.sequences.slice(0, 5))}
Extracted strings: ${patterns.strings.slice(0, 10).join(', ')}

What patterns do you see? What does this data likely represent?
Identify: encoding, compression, encryption, structure, protocol, or purpose.`,
        { maxTokens: 1500 }
      );
      patterns.recommendation = analysis;
    } catch {}

    return patterns;
  }

  _byteFrequency(buffer) {
    const freq = new Uint32Array(256);
    for (const byte of buffer) freq[byte]++;

    return Array.from(freq)
      .map((count, byte) => ({ byte: `0x${byte.toString(16).padStart(2, '0')}`, count, percent: ((count / buffer.length) * 100).toFixed(2) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  _findSequences(buffer) {
    const sequences = [];
    const minLen = 3;
    const maxLen = 32;

    for (let len = minLen; len <= maxLen; len++) {
      const seen = new Map();
      for (let i = 0; i <= buffer.length - len; i++) {
        const seq = buffer.slice(i, i + len).toString('hex');
        seen.set(seq, (seen.get(seq) || 0) + 1);
      }

      for (const [seq, count] of seen) {
        if (count >= 3 && count < buffer.length / len) {
          sequences.push({ hex: seq, length: len, count });
        }
      }
    }

    return sequences.sort((a, b) => b.count - a.count).slice(0, 20);
  }

  // ═══ HELPERS ═══
  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getStatus() {
    return { dataDir: this.dataDir };
  }
}

module.exports = ReverseEngineering;
