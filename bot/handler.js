const { readData, db } = require('./firebase');

/**
 * Handle incoming WhatsApp messages using whatsapp-web.js
 * @param {object} msg - whatsapp-web.js message object
 */
async function handleMessage(msg) {
  const sender = msg.from;
  const text = msg.body || "";

  // Ignore group messages
  if (sender.endsWith('@g.us')) return;

  // Ignore messages from the bot itself (if applicable)
  // whatsapp-web.js doesn't easily provide fromMe on incoming events like Baileys, 
  // but we can check the sender if needed.

  console.log(`Received message from ${sender}: ${text}`);

  try {
    // Read config from Firebase
    const config = await readData('/config') || {};
    const { 
      welcomeMessage = "Hello! Welcome to our business.", 
      businessInfo = "We provide quality services.", 
      services = [], 
      qna = []
    } = config;

    let response = "";
    const lowerText = text.toLowerCase().trim();

    // 1. COMMAND SYSTEM
    if (["hi", "hello", "start", "salam"].includes(lowerText)) {
      response = welcomeMessage;
    } else if (["services", "menu", "price"].includes(lowerText)) {
      if (services.length > 0) {
        response = "*Our Services:*\n\n" + services.map((s, i) => 
          `${i + 1}. *${s.name}* - ${s.price}\n   ${s.description}`
        ).join('\n\n');
      } else {
        response = "We don't have any services listed right now. Please check back later.";
      }
    } else if (["info", "about", "introduction"].includes(lowerText)) {
      response = businessInfo;
    } else if (["help", "commands"].includes(lowerText)) {
      response = "*Available Commands:*\n" +
                 "hi/hello — Welcome message\n" +
                 "services — View all services & prices\n" +
                 "info — About this business\n" +
                 "help — Show this menu";
    } else {
      // 2. Q&A MATCHING (Case-insensitive, partial)
      const matchedQna = qna.find(q => lowerText.includes(q.question.toLowerCase()));
      
      if (matchedQna) {
        response = matchedQna.answer;
      } else {
        // 3. FALLBACK
        response = "Sorry, I didn't understand. Type 'help' to see available commands.";
      }
    }

    // Send the response
    if (response) {
      await msg.reply(response);
      
      // LOG TO FIREBASE (Limit to last 100 entries)
      const logEntry = {
        from: sender,
        message: text,
        timestamp: Date.now(),
        response: response
      };
      
      const logsRef = db.ref('/logs/messages');
      const newLogRef = logsRef.push();
      await newLogRef.set(logEntry);

      // Keep only last 100 entries
      logsRef.once('value', (snapshot) => {
        const logs = snapshot.val();
        if (logs && Object.keys(logs).length > 100) {
          const keys = Object.keys(logs).sort();
          const toDelete = keys.slice(0, keys.length - 100);
          toDelete.forEach(key => logsRef.child(key).remove());
        }
      });
    }

  } catch (error) {
    console.error('Error handling message:', error);
  }
}

module.exports = {
  handleMessage
};
