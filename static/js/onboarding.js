(function () {
  const STORAGE_KEY = `onboarding_seen_${window.__userId || ''}`;
  const THEMES = ['nacht', 'tageslicht', 'farbe', 'nebel', 'sand', 'wald', 'rost', 'grau', 'bunt', 'karpaten'];
  const THEME_NAMES = {
    nacht:      'ich bin normal.',
    tageslicht: 'für die anderen.',
    farbe:      'kreativitätskrise.',
    nebel:      'berliner herbst.',
    sand:       'fernweh.',
    wald:       'waldbaden.',
    rost:       'industrieromantik.',
    grau:       'jahresgespräch.',
    bunt:       'bunt wie mein leben.',
    karpaten:   'karpatenromantik.',
  };

  let current = 0;
  let overlay, slides, dots;
  let themeBtn, themeNameEl, weiterBtn;
  let hideThemeTimer = null;
  let slide3Interval = null;
  let slide3StartTimeout = null;
  let weiterVisible = false;

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    if (themeNameEl) {
      themeNameEl.textContent = THEME_NAMES[t] || t;
      themeNameEl.classList.add('visible');
      clearTimeout(hideThemeTimer);
      hideThemeTimer = setTimeout(() => themeNameEl.classList.remove('visible'), 1300);
    }
  }

  function cycleTheme() {
    const curr = document.documentElement.getAttribute('data-theme');
    applyTheme(THEMES[(THEMES.indexOf(curr) + 1) % THEMES.length]);
  }

  function cycleThemePrev() {
    const curr = document.documentElement.getAttribute('data-theme');
    applyTheme(THEMES[(THEMES.indexOf(curr) - 1 + THEMES.length) % THEMES.length]);
  }

  function showWeiter() {
    if (weiterVisible || !weiterBtn) return;
    weiterVisible = true;
    weiterBtn.classList.add('visible');
  }

  function startSlide3() {
    weiterVisible = false;
    if (weiterBtn) weiterBtn.classList.remove('visible');
    // if (themeBtn) themeBtn.classList.add('pulsing');

    let cycleCount = 0;
    slide3StartTimeout = setTimeout(() => {
      slide3Interval = setInterval(() => {
        cycleTheme();
        cycleCount++;
        if (cycleCount === THEMES.length) showWeiter();
      }, 2200);
    }, 800);
  }

  function stopSlide3() {
    clearTimeout(slide3StartTimeout);
    clearInterval(slide3Interval);
    slide3Interval = null;
    // if (themeBtn) themeBtn.classList.remove('pulsing');
  }

  function goTo(index) {
    if (current === 2) stopSlide3();
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    if (current === 2) startSlide3();
  }

  function advance() {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      closeOnboarding();
    }
  }

  function closeOnboarding() {
    stopSlide3();
    localStorage.setItem(STORAGE_KEY, '1');
    overlay.setAttribute('hidden', '');
  }

  window.showOnboarding = function () {
    if (!overlay) return;
    stopSlide3();
    current = 0;
    slides.forEach((s, i) => s.classList.toggle('active', i === 0));
    dots.forEach((d, i) => d.classList.toggle('active', i === 0));
    overlay.removeAttribute('hidden');
  };

  document.addEventListener('DOMContentLoaded', () => {
    overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    slides = Array.from(overlay.querySelectorAll('.onboarding-slide'));
    dots = Array.from(overlay.querySelectorAll('.onboarding-dot'));
    themeBtn = document.getElementById('onboarding-theme-btn');
    themeNameEl = document.getElementById('onboarding-theme-name');
    weiterBtn = document.getElementById('onboarding-weiter');

    slides[0].classList.add('active');
    dots[0].classList.add('active');

    if (!localStorage.getItem(STORAGE_KEY)) {
      overlay.removeAttribute('hidden');
    }

    // Weiter-Button (Slide 3)
    weiterBtn?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      stopSlide3();
      advance();
    });

    // Manueller Themewechsel — stoppt Auto-Cycle, User übernimmt
    themeBtn?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      stopSlide3();
      cycleTheme();
      showWeiter();
    });

    // Touch / Swipe
    let touchStartX = 0;
    let touchStartY = 0;
    let moved = false;

    overlay.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      moved = false;
    }, { passive: true });

    overlay.addEventListener('touchmove', (e) => {
      if (Math.abs(e.touches[0].clientX - touchStartX) > 8 ||
          Math.abs(e.touches[0].clientY - touchStartY) > 8) {
        moved = true;
      }
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (moved) {
        if (Math.abs(dx) > 40) {
          if (current === 2) {
            if (dx > 0) { stopSlide3(); goTo(1); }
            else { stopSlide3(); cycleTheme(); showWeiter(); }
          } else {
            if (dx < 0) advance();
            else if (current > 0) goTo(current - 1);
          }
        }
        return;
      }
      const t = e.target;
      if (t.closest('#onboarding-theme-btn') || t.closest('#onboarding-skip') ||
          t.closest('.onboarding-dot') || t.closest('#onboarding-weiter')) return;
      e.preventDefault();
      const isLeft = e.changedTouches[0].clientX < window.innerWidth / 2;
      if (current === 2) {
        stopSlide3();
        if (isLeft) cycleThemePrev(); else cycleTheme();
        showWeiter();
      } else {
        if (isLeft && current > 0) goTo(current - 1);
        else if (!isLeft) advance();
      }
    });

    // Maus (Desktop)
    overlay.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('#onboarding-theme-btn') || t.closest('#onboarding-skip') ||
          t.closest('.onboarding-dot') || t.closest('#onboarding-weiter')) return;
      const isLeft = e.clientX < window.innerWidth / 2;
      if (current === 2) {
        stopSlide3();
        if (isLeft) cycleThemePrev(); else cycleTheme();
        showWeiter();
      } else {
        if (isLeft && current > 0) goTo(current - 1);
        else if (!isLeft) advance();
      }
    });

    // Dots
    dots.forEach((dot, i) => {
      dot.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        goTo(i);
      });
    });

    // "über" Menüeintrag
    document.getElementById('menu-about')?.addEventListener('click', () => {
      const dropdown = document.getElementById('nav-menu-dropdown');
      if (dropdown) dropdown.hidden = true;
      window.showOnboarding();
    });
  });
})();
