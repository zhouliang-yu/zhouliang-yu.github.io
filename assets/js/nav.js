(function () {
  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(function () {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector("#navbar .nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
      toggle.classList.toggle("open");
    });
  });
})();
