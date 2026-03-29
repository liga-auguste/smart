document.getElementById('compose-headline').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('compose-body').focus();
  }
});

const stapelInput = document.getElementById('compose-stapel');
const stapelValue = document.getElementById('compose-stapel-value');
const stapelChips = document.getElementById('compose-stapel-chips');

if (stapelInput && stapelValue) {
  // Preset stapel from URL (e.g. from /stapel/ view)
  if (stapelValue.value) {
    const chipFound = stapelChips && [...stapelChips.querySelectorAll('.compose-stapel-chip')]
      .some(c => { if (c.dataset.value === stapelValue.value) { c.classList.add('active'); return true; } });
    if (!chipFound) stapelInput.value = stapelValue.value;
  }

  stapelInput.addEventListener('input', () => {
    stapelValue.value = stapelInput.value.trim();
    stapelChips?.querySelectorAll('.compose-stapel-chip').forEach(c => c.classList.remove('active'));
  });

  if (stapelChips) {
    stapelInput.addEventListener('focus', () => stapelChips.removeAttribute('hidden'));
    stapelInput.addEventListener('blur', () => setTimeout(() => stapelChips.setAttribute('hidden', ''), 150));

    stapelChips.querySelectorAll('.compose-stapel-chip').forEach(chip => {
      chip.addEventListener('mousedown', (e) => e.preventDefault());
      chip.addEventListener('click', () => {
        stapelValue.value = chip.dataset.value;
        stapelInput.value = '';
        stapelChips.querySelectorAll('.compose-stapel-chip').forEach(c => c.classList.toggle('active', c === chip));
        stapelInput.focus();
      });
    });
  }
}
