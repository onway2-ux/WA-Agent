const admin = require('firebase-admin');

// User will add their own Firebase Admin SDK JSON credentials via environment variable
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

/**
 * Read data from a specific RTDB path
 * @param {string} path 
 * @returns {Promise<any>}
 */
async function readData(path) {
  try {
    const snapshot = await db.ref(path).once('value');
    return snapshot.val();
  } catch (error) {
    console.error(`Error reading from ${path}:`, error);
    return null;
  }
}

/**
 * Write data to a specific RTDB path
 * @param {string} path 
 * @param {any} value 
 */
async function writeData(path, value) {
  try {
    await db.ref(path).set(value);
  } catch (error) {
    console.error(`Error writing to ${path}:`, error);
  }
}

/**
 * Push data to a specific RTDB array path
 * @param {string} path 
 * @param {any} value 
 */
async function pushData(path, value) {
  try {
    await db.ref(path).push(value);
  } catch (error) {
    console.error(`Error pushing to ${path}:`, error);
  }
}

module.exports = {
  db,
  readData,
  writeData,
  pushData
};
