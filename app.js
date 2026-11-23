"use strict";

/* ---------- Speicher (nur auf diesem Gerät) ---------- */
const KEY = "akteHandball.v1";
const FAECHER = { deutsch: "Deutsch", englisch: "Englisch", mathe: "Mathe" };

// Jedes Fach-Modul (z. B. mathe.js) trägt hier seine Aufträge ein.
window.AUFTRAEGE = { deutsch: [], englisch: [], mathe: [] };

function ladeFortschritt() {
  try {
    const roh = localStorage.getItem(KEY);
    if (roh) {
      const p = JSON.parse(roh);
      return { erledigt: p.erledigt || {} };
    }
  } catch (e) { /* Speicher nicht verfügbar */ }
  return { erledigt: {} };
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

function anzahlAuftraege(fach) {
  const n = window.AUFTRAEGE[fach].length;
  return n > 0 ? n : 3;
}
function anzahlErledigt(fach) {
  return window.AUFTRAEGE[fach].filter(a => fortschritt.erledigt[a.id]).length;
}
function sterneText(fach) {
  const gesamt = anzahlAuftraege(fach);
  const n = anzahlErledigt(fach);
  return "★".repeat(n) + "☆".repeat(Math.max(0, gesamt - n));
}

function zeichneSterne() {
  document.querySelectorAll("[data-stars]").forEach(el => {
    el.textContent = sterneText(el.dataset.stars);
  });
}

/* ---------- Fach-Seite mit Aufträgen ---------- */
let aktuellesFach = null;

function zeigeFach(fach) {
  aktuellesFach = fach;
  document.getElementById("fach-title").textContent = FAECHER[fach];
  const liste = document.getElementById("auftrag-liste");
  liste.innerHTML = "";
  const auftraege = window.AUFTRAEGE[fach];

  if (!auftraege.length) {
    const p = document.createElement("p");
    p.className = "soon";
    p.textContent = "Dieser Auftrag kommt bald. 🕵️";
    liste.appendChild(p);
  } else {
    auftraege.forEach((a, i) => {
      const b = document.createElement("button");
      b.className = "auftrag" + (fortschritt.erledigt[a.id] ? " erledigt" : "");
      b.innerHTML =
        '<span class="auftrag-nr">' + (i + 1) + '</span>' +
        '<span class="auftrag-icon">' + a.icon + '</span>' +
        '<span class="auftrag-text"><b>' + a.titel + '</b><small>' + a.untertitel + '</small></span>' +
        '<span class="auftrag-stern">' + (fortschritt.erledigt[a.id] ? "★" : "☆") + '</span>';
      b.addEventListener("click", () => a.start());
      liste.appendChild(b);
    });
  }
  zeige("view-fach");
}

/* ---------- Schnittstelle für die Fach-Module ---------- */
window.App = {
  zeige,
  sprich,
  zeigeFach,
  aktuellesFach: () => aktuellesFach,
  istErledigt: id => !!fortschritt.erledigt[id],
  markiereErledigt(id) {
    fortschritt.erledigt[id] = true;
    speichereFortschritt();
  }
};

/* ---------- Bedienung ---------- */
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
  t.addEventListener("click", () => zeigeFach(t.dataset.fach));
});
document.getElementById("back-fach").addEventListener("click", () => {
  zeichneSterne();
  zeige("view-akte");
});
document.getElementById("speak-fach").addEventListener("click", () => {
  sprich(window.AUFTRAEGE[aktuellesFach].length ? "Wähle einen Auftrag." : "Dieser Auftrag kommt bald.");
});

zeichneSterne();

/* ---------- Offline (PWA) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* nicht schlimm */ });
  });
}
