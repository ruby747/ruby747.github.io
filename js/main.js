/* ===================================================
   ruby747 — main.js (Full Rewrite)
   =================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Clock ---------- */
function tick() {
  const el = $('#clock');
  if (el) el.textContent = new Date().toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' });
}
tick();
setInterval(tick, 1000);

/* ---------- Year ---------- */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Theme ---------- */
const root = document.documentElement;
function setTheme(mode) {
  root.setAttribute('data-theme', mode);
  try { localStorage.setItem('theme', mode); } catch {}
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = mode === 'dark' ? '#0a0a0b' : '#fafafa';
}
function toggleTheme() {
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}
const saved = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
if (saved) setTheme(saved);
$('#themeBtn').addEventListener('click', toggleTheme);

/* ---------- Scrolled Nav ---------- */
const nav = $('.nav');
function checkScroll() {
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', checkScroll, { passive: true });
checkScroll();

/* ---------- Scroll Reveal ---------- */
function initReveal() {
  const els = $$('.section-header, .project-card, .video-card, .app-card, .link-card, .gallery-item');
  els.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
}
// Run after dynamic content loads
let revealTimer;
function scheduleReveal() {
  clearTimeout(revealTimer);
  revealTimer = setTimeout(initReveal, 100);
}

/* ---------- Project Filter ---------- */
const projGrid = $('#projGrid');
const projSearch = $('#projSearch');
let activeTag = 'all';

$$('.chip[data-tag]').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.chip[data-tag]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTag = btn.dataset.tag;
    filterProjects();
  });
});
if (projSearch) projSearch.addEventListener('input', filterProjects);

function filterProjects() {
  const q = (projSearch?.value || '').toLowerCase();
  $$('#projGrid .project-card').forEach(el => {
    const tags = (el.dataset.tags || '').split(',');
    const hitTag = activeTag === 'all' || tags.includes(activeTag);
    const hitText = el.textContent.toLowerCase().includes(q);
    el.style.display = hitTag && hitText ? '' : 'none';
  });
}

/* ---------- YouTube helpers ---------- */
const YT_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/|v\/))([\w-]{11})/;
function getYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(YT_RE);
  return m ? m[1] : null;
}

const ytCache = new Map();
async function fetchYTMeta(id) {
  if (!id) return null;
  if (ytCache.has(id)) return ytCache.get(id);
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    ytCache.set(id, data);
    return data;
  } catch {
    ytCache.set(id, null);
    return null;
  }
}

/* ---------- Video Grid Loader ---------- */
async function loadVideos() {
  const grid = $('#videoGrid');
  if (!grid) return;
  try {
    const res = await fetch('./media/videos.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error();
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) {
      grid.innerHTML = '<div class="placeholder-text">영상이 아직 없습니다.</div>';
      return;
    }
    grid.innerHTML = '';

    const sorted = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    const enriched = await Promise.all(sorted.map(async raw => {
      const item = { ...raw };
      const ytId = raw.youtubeId || getYouTubeId(raw.youtube || raw.link || raw.embed);
      const linkUrl = raw.link || (ytId ? `https://youtu.be/${ytId}` : null);
      if (ytId) {
        const meta = await fetchYTMeta(ytId);
        if (meta) {
          if (!item.title) item.title = meta.title;
          if (!item.thumbnail) item.thumbnail = meta.thumbnail_url;
          if (!item.description && meta.author_name) item.description = `${meta.author_name} 채널`;
        }
      }
      return { item, ytId, linkUrl };
    }));

    enriched.forEach(({ item, ytId, linkUrl }) => {
      const card = document.createElement('a');
      card.className = 'video-card';
      if (linkUrl) { card.href = linkUrl; card.target = '_blank'; card.rel = 'noreferrer'; }
      if (item.featured) card.dataset.featured = 'true';

      const thumbSrc = item.thumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '');
      const title = item.title || '제목 미정';
      const desc = item.description || '';

      card.innerHTML = `
        <div class="video-thumb">
          ${thumbSrc ? `<img src="${thumbSrc}" alt="${title}" loading="lazy">` : ''}
          <div class="video-play"><span>▶</span></div>
          ${item.featured ? '<div class="video-featured-badge">Featured</div>' : ''}
        </div>
        <div class="video-info">
          <h3>${title}</h3>
          ${desc ? `<p>${desc}</p>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });

    scheduleReveal();
  } catch {
    grid.innerHTML = '<div class="placeholder-text">영상을 불러올 수 없습니다.</div>';
  }
}
loadVideos();

/* ---------- App Store helpers ---------- */
const APP_ID_RE = /id(\d{3,})/;
function getAppStoreId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(APP_ID_RE);
  return m ? m[1] : null;
}

const appCache = new Map();
async function fetchAppMeta(id, country = 'kr') {
  const key = `${country}:${id}`;
  if (appCache.has(key)) return appCache.get(key);
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${country}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const meta = data.results?.[0] || null;
    appCache.set(key, meta);
    return meta;
  } catch {
    appCache.set(key, null);
    return null;
  }
}

