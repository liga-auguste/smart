function getCookie(name) {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return '';
}

function initRow(row) {
  const nameEl = row.querySelector('.stapel-row-name');
  const editBtn = row.querySelector('.stapel-row-edit');
  const deleteBtn = row.querySelector('.stapel-row-delete');
  let originalName = row.dataset.name;
  let blurTimer = null;

  function enterRename() {
    row.classList.add('renaming');
    nameEl.contentEditable = 'true';
    nameEl.focus();
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }

  function exitRename(cancel) {
    clearTimeout(blurTimer);
    nameEl.contentEditable = 'false';
    row.classList.remove('renaming');
    const newName = nameEl.textContent.trim();
    if (cancel || !newName || newName === originalName) {
      nameEl.textContent = originalName;
      return;
    }
    fetch('/api/stapel/rename/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
      body: JSON.stringify({ old_name: originalName, new_name: newName }),
    }).then(() => {
      originalName = newName;
      row.dataset.name = newName;
      nameEl.href = `/cards/?alle&stapel=${encodeURIComponent(newName)}`;
    }).catch(() => { nameEl.textContent = originalName; });
  }

  editBtn.addEventListener('pointerdown', (e) => e.preventDefault());
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (row.classList.contains('renaming')) {
      exitRename(false);
    } else {
      enterRename();
    }
  });

  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); exitRename(false); }
    if (e.key === 'Escape') exitRename(true);
  });

  nameEl.addEventListener('blur', () => {
    blurTimer = setTimeout(() => exitRename(false), 150);
  });

  deleteBtn.addEventListener('pointerdown', (e) => e.preventDefault());
  deleteBtn.addEventListener('click', () => {
    if (!confirm(`„${originalName}" löschen? Die Karten bleiben erhalten.`)) return;
    fetch('/api/stapel/delete/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
      body: JSON.stringify({ name: originalName }),
    }).then(() => {
      row.style.transition = 'opacity 0.2s';
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 200);
    }).catch(() => {});
  });
}

document.querySelectorAll('.stapel-row:not(.stapel-row--new)').forEach(initRow);

// === DRAG & DROP ===

const wrap = document.querySelector('.stapel-list-wrap');
let dragRow = null;
let dragStartY = 0;
let dragOffsetY = 0;
let placeholder = null;

function getRows() {
  return [...wrap.querySelectorAll('.stapel-row:not(.stapel-row--new)')];
}

function saveOrder() {
  const names = getRows().map(r => r.dataset.name);
  fetch('/api/stapel/reorder/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ names }),
  }).catch(() => {});
}

wrap.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.stapel-row-handle');
  if (!handle) return;
  const row = handle.closest('.stapel-row');
  if (!row) return;

  e.preventDefault();
  dragRow = row;
  dragStartY = e.clientY;

  const rect = row.getBoundingClientRect();
  dragOffsetY = e.clientY - rect.top;

  placeholder = document.createElement('div');
  placeholder.className = 'stapel-row-placeholder';
  placeholder.style.height = rect.height + 'px';
  row.insertAdjacentElement('afterend', placeholder);

  row.style.position = 'fixed';
  row.style.top = rect.top + 'px';
  row.style.left = rect.left + 'px';
  row.style.width = rect.width + 'px';
  row.style.zIndex = '100';
  row.classList.add('dragging');

  wrap.setPointerCapture(e.pointerId);
});

wrap.addEventListener('pointermove', (e) => {
  if (!dragRow) return;
  const y = e.clientY - dragOffsetY;
  dragRow.style.top = y + 'px';

  const rows = getRows().filter(r => r !== dragRow);
  let inserted = false;
  for (const r of rows) {
    const rect = r.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      r.insertAdjacentElement('beforebegin', placeholder);
      inserted = true;
      break;
    }
  }
  if (!inserted && rows.length) {
    rows[rows.length - 1].insertAdjacentElement('afterend', placeholder);
  }
});

wrap.addEventListener('pointerup', () => {
  if (!dragRow) return;
  dragRow.style.position = '';
  dragRow.style.top = '';
  dragRow.style.left = '';
  dragRow.style.width = '';
  dragRow.style.zIndex = '';
  dragRow.classList.remove('dragging');
  placeholder.replaceWith(dragRow);
  placeholder = null;
  saveOrder();
  dragRow = null;
});

wrap.addEventListener('pointercancel', () => {
  if (!dragRow) return;
  dragRow.style.position = '';
  dragRow.style.top = '';
  dragRow.style.left = '';
  dragRow.style.width = '';
  dragRow.style.zIndex = '';
  dragRow.classList.remove('dragging');
  placeholder?.remove();
  placeholder = null;
  dragRow = null;
});

const newRow = document.getElementById('stapel-row-new');
const newName = document.getElementById('stapel-new-name');
const newSave = document.getElementById('stapel-new-save');
if (newName && newSave) {
  function submitNew() {
    const name = newName.value.trim();
    if (!name) return;
    fetch('/api/stapel/create/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
      body: JSON.stringify({ name }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        const row = document.createElement('div');
        row.className = 'stapel-row';
        row.dataset.name = data.name;

        const a = document.createElement('a');
        a.className = 'stapel-row-name';
        a.href = `/cards/?alle&stapel=${encodeURIComponent(data.name)}`;
        a.textContent = data.name;

        const count = document.createElement('span');
        count.className = 'stapel-row-count';
        count.textContent = data.count;

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'stapel-row-edit';
        editBtn.setAttribute('aria-label', 'umbenennen');
        editBtn.textContent = '✎';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'stapel-row-delete';
        deleteBtn.setAttribute('aria-label', 'löschen');
        deleteBtn.textContent = '×';

        row.append(a, count, editBtn, deleteBtn);
        newRow.insertAdjacentElement('beforebegin', row);
        initRow(row);
        newName.value = '';
        newSave.hidden = true;
        newName.blur();
        document.querySelector('.stapel-empty')?.remove();
      }
    });
  }

  newName.addEventListener('input', () => {
    newSave.hidden = !newName.value.trim();
  });
  newName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitNew(); }
    if (e.key === 'Escape') { newName.value = ''; newSave.hidden = true; newName.blur(); }
  });
  newSave.addEventListener('mousedown', (e) => e.preventDefault());
  newSave.addEventListener('click', submitNew);
}
