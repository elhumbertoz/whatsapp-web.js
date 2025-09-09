'use strict';

const http = require('http');
const url = require('url');
const { Client, LocalAuth } = require('./index');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Estado para compartir QR y estado actual con nuevos suscriptores SSE
let latestQr = null;
let latestStatus = 'inicializando';

// Cliente actual
let client = null;

function attachClientEvents(instance) {
	instance.on('loading_screen', (percent, message) => {
		latestStatus = `cargando: ${percent}% ${message || ''}`;
		// eslint-disable-next-line no-console
		console.log('LOADING SCREEN', percent, message);
		broadcastSse({ type: 'status', data: latestStatus });
	});

	instance.on('qr', (qr) => {
		latestQr = qr;
		latestStatus = 'qr_recibido';
		// eslint-disable-next-line no-console
		console.log('QR RECEIVED', qr ? `${qr.substring(0, 20)}...` : 'null');
		broadcastSse({ type: 'qr', data: qr });
	});

	instance.on('code', (code) => {
		latestStatus = 'codigo_empate';
		// eslint-disable-next-line no-console
		console.log('Pairing code:', code);
		broadcastSse({ type: 'code', data: code });
	});

	instance.on('authenticated', () => {
		latestStatus = 'autenticado';
		// eslint-disable-next-line no-console
		console.log('AUTHENTICATED');
		broadcastSse({ type: 'status', data: 'AUTHENTICATED' });
	});

	instance.on('auth_failure', (msg) => {
		latestStatus = 'falla_autenticacion';
		// eslint-disable-next-line no-console
		console.error('AUTHENTICATION FAILURE', msg);
		broadcastSse({ type: 'status', data: `AUTH_FAILURE: ${msg}` });
	});

	instance.on('ready', () => {
		latestStatus = 'listo';
		latestQr = null;
		// eslint-disable-next-line no-console
		console.log('READY');
		broadcastSse({ type: 'status', data: 'READY' });
		// Adjuntar listeners de la página para depuración
		if (instance.pupPage) {
			instance.pupPage.on('pageerror', function (err) {
				// eslint-disable-next-line no-console
				console.log('Page error:', err && err.toString ? err.toString() : err);
			});
			instance.pupPage.on('error', function (err) {
				// eslint-disable-next-line no-console
				console.log('Page error:', err && err.toString ? err.toString() : err);
			});
			instance.pupPage.on('requestfailed', (request) => {
				// eslint-disable-next-line no-console
				console.log('Request failed:', request.url(), request.failure() && request.failure().errorText);
			});
			instance.pupPage.on('response', (response) => {
				if (!response.ok()) {
					// eslint-disable-next-line no-console
					console.log('HTTP error response:', response.status(), response.url());
				}
			});
			// Log versión de WhatsApp Web
			instance.getWWebVersion().then((v) => {
				// eslint-disable-next-line no-console
				console.log(`WWebVersion = ${v}`);
			}).catch(() => {});
		}
	});

	instance.on('disconnected', (reason) => {
		// eslint-disable-next-line no-console
		console.log('Client was logged out', reason);
		broadcastSse({ type: 'status', data: `DISCONNECTED: ${reason}` });
	});

	instance.on('change_state', state => {
		// eslint-disable-next-line no-console
		console.log('CHANGE STATE', state);
	});
}

async function startClient({ fresh } = {}) {
	latestQr = null;
	latestStatus = 'inicializando';

	if (client) {
		try { await client.destroy(); } catch (_) {}
		client = null;
	}

	// Si fresh es true, usamos un nuevo clientId para garantizar QR limpio
	const auth = fresh ? new LocalAuth({ clientId: `fresh-${Date.now()}` }) : new LocalAuth();

	client = new Client({
		authStrategy: auth,
		puppeteer: {
			headless: false
		}
	});

	attachClientEvents(client);
	client.initialize();
    console.log('Cliente iniciado');
}

