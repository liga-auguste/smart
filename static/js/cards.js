const isSingleView = !document.querySelector('.card-list--alle');
const cardList = document.querySelector('.card-list--alle');
const menuBtn = document.getElementById('nav-menu-btn');
const menuDropdown = document.getElementById('nav-menu-dropdown');
let activeMode = null;

function enterMode(m) {
  if (!cardList) return;
  activeMode = m;
  cardList.classList.add(m + '-mode');
  if (menuBtn) { menuBtn.textContent = 'fertig'; menuBtn.classList.add('sort-active'); }
  if (menuDropdown) menuDropdown.hidden = true;
  if (m === 'sort') buildSortGroups();
}

function exitMode() {
  if (!cardList || !activeMode) return;
  if (activeMode === 'sort') teardownSortGroups();
  cardList.classList.remove(activeMode + '-mode');
  activeMode = null;
  if (menuBtn) { menuBtn.textContent = '⋯'; menuBtn.classList.remove('sort-active'); }
}

function buildSortGroups() {
  const cards = [...cardList.querySelectorAll('.card')];
  const stapelValues = [...new Set(cards.map(c => c.dataset.stapel || ''))];
  if (stapelValues.length <= 1) return;

  const groups = {};
  const order = [];
  cards.forEach(card => {
    const s = card.dataset.stapel || '';
    if (!groups[s]) { groups[s] = []; order.push(s); }
    groups[s].push(card);
    card.remove();
  });

  order.forEach(s => {
    const section = document.createElement('div');
    section.className = 'stapel-section';
    section.dataset.stapel = s;
    const header = document.createElement('div');
    header.className = 'stapel-section-header';
    header.textContent = s || 'ohne stapel';
    section.appendChild(header);
    groups[s].forEach(c => section.appendChild(c));
    cardList.appendChild(section);
  });
}

function teardownSortGroups() {
  const sections = [...cardList.querySelectorAll('.stapel-section')];
  if (!sections.length) return;
  const cards = [...cardList.querySelectorAll('.card')];
  sections.forEach(s => s.remove());
  cards.forEach(c => cardList.appendChild(c));
}

if (menuBtn && menuDropdown) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeMode) {
      exitMode();
    } else {
      menuDropdown.hidden = !menuDropdown.hidden;
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!menuDropdown.hidden && !menuDropdown.contains(e.target) && !e.target.closest('.nav-menu-wrap')) {
      menuDropdown.hidden = true;
    }
  }, { capture: true });
}

document.getElementById('menu-sort')?.addEventListener('click', () => { enterMode('sort'); });
document.getElementById('menu-delete')?.addEventListener('click', () => { enterMode('delete'); });


