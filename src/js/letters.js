(function () {
  "use strict";
  if (!window.fetch) return;

  function noteFor(form) {
    var note = form.querySelector(".form-note");
    if (note) return note;
    note = document.createElement("p");
    note.className = "form-note";
    note.hidden = true;
    note.setAttribute("aria-live", "polite");
    form.appendChild(note);
    return note;
  }

  document.querySelectorAll("form[name='newsletter'], form[name='notes']").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var note = noteFor(form);
      var button = form.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      fetch(form.getAttribute("action") || "/api/messages", {
        method: "POST",
        body: new FormData(form),
        headers: { accept: "application/json" },
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          return { ok: response.ok, body: body };
        });
      }).then(function (result) {
        note.hidden = false;
        if (result.ok) {
          form.reset();
          note.textContent = form.getAttribute("name") === "notes"
            ? "Your note is on its way. Thank you for writing."
            : "You're on the reader notes. Thank you.";
        } else {
          note.textContent = (result.body && result.body.error) || "That could not be sent.";
        }
      }).catch(function () {
        note.hidden = false;
        note.textContent = "That could not be sent.";
      }).finally(function () {
        if (button) button.disabled = false;
      });
    });
  });
})();
