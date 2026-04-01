(function () {
  const STORAGE_KEY = `onboarding_seen_${window.__userId || ''}`;
  const THEMES = ['nacht', 'tageslicht', 'farbe', 'nebel', 'sand', 'wald', 'rost', 'grau', 'bunt', 'karpaten'];
  const THEME_COLORS = {
    nacht:      '#c8b89a',
    tageslicht: '#6b4f3a',
    farbe:      '#b040f8',
    nebel:      '#5090f0',
    sand:       '#f0a020',
    wald:       '#6a8c3a',
    rost:       '#f04820',
    grau:       '#5060a0',
    bunt:       '#706050',
    karpaten:   '#bd93f9',
  };
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
  let overlay, slidesEl, slides, dots;
  let themeBtn, themeNameEl, weiterBtn, pickerDots;
  let hideThemeTimer = null;
  let slide3Interval = null;
  let slide3StartTimeout = null;
  let weiterVisible = false;
  let wheelSyncFn = null;

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    if (themeNameEl) {
      themeNameEl.textContent = THEME_NAMES[t] || t;
      themeNameEl.classList.add('visible');
      clearTimeout(hideThemeTimer);
      hideThemeTimer = setTimeout(() => themeNameEl.classList.remove('visible'), 1300);
    }
    pickerDots?.forEach((path, i) => {
      path.setAttribute('opacity', THEMES[i] === t ? '1' : '0.35');
    });
    if (wheelSyncFn) wheelSyncFn(t);
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
  }

  function goTo(index) {
    if (current === 2) stopSlide3();
    dots[current].classList.remove('active');
    current = index;
    dots[current].classList.add('active');
    slidesEl.style.transform = `translateX(-${index * 100}%)`;
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
    slidesEl.style.transition = 'none';
    slidesEl.style.transform = 'translateX(0)';
    requestAnimationFrame(() => { slidesEl.style.transition = ''; });
    dots.forEach((d, i) => d.classList.toggle('active', i === 0));
    overlay.removeAttribute('hidden');
  };

  document.addEventListener('DOMContentLoaded', () => {
    overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    slidesEl = overlay.querySelector('.onboarding-slides-track');
    slides = Array.from(overlay.querySelectorAll('.onboarding-slide'));
    dots = Array.from(overlay.querySelectorAll('.onboarding-dot'));
    themeBtn = document.getElementById('onboarding-theme-btn');
    themeNameEl = document.getElementById('onboarding-theme-name');
    weiterBtn = document.getElementById('onboarding-weiter');

    const picker = document.getElementById('theme-picker');
    if (picker) {
      const SIZE = 180, CX = 90, CY = 90, R = 82, INNER = 44;
      const SEG = 360 / THEMES.length, GAP = 3;
      const toRad = a => a * Math.PI / 180;
      let wheelRotation = 0;

      function arcPath(start, end) {
        const x1 = CX + R * Math.cos(toRad(start)), y1 = CY + R * Math.sin(toRad(start));
        const x2 = CX + R * Math.cos(toRad(end)),   y2 = CY + R * Math.sin(toRad(end));
        const x3 = CX + INNER * Math.cos(toRad(end)),   y3 = CY + INNER * Math.sin(toRad(end));
        const x4 = CX + INNER * Math.cos(toRad(start)), y4 = CY + INNER * Math.sin(toRad(start));
        const large = end - start > 180 ? 1 : 0;
        return `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4}Z`;
      }

      function indexFromRotation(rot) {
        return (Math.round(-rot / SEG) % THEMES.length + THEMES.length) % THEMES.length;
      }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
      svg.setAttribute('width', SIZE);
      svg.setAttribute('height', SIZE);

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.style.transformOrigin = `${CX}px ${CY}px`;
      svg.appendChild(group);

      pickerDots = THEMES.map((t, i) => {
        const start = i * SEG - SEG / 2 + GAP / 2 - 90;
        const end   = i * SEG + SEG / 2 - GAP / 2 - 90;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', arcPath(start, end));
        path.setAttribute('fill', THEME_COLORS[t]);
        path.setAttribute('opacity', '0.35');
        group.appendChild(path);
        return path;
      });

      // Fixer Marker oben
      const markerY = CY - (R + INNER) / 2;
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('cx', CX);
      marker.setAttribute('cy', markerY);
      marker.setAttribute('r', 4);
      marker.setAttribute('fill', 'white');
      marker.setAttribute('opacity', '0.9');
      svg.appendChild(marker);

      function rotateTo(rot, animate) {
        group.style.transition = animate ? 'transform 0.25s cubic-bezier(0.4,0,0.2,1)' : 'none';
        group.style.transform = `rotate(${rot}deg)`;
      }

      // Init: aktuelles Theme oben positionieren
      const initIdx = THEMES.indexOf(document.documentElement.getAttribute('data-theme'));
      if (initIdx >= 0) wheelRotation = -initIdx * SEG;
      rotateTo(wheelRotation, false);
      pickerDots[initIdx >= 0 ? initIdx : 0]?.setAttribute('opacity', '1');

      // Drag
      let isDragging = false, dragStartAngle = 0, dragStartRotation = 0, pointerDownAngle = 0;

      function angleFrom(e) {
        const rect = svg.getBoundingClientRect();
        return Math.atan2(e.clientY - rect.top - CY, e.clientX - rect.left - CX) * 180 / Math.PI;
      }

      svg.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isDragging = true;
        svg.setPointerCapture(e.pointerId);
        pointerDownAngle = angleFrom(e);
        dragStartAngle = angleFrom(e);
        dragStartRotation = wheelRotation;
        group.style.transition = 'none';
      });

      svg.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const delta = angleFrom(e) - dragStartAngle;
        wheelRotation = dragStartRotation + delta;
        group.style.transform = `rotate(${wheelRotation}deg)`;
        stopSlide3();
        applyTheme(THEMES[indexFromRotation(wheelRotation)]);
        showWeiter();
      });

      svg.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const upAngle = angleFrom(e);
        const delta = Math.abs(upAngle - pointerDownAngle);
        if (delta < 8) {
          // Klick: Segment unter Zeiger direkt selektieren
          const localAngle = ((upAngle - wheelRotation + 90) % 360 + 360) % 360;
          const clickedIdx = ((Math.round(localAngle / SEG)) % THEMES.length + THEMES.length) % THEMES.length;
          stopSlide3();
          applyTheme(THEMES[clickedIdx]); // applyTheme → wheelSyncFn animiert den Ring
          showWeiter();
        } else {
          const idx = indexFromRotation(wheelRotation);
          wheelRotation = -idx * SEG;
          rotateTo(wheelRotation, true);
        }
      });

      // Ring-Rotation synchron halten wenn Theme von außen gesetzt wird (Auto-Cycle, Tippen)
      wheelSyncFn = (t) => {
        if (isDragging) return;
        const idx = THEMES.indexOf(t);
        if (idx < 0) return;
        wheelRotation = -idx * SEG;
        rotateTo(wheelRotation, true);
      };

      picker.appendChild(svg);

      // Touch-Events nicht an Overlay weiterleiten → kein versehentliches Slide-Swipe
      svg.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
      svg.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
      svg.addEventListener('touchend', e => e.stopPropagation());
    }

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
          t.closest('#onboarding-weiter')) return;
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
          t.closest('#onboarding-weiter') || t.closest('#theme-picker')) return;
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

    // "über" Menüeintrag
    document.getElementById('menu-about')?.addEventListener('click', () => {
      const dropdown = document.getElementById('nav-menu-dropdown');
      if (dropdown) dropdown.hidden = true;
      window.showOnboarding();
    });
  });
})();
