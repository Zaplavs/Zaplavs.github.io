/* ==========================================================================
   motion.js — интерактивный слой портфолио.
   Без зависимостей: всё на нативных API, поэтому сборка остаётся лёгкой.
   ========================================================================== */

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');
const TELEGRAM = 'https://t.me/evgeinif';
const HANDLE = '@evgeinif';

/* --------------------------------------------------------------------------
   Прелоадер: показываем только при первом заходе за сессию.
   -------------------------------------------------------------------------- */
const preloader = document.querySelector('.preloader');
if (preloader) {
  let seen = false;
  try { seen = sessionStorage.getItem('az-seen') === '1'; } catch { /* приватный режим */ }
  if (seen || reduced.matches) {
    preloader.remove();
  } else {
    document.body.style.overflow = 'hidden';
    const bar = preloader.querySelector('.pre-bar > i');
    const num = preloader.querySelector('.pre-count');
    let value = 0;
    const tick = () => {
      value = Math.min(100, value + Math.random() * 18 + 6);
      bar?.style.setProperty('--pre', value + '%');
      if (num) num.textContent = String(Math.round(value)).padStart(3, '0');
      if (value < 100) {
        setTimeout(tick, 110);
      } else {
        setTimeout(() => {
          preloader.classList.add('is-done');
          document.body.style.overflow = '';
          document.body.classList.add('is-ready');
          setTimeout(() => preloader.remove(), 700);
        }, 260);
      }
    };
    setTimeout(tick, 120);
    try { sessionStorage.setItem('az-seen', '1'); } catch { /* ничего страшного */ }
  }
}

/* --------------------------------------------------------------------------
   Прогресс чтения и кнопка «наверх».
   -------------------------------------------------------------------------- */
const progress = document.querySelector('.scroll-progress');
const toTop = document.querySelector('.to-top');
let scrollTicking = false;

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const ratio = max > 0 ? Math.min(1, scrollY / max) : 0;
  progress?.style.setProperty('--p', ratio.toFixed(4));
  toTop?.style.setProperty('--p', ratio.toFixed(4));
  toTop?.classList.toggle('is-shown', scrollY > innerHeight * 0.8);
  scrollTicking = false;
}
addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(onScroll);
}, { passive: true });
onScroll();

toTop?.addEventListener('click', () => {
  scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
});

/* --------------------------------------------------------------------------
   Курсор-компаньон. Родной курсор остаётся на месте — так удобнее.
   -------------------------------------------------------------------------- */
const cursor = document.querySelector('.cursor');
if (cursor && finePointer.matches && !reduced.matches) {
  const label = cursor.querySelector('.cursor-label');
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let cx = x;
  let cy = y;
  let running = false;

  const loop = () => {
    cx += (x - cx) * 0.18;
    cy += (y - cy) * 0.18;
    cursor.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
    if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) requestAnimationFrame(loop);
    else running = false;
  };

  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    document.body.classList.add('has-cursor');
    x = event.clientX;
    y = event.clientY;
    if (!running) { running = true; requestAnimationFrame(loop); }

    const target = event.target.closest('[data-cursor]');
    cursor.classList.toggle('is-active', Boolean(target));
    if (target && label) label.textContent = target.dataset.cursor;
  }, { passive: true });

  addEventListener('pointerleave', () => document.body.classList.remove('has-cursor'));
}

/* --------------------------------------------------------------------------
   Появление заголовков по словам.
   -------------------------------------------------------------------------- */
function splitWords(element) {
  if (element.dataset.splitDone) return;
  let index = 0;
  const build = source => {
    const out = document.createDocumentFragment();
    source.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
          const outer = document.createElement('span');
          const inner = document.createElement('span');
          outer.className = 'sw';
          inner.className = 'si';
          inner.style.setProperty('--i', index++);
          inner.textContent = part;
          outer.appendChild(inner);
          out.appendChild(outer);
        });
      } else if (node.nodeName === 'BR') {
        out.appendChild(node.cloneNode());
      } else {
        const outer = document.createElement('span');
        const inner = document.createElement('span');
        outer.className = 'sw';
        inner.className = 'si';
        inner.style.setProperty('--i', index++);
        inner.appendChild(node.cloneNode(true));
        outer.appendChild(inner);
        out.appendChild(outer);
      }
    });
    return out;
  };
  element.replaceChildren(build(element));
  element.dataset.splitDone = '1';
}

