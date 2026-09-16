const themeToggle = document.querySelector('.theme-toggle');
function applyTheme(theme) {
  const dark = theme !== 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
  themeToggle?.setAttribute('aria-label', label);
  themeToggle?.setAttribute('title', label);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#18181b' : '#f6f6f1');
}
applyTheme(document.documentElement.dataset.theme);
themeToggle?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('az-theme', theme); } catch { /* Theme still works if storage is unavailable. */ }
});
window.addEventListener('storage', event => {
  if (event.key === 'az-theme') applyTheme(event.newValue);
});

const menu = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  if (mobileNav) mobileNav.hidden = true;
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  mobileNav.hidden = !open;
});
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => {
  if (!event.target.closest('.mobile-nav, .menu-toggle')) closeMenu();
});
matchMedia('(min-width: 801px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
document.querySelector('#year')?.replaceChildren(String(new Date().getFullYear()));
const portrait = document.querySelector('#profile-photo');
if (portrait) {
  const showFallback = () => portrait.closest('.portrait-frame').classList.add('no-photo');
  portrait.addEventListener('error', showFallback);
  if (portrait.complete && !portrait.naturalWidth) showFallback();
}
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.section-top, .project-card, .service, .about-copy, .process-grid, .faq-section, .contact-card').forEach(element => {
    element.classList.add('reveal');
    observer.observe(element);
  });
}
