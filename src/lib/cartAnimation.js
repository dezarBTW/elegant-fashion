export function animateToCart(source) {
  window.dispatchEvent(new Event('elegant-style-cart-added'));
  if (!source || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const image = source.closest('[data-product]')?.querySelector('[data-product-image]');
  const target = document.querySelector('[data-cart-target]');
  if (!image || !target || !image.currentSrc) return;
  const start = image.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const navTop = target.closest('nav')?.getBoundingClientRect().top || 0;
  const width = Math.min(90, start.width);
  const height = width * start.height / start.width;
  const fromX = start.left + start.width / 2 - width / 2;
  const fromY = start.top + start.height / 2 - height / 2;
  const toX = end.left + end.width / 2 - width / 2;
  const toY = end.top - Math.min(0, navTop) + end.height / 2 - height / 2;
  const flying = document.createElement('img');
  flying.src = image.currentSrc;
  flying.alt = '';
  flying.setAttribute('aria-hidden', 'true');
  flying.dataset.cartFlight = 'true';
  Object.assign(flying.style, { position: 'fixed', left: '0', top: '0', width: `${width}px`, height: `${height}px`, objectFit: 'cover', borderRadius: '8px', pointerEvents: 'none', zIndex: '1600', willChange: 'transform, opacity' });
  document.body.append(flying);
  const animation = flying.animate([
    { transform: `translate(${fromX}px, ${fromY}px) scale(1)`, opacity: 1 },
    { transform: `translate(${fromX + (toX - fromX) * 0.45}px, ${Math.min(fromY, toY) - 65}px) scale(.7)`, opacity: .95, offset: .5 },
    { transform: `translate(${toX}px, ${toY}px) scale(.12)`, opacity: 0 },
  ], { duration: 900, easing: 'cubic-bezier(.25,.65,.3,1)', fill: 'forwards' });
  animation.finished.catch(() => {}).finally(() => flying.remove());
}
