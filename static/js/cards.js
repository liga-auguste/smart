const isSingleView = !document.querySelector('.card-list--alle');
if (isSingleView) {
  document.body.classList.add('single-view');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      e.target.classList.toggle('in-view', e.isIntersecting);
      if (e.isIntersecting) localStorage.setItem('lastCard', e.target.id);
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

// === DRAG, DROP & SWIPE-TO-DELETE (liste view) ===

const cardList = document.querySelector('.card-list--alle');
let isDragging = false;

if (cardList) {
  let mode = null; // 'drag' | 'swipe' | null
  let dragged = null;
  let ghost = null;
  let offsetY = 0;
  let downCard = null;
  let downX = 0;
  let downY = 0;
  let downPointerId = null;
  let openCard = null; // card currently swiped open showing delete btn

  // Wrap each card and add delete button to wrapper
  cardList.querySelectorAll('.card').forEach(card => {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-swipe-wrapper';
    card.parentNode.insertBefore(wrapper, card);
    wrapper.appendChild(card);

    const btn = document.createElement('button');
    btn.className = 'card-delete-btn';
    btn.type = 'button';
    btn.textContent = 'löschen';
    wrapper.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(card);
    });
  });

  function snapOpen(card) {
    const wrapper = card.parentNode;
    const btn = wrapper.querySelector('.card-delete-btn');
    const snapX = -(btn.offsetWidth + 24);
    card.style.transition = 'transform 0.2s ease';
    card.style.transform = `translateX(${snapX}px)`;
    wrapper.classList.add('swipe-open');
    setTimeout(() => { card.style.transition = ''; }, 200);
    openCard = card;
  }

  function snapClosed(card) {
    card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    card.style.transform = '';
    card.style.opacity = '';
    card.parentNode.classList.remove('swipe-open');
    card.classList.remove('swiping');
    setTimeout(() => { card.style.transition = ''; }, 200);
    if (openCard === card) openCard = null;
  }

  function deleteCard(card) {
    const id = parseInt(card.dataset.id);
    const wrapper = card.parentNode;
    const h = wrapper.offsetHeight;
    card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    card.style.transform = 'translateX(-100%)';
    card.style.opacity = '0';
    setTimeout(() => {
      wrapper.style.transition = 'height 0.18s ease';
      wrapper.style.overflow = 'hidden';
      wrapper.style.height = h + 'px';
      requestAnimationFrame(() => { wrapper.style.height = '0'; });
      setTimeout(() => wrapper.remove(), 180);
    }, 200);
    fetch(`/api/cards/${id}/delete/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
    }).catch(() => {});
    openCard = null;
  }

  // Close open card when tapping elsewhere
  document.addEventListener('pointerdown', (e) => {
    if (openCard && !openCard.parentNode.contains(e.target)) {
      snapClosed(openCard);
    }
  }, { capture: true });

  cardList.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (openCard === card && !e.target.closest('.card-delete-btn')) {
        snapClosed(card);
        e.stopPropagation();
        return;
      }
      downCard = card;
      downX = e.clientX;
      downY = e.clientY;
      downPointerId = e.pointerId;
      mode = null;

      // mouse drag starts on vertical move (see pointermove)
    });
  });

  document.addEventListener('pointermove', (e) => {
    if (!downCard) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (mode === null) {
      if (e.pointerType === 'mouse') {
        if (ady > 5) {
          mode = 'drag';
          isDragging = true;
          startDrag(downCard, { clientX: downX, clientY: downY });
        }
      } else {
        if (adx > 10 && adx > ady * 1.5 && dx < 0) {
          // links swipen → löschen
          if (openCard && openCard !== downCard) snapClosed(openCard);
          mode = 'swipe';
          downCard.setPointerCapture(downPointerId);
          downCard.classList.add('swiping');
        } else if (adx > 10 && adx > ady * 1.5 && dx > 0) {
          // rechts swipen → drag starten
          if (openCard) snapClosed(openCard);
          mode = 'drag';
          isDragging = true;
          downCard.setPointerCapture(downPointerId);
          startDrag(downCard, { clientX: downX, clientY: downY, pointerId: downPointerId });
        } else if (ady > 8) {
          downCard = null;
        }
      }
    }

    if (mode === 'swipe') {
      const tx = Math.min(0, dx);
      downCard.style.transform = `translateX(${tx}px)`;
      downCard.style.opacity = 1 + tx / downCard.offsetWidth * 0.3;
    }

    if (mode === 'drag') {
      e.preventDefault();
      if (!ghost) return;
      ghost.style.top = `${e.clientY - offsetY}px`;

      ghost.style.visibility = 'hidden';
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.card-list--alle .card');
      ghost.style.visibility = '';

      cardList.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
      if (target && target !== dragged) target.classList.add('drag-over');
    }
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
    if (mode === 'swipe' && downCard) {
      const dx = e.clientX - downX;
      if (Math.abs(dx) > downCard.offsetWidth * 0.35) {
        snapOpen(downCard);
      } else {
        snapClosed(downCard);
      }
    }

    if (mode === 'drag') {
      isDragging = false;
      if (ghost) { ghost.remove(); ghost = null; }
      if (dragged) {
        dragged.classList.remove('dragging');
        document.body.style.userSelect = '';
        const target = cardList.querySelector('.card.drag-over');
        cardList.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
        if (target && target !== dragged) {
          const cards = [...cardList.querySelectorAll('.card')];
          const draggedWrapper = dragged.parentNode;
          const targetWrapper = target.parentNode;
          if (cards.indexOf(dragged) < cards.indexOf(target)) targetWrapper.after(draggedWrapper);
          else targetWrapper.before(draggedWrapper);
          saveOrder();
        }
        dragged = null;
      }
    }

    downCard = null;
    mode = null;
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
        document.body.classList.add('nav-visible');
        navTimer = setTimeout(() => document.body.classList.remove('nav-visible'), 3000);
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
    originalBody = bodyEl.textContent;

    card.classList.add('editing');
    headlineEl.contentEditable = 'true';
    bodyEl.contentEditable = 'true';

    placeCursorAtEnd(headlineEl);
    headlineEl.focus();

    headlineEl.addEventListener('keydown', onHeadlineKeydown);
    headlineEl.addEventListener('blur', scheduleExit);
    bodyEl.addEventListener('blur', scheduleExit);
    bodyEl.addEventListener('keydown', onBodyKeydown);
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
    const body = bodyEl ? bodyEl.textContent.trim() : '';
    const newContent = body ? headline + '\n' + body : headline;
    const oldContent = originalBody ? originalHeadline + '\n' + originalBody : originalHeadline;

    if (newContent !== oldContent && headline) {
      fetch(`/api/cards/${card.dataset.id}/edit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({ content: newContent }),
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

if (navSearchToggle && searchBar) {
  navSearchToggle.addEventListener('click', () => {
    searchBar.removeAttribute('hidden');
    searchBarInput.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !searchBar.hidden && !searchBarInput.value) {
      searchBar.setAttribute('hidden', '');
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!searchBar.hidden && !searchBarInput.value && !searchBar.contains(e.target) && e.target !== navSearchToggle) {
      searchBar.setAttribute('hidden', '');
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
