// Reveal: one IntersectionObserver fades .reveal elements up on first entry (≤ 300ms, CSS-driven).
// Off under prefers-reduced-motion and without JS (everything is visible by default; see home.css).
(function () {
  "use strict";
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }
  document.documentElement.classList.add("has-reveal");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  items.forEach(function (el, i) {
    var sibling = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.transitionDelay = (Math.min(sibling, 2) * 150) + "ms";
    io.observe(el);
  });
  // Anything already past the viewport when the script runs (deep-linked anchors) is shown at once.
  window.addEventListener("load", function () {
    items.forEach(function (el) {
      if (el.getBoundingClientRect().bottom < 0) { el.classList.add("is-in"); io.unobserve(el); }
    });
  });
})();
