const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { writeData, readData } = require('./firebase');
const { handleMessage } = require('./handler');

/**
 * Initialize WhatsApp connection using whatsapp-web.js
 */
async function connectToWhatsApp() {
  console.log('Bot connection process started using whatsapp-web.js...');

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: '.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    }
  });

  // INITIALIZE FIREBASE RTDB STRUCTURE (if not exists)
  console.log('Checking Firebase RTDB structure...');
  const configExists = await readData('/config');
  if (!configExists) {
    console.log('Initializing Firebase RTDB structure with defaults...');
    await writeData('/config', {
      welcomeMessage: "Hello! Welcome to our business.",
      businessInfo: "We provide professional services with excellence.",
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

  // QR EVENT
  client.on('qr', async (qr) => {
    console.log('WhatsApp QR event detected.');
    
    // Print QR in terminal
    qrcodeTerminal.generate(qr, { small: true });
    
    // Convert QR to base64 for Admin Dashboard
    try {
      const base64QR = await QRCode.toDataURL(qr);
      await writeData('/bot/qr', base64QR);
      await writeData('/bot/status', 'waiting_scan');
      console.log("QR Code generated and saved to Firebase!");
    } catch (err) {
      console.error('Error generating base64 QR:', err);
    }
  });

  // READY EVENT
  client.on('ready', async () => {
    console.log("WhatsApp bot connected successfully!");
    await writeData('/bot/status', 'connected');
    await writeData('/bot/qr', null);
  });

  // DISCONNECTED EVENT
  client.on('disconnected', async (reason) => {
    console.log("Bot disconnected!", reason);
    await writeData('/bot/status', 'disconnected');
  });

  // MESSAGE EVENT
  client.on('message', async (msg) => {
    console.log('New message event detected.');
    await handleMessage(msg);
  });

  // AUTH FAILURE
  client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
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

  // KEEP PROCESS ALIVE
  setInterval(async () => {
    const status = await readData('/bot/status');
    console.log(`Keep-alive check: Current status is "${status}"`);
  }, 60000);

  // Initialize the client
  client.initialize();
}

// Start the bot
connectToWhatsApp().catch(err => {
  console.error('Failed to start bot:', err);
});
