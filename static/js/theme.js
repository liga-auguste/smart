const THEMES = ['nacht', 'tageslicht', 'farbe', 'nebel', 'sand', 'wald', 'rost', 'grau', 'bunt', 'karpaten'];

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

const saved = localStorage.getItem('theme') || 'nacht';
document.documentElement.setAttribute('data-theme', saved);

document.addEventListener('DOMContentLoaded', () => {
  const btn   = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-label');
  if (!btn) return;

  let hideTimer = null;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    if (label) {
      label.textContent = THEME_NAMES[next] || next;
      label.classList.add('visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => label.classList.remove('visible'), 1800);
    }
  });
});
