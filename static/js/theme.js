const saved = localStorage.getItem('theme') || 'nacht';
document.documentElement.setAttribute('data-theme', saved);