const splitTargets = [...document.querySelectorAll('[data-split]')];
if (splitTargets.length) {
  if (reduced.matches || !('IntersectionObserver' in window)) {
    splitTargets.forEach(element => element.classList.add('split-in', 'split-done'));
  } else {
    splitTargets.forEach(splitWords);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('split-in');
        const words = entry.target.querySelectorAll('.si').length;
        setTimeout(() => entry.target.classList.add('split-done'), 900 + words * 45);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    splitTargets.forEach(element => observer.observe(element));
  }
}

/* --------------------------------------------------------------------------
   Навигация точками + подсветка активной секции.
   -------------------------------------------------------------------------- */
const dotLinks = [...document.querySelectorAll('.dot-nav a')];
if (dotLinks.length && 'IntersectionObserver' in window) {
  const sections = dotLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      dotLinks.forEach(link => {
        link.setAttribute('aria-current', String(link.getAttribute('href') === '#' + entry.target.id));
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(section => spy.observe(section));
}

/* --------------------------------------------------------------------------
   Бегущая строка: копий должно хватать на всю ширину экрана, иначе в цикле
   появляется пустота. Число копий чётное — анимация сдвигает ровно половину.
   -------------------------------------------------------------------------- */
const marqueeRows = [...document.querySelectorAll('.marquee-row')];
if (marqueeRows.length) {
  const SPEED = [58, 68]; // пикселей в секунду для первой и второй строки

  const layout = () => {
    marqueeRows.forEach((row, index) => {
      const source = row.firstElementChild;
      if (!source) return;
      while (row.children.length > 1) row.lastElementChild.remove();
      const unit = source.getBoundingClientRect().width;
      if (!unit) return;
      const copies = Math.max(1, Math.ceil(innerWidth / unit)) * 2;
      for (let i = 1; i < copies; i += 1) row.appendChild(source.cloneNode(true));
      row.style.setProperty('--duration', ((unit * copies) / 2 / SPEED[index % SPEED.length]).toFixed(1) + 's');
    });
  };

  layout();
  if (document.fonts?.ready) document.fonts.ready.then(layout);

  let resizeTimer;
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) return; // на мобильных resize стреляет от адресной строки
    lastWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 200);
  });
}

/* --------------------------------------------------------------------------
   Счётчики.
   -------------------------------------------------------------------------- */
const counters = [...document.querySelectorAll('[data-count]')];
if (counters.length) {
  const run = element => {
    const target = Number(element.dataset.count);
    if (reduced.matches || !target) { element.firstChild.textContent = String(target); return; }
    const started = performance.now();
    const step = now => {
      const t = Math.min(1, (now - started) / 1200);
      const eased = 1 - Math.pow(1 - t, 3);
      element.firstChild.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(element => observer.observe(element));
  } else {
    counters.forEach(run);
  }
}

/* --------------------------------------------------------------------------
   Было / стало: вкладки примеров и слайдер сравнения в каждой из них.
   -------------------------------------------------------------------------- */
document.querySelectorAll('.compare-stage').forEach(stage => {
  const range = stage.querySelector('.compare-range');
  const setSplit = percent => {
    const clamped = Math.max(0, Math.min(100, percent));
    stage.style.setProperty('--split', clamped + '%');
    if (range && Number(range.value) !== Math.round(clamped)) range.value = String(Math.round(clamped));
  };
  const fromEvent = event => {
    const rect = stage.getBoundingClientRect();
    if (!rect.width) return;
    setSplit(((event.clientX - rect.left) / rect.width) * 100);
  };

  range?.addEventListener('input', () => setSplit(Number(range.value)));
  range?.addEventListener('focus', () => stage.classList.add('is-focused'));
  range?.addEventListener('blur', () => stage.classList.remove('is-focused'));

  let dragging = false;
  stage.addEventListener('pointerdown', event => {
    event.preventDefault(); // иначе браузер начинает выделять текст макетов
    dragging = true;
    stage.setPointerCapture(event.pointerId);
    fromEvent(event);
  });
  stage.addEventListener('dragstart', event => event.preventDefault());
  stage.addEventListener('pointermove', event => { if (dragging) fromEvent(event); });
  stage.addEventListener('pointerup', event => {
    dragging = false;
    stage.releasePointerCapture(event.pointerId);
  });
  stage.addEventListener('pointercancel', () => { dragging = false; });
  if (finePointer.matches) {
    stage.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') fromEvent(event); });
  }
  setSplit(50);
});

const compareTabs = [...document.querySelectorAll('.compare-tab')];
if (compareTabs.length) {
  const select = (index, focus) => {
    compareTabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
    if (focus) compareTabs[index].focus();
  };
  compareTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', event => {
      const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: compareTabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      select((keys[event.key] + compareTabs.length) % compareTabs.length, true);
    });
  });
}

