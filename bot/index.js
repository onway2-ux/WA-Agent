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
    printQRInTerminal: false, // We'll handle this ourselves in qr.js for better control
    logger
  });

  console.log('Bot connection process started...');

  // INITIALIZE FIREBASE RTDB STRUCTURE (if not exists)
  console.log('Checking Firebase RTDB structure...');
  const configExists = await readData('/config');
  if (!configExists) {
    console.log('Initializing Firebase RTDB structure with defaults...');
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
  } else {
    console.log('Firebase RTDB structure found.');
  }

  // CONNECTION EVENTS
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR EVENT
    if (qr) {
      console.log('WhatsApp QR event detected.');
      await generateAndUploadQR(qr);
      
      // Keep process alive for at least 5 minutes to allow for scan
      console.log('QR waiting scan. Bot will stay active...');
    }

    // CONNECTION SUCCESS
    if (connection === 'open') {
      console.log('WhatsApp connection successfully opened!');
      await writeData('/bot/status', 'connected');
      await writeData('/bot/qr', null);
      console.log('Bot status updated to connected.');
    }

    // CONNECTION CLOSE
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnect recommended:', shouldReconnect);
      await writeData('/bot/status', 'disconnected');

      // Attempt reconnect once
      if (shouldReconnect) {
        console.log('Attempting to reconnect in 5 seconds...');
        setTimeout(() => connectToWhatsApp(), 5000);
      } else {
        console.log('Logged out or fatal error. Please restart manually.');
      }
    }
  });

  // SAVE CREDS ON UPDATE
  sock.ev.on('creds.update', async () => {
    console.log('Auth credentials updated.');
    await saveCreds();
  });

  // MESSAGE EVENT
  sock.ev.on('messages.upsert', async (m) => {
    console.log('New message event detected.');
    await handleMessage(sock, m);
  });

  // HEARTBEAT (Update /bot/lastSeen every 30 seconds)
  setInterval(async () => {
    try {
      console.log('Heartbeat: Updating lastSeen timestamp...');
      await writeData('/bot/lastSeen', Date.now());
    } catch (error) {
      console.error('Heartbeat update failed:', error);
    }
  }, 30000);

  // KEEP PROCESS ALIVE (Prevent GitHub Actions from exiting too early)
  // Check every 1 minute if we are still connected or waiting for QR
  setInterval(async () => {
    const status = await readData('/bot/status');
    console.log(`Keep-alive check: Current status is "${status}"`);
  }, 60000);
}

// Start the bot
connectToWhatsApp().catch(err => {
  console.error('Failed to start bot:', err);
});
