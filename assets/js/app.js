(function () {
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char];
    });
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    var radius = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function relativeToRoot(path) {
    var current = location.pathname.replace(/\\/g, "/");
    var local = current.includes("/site/") ? current.split("/site/")[1] : current.replace(/^\/+/, "");
    if (!local || local.endsWith("/")) local += "index.html";
    if (!/\.html?$/.test(local)) local += "/index.html";
    var depth = (local.match(/\//g) || []).length;
    return "../".repeat(depth) + path;
  }

  function courseCard(item) {
    var article = document.createElement("article");
    article.className = "course-card";
    var sideNote = item.distance ? "<span>" + item.distance.toFixed(1) + " km away</span>" : "<span>" + escapeHtml(item.price || "Check prices") + "</span>";
    article.innerHTML =
      '<a class="course-image" href="' + escapeHtml(relativeToRoot(item.path)) + '">' +
      '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + ' mini golf in ' + escapeHtml(item.city) + ', ' + escapeHtml(item.province) + '" loading="lazy" decoding="async"></a>' +
      '<div class="course-body"><div class="course-meta">' +
      (item.rating ? escapeHtml(item.rating.toFixed(1) + " rating") : "No rating yet") +
      (item.reviews ? " · " + escapeHtml(String(item.reviews)) + " reviews" : "") +
      '</div><h3><a href="' + escapeHtml(relativeToRoot(item.path)) + '">' + escapeHtml(item.name) + '</a></h3>' +
      '<p class="course-location">' + escapeHtml(item.city) + ", " + escapeHtml(item.province) + '</p>' +
      '<div class="tag-row">' + (item.tags || []).slice(0, 4).map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + '</span>'; }).join("") + '</div>' +
      '<div class="course-actions"><a class="text-link" href="' + escapeHtml(relativeToRoot(item.path)) + '">View course</a>' + sideNote + '</div></div>';
    return article;
  }

  function searchTokens(query) {
    var stop = {near:1, me:1, in:1, the:1, and:1, canada:1, course:1, courses:1, find:1};
    return String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (token) {
      return token && !stop[token];
    });
  }

  function runSearch(form) {
    var queryInput = form.querySelector("[name=q]");
    var provinceInput = form.querySelector("[name=province]");
    var results = document.querySelector(".js-search-results");
    var status = document.querySelector(".js-search-status");
    if (!results) return;

    var tokens = searchTokens(queryInput && queryInput.value);
    var province = (provinceInput && provinceInput.value || "").trim();
    var matches = (window.MGC_LISTINGS || []).filter(function (item) {
      return (!tokens.length || tokens.every(function (token) { return item.search.indexOf(token) > -1; })) &&
        (!province || item.province === province);
    }).slice(0, 24);

    results.innerHTML = "";
    matches.forEach(function (item) { results.appendChild(courseCard(item)); });
    if (status) {
      status.textContent = matches.length
        ? "Showing " + matches.length + " matching mini golf listing" + (matches.length === 1 ? "." : "s.")
        : "No matching courses found. Try a nearby city, province, mini putt, glow golf, indoor, or outdoor.";
    }
  }

  function applyQueryParams(form) {
    var params = new URLSearchParams(location.search);
    var q = params.get("q");
    var province = params.get("province");
    if (q && form.querySelector("[name=q]")) form.querySelector("[name=q]").value = q;
    if (province && form.querySelector("[name=province]")) form.querySelector("[name=province]").value = province;
    if (q || province || location.pathname.includes("/search/")) runSearch(form);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".js-directory-search").forEach(function (form) {
      applyQueryParams(form);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        runSearch(form);
        var input = form.querySelector("[name=q]");
        if (input && location.pathname.includes("/search/")) {
          var params = new URLSearchParams(location.search);
          params.set("q", input.value.trim());
          history.replaceState(null, "", "?" + params.toString());
        }
      });
      form.addEventListener("input", function () { runSearch(form); });
    });

    document.querySelectorAll(".js-use-location").forEach(function (button) {
      button.addEventListener("click", function () {
        var results = document.querySelector(".js-search-results");
        var status = document.querySelector(".js-search-status");
        if (!navigator.geolocation) {
          if (status) status.textContent = "Location is not available in this browser.";
          return;
        }
        if (status) status.textContent = "Checking your location...";
        navigator.geolocation.getCurrentPosition(function (position) {
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;
          var closest = (window.MGC_LISTINGS || []).filter(function (item) {
            return typeof item.lat === "number" && typeof item.lng === "number";
          }).map(function (item) {
            return Object.assign({}, item, {distance: distanceKm(lat, lng, item.lat, item.lng)});
          }).sort(function (a, b) {
            return a.distance - b.distance;
          }).slice(0, 18);
          results.innerHTML = "";
          closest.forEach(function (item) { results.appendChild(courseCard(item)); });
          if (status) status.textContent = "Showing the closest mini golf listings to your current location.";
        }, function () {
          if (status) status.textContent = "Location permission was not granted. You can still search by city or province.";
        }, {enableHighAccuracy:false, timeout:8000, maximumAge:300000});
      });
    });
  });
})();