/* --------------------------------------------------------------------------
   Акцентный цвет.
   -------------------------------------------------------------------------- */
const ACCENTS = {
  lime:   '#d4f26a',
  coral:  '#ff9b6b',
  sky:    '#8fd0ff',
  lilac:  '#c9b2ff',
};
const swatches = [...document.querySelectorAll('.accent-swatch')];

function applyAccent(name) {
  const key = ACCENTS[name] ? name : 'lime';
  document.documentElement.style.setProperty('--accent', ACCENTS[key]);
  document.documentElement.style.setProperty('--accent-soft', ACCENTS[key] + '24');
  document.documentElement.dataset.accent = key;
  swatches.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.accent === key)));
  try { localStorage.setItem('az-accent', key); } catch { /* тема всё равно работает */ }
}
let savedAccent = 'lime';
try { savedAccent = localStorage.getItem('az-accent') || 'lime'; } catch { /* без хранилища */ }
applyAccent(savedAccent);
swatches.forEach(button => button.addEventListener('click', () => applyAccent(button.dataset.accent)));

/* --------------------------------------------------------------------------
   Командная палитра (Ctrl/⌘ + K).
   -------------------------------------------------------------------------- */
const palette = document.querySelector('#palette');
if (palette && typeof palette.showModal === 'function') {
  const input = palette.querySelector('.palette-search input');
  const list = palette.querySelector('.palette-list');
  const empty = palette.querySelector('.palette-empty');

  const go = hash => () => {
    const target = document.querySelector(hash);
    target?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  };

  const commands = [
    { icon: '◍', title: 'Работы', hint: 'СЕКЦИЯ', run: go('#work') },
    { icon: '⌘', title: 'Услуги', hint: 'СЕКЦИЯ', run: go('#services') },
    { icon: '↔', title: 'Было и стало', hint: 'СЕКЦИЯ', run: go('#compare') },
    { icon: '◎', title: 'Обо мне', hint: 'СЕКЦИЯ', run: go('#about') },
    { icon: '▱', title: 'Как я работаю', hint: 'СЕКЦИЯ', run: go('#process') },
    { icon: '₽', title: 'Стоимость', hint: 'СЕКЦИЯ', run: go('#price') },
    { icon: '?', title: 'Вопросы и ответы', hint: 'СЕКЦИЯ', run: go('#faq') },
    { icon: '✳', title: 'Контакты', hint: 'СЕКЦИЯ', run: go('#contact') },
    { icon: '☾', title: 'Переключить тему', hint: 'ВИД', run: () => document.querySelector('.theme-toggle')?.click() },
    ...Object.keys(ACCENTS).map(name => ({
      icon: '●',
      title: `Акцент: ${{ lime: 'лайм', coral: 'коралл', sky: 'лазурь', lilac: 'сирень' }[name]}`,
      hint: 'ВИД',
      run: () => applyAccent(name),
    })),
    { icon: '✈', title: 'Написать в Telegram', hint: 'СВЯЗЬ', run: () => open(TELEGRAM, '_blank', 'noopener') },
    {
      icon: '⧉',
      title: `Скопировать ${HANDLE}`,
      hint: 'СВЯЗЬ',
      run: () => navigator.clipboard?.writeText(HANDLE),
    },
  ];

  let visible = commands;
  let active = 0;

  const mark = () => {
    [...list.querySelectorAll('button')].forEach((node, index) => node.classList.toggle('is-active', index === active));
  };

  const draw = () => {
    list.replaceChildren(...visible.map((command, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const icon = document.createElement('i');
      const title = document.createElement('span');
      const hint = document.createElement('em');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = command.icon;
      title.textContent = command.title;
      hint.textContent = command.hint;
      button.append(icon, title, hint);
      button.addEventListener('click', () => { palette.close(); command.run(); });
      button.addEventListener('pointermove', () => { active = index; mark(); });
      button.addEventListener('focus', () => { active = index; mark(); });
      li.appendChild(button);
      return li;
    }));
    empty.hidden = visible.length > 0;
    mark();
  };

  // Нечёткий поиск: «расч» находит «Рассчитать проект», «тг» — Telegram.
  const score = (title, query) => {
    const text = title.toLowerCase();
    if (text.includes(query)) return text.indexOf(query);
    let position = -1;
    for (const letter of query) {
      position = text.indexOf(letter, position + 1);
      if (position === -1) return -1;
    }
    return 100 + position;
  };

  const filter = () => {
    const query = input.value.trim().toLowerCase();
    visible = query
      ? commands
          .map(command => ({ command, rank: score(command.title, query) }))
          .filter(item => item.rank >= 0)
          .sort((a, b) => a.rank - b.rank)
          .map(item => item.command)
      : commands;
    active = 0;
    draw();
  };

  input.addEventListener('input', filter);
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const command = visible[0];
    if (!command) return;
    palette.close();
    command.run();
  });
  palette.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = [...list.querySelectorAll('button')];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const next = current === -1
      ? (event.key === 'ArrowDown' ? 0 : buttons.length - 1)
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    buttons[next].scrollIntoView({ block: 'nearest' });
  });
  palette.addEventListener('close', () => { input.value = ''; filter(); });
  palette.addEventListener('click', event => { if (event.target === palette) palette.close(); });

  const openPalette = () => {
    if (palette.open) return;
    filter();
    palette.showModal();
    input.focus();
  };
  document.querySelectorAll('[data-palette-open]').forEach(button => button.addEventListener('click', openPalette));
  addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      palette.open ? palette.close() : openPalette();
    }
  });
  filter();
}

