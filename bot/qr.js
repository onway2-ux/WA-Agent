const QRCode = require('qrcode');
const { writeData } = require('./firebase');

/**
 * Generate QR code from data string and upload base64 to Firebase RTDB
 * @param {string} qr 
 */
async function generateAndUploadQR(qr) {
  try {
    console.log('Generating QR Code for WhatsApp...');
    
    // Convert QR to base64 for Admin Dashboard
    const base64QR = await QRCode.toDataURL(qr);
    await writeData('/bot/qr', base64QR);
    await writeData('/bot/status', 'waiting_scan');
    console.log('QR Code base64 string uploaded to Firebase at /bot/qr');

    // Print QR to terminal for GitHub Actions debugging
    console.log('--- SCAN THE QR CODE BELOW ---');
    const terminalQR = await QRCode.toString(qr, { type: 'terminal', small: true });
    console.log(terminalQR);
    console.log('------------------------------');
    console.log('Wait for scan... Bot will stay alive for at least 5 minutes after this generation.');
    
  } catch (error) {
    console.error('Error generating/uploading QR code:', error);
  }
}

module.exports = {
  generateAndUploadQR
};
