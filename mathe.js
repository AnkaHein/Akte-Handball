"use strict";

/* Mathe: schriftlich untereinander, Zahlenraum bis 1000.
   Ben rechnet auf einem Blatt und gibt das Ergebnis ein.
   Stufe 1: Plus ohne Übertrag, Minus ohne Entbündeln. */
(function () {
  const ANZAHL = 6;
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  // Schwierigkeit pro Aufgabe: [Stellen erste Zahl, Stellen zweite Zahl]
  const STUFEN = [[2, 1], [2, 2], [3, 2], [3, 2], [3, 3], [3, 3]];

  const wert = st => st[0] + st[1] * 10 + st[2] * 100;

  function genPlus(i) {
    const [na, nb] = STUFEN[i];
    const a = [0, 0, 0], b = [0, 0, 0];
    for (let p = na - 1; p >= 0; p--) {
      const hatB = p < nb;
      const bFuehrend = hatB && p === nb - 1;
      a[p] = rnd(p === na - 1 ? 1 : 0, bFuehrend ? 8 : 9);
      if (hatB) b[p] = rnd(bFuehrend ? 1 : 0, 9 - a[p]);
    }
    const A = wert(a), B = wert(b);
    return { op: "+", a: A, b: B, ergebnis: A + B, aSt: a, bSt: b };
  }

  function genMinus(i) {
    const [na, nb] = STUFEN[i];
    const a = [0, 0, 0], b = [0, 0, 0];
    for (let p = na - 1; p >= 0; p--) {
      const hatB = p < nb;
      const bFuehrend = hatB && p === nb - 1;
      let aMin = p === na - 1 ? 1 : 0;
      if (bFuehrend) aMin = Math.max(aMin, 1);
      a[p] = rnd(aMin, 9);
      if (hatB) b[p] = rnd(bFuehrend ? 1 : 0, a[p]);
    }
    const A = wert(a), B = wert(b);
    return { op: "-", a: A, b: B, ergebnis: A - B, aSt: a, bSt: b };
  }

  // Reihenfolge von Plus und Minus: unregelmäßig, nicht streng abwechselnd
  function mischeOps() {
    let ops;
    do {
      ops = ["+", "+", "+", "-", "-", "-"];
      for (let i = ops.length - 1; i > 0; i--) {
        const j = rnd(0, i);
        [ops[i], ops[j]] = [ops[j], ops[i]];
      }
    } while (ops.every((o, i) => i === 0 || o !== ops[i - 1]));
    return ops;
  }

  function erzeugeAufgaben(modus) {
    const ops = modus === "plus" ? Array(ANZAHL).fill("+")
              : modus === "minus" ? Array(ANZAHL).fill("-")
              : mischeOps();
    const gesehen = new Set();
    return ops.map((op, i) => {
      let t, versuche = 0;
      do {
        t = op === "+" ? genPlus(i) : genMinus(i);
        versuche++;
      } while ((t.ergebnis < 1 || gesehen.has(t.a + op + t.b)) && versuche < 50);
      gesehen.add(t.a + op + t.b);
      return t;
    });
  }

  /* ---------- Zustand ---------- */
  let st = null;

  function start(auftrag) {
    st = {
      auftrag,
      aufgaben: erzeugeAufgaben(auftrag.modus),
      idx: 0,
      fehler: 0,
      eingaben: {},
      aktiv: 0,
      gesperrt: false,
      hilfe: false
    };
    baueGeruest();
    zeichne();
    App.zeige("view-aufgabe");
  }

  const root = () => document.getElementById("aufgabe-root");
  const el = id => document.getElementById(id);

  function baueGeruest() {
    root().innerHTML =
      '<header class="akte-head">' +
        '<button class="btn-back" id="m-zurueck" aria-label="Zurück">←</button>' +
        '<div class="akte-title">' +
          '<span class="akte-label">Mathe · ' + st.auftrag.titel + '</span>' +
          '<h2>Rechne auf deinem Blatt</h2>' +
        '</div>' +
        '<button class="btn-speak" id="m-sprich" aria-label="Vorlesen">🔊</button>' +
      '</header>' +
      '<div class="punkte" id="m-punkte"></div>' +
      '<div class="aufgabe-layout">' +
        '<section class="zettel" id="m-zettel"></section>' +
        '<section class="eingabe">' +
          '<div class="meldung" id="m-meldung"></div>' +
          '<div class="tastatur" id="m-tastatur"></div>' +
          '<button class="btn btn-weiter" id="m-weiter" hidden>Weiter →</button>' +
        '</section>' +
      '</div>';

    const tast = el("m-tastatur");
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "loeschen", "0", "pruefen"].forEach(k => {
      const b = document.createElement("button");
      b.className = "taste" + (k === "loeschen" ? " taste-loeschen" : k === "pruefen" ? " taste-ok" : "");
      b.textContent = k === "loeschen" ? "⌫" : k === "pruefen" ? "✓" : k;
      b.setAttribute("aria-label", k === "loeschen" ? "Löschen" : k === "pruefen" ? "Prüfen" : k);
      b.addEventListener("click", () => {
        if (k === "loeschen") loesche();
        else if (k === "pruefen") pruefe();
        else tippe(k);
      });
      tast.appendChild(b);
    });

    el("m-zurueck").addEventListener("click", () => App.zeigeFach("mathe"));
    el("m-sprich").addEventListener("click", () => App.sprich(aufgabenText()));
    el("m-weiter").addEventListener("click", weiter);
  }

  function aufgabenText() {
    const t = st.aufgaben[st.idx];
    return "Rechne " + t.a + (t.op === "+" ? " plus " : " minus ") + t.b +
           ". Schreibe auf dein Blatt und gib das Ergebnis ein.";
  }

  function laenge(n) { return String(n).length; }

  function ziffer(zahl, p) {
    const s = String(zahl);
    return p < s.length ? s[s.length - 1 - p] : "";
  }

  function zeile(zahl, op, hl) {
    let h = '<div class="zeile"><span class="op">' + op + '</span>';
    for (let p = 2; p >= 0; p--) {
      h += '<span class="zelle' + (hl && p === 0 ? " hl" : "") + '">' + ziffer(zahl, p) + '</span>';
    }
    return h + '</div>';
  }

  function zeichne() {
    const t = st.aufgaben[st.idx];
    const len = laenge(t.ergebnis);

    // Fortschrittspunkte
    let pk = "";
    for (let i = 0; i < st.aufgaben.length; i++) {
      pk += '<span class="punkt' + (i < st.idx ? " ok" : i === st.idx ? " jetzt" : "") + '"></span>';
    }
    el("m-punkte").innerHTML = pk;

    // Rechenzettel
    let z = '<div class="stellen"><span></span><span>H</span><span>Z</span><span>E</span></div>';
    z += zeile(t.a, "", st.hilfe);
    z += zeile(t.b, t.op === "+" ? "+" : "−", st.hilfe);
    z += '<div class="strich"></div>';
    z += '<div class="zeile ergebnis"><span class="op">=</span>';
    for (let p = 2; p >= 0; p--) {
      if (p < len) {
        const v = st.eingaben[p];
        const kl = "box" + (st.aktiv === p && !st.gesperrt ? " aktiv" : "") +
                   (st.gesperrt ? (st.gesperrt === "loesung" ? " loesung" : " richtig") : "");
        z += '<button class="' + kl + '" data-p="' + p + '">' + (v === undefined ? "" : v) + '</button>';
      } else {
        z += '<span class="zelle"></span>';
      }
    }
    z += '</div>';
    el("m-zettel").innerHTML = z;
    el("m-zettel").querySelectorAll(".box").forEach(b => {
      b.addEventListener("click", () => {
        if (st.gesperrt) return;
        st.aktiv = Number(b.dataset.p);
        zeichne();
      });
    });
  }

  function meldung(text, art, sprechen) {
    const m = el("m-meldung");
    m.textContent = text;
    m.className = "meldung" + (art ? " " + art : "");
    if (sprechen) App.sprich(sprechen === true ? text : sprechen);
  }

  function tippe(d) {
    if (st.gesperrt) return;
    const len = laenge(st.aufgaben[st.idx].ergebnis);
    st.eingaben[st.aktiv] = d;
    if (st.aktiv + 1 < len) st.aktiv++;
    meldung("", "");
    zeichne();
  }

  function loesche() {
    if (st.gesperrt) return;
    if (st.eingaben[st.aktiv] !== undefined) {
      delete st.eingaben[st.aktiv];
    } else if (st.aktiv > 0) {
      st.aktiv--;
      delete st.eingaben[st.aktiv];
    }
    zeichne();
  }

  function pruefe() {
    if (st.gesperrt) return;
    const t = st.aufgaben[st.idx];
    const len = laenge(t.ergebnis);
    let eingabe = "";
    for (let p = len - 1; p >= 0; p--) {
      if (st.eingaben[p] === undefined) {
        meldung("Fülle alle Kästchen aus.", "info", true);
        return;
      }
      eingabe += st.eingaben[p];
    }

    if (Number(eingabe) === t.ergebnis) {
      st.gesperrt = "richtig";
      zeichne();
      zeigeWeiter();
      meldung("Richtig! 🎉", "gut", "Richtig! Super!");
      return;
    }

    st.fehler++;
    st.eingaben = {};
    st.aktiv = 0;

    if (st.fehler >= 3) {
      // Lösung zeigen, ohne Druck
      const s = String(t.ergebnis);
      for (let p = 0; p < len; p++) st.eingaben[p] = s[s.length - 1 - p];
      st.gesperrt = "loesung";
      zeichne();
      zeigeWeiter();
      meldung("So ist es richtig. Weiter geht's!", "info", "So ist es richtig. Weiter geht's!");
      return;
    }

    if (st.fehler === 2) {
      st.hilfe = true;
      const aE = t.aSt[0], bE = t.bSt[0];
      const tipp = "Fange bei den Einern an: " + aE + (t.op === "+" ? " + " : " − ") + bE;
      zeichne();
      meldung("Tipp: " + tipp, "tipp",
        "Tipp: Fange bei den Einern an. " + aE + (t.op === "+" ? " plus " : " minus ") + bE);
      return;
    }

    zeichne();
    el("m-zettel").classList.remove("wackeln");
    void el("m-zettel").offsetWidth;
    el("m-zettel").classList.add("wackeln");
    meldung("Nochmal! Du schaffst das. 💪", "nochmal", "Nochmal! Du schaffst das.");
  }

  function zeigeWeiter() {
    el("m-tastatur").hidden = true;
    el("m-weiter").hidden = false;
  }

  function weiter() {
    st.idx++;
    if (st.idx >= st.aufgaben.length) {
      fertig();
      return;
    }
    st.fehler = 0;
    st.eingaben = {};
    st.aktiv = 0;
    st.gesperrt = false;
    st.hilfe = false;
    el("m-tastatur").hidden = false;
    el("m-weiter").hidden = true;
    meldung("", "");
    zeichne();
  }

  function fertig() {
    App.markiereErledigt(st.auftrag.id);
    root().innerHTML =
      '<div class="fertig">' +
        '<div class="fertig-stern">⭐</div>' +
        '<h2>Super, Detektiv Ben!</h2>' +
        '<p>Beweisstück gesichert.</p>' +
        '<button class="btn btn-big" id="m-fertig-ok">Weiter</button>' +
      '</div>';
    el("m-fertig-ok").addEventListener("click", () => App.zeigeFach("mathe"));
    App.sprich("Super gemacht, Ben! Beweisstück gesichert.");
  }

  /* ---------- Aufträge registrieren ---------- */
  const defs = [
    { id: "mathe-1", modus: "plus",  icon: "➕", titel: "Tore zählen",   untertitel: "Plus rechnen" },
    { id: "mathe-2", modus: "minus", icon: "➖", titel: "Tore abziehen", untertitel: "Minus rechnen" },
    { id: "mathe-3", modus: "mix",   icon: "🎯", titel: "Torwand-Mix",   untertitel: "Plus und Minus gemischt" }
  ];
  window.AUFTRAEGE.mathe = defs.map(d => Object.assign({}, d, { start: () => start(d) }));

  // Für Tests im Browser
  window.__mathe = { erzeugeAufgaben };
})();
