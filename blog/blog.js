(function () {
  "use strict";

  var article = document.querySelector("article.prose");

  if (article) {
    var progress = document.createElement("div");
    var progressFill = document.createElement("span");
    var progressLabel = document.createElement("span");
    var progressTitle = document.createElement("span");
    var progressTime = document.createElement("span");
    var progressTop = document.createElement("span");
    var readingTime = document.querySelector(".reading-time");
    var articleHeading = document.querySelector(".post-head h1");
    var totalMinutes = readingTime
      ? parseInt(readingTime.dataset.minutes, 10)
      : 0;

    progress.className = "reading-progress";
    progress.setAttribute("aria-hidden", "true");
    progressFill.className = "reading-progress-fill";
    progressLabel.className = "reading-progress-label";
    progressTitle.className = "reading-progress-title";
    progressTime.className = "reading-progress-time";
    progressTitle.textContent = articleHeading ? articleHeading.textContent : "Article";
    progressTop.className = "reading-progress-top";
    progressTop.textContent = "↑";
    progressTop.title = "Back to top";
    progressTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    progressLabel.appendChild(progressTitle);
    progressLabel.appendChild(progressTime);
    progressLabel.appendChild(progressTop);
    progress.appendChild(progressFill);
    if (totalMinutes > 0) progress.appendChild(progressLabel);
    document.body.appendChild(progress);

    var updateProgress = function () {
      var start = article.offsetTop;
      var finish = start + article.offsetHeight - window.innerHeight;
      var amount = finish <= start ? 1 : (window.scrollY - start) / (finish - start);

      amount = Math.max(0, Math.min(1, amount));
      progressFill.style.width = amount * 100 + "%";

      if (totalMinutes > 0) {
        var minutesLeft = Math.max(1, Math.ceil(totalMinutes * (1 - amount)));

        if (amount >= 1) {
          progressTime.textContent = "";
          progressTime.hidden = true;
        } else {
          progressTime.textContent = minutesLeft + " min left";
          progressTime.hidden = false;
        }
        progress.classList.toggle("is-active", amount > 0);
      }
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  var terms = document.querySelectorAll("abbr.term[title]");

  if (terms.length) {
    var tooltip = document.createElement("span");
    var activeTerm = null;

    tooltip.id = "term-definition";
    tooltip.className = "term-definition";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);

    var positionTooltip = function (term) {
      var termRect = term.getBoundingClientRect();
      var tooltipRect = tooltip.getBoundingClientRect();
      var gap = 10;
      var edge = 12;
      var left = termRect.left + termRect.width / 2 - tooltipRect.width / 2;
      var top = termRect.top - tooltipRect.height - gap;

      left = Math.max(edge, Math.min(left, window.innerWidth - tooltipRect.width - edge));
      if (top < edge) top = termRect.bottom + gap;

      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    };

    var showDefinition = function (term) {
      activeTerm = term;
      tooltip.textContent = term.dataset.definition;
      tooltip.hidden = false;
      term.setAttribute("aria-describedby", tooltip.id);
      positionTooltip(term);
    };

    var hideDefinition = function (term) {
      if (activeTerm !== term) return;
      term.removeAttribute("aria-describedby");
      tooltip.hidden = true;
      activeTerm = null;
    };

    terms.forEach(function (term) {
      term.dataset.definition = term.getAttribute("title");
      term.removeAttribute("title");
      term.setAttribute("tabindex", "0");

      term.addEventListener("mouseenter", function () {
        showDefinition(term);
      });
      term.addEventListener("mouseleave", function () {
        hideDefinition(term);
      });
      term.addEventListener("focus", function () {
        showDefinition(term);
      });
      term.addEventListener("blur", function () {
        hideDefinition(term);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && activeTerm) {
        activeTerm.blur();
      }
    });

    window.addEventListener("scroll", function () {
      if (activeTerm) positionTooltip(activeTerm);
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (activeTerm) positionTooltip(activeTerm);
    });
  }
})();
