const QRCode = require('qrcode');
const { writeData } = require('./firebase');

/**
 * Generate QR code from data string and upload base64 to Firebase RTDB
 * @param {string} qr 
 */
async function generateAndUploadQR(qr) {
  try {
    const base64QR = await QRCode.toDataURL(qr);
    await writeData('/bot/qr', base64QR);
    await writeData('/bot/status', 'waiting_scan');
    console.log('QR Code generated and uploaded to Firebase');
  } catch (error) {
    console.error('Error generating/uploading QR code:', error);
  }
}

module.exports = {
  generateAndUploadQR
};
