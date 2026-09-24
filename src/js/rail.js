// Rail: keyboard-operable scroll buttons for .rail components. No auto-rotate.
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".rail").forEach(function (rail) {
    var track = rail.querySelector(".rail__track");
    var prev = rail.querySelector(".rail__btn--prev");
    var next = rail.querySelector(".rail__btn--next");
    var status = rail.querySelector(".rail__status");
    if (!track || !prev || !next) return;
    function step() {
      var item = track.querySelector(".rail__item");
      return item ? item.getBoundingClientRect().width + 24 : track.clientWidth * 0.8;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 1;
      prev.disabled = track.scrollLeft <= 0;
      next.disabled = track.scrollLeft >= max;
      if (status) {
        var items = track.querySelectorAll(".rail__item");
        var first = Math.round(track.scrollLeft / step()) + 1;
        status.textContent = "Showing from item " + Math.min(first, items.length) + " of " + items.length;
      }
    }
    function go(dir) {
      track.scrollBy({ left: dir * step() * 2, behavior: reduce ? "auto" : "smooth" });
    }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
      if (e.key === "Home") { track.scrollTo({ left: 0 }); e.preventDefault(); }
      if (e.key === "End") { track.scrollTo({ left: track.scrollWidth }); e.preventDefault(); }
    });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
