/* ===========================================================
   ruby747 — main.js (bento rewrite)
   =========================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* --- Clock --- */
function tick() {
  const el = $('#clock');
  if (el) el.textContent = new Date().toLocaleTimeString('ko-KR', {
    hour12: false, timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit'
  });
}
tick(); setInterval(tick, 1000);

/* --- Year --- */
const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

/* --- Theme --- */
const root = document.documentElement;
function setTheme(m) {
  root.setAttribute('data-theme', m);
  try { localStorage.setItem('theme', m); } catch {}
}
function toggle() { setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'); }
try { const s = localStorage.getItem('theme'); if (s) setTheme(s); } catch {}
$('#themeBtn').addEventListener('click', toggle);

/* --- Filter --- */
let activeTag = 'all';
const projSearch = $('#projSearch');
$$('.tag[data-tag]').forEach(b => {
  b.addEventListener('click', () => {
    $$('.tag[data-tag]').forEach(t => t.classList.remove('active'));
    b.classList.add('active');
    activeTag = b.dataset.tag;
    filterProj();
  });
});
if (projSearch) projSearch.addEventListener('input', filterProj);
function filterProj() {
  const q = (projSearch?.value || '').toLowerCase();
  $$('#projGrid .proj').forEach(el => {
    const tags = (el.dataset.tags || '').split(',');
    const ok = (activeTag === 'all' || tags.includes(activeTag)) && el.textContent.toLowerCase().includes(q);
    el.style.display = ok ? '' : 'none';
  });
}

/* --- YouTube --- */
const YT_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/|v\/))([\w-]{11})/;
const ytId = url => { const m = (url || '').match(YT_RE); return m ? m[1] : null; };
const ytCache = new Map();
async function ytMeta(id) {
  if (!id) return null;
  if (ytCache.has(id)) return ytCache.get(id);
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (!r.ok) throw 0;
    const d = await r.json(); ytCache.set(id, d); return d;
  } catch { ytCache.set(id, null); return null; }
}

/* --- Video loader --- */
async function loadVideos() {
  const g = $('#videoGrid'); if (!g) return;
  try {
    const r = await fetch('./media/videos.json', { cache: 'no-cache' });
    if (!r.ok) throw 0;
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) { g.innerHTML = '<div class="muted-sm">영상이 없습니다.</div>'; return; }
    g.innerHTML = '';
    const sorted = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    const data = await Promise.all(sorted.map(async raw => {
      const item = { ...raw };
      const id = raw.youtubeId || ytId(raw.link || raw.youtube || raw.embed);
      const link = raw.link || (id ? `https://youtu.be/${id}` : null);
      if (id) {
        const m = await ytMeta(id);
        if (m) { if (!item.title) item.title = m.title; if (!item.thumbnail) item.thumbnail = m.thumbnail_url; if (!item.description && m.author_name) item.description = m.author_name + ' 채널'; }
      }
      return { item, id, link };
    }));
    data.forEach(({ item, id, link }) => {
      const a = document.createElement('a');
      a.className = 'vid-card';
      if (link) { a.href = link; a.target = '_blank'; a.rel = 'noreferrer'; }
      if (item.featured) a.dataset.featured = 'true';
      const thumb = item.thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
      const title = item.title || '제목 미정';
      a.innerHTML = `
        <div class="vid-thumb">
          ${thumb ? `<img src="${thumb}" alt="${title}" loading="lazy">` : ''}
          <div class="vid-play"><div class="vid-play-btn">▶</div></div>
          ${item.featured ? '<div class="vid-feat">Featured</div>' : ''}
        </div>
        <div class="vid-info">
          <h3>${title}</h3>
          ${item.description ? `<p>${item.description}</p>` : ''}
        </div>`;
      g.appendChild(a);
    });
  } catch { g.innerHTML = '<div class="muted-sm">영상을 불러올 수 없습니다.</div>'; }
}
loadVideos();

