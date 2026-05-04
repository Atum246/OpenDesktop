'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════
//  UNIVERSAL TOOLKIT — Does EVERYTHING 🔧🌐💥
//  Image gen, TTS, PDF, file conversion, DB, git, charts, email, calendar
// ═══════════════════════════════════════════════════════════════

class UniversalToolkit {
  constructor(config, provider) {
    this.config = config;
    this.provider = provider;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'toolkit');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  // ═══ IMAGE GENERATION ═══

  async generateImage(prompt, options = {}) {
    const size = options.size || '1024x1024';
    const quality = options.quality || 'standard';
    const style = options.style || 'vivid';

    try {
      const axios = require('axios');
      const apiKey = this.provider.apiKey;

      // Try DALL-E via OpenAI-compatible endpoint
      const baseUrl = this.provider.endpoint || 'https://api.openai.com/v1';
      const resp = await axios.post(`${baseUrl}/images/generations`, {
        model: options.model || 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality,
        style,
        response_format: 'url'
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 120000
      });

      const imageUrl = resp.data.data[0].url;
      const revisedPrompt = resp.data.data[0].revised_prompt;

      // Download image
      const imgPath = path.join(this.dataDir, `generated_${Date.now()}.png`);
      const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(imgPath, Buffer.from(imgResp.data));

      return { success: true, path: imgPath, url: imageUrl, revisedPrompt };
    } catch (err) {
      return { success: false, error: err.message, suggestion: 'Ensure you have an OpenAI API key with DALL-E access, or use Stability AI / Replicate' };
    }
  }

