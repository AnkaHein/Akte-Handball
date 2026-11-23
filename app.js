"use strict";

/* ---------- Speicher (nur auf diesem Gerät) ---------- */
const KEY = "akteHandball.v1";
const FAECHER = { deutsch: "Deutsch", englisch: "Englisch", mathe: "Mathe" };

function ladeFortschritt() {
  try {
    const roh = localStorage.getItem(KEY);
    if (roh) return JSON.parse(roh);
  } catch (e) { /* Speicher nicht verfügbar */ }
  return { sterne: { deutsch: 0, englisch: 0, mathe: 0 } };
}
let fortschritt = ladeFortschritt();

function speichereFortschritt() {
  try { localStorage.setItem(KEY, JSON.stringify(fortschritt)); } catch (e) { /* egal */ }
}

/* ---------- Vorlesen (Sprachausgabe des iPad) ---------- */
let stimmen = [];
function ladeStimmen() {
  if ("speechSynthesis" in window) stimmen = window.speechSynthesis.getVoices();
}
if ("speechSynthesis" in window) {
  ladeStimmen();
  window.speechSynthesis.onvoiceschanged = ladeStimmen;
}

function sprich(text, sprache) {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = sprache || "de-DE";
  const passend = stimmen.find(v => v.lang === u.lang) ||
                  stimmen.find(v => v.lang.startsWith(u.lang.slice(0, 2)));
  if (passend) u.voice = passend;
  u.rate = 0.9;
  synth.speak(u);
}

/* ---------- Ansichten ---------- */
function zeige(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function zeichneSterne() {
  document.querySelectorAll("[data-stars]").forEach(el => {
    const fach = el.dataset.stars;
    const n = Math.max(0, Math.min(3, (fortschritt.sterne && fortschritt.sterne[fach]) || 0));
    el.textContent = "★".repeat(n) + "☆".repeat(3 - n);
  });
}

document.getElementById("btn-start").addEventListener("click", () => {
  zeichneSterne();
  zeige("view-akte");
  sprich("Wähle einen Auftrag.");
});
document.getElementById("speak-start").addEventListener("click", () => {
  sprich("Akte Handball. Detektiv Ben ermittelt. Tippe auf Fall starten.");
});
document.getElementById("back-akte").addEventListener("click", () => zeige("view-start"));
document.getElementById("speak-akte").addEventListener("click", () => {
  sprich("Wähle einen Auftrag. Deutsch, Englisch oder Mathe.");
});

document.querySelectorAll(".tile").forEach(t => {
  t.addEventListener("click", () => {
    const fach = t.dataset.fach;
    document.getElementById("fach-title").textContent = FAECHER[fach];
    zeige("view-fach");
  });
});
document.getElementById("back-fach").addEventListener("click", () => {
  zeichneSterne();
  zeige("view-akte");
});

zeichneSterne();

/* ---------- Offline (PWA) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* nicht schlimm */ });
  });
}