// Iniciar el cliente por primera vez (puede no emitir QR si ya hay sesión)
startClient().catch(() => {});

// Lista de clientes SSE conectados
const sseClients = new Set();

function broadcastSse(message) {
	const data = `data: ${JSON.stringify(message)}\n\n`;
	for (const res of sseClients) {
		try { res.write(data); } catch (_) { /* noop */ }
	}
}

function handleSse(req, res) {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*'
	});

	// Enviar estado inicial al conectar
	if (latestStatus) {
		res.write(`data: ${JSON.stringify({ type: 'status', data: latestStatus })}\n\n`);
	}
	if (latestQr) {
		res.write(`data: ${JSON.stringify({ type: 'qr', data: latestQr })}\n\n`);
	}

	sseClients.add(res);
	req.on('close', () => {
		sseClients.delete(res);
	});
}

function handleGetQrPage(res) {
	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WhatsApp QR</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f7f7f7; color: #111; }
    .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    h1 { font-size: 20px; margin: 0 0 12px; }
    #status { margin: 8px 0 16px; color: #555; }
    #qr { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 320px; background: #fafafa; border: 1px dashed #ddd; border-radius: 8px; }
    canvas { image-rendering: pixelated; }
    .hint { margin-top: 12px; font-size: 13px; color: #666; }
    #testForm { display:none; margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; }
    #testForm label { display:block; margin: 8px 0 4px; }
    #testForm input, #testForm textarea { width:100%; box-sizing: border-box; padding:8px; }
    #result { margin-top: 8px; font-size: 13px; color: #333; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <script>
    function setStatus(text) {
      const el = document.getElementById('status');
      el.textContent = text;
    }
    function hideQr() {
      const container = document.getElementById('qr');
      container.innerHTML = '';
      container.style.display = 'none';
      const btn = document.getElementsByTagName('button')[0];
      if (btn) btn.style.display = 'none';
    }
    function showTestForm() {
      const form = document.getElementById('testForm');
      if (form) form.style.display = 'block';
    }
    async function sendTest() {
      const rawPhone = (document.getElementById('phone').value || '').trim();
      const phone = rawPhone.replace(/\D/g, '');
      const text = (document.getElementById('message').value || '').trim();
      const result = document.getElementById('result');
      if (!phone || phone.length < 8 || phone.length > 15) {
        result.textContent = 'Teléfono inválido. Usa formato internacional sin +.';
        return;
      }
      if (!text) {
        result.textContent = 'Escribe un mensaje.';
        return;
      }
      result.textContent = 'Enviando...';
      try {
        const resp = await fetch('/auth/testsend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, text })
        });
        const data = await resp.json();
        if (resp.ok && data && data.ok) {
          result.textContent = 'Enviado. id=' + (data.id || 'N/A');
        } else {
          result.textContent = 'Fallo: ' + ((data && (data.error || data.message)) || 'Error');
        }
      } catch (e) {
        result.textContent = 'Error al enviar: ' + (e && e.message ? e.message : e);
      }
    }
    async function renderQr(text) {
      const container = document.getElementById('qr');
      container.innerHTML = '';
      try {
        if (typeof QRCode !== 'undefined' && QRCode && typeof QRCode.toCanvas === 'function') {
          const canvas = document.createElement('canvas');
          container.appendChild(canvas);
          await QRCode.toCanvas(canvas, text, { width: 300, margin: 2 });
        } else {
          // Fallback sin librerías: usar un servicio externo para generar la imagen del QR
          const img = document.createElement('img');
          img.width = 300;
          img.height = 300;
          img.alt = 'QR code';
          img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(text);
          container.appendChild(img);
        }
      } catch (e) {
        // Fallback final en caso de error
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = text;
        container.appendChild(pre);
      }
    }
    async function forceNewQr() {
      try {
        setStatus('Reiniciando sesión y solicitando nuevo QR...');
        await fetch('/auth/getqr/new');
      } catch (e) { console.error(e); }
    }
    async function doLogout() {
      try {
        setStatus('Cerrando sesión...');
        const resp = await fetch('/auth/logout');
        const data = await resp.json().catch(() => ({}));
        setStatus(data && data.ok ? 'Sesión cerrada' : 'Sesión cerrada');
      } catch (e) { console.error(e); }
    }
    window.addEventListener('DOMContentLoaded', () => {
      setStatus('Conectando con el servicio...');
      const es = new EventSource('/auth/getqr/stream');
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'qr') {
            setStatus('Escanea el código QR con WhatsApp.');
            renderQr(msg.data);
          } else if (msg.type === 'status') {
            const s = String(msg.data);
            setStatus(s);
            if (s === 'READY') {
              hideQr();
              es.close();
              showTestForm();
            }
          } else if (msg.type === 'code') {
            setStatus('Código de emparejamiento: ' + msg.data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      es.onerror = () => setStatus('Conexión perdida, reintentando...');
    });
  </script>
  </head>
  <body>
    <div class="container">
      <h1>Conectar WhatsApp</h1>
      <div id="status">Cargando...</div>
      <p>
        <button id="btn-new" onclick="forceNewQr()">Forzar nuevo QR</button>
        <button id="btn-logout" onclick="doLogout()" style="margin-left:8px">Cerrar sesión</button>
      </p>
      <div id="qr">Esperando QR...</div>
      <div class="hint">Abre WhatsApp » Dispositivos vinculados » Vincular dispositivo y escanea el QR.</div>
      <div id="testForm">
        <h2>Prueba de envío de mensaje</h2>
        <label>Teléfono (formato internacional, sin +, ej. 593XXXXXXXXX)</label>
        <input id="phone" placeholder="593xxxxxxxxx" />
        <label>Mensaje</label>
        <textarea id="message" rows="3" placeholder="Escribe tu mensaje..."></textarea>
        <p><button onclick="sendTest()">Enviar</button></p>
        <div id="result"></div>
      </div>
    </div>
  </body>
</html>`;

	res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
	res.end(html);
}

const server = http.createServer((req, res) => {
	const parsed = url.parse(req.url, true);
	const method = req.method || 'GET';
    
    if (method === 'POST' && parsed.pathname === '/auth/testsend') {
        let body = '';
        req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.socket.destroy(); });
        req.on('end', async () => {
            try {
                const { phone: rawPhone, text } = JSON.parse(body || '{}');
                const phone = String(rawPhone || '').replace(/\D/g, '');
                if (!client) throw new Error('Cliente no inicializado');
                if (!phone || phone.length < 8 || phone.length > 15) throw new Error('Teléfono inválido');
                const chatId = `${phone}@c.us`;
                const result = await client.sendMessage(chatId, text);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ ok: true, id: result && result.id && result.id._serialized }));
            } catch (e) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ ok: false, error: e && e.message ? e.message : String(e) }));
            }
        });
        return;
    }

	if (method === 'GET' && parsed.pathname === '/auth/getqr') {
		return handleGetQrPage(res);
	}

	if (method === 'GET' && parsed.pathname === '/auth/getqr/stream') {
		return handleSse(req, res);
	}

	if (method === 'GET' && parsed.pathname === '/auth/getqr/new') {
		startClient({ fresh: true }).catch(() => {});
		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		return res.end(JSON.stringify({ ok: true }));
	}

	if (method === 'GET' && parsed.pathname === '/auth/logout') {
		(async () => {
			try {
				if (client) await client.logout();
			} catch (_) {}
			client = null;
			latestQr = null;
			latestStatus = 'cerrado';
			broadcastSse({ type: 'status', data: 'LOGGED_OUT' });
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ ok: true }));
		})();
		return;
	}

	res.statusCode = 404;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Servidor QR escuchando en http://localhost:${PORT}/auth/getqr`);
});


