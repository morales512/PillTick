importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCJBsxnJQyFb5KNK35BhHNqnbHRJlksptw",
  authDomain: "pilltick-b8213.firebaseapp.com",
  projectId: "pilltick-b8213",
  storageBucket: "pilltick-b8213.firebasestorage.app",
  messagingSenderId: "221398812448",
  appId: "1:221398812448:web:59981bacd8d42a1fc53945"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png" // opcional
  });
});
