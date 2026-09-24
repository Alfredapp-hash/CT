// Global nav: hamburger (≤ 900px) with focus trap + Escape, Books disclosure dropdown.
// Progressive: without this file every link is already visible.
(function () {
  "use strict";
  var header = document.querySelector("[data-nav]");
  if (!header) return;
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("nav-menu");
  var dropBtn = header.querySelector(".nav-drop__btn");
  var drop = document.getElementById("nav-books");
  var mq = window.matchMedia("(max-width: 900px)");
  var FOCUSABLE = 'a[href], button:not([hidden]):not([disabled]), input, [tabindex]:not([tabindex="-1"])';

  document.documentElement.classList.add("has-nav-js");
  if (toggle) toggle.hidden = false;
  if (dropBtn) dropBtn.hidden = false;

  /* ---- mobile menu ---- */
  function isOpen() { return header.classList.contains("is-open"); }
  function setOpen(open, returnFocus) {
    header.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      var first = menu.querySelector(FOCUSABLE);
      if (first) first.focus();
    } else if (returnFocus && toggle) {
      toggle.focus();
    }
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () { setOpen(!isOpen(), false); });
    document.addEventListener("keydown", function (e) {
      if (!isOpen() || !mq.matches) return;
      if (e.key === "Escape") { e.preventDefault(); setOpen(false, true); return; }
      if (e.key !== "Tab") return;
      var items = Array.prototype.filter.call(header.querySelectorAll(FOCUSABLE), function (el) {
        return el.offsetParent !== null && !el.hidden;
      });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (isOpen() && mq.matches && !header.contains(e.target)) setOpen(false, false);
    });
    menu.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (a && isOpen() && mq.matches) setOpen(false, false);
    });
    mq.addEventListener ? mq.addEventListener("change", function () { if (!mq.matches) setOpen(false, false); }) : null;
  }

  /* ---- books dropdown (desktop) ---- */
  function setDrop(open, returnFocus) {
    header.classList.toggle("drop-open", open);
    if (dropBtn) dropBtn.setAttribute("aria-expanded", String(open));
    if (open) { var first = drop.querySelector("a"); if (first) first.focus(); }
    else if (returnFocus && dropBtn) dropBtn.focus();
  }
  if (dropBtn && drop) {
    dropBtn.addEventListener("click", function () { setDrop(!header.classList.contains("drop-open"), false); });
    header.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("drop-open") && !mq.matches) { e.preventDefault(); setDrop(false, true); }
    });
    header.addEventListener("focusout", function (e) {
      if (mq.matches || !header.classList.contains("drop-open")) return;
      var to = e.relatedTarget;
      if (!to || !(drop.contains(to) || to === dropBtn)) setDrop(false, false);
    });
    document.addEventListener("click", function (e) {
      if (!mq.matches && header.classList.contains("drop-open") && !e.target.closest(".nav-item--books")) setDrop(false, false);
    });
  }
})();
