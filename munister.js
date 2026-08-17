(() => {
  const year = document.getElementById('y');
  if (year) year.textContent = String(new Date().getFullYear());
})();
