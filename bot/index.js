const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { writeData, readData, db } = require('./firebase');
const { generateAndUploadQR } = require('./qr');
const { handleMessage } = require('./handler');

// Set pino logger to silent
const logger = pino({ level: 'silent' });

/**
 * Initialize WhatsApp connection using Baileys
 */
async function connectToWhatsApp() {
  // Use multi-file auth state for persistence
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger
  });

  // INITIALIZE FIREBASE RTDB STRUCTURE (if not exists)
  const configExists = await readData('/config');
  if (!configExists) {
    console.log('Initializing Firebase RTDB structure...');
    await writeData('/config', {
      welcomeMessage: "Hello! Welcome to our business.",
      businessInfo: "We provide professional services with excellence.",
      aiEnabled: true,
      aiPersonality: "Be helpful, friendly, and professional.",
      services: [
        { name: "Consultation", price: "$50", description: "Get professional advice for your business." }
      ],
      qna: [
        { question: "working hours", answer: "Our working hours are 9 AM to 6 PM, Monday to Friday." }
      ]
    });
    await writeData('/bot', {
      status: "disconnected",
      qr: null,
      lastSeen: 0
    });
  }

  // CONNECTION EVENTS
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR EVENT
    if (qr) {
      await generateAndUploadQR(qr);
    }

    // CONNECTION SUCCESS
    if (connection === 'open') {
      console.log('WhatsApp connection successfully opened!');
      await writeData('/bot/status', 'connected');
      await writeData('/bot/qr', null);
    }

    // CONNECTION CLOSE
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting...', shouldReconnect);
      await writeData('/bot/status', 'disconnected');

      // Attempt reconnect once
      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    }
  });

  // SAVE CREDS ON UPDATE
  sock.ev.on('creds.update', saveCreds);

  // MESSAGE EVENT
  sock.ev.on('messages.upsert', async (m) => {
    await handleMessage(sock, m);
  });

  // HEARTBEAT (Update /bot/lastSeen every 30 seconds)
  setInterval(async () => {
    try {
      await writeData('/bot/lastSeen', Date.now());
    } catch (error) {
      console.error('Heartbeat update failed:', error);
    }
  }, 30000);

  // KEEP PROCESS ALIVE
  setInterval(() => {
    // console.log('Process alive...');
  }, 1000 * 60 * 60); // Log once an hour if needed
}

// Start the bot
connectToWhatsApp().catch(err => {
  console.error('Failed to start bot:', err);
});
