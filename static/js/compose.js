const textarea = document.getElementById('content');
textarea.focus();
const form    = document.getElementById('compose-form');
const actions = document.querySelector('.compose-actions');

textarea.addEventListener('input', () => {
  actions.classList.toggle('visible', textarea.value.trim().length > 0);
});

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
