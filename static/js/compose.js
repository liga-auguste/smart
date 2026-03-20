// Ironic labels are intentionally in German — part of the UI aesthetic
const TYPE_LABELS = {
  note:  '',
  quote: 'jemand kluges hat gesagt',
  book:  'papier mit wörtern',
  link:  'internet-fund',
  fact:  'unnötiges wissen',
};

const textarea     = document.getElementById('content');
const typeField    = document.getElementById('card-type-field');
const typeLabel    = document.getElementById('type-label');
const saveConfirm  = document.getElementById('save-confirm');
const form         = document.getElementById('compose-form');

let debounceTimer = null;

function detectTypeClientside(content) {
  if (/https?:\/\//.test(content)) return 'link';
  if (/—\s*\S/.test(content)) return 'quote';
  return 'note';
}

function updateTypeLabel(cardType) {
  typeLabel.textContent = TYPE_LABELS[cardType] || '';
  typeField.value = cardType;
}

textarea.addEventListener('input', () => {
  const content = textarea.value;

  // Immediate client-side type detection
  updateTypeLabel(detectTypeClientside(content));

  // Debounced API call
  clearTimeout(debounceTimer);
  if (content.trim().length > 10) {
    debounceTimer = setTimeout(() => analyseViaAPI(content), 500);
  }
});

async function analyseViaAPI(content) {
  try {
    const res = await fetch('/api/analyse/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return;
    const data = await res.json();

    // Only fill empty fields — never overwrite manual input
    if (data.card_type && typeField.value === 'note') {
      updateTypeLabel(data.card_type);
    }
  } catch (e) {
    // silent — no error shown to user
  }
}

form.addEventListener('submit', () => {
  setTimeout(() => {
    saveConfirm.classList.add('visible');
    setTimeout(() => saveConfirm.classList.remove('visible'), 2000);
  }, 50);
});

function getCookie(name) {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return '';
}