/* --------------------------------------------------------------------------
   Магнитные кнопки и наклон карточек.
   -------------------------------------------------------------------------- */
if (finePointer.matches && !reduced.matches) {
  document.querySelectorAll('.magnetic').forEach(element => {
    element.addEventListener('pointermove', event => {
      const rect = element.getBoundingClientRect();
      const dx = (event.clientX - rect.left - rect.width / 2) * 0.28;
      const dy = (event.clientY - rect.top - rect.height / 2) * 0.32;
      element.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });

  document.querySelectorAll('.work-card').forEach(card => {
    const visual = card.querySelector('.work-shot');
    if (!visual) return;
    card.addEventListener('pointermove', event => {
      const rect = visual.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
      visual.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      visual.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  const heroArt = document.querySelector('.hero-art');
  heroArt?.addEventListener('pointermove', event => {
    const rect = heroArt.getBoundingClientRect();
    heroArt.style.setProperty('--px', (((event.clientX - rect.left) / rect.width) - 0.5).toFixed(3));
    heroArt.style.setProperty('--py', (((event.clientY - rect.top) / rect.height) - 0.5).toFixed(3));
  });
  heroArt?.addEventListener('pointerleave', () => {
    heroArt.style.setProperty('--px', '0');
    heroArt.style.setProperty('--py', '0');
  });
}
