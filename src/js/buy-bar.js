// Book pages: the sticky mobile Buy bar shows only once the in-page "Buy the book" button
// has scrolled out of view above, and hides again while the footer is on screen (it must never cover the legal row).
// Without JS the bar is simply visible (CSS default).
(function () {
  "use strict";
  var bar = document.querySelector(".buy-bar");
  var cta = document.getElementById("book-cta");
  var footer = document.querySelector(".site-footer");
  if (!bar || !cta || !("IntersectionObserver" in window)) { if (bar) bar.classList.add("is-visible"); return; }
  var ctaGone = false, footerOn = false;
  function render() { bar.classList.toggle("is-visible", ctaGone && !footerOn); }
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { ctaGone = !e.isIntersecting && e.boundingClientRect.bottom < 0; });
    render();
  }, { threshold: 0 }).observe(cta);
  if (footer) new IntersectionObserver(function (entries) { entries.forEach(function (e) { footerOn = e.isIntersecting; }); render(); }).observe(footer);
})();
