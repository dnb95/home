importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAP5gV1yUVEKnd_x3RkqyxYwF7vpnROgR0",
  projectId: "tstmg-1",
  messagingSenderId: "626888970289",
  appId: "1:626888970289:web:23880053888f3dd1a88510"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'DnB Reviz';
  const options = {
    body: payload.notification?.body || '',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/4/48/DnB_website.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});


self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.click_action || '#page-accueil';
  event.waitUntil(clients.openWindow(url));
});
