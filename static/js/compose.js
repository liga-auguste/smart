// Ironic labels are intentionally in German — part of the UI aesthetic
const TYPE_LABELS = {
  note:  '',
  quote: 'jemand kluges hat gesagt',
  book:  'papier mit wörtern',
  link:  'internet-fund',
  fact:  'unnötiges wissen',
};

const textarea     = document.getElementById('content');
textarea.focus();
const typeField    = document.getElementById('card-type-field');
const typeLabel    = document.getElementById('type-label');
const saveConfirm  = document.getElementById('save-confirm');
const form         = document.getElementById('compose-form');
const actions      = document.querySelector('.compose-actions');

const SAVE_MESSAGES = [
  'gespeichert. wow.',
  'da ist es.',
  'okay.',
  'noted.',
  'für die nachwelt.',
  'ins leere geschrien.',
  'niemand wird\'s lesen.',
  'gut für dich.',
  'fein gemacht.',
  'irgendwo zwischen ernst und egal.',
  'wer weiß wozu.',
];

let saveMessageIndex = 0;
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

  actions.classList.toggle('visible', content.trim().length > 0);
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    });

    if (!res.ok) return;
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
  } catch (e) {
    // still
  }
});

function getCookie(name) {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return '';
}
