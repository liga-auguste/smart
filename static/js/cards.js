const isSingleView = !document.querySelector('.card-list--alle');
if (isSingleView) {
  document.body.classList.add('single-view');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting));
  }, { threshold: 0.1 });

  document.querySelectorAll('.card').forEach(c => observer.observe(c));
}

// === DRAG, DROP & SWIPE-TO-DELETE (liste view) ===

const cardList = document.querySelector('.card-list--alle');
let isDragging = false;

if (cardList) {
  let mode = null; // 'drag' | 'swipe' | null
  let dragged = null;
  let ghost = null;
  let offsetY = 0;
  let longPressTimer = null;
  let downCard = null;
  let downX = 0;
  let downY = 0;

  cardList.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      downCard = card;
      downX = e.clientX;
      downY = e.clientY;
      mode = null;

      if (e.pointerType !== 'mouse') {
        longPressTimer = setTimeout(() => {
          if (mode === null) {
            mode = 'drag';
            isDragging = true;
            startDrag(card, e);
          }
        }, 300);
      }
    });
  });

  document.addEventListener('pointermove', (e) => {
    if (!downCard) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (mode === null) {
      if (adx > 10 && adx > ady * 1.5 && dx < 0) {
        // horizontal swipe left
        clearTimeout(longPressTimer);
        mode = 'swipe';
        downCard.classList.add('swiping');
      } else if (ady > 10 && ady > adx * 1.5) {
        // vertical drag
        if (downCard.pointerType === 'mouse' || !longPressTimer) return;
        // touch: wait for long press; mouse: start drag now
        if (e.pointerType === 'mouse') {
          clearTimeout(longPressTimer);
          mode = 'drag';
          isDragging = true;
          startDrag(downCard, { clientX: downX, clientY: downY });
        }
      }
    }

    if (mode === 'swipe') {
      e.preventDefault();
      const tx = Math.min(0, dx);
      downCard.style.transform = `translateX(${tx}px)`;
      downCard.style.opacity = 1 + tx / downCard.offsetWidth;
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
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
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
    clearTimeout(longPressTimer);
    longPressTimer = null;

    if (mode === 'swipe' && downCard) {
      const dx = e.clientX - downX;
      if (Math.abs(dx) > downCard.offsetWidth * 0.35) {
        // delete — slide out, then collapse height so others move up
        const card = downCard;
        const id = parseInt(card.dataset.id);
        const h = card.offsetHeight;
        card.style.overflow = 'hidden';
        card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        card.style.transform = `translateX(-100%)`;
        card.style.opacity = '0';
        setTimeout(() => {
          card.style.transition = 'height 0.18s ease, padding 0.18s ease';
          card.style.height = h + 'px';
          requestAnimationFrame(() => {
            card.style.height = '0';
            card.style.padding = '0';
          });
          setTimeout(() => card.remove(), 180);
        }, 200);
        fetch(`/api/cards/${id}/delete/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCookie('csrftoken') },
        }).catch(() => {});
      } else {
        // snap back
        downCard.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        downCard.style.transform = '';
        downCard.style.opacity = '';
        setTimeout(() => {
          downCard.style.transition = '';
          downCard.classList.remove('swiping');
        }, 200);
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
  let metaTimer = null;

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

    const now = Date.now();
    if (now - lastTap < 300) {
      lastTap = 0;
      enterEdit();
    } else {
      lastTap = now;
      if (isSingleView) {
        card.classList.add('meta-visible');
        document.body.classList.add('meta-active');
        clearTimeout(metaTimer);
        metaTimer = setTimeout(() => {
          card.classList.remove('meta-visible');
          document.body.classList.remove('meta-active');
        }, 5000);
      } else {
        card.classList.toggle('meta-visible');
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

function getCookie(name) {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return '';
}
