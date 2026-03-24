document.getElementById('compose-headline').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('compose-body').focus();
  }
});
