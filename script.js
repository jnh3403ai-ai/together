/* =========================================================
   RESCUE BAND — 인터랙션 스크립트
   순수 JavaScript. 외부 라이브러리 없음.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. 스크롤 시 내비게이션 배경 변화
     --------------------------------------------------------- */
  var nav = document.getElementById("nav");
  var toTop = document.getElementById("toTop");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    // 일정 스크롤 이상 내려가면 배경 표시
    nav.classList.toggle("is-scrolled", y > 40);
    // 최상단 이동 버튼 노출
    toTop.classList.toggle("is-visible", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     2. 모바일 햄버거 메뉴
     --------------------------------------------------------- */
  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("navMenu");

  function closeMenu() {
    menu.classList.remove("is-open");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "메뉴 열기");
  }
  function toggleMenu() {
    var open = menu.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  }
  burger.addEventListener("click", toggleMenu);

  // 메뉴 항목 클릭 시 닫기 (모바일)
  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });
  // ESC 로 닫기
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------------------------------------------------------
     3. 최상단 이동 버튼
     --------------------------------------------------------- */
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------------------------------------------------------
     4. 스크롤 등장(reveal) 애니메이션 — IntersectionObserver
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target); // 한 번만 실행
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // 폴백: 관찰 기능이 없으면 즉시 표시
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------------------------------------------------
     5. 작동 방식(How It Works) 단계 탭
     --------------------------------------------------------- */
  var tabs = document.querySelectorAll(".how__tab");
  var panels = document.querySelectorAll(".how__panel");

  function selectStep(step) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-step") === String(step);
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach(function (panel) {
      var active = panel.getAttribute("data-step") === String(step);
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectStep(tab.getAttribute("data-step"));
    });
  });

  /* ---------------------------------------------------------
     6. 제품 디자인 — 센서 핫스팟 클릭 시 설명 표시
     --------------------------------------------------------- */
  var hotspots = document.querySelectorAll(".hotspot");
  var designPanels = document.querySelectorAll(".design__panel");

  function selectHotspot(targetId) {
    hotspots.forEach(function (h) {
      h.classList.toggle("is-active", h.getAttribute("data-target") === targetId);
    });
    designPanels.forEach(function (panel) {
      var active = panel.id === targetId;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }
  hotspots.forEach(function (h) {
    h.addEventListener("click", function () {
      selectHotspot(h.getAttribute("data-target"));
    });
  });
  // 첫 핫스팟 활성화
  if (hotspots.length) hotspots[0].classList.add("is-active");

  /* ---------------------------------------------------------
     7. 앵커 링크 부드러운 이동 (고정 헤더 높이 보정)
        - CSS scroll-behavior 로도 동작하지만,
          고정 nav 높이만큼 보정하기 위해 JS 로 처리
     --------------------------------------------------------- */
  var navHeight = 68;
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length < 2) return; // "#" 단독 무시
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  /* ---------------------------------------------------------
     8. 현재 섹션에 맞춰 내비게이션 링크 강조 (선택적)
     --------------------------------------------------------- */
  var sections = ["product", "features", "how", "design", "scenario"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = document.querySelectorAll(".nav__link");

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            navLinks.forEach(function (l) {
              // 현재 섹션 링크를 브랜드 블루로 강조
              l.style.color = l.getAttribute("href") === "#" + id ? "var(--blue)" : "";
            });
          }
        });
      },
      { threshold: 0.5 }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
