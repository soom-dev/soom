export function buildToggleScript(): string {
  return `
(function() {
  var body = document.body;
  var btn = document.querySelector('.soom-theme-toggle');
  if (!btn) return;
  var saved = localStorage.getItem('soom-theme');
  if (saved === 'light' || saved === 'dark') {
    body.classList.remove('soom-dark', 'soom-light');
    body.classList.add('soom-' + saved);
  }
  function update() {
    var isDark = body.classList.contains('soom-dark');
    btn.textContent = isDark ? '\\u2600\\uFE0F' : '\\uD83C\\uDF19';
  }
  update();
  btn.addEventListener('click', function() {
    var isDark = body.classList.contains('soom-dark');
    body.classList.remove('soom-dark', 'soom-light');
    body.classList.add(isDark ? 'soom-light' : 'soom-dark');
    localStorage.setItem('soom-theme', isDark ? 'light' : 'dark');
    update();
  });
})();`;
}

export function buildToggleCss(): string {
  return `
    .soom-theme-toggle {
      position: fixed; top: 12px; right: 16px; z-index: 30;
      width: 44px; height: 44px; border: none; border-radius: 50%;
      background: rgba(128, 128, 128, 0.3); cursor: pointer;
      font-size: 20px; line-height: 44px; text-align: center;
      transition: background 200ms ease; backdrop-filter: blur(4px);
    }
    .soom-theme-toggle:hover { background: rgba(128, 128, 128, 0.5); }
  `;
}
