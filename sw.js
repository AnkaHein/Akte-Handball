"use strict";

// Bei jeder neuen Version die Nummer erhöhen, damit das iPad die neuen Dateien holt.
const VERSION = "akte-handball-0.1.0";
const DATEIEN = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "img/hintergrund.jpg",
  "img/kachel-deutsch.jpg",
  "img/kachel-englisch.jpg",
  "img/kachel-mathe.jpg",
  "img/trikot.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(treffer => treffer || fetch(e.request))
  );
});