/* ---------- App Grid Loader ---------- */
async function loadApps() {
  const grid = $('#appGrid');
  if (!grid) return;
  try {
    const res = await fetch('./data/apps.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error();
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) {
      grid.innerHTML = '<div class="placeholder-text">앱 정보가 아직 없습니다.</div>';
      return;
    }
    grid.innerHTML = '';

    const enriched = await Promise.all(list.map(async raw => {
      const app = { ...raw };
      const linkUrl = app.storeUrl || app.link || null;
      const id = getAppStoreId(linkUrl);
      if (id) {
        const meta = await fetchAppMeta(id, app.country || 'kr');
        if (meta) {
          if (!app.name) app.name = meta.trackName;
          if (!app.icon) app.icon = meta.artworkUrl512 || meta.artworkUrl100 || meta.artworkUrl60;
          if (!app.tagline) {
            const parts = [];
            if (meta.primaryGenreName) parts.push(meta.primaryGenreName);
            if (meta.formattedPrice && meta.formattedPrice !== 'Free') parts.push(meta.formattedPrice);
            if (parts.length) app.tagline = parts.join(' · ');
          }
        }
      }
      return { app, linkUrl };
    }));

    enriched.forEach(({ app, linkUrl }) => {
      const el = document.createElement(linkUrl ? 'a' : 'div');
      el.className = 'app-card';
      if (linkUrl) { el.href = linkUrl; el.target = '_blank'; el.rel = 'noreferrer'; }

      const iconHtml = app.icon
        ? `<img src="${app.icon}" alt="${app.name || 'app'}" loading="lazy">`
        : '📱';

      el.innerHTML = `
        <div class="app-icon">${iconHtml}</div>
        <div class="app-meta">
          <h3>${app.name || '이름 미정'}</h3>
          ${app.tagline ? `<p>${app.tagline}</p>` : ''}
        </div>
      `;
      grid.appendChild(el);
    });

    scheduleReveal();
  } catch {
    grid.innerHTML = '<div class="placeholder-text">앱 데이터를 불러올 수 없습니다.</div>';
  }
}
loadApps();

/* ---------- Gallery ---------- */
const G_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
let galleryList = [];
let galleryIndex = 0;

async function fetchAssets() {
  const user = root.dataset.user;
  const repo = root.dataset.repo;
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/assets?ref=${branch}`, {
        headers: { 'Accept': 'application/vnd.github+json' }
      });
      if (!res.ok) continue;
      const arr = await res.json();
      const files = arr.filter(x => x.type === 'file' && G_EXT.test(x.name)).map(x => `/assets/${x.name}`);
      if (files.length) return files;
    } catch {}
  }
  return ['/assets/shot1.jpg', '/assets/shot2.jpg', '/assets/shot3.jpg'];
}

async function renderGallery() {
  const grid = $('#galleryGrid');
  if (!grid) return;
  try {
    galleryList = await fetchAssets();
    grid.innerHTML = '';
    galleryList.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.dataset.index = i;
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = 'gallery';
      img.src = src;
      img.onerror = () => {
        img.src = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#1c1c1e"/><text x="50%" y="50%" fill="#6b6b76" font-size="16" text-anchor="middle" dominant-baseline="middle">no image</text></svg>')}`;
      };
      div.appendChild(img);
      grid.appendChild(div);
      div.addEventListener('click', () => openLightbox(i));
    });
    scheduleReveal();
  } catch {
    grid.innerHTML = '<div class="placeholder-text">갤러리를 불러올 수 없습니다.</div>';
  }
}
renderGallery();

/* ---------- Lightbox ---------- */
const lb = $('#lightbox');
const lbImg = $('#lightImg');
const lbCounter = $('#lbCounter');

function updateCounter() {
  if (lbCounter) lbCounter.textContent = `${galleryIndex + 1} / ${galleryList.length}`;
}

function openLightbox(i) {
  galleryIndex = i;
  lbImg.src = galleryList[galleryIndex];
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  updateCounter();
}
function closeLightbox() {
  lb.setAttribute('aria-hidden', 'true');
  lbImg.src = '';
  document.body.style.overflow = '';
}
function prevImage() {
  galleryIndex = (galleryIndex - 1 + galleryList.length) % galleryList.length;
  lbImg.src = galleryList[galleryIndex];
  updateCounter();
}
function nextImage() {
  galleryIndex = (galleryIndex + 1) % galleryList.length;
  lbImg.src = galleryList[galleryIndex];
  updateCounter();
}

$('#closeImg')?.addEventListener('click', closeLightbox);
$('#prevOverlay')?.addEventListener('click', prevImage);
$('#nextOverlay')?.addEventListener('click', nextImage);

$('.lightbox-backdrop')?.addEventListener('click', closeLightbox);
lbImg?.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });

document.addEventListener('keydown', e => {
  if (lb?.getAttribute('aria-hidden') === 'false') {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  }
});

// Touch swipe for lightbox
let touchStartX = 0;
lb?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
lb?.addEventListener('touchend', e => {
  const diff = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) prevImage(); else nextImage();
  }
}, { passive: true });

/* ---------- Mobile Nav Active State ---------- */
const sections = $$('.section[id], .hero[id]');
const mobileLinks = $$('.mobile-nav-item');

function updateActiveNav() {
  let current = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - 120;
    if (window.scrollY >= top) current = sec.id;
  });
  mobileLinks.forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === `#${current}`);
  });
}
window.addEventListener('scroll', updateActiveNav, { passive: true });

/* ---------- Init Reveal ---------- */
scheduleReveal();

/* ---------- Service Worker ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
