const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://whatsthemove-9cfbb-default-rtdb.firebaseio.com",
});

const db = admin.database();

module.exports = { db };