/* --- App loader --- */
const appIdRe = /id(\d{3,})/;
const appCache = new Map();
async function appMeta(id, c = 'kr') {
  const k = c + ':' + id; if (appCache.has(k)) return appCache.get(k);
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${c}`);
    if (!r.ok) throw 0;
    const d = await r.json(); const m = d.results?.[0] || null; appCache.set(k, m); return m;
  } catch { appCache.set(k, null); return null; }
}
async function loadApps() {
  const g = $('#appGrid'); if (!g) return;
  try {
    const r = await fetch('./data/apps.json', { cache: 'no-cache' });
    if (!r.ok) throw 0;
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) { g.innerHTML = '<div class="muted-sm">앱 정보가 없습니다.</div>'; return; }
    g.innerHTML = '';
    const data = await Promise.all(list.map(async raw => {
      const app = { ...raw }; const link = app.storeUrl || app.link || null;
      const idm = (link || '').match(appIdRe);
      if (idm) {
        const m = await appMeta(idm[1], app.country || 'kr');
        if (m) {
          if (!app.name) app.name = m.trackName;
          if (!app.icon) app.icon = m.artworkUrl512 || m.artworkUrl100;
          if (!app.tagline && m.primaryGenreName) app.tagline = m.primaryGenreName;
        }
      }
      return { app, link };
    }));
    data.forEach(({ app, link }) => {
      const el = document.createElement(link ? 'a' : 'div');
      el.className = 'app-row';
      if (link) { el.href = link; el.target = '_blank'; el.rel = 'noreferrer'; }
      el.innerHTML = `
        <div class="app-ico">${app.icon ? `<img src="${app.icon}" alt="${app.name || ''}" loading="lazy">` : '📱'}</div>
        <div class="app-txt">
          <h3>${app.name || '이름 미정'}</h3>
          ${app.tagline ? `<p>${app.tagline}</p>` : ''}
        </div>`;
      g.appendChild(el);
    });
  } catch { g.innerHTML = '<div class="muted-sm">앱 데이터를 불러올 수 없습니다.</div>'; }
}
loadApps();

/* --- Gallery --- */
const G_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
let galList = [], galIdx = 0;
async function fetchAssets() {
  const u = root.dataset.user, rp = root.dataset.repo;
  for (const b of ['main', 'master']) {
    try {
      const r = await fetch(`https://api.github.com/repos/${u}/${rp}/contents/assets?ref=${b}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) continue;
      const arr = await r.json();
      const f = arr.filter(x => x.type === 'file' && G_EXT.test(x.name)).map(x => `/assets/${x.name}`);
      if (f.length) return f;
    } catch {}
  }
  return [];
}
async function renderGallery() {
  const g = $('#galleryGrid'); if (!g) return;
  try {
    galList = await fetchAssets();
    if (!galList.length) { g.innerHTML = '<div class="muted-sm">이미지가 없습니다.</div>'; return; }
    g.innerHTML = '';
    galList.forEach((src, i) => {
      const d = document.createElement('div');
      d.className = 'gal-item';
      const img = document.createElement('img');
      img.loading = 'lazy'; img.alt = 'gallery'; img.src = src;
      img.onerror = () => { img.src = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#191919"/><text x="50%" y="50%" fill="#555" font-size="14" text-anchor="middle" dominant-baseline="middle">×</text></svg>')}`; };
      d.appendChild(img);
      g.appendChild(d);
      d.addEventListener('click', () => openLb(i));
    });
  } catch { g.innerHTML = '<div class="muted-sm">갤러리를 불러올 수 없습니다.</div>'; }
}
renderGallery();

/* --- Lightbox --- */
const lb = $('#lightbox'), lbImg = $('#lightImg'), lbCnt = $('#lbCounter');
function cnt() { if (lbCnt) lbCnt.textContent = `${galIdx + 1} / ${galList.length}`; }
function openLb(i) { galIdx = i; lbImg.src = galList[i]; lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; cnt(); }
function closeLb() { lb.setAttribute('aria-hidden', 'true'); lbImg.src = ''; document.body.style.overflow = ''; }
function prev() { galIdx = (galIdx - 1 + galList.length) % galList.length; lbImg.src = galList[galIdx]; cnt(); }
function next() { galIdx = (galIdx + 1) % galList.length; lbImg.src = galList[galIdx]; cnt(); }
$('#closeImg')?.addEventListener('click', closeLb);
$('#prevOverlay')?.addEventListener('click', prev);
$('#nextOverlay')?.addEventListener('click', next);
$('.lb-bg')?.addEventListener('click', closeLb);
lbImg?.addEventListener('click', e => { e.stopPropagation(); closeLb(); });
document.addEventListener('keydown', e => {
  if (lb?.getAttribute('aria-hidden') === 'false') {
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }
});
let tx = 0;
lb?.addEventListener('touchstart', e => { tx = e.changedTouches[0].screenX; }, { passive: true });
lb?.addEventListener('touchend', e => { const d = e.changedTouches[0].screenX - tx; if (Math.abs(d) > 50) d > 0 ? prev() : next(); }, { passive: true });
