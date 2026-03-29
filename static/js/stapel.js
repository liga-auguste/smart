function initRow(row) {
  const nameEl = row.querySelector('.stapel-row-name');
  const deleteBtn = row.querySelector('.stapel-row-delete');
  let originalName = row.dataset.name;
  let lastTap = 0;
  let blurTimer = null;
  let navTimer = null;

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
    }).catch(() => { nameEl.textContent = originalName; });
  }

  nameEl.addEventListener('pointerup', (e) => {
    if (row.classList.contains('renaming')) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      lastTap = 0;
      clearTimeout(navTimer);
      enterRename();
    } else {
      lastTap = now;
      clearTimeout(navTimer);
      navTimer = setTimeout(() => {
        window.location.href = `/cards/?stapel=${encodeURIComponent(originalName)}`;
      }, 300);
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
    clearTimeout(blurTimer);
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
        row.innerHTML = `<span class="stapel-row-name">${data.name}</span><span class="stapel-row-count">${data.count}</span><button type="button" class="stapel-row-delete">×</button>`;
        newRow.insertAdjacentElement('beforebegin', row);
        initRow(row);
        newName.value = '';
        newSave.hidden = true;
        newName.blur();
        const empty = document.querySelector('.stapel-empty');
        if (empty) empty.remove();
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

function getCookie(name) {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return '';
}
