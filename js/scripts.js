// Viswanath M Sathananth — Resume
// Vanilla ES module: theme, nav, scrollspy, reveal, count-up, timeline rail, spotlight, agent trace, agent network.

import { initAgentField } from "./agents-bg.js";

const THEME_KEY = "vms-theme";
const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Theme (dark by default; choice persisted) ---------- */
let field;
const setTheme = (next) => {
  root.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked: fine */ }
  $('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#06080f" : "#f3f5fb");
  field?.refreshColors();
};
const toggleTheme = () => setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");

/* ---------- Mobile nav ---------- */
const initNav = () => {
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  if (!toggle || !links) return;
  const close = () => { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
};

/* ---------- Scrollspy ---------- */
const initScrollSpy = () => {
  const navLinks = $$("[data-nav]");
  const sections = navLinks.map((l) => $(l.getAttribute("href"))).filter(Boolean);
  if (!sections.length) return;
  const io = new IntersectionObserver((entries) => {
    const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (hit) navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === `#${hit.target.id}`));
  }, { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
  sections.forEach((s) => io.observe(s));
};

/* ---------- Count-up (once, on reveal) ---------- */
const countUp = (el) => {
  const target = Number(el.dataset.count);
  if (reduced || !Number.isFinite(target)) return;
  const dur = 1100;
  const t0 = performance.now();
  const tick = (now) => {
    const p = clamp((now - t0) / dur, 0, 1);
    el.textContent = Math.round(target * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));
    if (p < 1) requestAnimationFrame(tick);
  };
  el.textContent = "0";
  requestAnimationFrame(tick);
};

/* ---------- Reveal on scroll (fires once) ---------- */
const initReveal = () => {
  const targets = $$(".reveal");
  if (!("IntersectionObserver" in window)) { targets.forEach((el) => el.classList.add("is-visible")); return; }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      $$("[data-count]", entry.target).forEach(countUp);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  targets.forEach((el) => io.observe(el));
};

/* ---------- Scroll-linked: timeline rail + network dimming ---------- */
const initScrollLinked = () => {
  const timeline = $("#timeline");
  const rail = $("#railFill");
  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = innerHeight;
    // Dim the network once you leave the hero so text stays readable.
    const o = 1 - clamp(scrollY / (vh * 0.9), 0, 1) * 0.62;
    root.style.setProperty("--net-o", o.toFixed(3));
    if (timeline && rail) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      rail.style.transform = `scaleY(${p.toFixed(4)})`;
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  update();
};

/* ---------- Card spotlight (fine pointers only) ---------- */
const initSpotlight = () => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".spot");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
};

/* ---------- Illustrative agent trace: play, hold, replay while visible ---------- */
const initTrace = () => {
  const card = $("#trace");
  const lines = $$("#traceLines .tl");
  const status = $("#traceStatus");
  const meter = $("#traceMeter");
  if (!card || !lines.length) return;

  const setState = (state, label) => { card.dataset.state = state; status.textContent = label; };
  const showAll = () => {
    lines.forEach((l) => l.classList.add("is-on"));
    meter.style.transform = "scaleX(1)";
    setState("done", "done");
  };
  if (reduced) { showAll(); return; }

  const gaps = [650, 900, 1100, 1000, 800];
  let run = 0;
  let visible = true;

  const reset = () => {
    lines.forEach((l) => l.classList.remove("is-on", "is-live"));
    meter.style.transform = "scaleX(0)";
    setState("idle", "idle");
  };

  const play = async () => {
    const id = ++run;
    await wait(1700); // attention loop: wait before the first run
    while (id === run) {
      reset();
      await wait(500);
      setState("running", "running");
      for (let i = 0; i < lines.length; i++) {
        if (id !== run) return;
        await wait(gaps[i]);
        if (id !== run) return;
        lines.forEach((l) => l.classList.remove("is-live"));
        lines[i].classList.add("is-on", "is-live");
        meter.style.transform = `scaleX(${(i + 1) / lines.length})`;
      }
      await wait(500);
      lines.forEach((l) => l.classList.remove("is-live"));
      setState("done", "done");
      await wait(6500); // hold, then replay
      while (!visible && id === run) await wait(400);
    }
  };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 }).observe(card);
  play();
};

/* ---------- Copy email ---------- */
const initCopy = () => {
  const btn = $("#copyEmail");
  if (!btn) return;
  const label = $("[data-label]", btn);
  const live = $("#copyStatus");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      label.textContent = "Copied";
      btn.classList.add("is-done");
      if (live) live.textContent = "Email address copied to clipboard";
    } catch {
      label.textContent = "Press ⌘C / Ctrl+C";
      const sel = getSelection();
      const r = document.createRange();
      r.selectNodeContents(btn.previousElementSibling);
      sel.removeAllRanges(); sel.addRange(r);
    }
    setTimeout(() => { label.textContent = "Copy email"; btn.classList.remove("is-done"); }, 1800);
  });
};

const init = () => {
  field = initAgentField($("#agents"), { reduced });
  initNav();
  initScrollSpy();
  initReveal();
  initScrollLinked();
  initSpotlight();
  initTrace();
  initCopy();
  $("#year") && ($("#year").textContent = new Date().getFullYear());
  $("#themeToggle")?.addEventListener("click", toggleTheme);
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
