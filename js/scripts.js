// Viswanath M Sathananth — Resume
// Vanilla ES module: theme toggle, mobile nav, scrollspy, reveal-on-scroll.

const THEME_KEY = "vms-theme";
const root = document.documentElement;

const initTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }
};

const toggleTheme = () => {
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const current = root.getAttribute("data-theme") ?? (prefersDark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
};

const initNav = () => {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
};

const initScrollSpy = () => {
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  if (navLinks.length === 0) return;

  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  sections.forEach((section) => observer.observe(section));
};

const initReveal = () => {
  const targets = document.querySelectorAll(".reveal");
  if (targets.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
};

const initFooterYear = () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
};

const init = () => {
  initTheme();
  initNav();
  initScrollSpy();
  initReveal();
  initFooterYear();

  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
