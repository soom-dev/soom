export function buildWatermarkScript(): string {
  return `
document.addEventListener('DOMContentLoaded', function() {
  var enSvg = document.querySelector('.soom-wm-en');
  if (!enSvg) return;
  var enChars = enSvg.querySelectorAll('.soom-wm-char');
  if (!enChars.length || !window.anime || !anime.svg) return;
  var drawables = anime.svg.createDrawable(enChars);
  anime.animate(drawables, {
    draw: '0 1',
    ease: 'inOutQuad',
    duration: 1500,
    delay: anime.stagger(80),
  });
});`;
}
