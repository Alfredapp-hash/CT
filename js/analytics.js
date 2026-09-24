(function () {
  "use strict";

  var ENDPOINT = "/api/analytics/collect";

  function path() {
    var value = window.location.pathname || "/";
    if (value.length > 1 && value.charAt(value.length - 1) === "/") {
      value = value.slice(0, -1);
    }
    return value;
  }

  if (path().indexOf("/admin") === 0) return;
  if (!window.fetch) return;

  function send(payload) {
    try {
      fetch(ENDPOINT, {
        method: "POST",
        keepalive: true,
        mode: "same-origin",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(function () {});
    } catch (error) {
      /* analytics must never break the page */
    }
  }

  send({
    path: path(),
    referrer: document.referrer || "",
    title: document.title || "",
    ts: Date.now(),
  });

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var link = target.closest("a[data-track]");
      if (!link) return;
      send({
        path: path(),
        referrer: document.referrer || "",
        title: document.title || "",
        event: link.getAttribute("data-track") || "click",
        ts: Date.now(),
      });
    },
    true
  );
})();
