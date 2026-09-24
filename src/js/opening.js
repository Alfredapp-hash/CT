(() => {
  const KEY = "ct-hero-opened";
  const root = document.documentElement;
  const hero = document.getElementById("top");
  const book = document.getElementById("bk-book");
  const cover = document.getElementById("bk-cover");
  const page = document.getElementById("bk-page");
  const shade = document.getElementById("bk-shade");
  const frontShade = document.getElementById("bk-front-shade");
  const backShade = document.getElementById("bk-back-shade");
  const shadow = hero && hero.querySelector(".bk-shadow");
  const skipBtn = document.getElementById("bk-skip");
  const navSkip = document.getElementById("skip");
  const cue = document.getElementById("enter");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrowQ = window.matchMedia("(max-width: 719px)");

  let playing = false;
  let turnAnims = [];
  let inkAnims = [];
  let timers = [];
  const originals = new Map();

  const setChrome = (on) => {
    if (skipBtn) skipBtn.hidden = !on;
    if (navSkip) navSkip.hidden = !on;
  };

  function visibleParagraphs() {
    return Array.from(hero.querySelectorAll(".bk-text p")).filter((p) => p.offsetParent !== null);
  }

  function wrap(p) {
    const text = p.textContent;
    originals.set(p, text);
    const frag = document.createDocumentFragment();
    const words = text.split(" ");
    words.forEach((w, wi) => {
      const word = document.createElement("span");
      word.style.whiteSpace = "nowrap";
      Array.from(w).forEach((c) => {
        const ch = document.createElement("span");
        ch.className = "bk-ch";
        ch.textContent = c;
        word.appendChild(ch);
      });
      frag.appendChild(word);
      if (wi < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    p.replaceChildren(frag);
  }

  function unwrap() {
    originals.forEach((text, p) => { p.textContent = text; });
    originals.clear();
  }

  function clearTimers() {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
  }

  function finish() {
    if (!playing) return;
    playing = false;
    clearTimers();
    inkAnims.forEach((a) => a.cancel());
    inkAnims = [];
    const settled = turnAnims;
    turnAnims = [];
    settled.forEach((a) => { try { a.finish(); } catch (e) { /* noop */ } });
    root.classList.remove("bk-pre");
    hero.classList.remove("bk-writing");
    window.requestAnimationFrame(() => settled.forEach((a) => a.cancel()));
    unwrap();
    setChrome(false);
    try { window.sessionStorage.setItem(KEY, "1"); } catch (e) { /* noop */ }
  }

  function write() {
    const paras = visibleParagraphs();
    const base = 17;
    let t = 120;
    paras.forEach((p) => {
      const chars = p.querySelectorAll(".bk-ch");
      chars.forEach((el, i) => {
        inkAnims.push(el.animate(
          [{ opacity: 0, filter: "blur(1.2px)" }, { opacity: 1, filter: "blur(0)" }],
          { duration: 260, delay: t, easing: "ease-out", fill: "both" }
        ));
        const c = el.textContent;
        t += base + (c === "." ? base * 22 : c === "," ? base * 7 : 0);
        if (i === chars.length - 1) t += base * 20;
      });
    });
    timers.push(window.setTimeout(finish, t + 320));
  }

  function turn() {
    const D = 1550;
    const ease = "cubic-bezier(0.6, 0.04, 0.24, 1)";
    const narrow = narrowQ.matches;
    const main = cover.animate(
      [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }],
      { duration: D, easing: ease, fill: "forwards" }
    );
    turnAnims = [
      main,
      shade.animate([{ opacity: 0 }, { opacity: 1, offset: 0.38 }, { opacity: 0 }], { duration: D, easing: "ease-in-out", fill: "forwards" }),
      frontShade.animate([{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }], { duration: D, easing: ease, fill: "forwards" }),
      backShade.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: D, easing: ease, fill: "forwards" }),
    ];
    if (narrow) {
      turnAnims.push(cover.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: D, fill: "forwards" }));
    } else {
      const slide = { duration: D * 0.94, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "forwards" };
      turnAnims.push(book.animate([{ transform: "translateX(-25%)" }, { transform: "translateX(0)" }], slide));
      if (shadow) turnAnims.push(shadow.animate([{ transform: "translateX(-25%) scaleX(0.5)" }, { transform: "translateX(0) scaleX(1)" }], slide));
    }
    main.finished.then(() => {
      if (!playing || !turnAnims.includes(main)) return;
      const settled = turnAnims;
      turnAnims = [];
      root.classList.remove("bk-pre");
      window.requestAnimationFrame(() => settled.forEach((a) => a.cancel()));
      write();
    }, () => {});
  }

  function play() {
    playing = true;
    setChrome(true);
    hero.classList.add("bk-writing");
    visibleParagraphs().forEach(wrap);
    timers.push(window.setTimeout(turn, 800));
  }

  function enterLibrary() {
    document.getElementById("library")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  if (hero && cover && book) {
    if (root.classList.contains("bk-pre") && typeof cover.animate === "function") {
      play();
    } else {
      root.classList.remove("bk-pre");
    }
    skipBtn?.addEventListener("click", () => { finish(); page?.focus({ preventScroll: true }); });
    navSkip?.addEventListener("click", () => { finish(); enterLibrary(); });
    book.addEventListener("click", finish);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") finish(); });
    narrowQ.addEventListener?.("change", finish);
  }

  cue?.addEventListener("click", enterLibrary);

  const form = document.querySelector("form[name='notes']");
  form?.addEventListener("submit", async (event) => {
    if (location.protocol === "file:") return;
    event.preventDefault();
    const note = document.getElementById("form-note");
    const data = new FormData(form);
    try {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString(),
      });
      if (!response.ok) throw new Error("Form was not accepted");
      form.reset();
      if (note) {
        note.hidden = false;
        note.textContent = "Your note is on its way. Thank you for writing.";
      }
    } catch (error) {
      if (note) {
        note.hidden = false;
        note.textContent = "The note could not be sent from this preview. It will send once the site is published.";
      }
    }
  });
})();