  async generateImageStability(prompt, options = {}) {
    try {
      const axios = require('axios');
      const apiKey = this.config.get('providers.stability.apiKey') || this.provider.apiKey;

      const resp = await axios.post('https://api.stability.ai/v2beta/stable-image/generate/core', {
        prompt,
        output_format: 'png',
        aspect_ratio: options.aspect || '1:1'
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'image/*'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      });

      const imgPath = path.join(this.dataDir, `stability_${Date.now()}.png`);
      fs.writeFileSync(imgPath, Buffer.from(resp.data));
      return { success: true, path: imgPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ TEXT-TO-SPEECH ═══

  async textToSpeech(text, options = {}) {
    const voice = options.voice || 'alloy';
    const model = options.model || 'tts-1';
    const speed = options.speed || 1.0;

    try {
      const axios = require('axios');
      const apiKey = this.provider.apiKey;
      const baseUrl = this.provider.endpoint || 'https://api.openai.com/v1';

      const resp = await axios.post(`${baseUrl}/audio/speech`, {
        model,
        input: text,
        voice,
        speed,
        response_format: options.format || 'mp3'
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 60000
      });

      const ext = options.format || 'mp3';
      const audioPath = path.join(this.dataDir, `speech_${Date.now()}.${ext}`);
      fs.writeFileSync(audioPath, Buffer.from(resp.data));
      return { success: true, path: audioPath, voice, model };
    } catch (err) {
      return { success: false, error: err.message, suggestion: 'Ensure you have an OpenAI API key' };
    }
  }

  async textToSpeechElevenLabs(text, options = {}) {
    try {
      const axios = require('axios');
      const apiKey = this.config.get('providers.elevenlabs.apiKey');
      if (!apiKey) return { error: 'ElevenLabs API key not configured' };

      const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel
      const resp = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        text,
        model_id: options.model || 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }, {
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 60000
      });

      const audioPath = path.join(this.dataDir, `elevenlabs_${Date.now()}.mp3`);
      fs.writeFileSync(audioPath, Buffer.from(resp.data));
      return { success: true, path: audioPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ SPEECH-TO-TEXT ═══

  async speechToText(audioPath, options = {}) {
    try {
      const axios = require('axios');
      const FormData = globalThis.FormData || require('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(audioPath));
      form.append('model', options.model || 'whisper-1');
      if (options.language) form.append('language', options.language);

      const apiKey = this.provider.apiKey;
      const baseUrl = this.provider.endpoint || 'https://api.openai.com/v1';

      const resp = await axios.post(`${baseUrl}/audio/transcriptions`, form, {
        headers: { ...form.getHeaders(), 'Authorization': `Bearer ${apiKey}` },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000
      });

      return { success: true, text: resp.data.text, language: resp.data.language };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ PDF GENERATION ═══

  async generatePDF(content, options = {}) {
    try {
      const title = options.title || 'Document';
      const author = options.author || 'OpenDesktop';
      const orientation = options.orientation || 'portrait';

      // Simple PDF generation using raw PDF spec
      const lines = content.split('\n');
      let pageContent = '';

      for (const line of lines) {
        const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        pageContent += `BT /F1 12 Tf 50 ${750 - lines.indexOf(line) * 16} Td (${escaped}) Tj ET\n`;
      }

      // Use a simpler approach: write HTML and convert
      const htmlPath = path.join(this.dataDir, `temp_${Date.now()}.html`);
      const pdfPath = options.outputPath || path.join(this.dataDir, `document_${Date.now()}.pdf`);

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: 'Courier New', monospace; margin: 40px; color: #000; background: #fff; }
h1 { color: #FF0000; border-bottom: 2px solid #FF0000; padding-bottom: 10px; }
h2 { color: #333; }
pre { background: #f5f5f5; padding: 15px; border: 1px solid #ddd; overflow-x: auto; }
code { font-family: 'Courier New', monospace; }
.meta { color: #666; font-size: 12px; }
</style></head>
<body>
<h1>${title}</h1>
<p class="meta">Generated by OpenDesktop | ${new Date().toISOString()} | ${author}</p>
<hr>
${content.split('\n').map(line => {
  if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
  if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
  if (line.startsWith('```')) return '<pre>';
  if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
  return `<p>${line}</p>`;
}).join('\n')}
</body></html>`;

      fs.writeFileSync(htmlPath, html);

      // Try wkhtmltopdf or puppeteer
      try {
        execSync(`wkhtmltopdf --page-size A4 --orientation ${orientation} "${htmlPath}" "${pdfPath}"`, { timeout: 30000 });
      } catch {
        // Fallback: save as HTML
        const htmlOut = pdfPath.replace('.pdf', '.html');
        fs.copyFileSync(htmlPath, htmlOut);
        fs.unlinkSync(htmlPath);
        return { success: true, path: htmlOut, format: 'html', note: 'wkhtmltopdf not found, saved as HTML. Install wkhtmltopdf for PDF.' };
      }

      fs.unlinkSync(htmlPath);
      return { success: true, path: pdfPath, format: 'pdf' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ FILE FORMAT CONVERSION ═══

  async convertFile(inputPath, outputFormat, options = {}) {
    const ext = path.extname(inputPath).toLowerCase();
    const outputPath = options.outputPath || inputPath.replace(ext, `.${outputFormat}`);

    const conversions = {
      '.md': { pdf: 'pandoc', html: 'pandoc', docx: 'pandoc' },
      '.html': { pdf: 'wkhtmltopdf', png: 'wkhtmltoimage' },
      '.csv': { json: 'node', xlsx: 'node' },
      '.json': { csv: 'node', yaml: 'node' },
      '.txt': { pdf: 'pandoc', html: 'pandoc' },
      '.py': { js: 'ai', exe: 'pyinstaller' },
      '.png': { jpg: 'convert', webp: 'convert', ico: 'convert' },
      '.jpg': { png: 'convert', webp: 'convert' },
      '.mp3': { wav: 'ffmpeg', ogg: 'ffmpeg' },
      '.wav': { mp3: 'ffmpeg', ogg: 'ffmpeg' },
      '.mp4': { gif: 'ffmpeg', mp3: 'ffmpeg', webm: 'ffmpeg' }
    };

    const converter = conversions[ext]?.[outputFormat];
    if (!converter) {
      return { error: `No converter for ${ext} → ${outputFormat}. Supported: ${JSON.stringify(conversions[ext] || {})}` };
    }

    try {
      switch (converter) {
        case 'pandoc':
          execSync(`pandoc "${inputPath}" -o "${outputPath}"`, { timeout: 60000 });
          break;
        case 'wkhtmltopdf':
          execSync(`wkhtmltopdf "${inputPath}" "${outputPath}"`, { timeout: 60000 });
          break;
        case 'wkhtmltoimage':
          execSync(`wkhtmltoimage "${inputPath}" "${outputPath}"`, { timeout: 60000 });
          break;
        case 'convert':
          execSync(`convert "${inputPath}" "${outputPath}"`, { timeout: 30000 });
          break;
        case 'ffmpeg':
          execSync(`ffmpeg -i "${inputPath}" "${outputPath}" -y`, { timeout: 120000 });
          break;
        case 'node':
          return this._convertWithNode(inputPath, outputPath, ext, outputFormat);
        case 'ai':
          return { error: 'AI-based conversion requires a model. Use /code to convert manually.' };
        default:
          return { error: `Unknown converter: ${converter}` };
      }

      return { success: true, input: inputPath, output: outputPath, format: outputFormat };
    } catch (err) {
      return { success: false, error: err.message, suggestion: `Install ${converter} for this conversion` };
    }
  }

  _convertWithNode(input, output, fromExt, toFormat) {
    const data = fs.readFileSync(input, 'utf8');

    if (fromExt === '.csv' && toFormat === 'json') {
      const lines = data.split('\n').filter(Boolean);
      const headers = lines[0].split(',');
      const json = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
        return obj;
      });
      fs.writeFileSync(output, JSON.stringify(json, null, 2));
    } else if (fromExt === '.json' && toFormat === 'csv') {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json.length) {
        const headers = Object.keys(json[0]);
        const csv = [headers.join(','), ...json.map(row => headers.map(h => row[h] || '').join(','))].join('\n');
        fs.writeFileSync(output, csv);
      }
    } else if (fromExt === '.json' && toFormat === 'yaml') {
      const json = JSON.parse(data);
      const yaml = this._jsonToYaml(json);
      fs.writeFileSync(output, yaml);
    }

    return { success: true, input, output, format: toFormat };
  }

  _jsonToYaml(obj, indent = 0) {
    const prefix = '  '.repeat(indent);
    if (Array.isArray(obj)) {
      return obj.map(item => `${prefix}- ${typeof item === 'object' ? '\n' + this._jsonToYaml(item, indent + 1) : item}`).join('\n');
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj).map(([key, val]) => {
        if (typeof val === 'object') return `${prefix}${key}:\n${this._jsonToYaml(val, indent + 1)}`;
        return `${prefix}${key}: ${val}`;
      }).join('\n');
    }
    return `${prefix}${obj}`;
  }

  // ═══ CHART / GRAPH GENERATION ═══

  async generateChart(data, options = {}) {
    const type = options.type || 'bar'; // bar, line, pie, scatter
    const title = options.title || 'Chart';
    const width = options.width || 800;
    const height = options.height || 400;

    // Generate SVG chart
    let svg = '';
    const padding = 60;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    if (type === 'bar') {
      const maxVal = Math.max(...data.map(d => d.value));
      const barW = chartW / data.length * 0.8;
      const gap = chartW / data.length * 0.2;

      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="#1a1a2e"/>
        <text x="${width/2}" y="30" text-anchor="middle" fill="#FF0000" font-family="monospace" font-size="16">${title}</text>`;

      data.forEach((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = padding + i * (barW + gap) + gap / 2;
        const y = height - padding - barH;
        const color = `hsl(${(i * 360 / data.length)}, 70%, 50%)`;
        svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="2"/>
          <text x="${x + barW/2}" y="${height - padding + 20}" text-anchor="middle" fill="#888" font-family="monospace" font-size="10">${d.label}</text>
          <text x="${x + barW/2}" y="${y - 5}" text-anchor="middle" fill="#fff" font-family="monospace" font-size="10">${d.value}</text>`;
      });

      svg += '</svg>';
    } else if (type === 'pie') {
      const total = data.reduce((s, d) => s + d.value, 0);
      let startAngle = 0;
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(chartW, chartH) / 2 - 20;

      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="#1a1a2e"/>
        <text x="${cx}" y="30" text-anchor="middle" fill="#FF0000" font-family="monospace" font-size="16">${title}</text>`;

      data.forEach((d, i) => {
        const angle = (d.value / total) * 360;
        const endAngle = startAngle + angle;
        const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
        const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
        const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
        const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
        const largeArc = angle > 180 ? 1 : 0;
        const color = `hsl(${(i * 360 / data.length)}, 70%, 50%)`;

        svg += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" stroke="#1a1a2e" stroke-width="2"/>`;

        // Label
        const midAngle = startAngle + angle / 2;
        const labelX = cx + (r * 0.7) * Math.cos((midAngle * Math.PI) / 180);
        const labelY = cy + (r * 0.7) * Math.sin((midAngle * Math.PI) / 180);
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#fff" font-family="monospace" font-size="11">${d.label}</text>`;

        startAngle = endAngle;
      });

      svg += '</svg>';
    } else if (type === 'line') {
      const maxVal = Math.max(...data.map(d => d.value));
      const minVal = Math.min(...data.map(d => d.value));
      const range = maxVal - minVal || 1;

      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="#1a1a2e"/>
        <text x="${width/2}" y="30" text-anchor="middle" fill="#FF0000" font-family="monospace" font-size="16">${title}</text>`;

      const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * chartW;
        const y = height - padding - ((d.value - minVal) / range) * chartH;
        return `${x},${y}`;
      });

      svg += `<polyline points="${points.join(' ')}" fill="none" stroke="#FF0000" stroke-width="2"/>`;

      data.forEach((d, i) => {
        const x = padding + (i / (data.length - 1)) * chartW;
        const y = height - padding - ((d.value - minVal) / range) * chartH;
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#FF0000"/>
          <text x="${x}" y="${y - 10}" text-anchor="middle" fill="#fff" font-family="monospace" font-size="10">${d.value}</text>
          <text x="${x}" y="${height - padding + 20}" text-anchor="middle" fill="#888" font-family="monospace" font-size="10">${d.label}</text>`;
      });

      svg += '</svg>';
    }

    // Save SVG
    const svgPath = path.join(this.dataDir, `chart_${Date.now()}.svg`);
    fs.writeFileSync(svgPath, svg);

    // Try to convert to PNG
    let pngPath = null;
    try {
      pngPath = svgPath.replace('.svg', '.png');
      execSync(`rsvg-convert "${svgPath}" -o "${pngPath}"`, { timeout: 10000 });
    } catch {
      // Try sharp
      try {
        const sharp = require('sharp');
        const svgBuffer = Buffer.from(svg);
        await sharp(svgBuffer).png().toFile(pngPath);
      } catch {
        pngPath = null;
      }
    }

    return { success: true, svg: svgPath, png: pngPath, type, dataPoints: data.length };
  }

  // ═══ GIT OPERATIONS ═══

  async gitOperation(command, options = {}) {
    const cwd = options.cwd || process.cwd();
    const commands = {
      status: 'git status',
      log: 'git log --oneline -20',
      diff: 'git diff',
      branch: 'git branch -a',
      stash: 'git stash list',
      remote: 'git remote -v',
      tags: 'git tag -l',
      blame: options.file ? `git blame "${options.file}"` : 'git blame .',
      search: options.query ? `git log --all --grep="${options.query}" --oneline` : null,
      contributors: 'git shortlog -sn --all',
      filelog: options.file ? `git log --oneline --follow "${options.file}"` : null
    };

    const cmd = commands[command];
    if (!cmd) return { error: `Unknown git command: ${command}. Available: ${Object.keys(commands).join(', ')}` };

    try {
      const output = execSync(cmd, { cwd, encoding: 'utf8', timeout: 30000 });
      return { success: true, command, output: output.trim() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ DOCKER OPERATIONS ═══

  async dockerOperation(command, options = {}) {
    const commands = {
      ps: 'docker ps -a',
      images: 'docker images',
      volumes: 'docker volume ls',
      networks: 'docker network ls',
      stats: 'docker stats --no-stream',
      logs: options.container ? `docker logs --tail 50 ${options.container}` : null,
      inspect: options.container ? `docker inspect ${options.container}` : null,
      pull: options.image ? `docker pull ${options.image}` : null,
      stop: options.container ? `docker stop ${options.container}` : null,
      start: options.container ? `docker start ${options.container}` : null,
      remove: options.container ? `docker rm ${options.container}` : null,
      prune: 'docker system prune -f'
    };

    const cmd = commands[command];
    if (!cmd) return { error: `Unknown docker command: ${command}` };

    try {
      const output = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
      return { success: true, command, output: output.trim() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ SSH OPERATIONS ═══

  async sshCommand(host, command, options = {}) {
    const user = options.user || 'root';
    const port = options.port || 22;
    const key = options.key ? `-i "${options.key}"` : '';

    try {
      const output = execSync(`ssh ${key} -p ${port} -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${user}@${host} "${command}"`, {
        encoding: 'utf8', timeout: options.timeout || 30000
      });
      return { success: true, host, command, output: output.trim() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ DATABASE OPERATIONS ═══

  async queryDatabase(type, connectionString, query, options = {}) {
    try {
      if (type === 'sqlite') {
        const db = require('better-sqlite3')(connectionString);
        const result = db.prepare(query).all();
        db.close();
        return { success: true, rows: result, count: result.length };
      }

      if (type === 'postgres' || type === 'mysql') {
        // Use generic query via CLI
        const cmd = type === 'postgres'
          ? `psql "${connectionString}" -c "${query}" --csv`
          : `mysql -e "${query}"`;

        const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
        return { success: true, output: output.trim() };
      }

      return { error: `Database type '${type}' not supported. Use: sqlite, postgres, mysql` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ SPREADSHEET OPERATIONS ═══

  async createSpreadsheet(data, options = {}) {
    const headers = options.headers || (data.length > 0 ? Object.keys(data[0]) : []);
    const title = options.title || 'Sheet1';

    // Generate CSV
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = String(row[h] || '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');

    const csvPath = options.outputPath || path.join(this.dataDir, `spreadsheet_${Date.now()}.csv`);
    fs.writeFileSync(csvPath, csv);

    // Try to create XLSX if xlsx library is available
    let xlsxPath = null;
    try {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data.map(row => headers.map(h => row[h] || ''))]);
      XLSX.utils.book_append_sheet(wb, ws, title);
      xlsxPath = csvPath.replace('.csv', '.xlsx');
      XLSX.writeFile(wb, xlsxPath);
    } catch {}

    return { success: true, csv: csvPath, xlsx: xlsxPath, rows: data.length, columns: headers.length };
  }

  // ═══ EMAIL SENDING ═══

  async sendEmail(options = {}) {
    const { to, subject, body, html, attachments } = options;
    if (!to || !subject || (!body && !html)) {
      return { error: 'Required: to, subject, body (or html)' };
    }

    try {
      const nodemailer = require('nodemailer');
      const smtpConfig = this.config.get('email.smtp');
      if (!smtpConfig) return { error: 'SMTP not configured. Set email.smtp in settings.' };

      const transporter = nodemailer.createTransport(smtpConfig);
      const info = await transporter.sendMail({
        from: smtpConfig.from || smtpConfig.auth?.user,
        to, subject,
        text: body,
        html: html || body,
        attachments: attachments || []
      });

      return { success: true, messageId: info.messageId, to, subject };
    } catch (err) {
      return { success: false, error: err.message, suggestion: 'Install nodemailer: npm install nodemailer' };
    }
  }

  // ═══ HTTP/API TESTING ═══

  async httpRequest(url, options = {}) {
    try {
      const axios = require('axios');
      const method = options.method || 'GET';
      const resp = await axios({
        method,
        url,
        headers: options.headers || {},
        data: options.body || options.data,
        params: options.params,
        timeout: options.timeout || 30000,
        validateStatus: () => true // Don't throw on non-2xx
      });

      return {
        success: true,
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
        data: resp.data,
        duration: resp.headers['x-response-time'] || 'N/A'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ BASE64 / ENCODING ═══

  encode(text, format = 'base64') {
    const formats = {
      base64: Buffer.from(text).toString('base64'),
      hex: Buffer.from(text).toString('hex'),
      url: encodeURIComponent(text),
      html: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      binary: Buffer.from(text).toString('binary')
    };
    return { encoded: formats[format] || formats.base64, format };
  }

  decode(text, format = 'base64') {
    const formats = {
      base64: Buffer.from(text, 'base64').toString('utf8'),
      hex: Buffer.from(text, 'hex').toString('utf8'),
      url: decodeURIComponent(text),
      html: text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    };
    return { decoded: formats[format] || formats.base64, format };
  }

  // ═══ HASHING ═══

  hash(data, algorithm = 'sha256') {
    const crypto = require('crypto');
    return { hash: crypto.createHash(algorithm).update(data).digest('hex'), algorithm };
  }

  // ═══ UUID GENERATION ═══

  generateUUID(count = 1) {
    const crypto = require('crypto');
    const uuids = [];
    for (let i = 0; i < count; i++) {
      uuids.push(crypto.randomUUID());
    }
    return count === 1 ? uuids[0] : uuids;
  }

  // ═══ JSON OPERATIONS ═══

  jsonOperation(operation, data, options = {}) {
    switch (operation) {
      case 'parse':
        return JSON.parse(data);
      case 'stringify':
        return JSON.stringify(data, null, options.indent || 2);
      case 'validate':
        try { JSON.parse(data); return { valid: true }; }
        catch (e) { return { valid: false, error: e.message }; }
      case 'path': {
        const obj = typeof data === 'string' ? JSON.parse(data) : data;
        const parts = options.path.split('.');
        let current = obj;
        for (const part of parts) {
          if (current === undefined) return { value: undefined };
          current = current[part];
        }
        return { value: current };
      }
      case 'merge':
        return { ...data, ...options.mergeWith };
      default:
        return { error: `Unknown operation: ${operation}` };
    }
  }

  // ═══ CRYPTO OPERATIONS ═══

  async cryptoPrice(symbols = ['bitcoin', 'ethereum']) {
    try {
      const axios = require('axios');
      const ids = Array.isArray(symbols) ? symbols.join(',') : symbols;
      const resp = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, { timeout: 10000 });
      return { success: true, data: resp.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ WEATHER ═══

  async getWeather(city) {
    try {
      const axios = require('axios');
      const resp = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 10000 });
      const current = resp.data.current_condition?.[0];
      return {
        success: true,
        city,
        temp: current?.temp_C + '°C',
        feelsLike: current?.FeelsLikeC + '°C',
        description: current?.weatherDesc?.[0]?.value,
        humidity: current?.humidity + '%',
        wind: current?.windspeedKmph + ' km/h'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ═══ STATUS ═══
  getStatus() {
    return {
      dataDir: this.dataDir,
      filesGenerated: fs.existsSync(this.dataDir) ? fs.readdirSync(this.dataDir).length : 0
    };
  }
}

module.exports = UniversalToolkit;
