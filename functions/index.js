// functions/index.js
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase!");
});