if (isSingleView) {
  document.body.classList.add('single-view');

  const navStapel = document.getElementById('nav-stapel');

  if (navStapel && !navStapel.classList.contains('nav-stapel--active')) {
    navStapel.style.cursor = 'pointer';
    navStapel.addEventListener('click', () => {
      const s = navStapel.textContent.trim();
      if (s) window.location.href = `/cards/?stapel=${encodeURIComponent(s)}`;
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      e.target.classList.toggle('in-view', e.isIntersecting);
      if (e.isIntersecting) {
        localStorage.setItem('lastCard', e.target.id);
        if (navStapel && !navStapel.classList.contains('nav-stapel--active')) {
          navStapel.textContent = e.target.dataset.stapel || '';
        }
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.card').forEach(c => observer.observe(c));

  // Zur Karte aus Hash scrollen
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) target.scrollIntoView({ behavior: 'instant', inline: 'start', block: 'nearest' });
  }
} else {
  // Listenansicht: "karten"-Link mit letzter Karte verknüpfen
  const lastCard = localStorage.getItem('lastCard');
  if (lastCard) {
    document.querySelectorAll('a.nav-link').forEach(a => {
      if (a.href.includes('/cards/') && !a.href.includes('?')) {
        a.href = `/cards/#${lastCard}`;
      }
    });
  }
}

// === DRAG, DROP & DELETE (liste view) ===

let isDragging = false;

if (cardList) {
  let mode = null;
  let dragged = null;
  let ghost = null;
  let offsetY = 0;
  let downCard = null;
  let downX = 0;
  let downY = 0;
  let downPointerId = null;

  cardList.querySelectorAll('.card').forEach(card => {
    const handle = document.createElement('span');
    handle.className = 'card-drag-handle';
    handle.setAttribute('aria-hidden', 'true');
    card.appendChild(handle);

    const btn = document.createElement('button');
    btn.className = 'card-delete-btn';
    btn.type = 'button';
    btn.textContent = '×';
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(card);
    });
    card.appendChild(btn);

    handle.addEventListener('pointerdown', (e) => {
      if (activeMode !== 'sort') return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();
      downCard = card;
      downX = e.clientX;
      downY = e.clientY;
      downPointerId = e.pointerId;
      mode = 'drag';
      isDragging = true;
      if (navigator.vibrate) navigator.vibrate(20);
      handle.setPointerCapture(e.pointerId);
      startDrag(card, e);
    });
  });

  function deleteCard(card) {
    const id = parseInt(card.dataset.id);
    const h = card.offsetHeight;
    card.style.transition = 'opacity 0.2s ease';
    card.style.opacity = '0';
    setTimeout(() => {
      card.style.transition = 'height 0.18s ease';
      card.style.overflow = 'hidden';
      card.style.height = h + 'px';
      requestAnimationFrame(() => { card.style.height = '0'; });
      setTimeout(() => card.remove(), 180);
    }, 200);
    fetch(`/api/cards/${id}/delete/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
    }).catch(() => {});
  }

  document.addEventListener('pointermove', (e) => {
    if (mode !== 'drag' || !downCard) return;
    e.preventDefault();
    if (!ghost) return;
    ghost.style.top = `${e.clientY - offsetY}px`;

    ghost.style.visibility = 'hidden';
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.card-list--alle .card');
    ghost.style.visibility = '';

    cardList.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== dragged) target.classList.add('drag-over');
  }, { passive: false });

  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);

  function startDrag(card, e) {
    dragged = card;
    const rect = card.getBoundingClientRect();
    offsetY = (e.clientY || downY) - rect.top;

    ghost = card.cloneNode(true);
    const ghostBody = ghost.querySelector('.card-body');
    if (ghostBody) ghostBody.style.display = 'none';
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      min-width: 0;
      opacity: 0.9;
      pointer-events: none;
      z-index: 1000;
      background: var(--bg-card);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(ghost);
    document.body.style.userSelect = 'none';
    card.classList.add('dragging');
  }

  function onUp(e) {
    if (mode === 'drag') {
      isDragging = false;
      if (ghost) { ghost.remove(); ghost = null; }
      if (dragged) {
        dragged.classList.remove('dragging');
        document.body.style.userSelect = '';
        const target = cardList.querySelector('.card.drag-over');
        cardList.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
        if (target && target !== dragged) {
          const draggedStapel = dragged.dataset.stapel || '';
          const targetStapel = target.dataset.stapel || '';
          if (draggedStapel !== targetStapel) {
            dragged.dataset.stapel = targetStapel;
            const targetSection = target.closest('.stapel-section');
            if (targetSection) targetSection.appendChild(dragged);
            updateCardStapel(dragged, targetStapel);
          }
          const cards = [...cardList.querySelectorAll('.card')];
          if (cards.indexOf(dragged) < cards.indexOf(target)) target.after(dragged);
          else target.before(dragged);
          saveOrder();
        }
        dragged = null;
      }
    }
    downCard = null;
    mode = null;
  }

  function updateCardStapel(card, stapel) {
    fetch(`/api/cards/${card.dataset.id}/edit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
      body: JSON.stringify({ stapel }),
    }).catch(() => {});
  }

  function saveOrder() {
    const ids = [...cardList.querySelectorAll('.card')].map(c => parseInt(c.dataset.id));
    fetch('/api/cards/reorder/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }

}

// === TAP / EDIT ===

document.querySelectorAll('.card').forEach(card => {
  let lastTap = 0;
  let blurTimer = null;
  let originalHeadline = '';
  let originalBody = '';
  let originalStapel = '';
  let pointerStart = null;
  let navTimer = null;

  card.addEventListener('pointerdown', (e) => {
    pointerStart = { x: e.clientX, y: e.clientY };
  }, { passive: true });

  card.addEventListener('pointercancel', () => { pointerStart = null; });

  card.addEventListener('pointerup', (e) => {
    if (!pointerStart) return;
    if (isDragging) { pointerStart = null; return; }
    const dx = Math.abs(e.clientX - pointerStart.x);
    const dy = Math.abs(e.clientY - pointerStart.y);
    pointerStart = null;
    if (dx > 10 || dy > 10) return;
    if (card.classList.contains('editing')) return;
    if (card.classList.contains('swipe-open')) return;

    const now = Date.now();
    if (now - lastTap < 300) {
      lastTap = 0;
      enterEdit();
    } else {
      lastTap = now;
      if (isSingleView) {
        clearTimeout(navTimer);
        if (document.body.classList.contains('nav-visible')) {
          document.body.classList.remove('nav-visible');
        } else {
          document.body.classList.add('nav-visible');
          navTimer = setTimeout(() => document.body.classList.remove('nav-visible'), 3000);
        }
      } else {
        window.location.href = `/cards/#card-${card.dataset.id}`;
      }
    }
  });

  card.addEventListener('focusin', () => clearTimeout(blurTimer));

  function enterEdit() {
    const display = card.querySelector('.card-display');
    const headlineEl = display.querySelector('.card-headline');

    let bodyEl = display.querySelector('.card-body');
    if (!bodyEl) {
      bodyEl = document.createElement('div');
      bodyEl.className = 'card-body';
      headlineEl.after(bodyEl);
    }

    originalHeadline = headlineEl.textContent;
    originalBody = bodyEl.innerText;
    originalStapel = card.dataset.stapel || '';

    card.classList.add('editing');
    headlineEl.contentEditable = 'true';
    bodyEl.contentEditable = 'true';

    placeCursorAtEnd(headlineEl);
    headlineEl.focus();

    headlineEl.addEventListener('keydown', onHeadlineKeydown);
    headlineEl.addEventListener('blur', scheduleExit);
    bodyEl.addEventListener('blur', scheduleExit);
    bodyEl.addEventListener('keydown', onBodyKeydown);

    const stapelInput = document.createElement('input');
    stapelInput.type = 'text';
    stapelInput.className = 'card-edit-stapel';
    stapelInput.placeholder = 'stapel';
    stapelInput.value = originalStapel;
    stapelInput.autocomplete = 'off';
    stapelInput.spellcheck = false;
    stapelInput.addEventListener('mousedown', (e) => e.stopPropagation());
    stapelInput.addEventListener('blur', scheduleExit);
    display.appendChild(stapelInput);

    const stapelList = (document.querySelector('[data-stapel-list]')?.dataset.stapelList || '').split('|').filter(Boolean);
    if (stapelList.length) {
      const chipsEl = document.createElement('div');
      chipsEl.className = 'card-edit-stapel-chips';
      stapelList.forEach(s => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'compose-stapel-chip' + (s === originalStapel ? ' active' : '');
        chip.textContent = s;
        chip.addEventListener('mousedown', (e) => e.preventDefault());
        chip.addEventListener('click', () => {
          stapelInput.value = s;
          chipsEl.querySelectorAll('.compose-stapel-chip').forEach(c => c.classList.toggle('active', c === chip));
          stapelInput.focus();
        });
        chipsEl.appendChild(chip);
      });
      display.appendChild(chipsEl);
    }

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'card-edit-save-btn';
    saveBtn.textContent = 'speichern';
    saveBtn.addEventListener('mousedown', (e) => e.preventDefault());
    saveBtn.addEventListener('click', () => exitEdit(false));
    display.appendChild(saveBtn);
  }

  function onHeadlineKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const bodyEl = card.querySelector('.card-body');
      placeCursorAtEnd(bodyEl);
      bodyEl.focus();
    }
    if (e.key === 'Escape') exitEdit(true);
  }

  function onBodyKeydown(e) {
    if (e.key === 'Escape') exitEdit(true);
  }

  function scheduleExit() {
    clearTimeout(blurTimer);
    blurTimer = setTimeout(() => exitEdit(false), 150);
  }

  function placeCursorAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function exitEdit(cancel) {
    clearTimeout(blurTimer);
    const display = card.querySelector('.card-display');
    const headlineEl = display.querySelector('.card-headline');
    const bodyEl = display.querySelector('.card-body');
    const saveBtn = display.querySelector('.card-edit-save-btn');
    const stapelInput = display.querySelector('.card-edit-stapel');
    const chipsEl = display.querySelector('.card-edit-stapel-chips');
    if (saveBtn) saveBtn.remove();
    if (chipsEl) chipsEl.remove();

    const newStapel = stapelInput ? stapelInput.value.trim() : originalStapel;
    if (stapelInput) stapelInput.remove();

    card.classList.remove('editing');
    headlineEl.contentEditable = 'false';
    headlineEl.removeEventListener('keydown', onHeadlineKeydown);
    headlineEl.removeEventListener('blur', scheduleExit);
    if (bodyEl) {
      bodyEl.contentEditable = 'false';
      bodyEl.removeEventListener('blur', scheduleExit);
      bodyEl.removeEventListener('keydown', onBodyKeydown);
    }

    if (cancel) {
      headlineEl.textContent = originalHeadline;
      if (bodyEl) bodyEl.textContent = originalBody;
      return;
    }

    const headline = headlineEl.textContent.trim();
    const body = bodyEl ? bodyEl.innerText.trim() : '';
    const newContent = body ? headline + '\n' + body : headline;
    const oldContent = originalBody ? originalHeadline + '\n' + originalBody : originalHeadline;
    const contentChanged = newContent !== oldContent && headline;
    const stapelChanged = newStapel !== originalStapel;

    if (contentChanged || stapelChanged) {
      const payload = {};
      if (contentChanged) payload.content = newContent;
      if (stapelChanged) {
        payload.stapel = newStapel;
        card.dataset.stapel = newStapel;
        const navStapelEl = document.getElementById('nav-stapel');
        if (navStapelEl && !navStapelEl.classList.contains('nav-stapel--active') && card.classList.contains('in-view')) {
          navStapelEl.textContent = newStapel;
        }
        const stapelLabel = card.querySelector('.card-stapel');
        if (newStapel) {
          if (stapelLabel) stapelLabel.textContent = newStapel;
          else {
            const label = document.createElement('span');
            label.className = 'card-stapel';
            label.textContent = newStapel;
            card.prepend(label);
          }
        } else if (stapelLabel) {
          stapelLabel.remove();
        }
      }
      fetch(`/api/cards/${card.dataset.id}/edit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }
});

// === KEYBOARD NAVIGATION (single view) ===

if (isSingleView) {
  const list = document.querySelector('.card-list');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      list.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      list.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
    }
  });
}

// === SUCHE ===


const navSearchToggle = document.getElementById('nav-search-toggle');
const searchBar = document.getElementById('search-bar');
const searchBarInput = document.getElementById('search-bar-input');

if (searchBar) {
  const nav = document.querySelector('.nav');
  let searchBlurFromPointer = false;

  document.addEventListener('pointerdown', (e) => {
    if (!searchBar.hidden && !searchBar.contains(e.target)) {
      searchBlurFromPointer = true;
    }
  }, { capture: true });

  function openSearch() {
    if (isSingleView) {
      document.body.classList.add('nav-visible');
      searchBar.style.top = nav.offsetHeight + 'px';
    }
    searchBar.removeAttribute('hidden');
    searchBarInput.focus();
  }

  function closeSearch() {
    searchBar.setAttribute('hidden', '');
    if (isSingleView) {
      document.body.classList.remove('nav-visible');
      searchBar.style.top = '';
    }
  }

  searchBarInput.addEventListener('blur', () => {
    const fromPointer = searchBlurFromPointer;
    searchBlurFromPointer = false;
    if (!fromPointer && searchBarInput.value.trim()) {
      searchBarInput.closest('form').submit();
    }
  });

  navSearchToggle?.addEventListener('click', () => {
    if (!searchBar.hidden) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  document.getElementById('menu-search')?.addEventListener('click', () => {
    if (menuDropdown) menuDropdown.hidden = true;
    openSearch();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !searchBar.hidden && !searchBarInput.value) {
      closeSearch();
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!searchBar.hidden && !searchBarInput.value && !searchBar.contains(e.target) && !navSearchToggle?.contains(e.target)) {
      closeSearch();
    }
  });
}

function getCookie(name) {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return '';
}
