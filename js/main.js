/* ========= Utilities ========= */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

/* ========= Clock & Year ========= */
function tick(){ $('#clock').textContent = new Date().toLocaleTimeString('ko-KR',{hour12:false,timeZone:'Asia/Seoul'}); }
tick(); setInterval(tick,1000);
$('#year').textContent = new Date().getFullYear();

/* ========= Local visits ========= */
try{ const k='ruby747_visits'; const n=(+localStorage.getItem(k)||0)+1; localStorage.setItem(k,n); $('#visits').textContent=n; }catch{ }

/* ========= Theme ========= */
const root=document.documentElement;
function setTheme(mode){ root.setAttribute('data-theme', mode); try{localStorage.setItem('theme',mode);}catch{} }
function toggleTheme(){ setTheme(root.getAttribute('data-theme')==='dark'?'light':'dark'); }
const saved=(()=>{try{return localStorage.getItem('theme')}catch{return null}})(); if(saved) setTheme(saved);
$('#themeBtn').addEventListener('click', toggleTheme);

/* ========= Email copy ========= */
const EMAIL='jun2002usa@gmail.com';
$('#copyBtn').addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(EMAIL); alert('복사됨: '+EMAIL); }
  catch{ prompt('복사 실패. 직접 복사하세요 ↓', EMAIL); }
});

/* ========= Scroll progress ========= */
const bar=$('#progress');
document.addEventListener('scroll', ()=>{
  const h = document.documentElement;
  const p = h.scrollTop / (h.scrollHeight - h.clientHeight);
  bar.style.transform = `scaleX(${p})`;
}, {passive:true});

/* ========= Section link copy ========= */
$$('[data-copy]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const sel = btn.getAttribute('data-copy');
    const url = location.origin + location.pathname + sel;
    try{ await navigator.clipboard.writeText(url); btn.textContent='✅ 복사됨'; setTimeout(()=>btn.textContent='🔗 섹션링크 복사',1200); }catch{}
  });
});

/* ========= Projects: tag filter + search ========= */
const projGrid = $('#projGrid'), projSearch = $('#projSearch');
let activeTag='all';
$$('.btn[data-tag]').forEach(b=>{
  b.addEventListener('click', ()=>{
    activeTag = b.dataset.tag;
    filterProjects();
  });
});
projSearch.addEventListener('input', filterProjects);
function filterProjects(){
  const q = (projSearch.value||'').toLowerCase();
  $$('#projGrid .tile').forEach(el=>{
    const tags = (el.dataset.tags||'').split(',');
    const hitTag = (activeTag==='all' || tags.includes(activeTag));
    const hitText = el.textContent.toLowerCase().includes(q);
    el.style.display = (hitTag && hitText) ? '' : 'none';
  });
}

const YT_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/|v\/))([\w-]{11})/;
function getYouTubeId(url){
  if(!url || typeof url !== 'string') return null;
  const match = url.match(YT_RE);
  return match ? match[1] : null;
}

/* ========= Video works loader ========= */
async function loadVideoGrid(){
  const grid = $('#videoGrid');
  if(!grid) return;
  try{
    const res = await fetch('./media/videos.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('status '+res.status);
    const list = await res.json();
    if(!Array.isArray(list) || !list.length){
      grid.innerHTML = '<div class="hint">`media/videos.json` 파일에 YouTube 링크를 추가하면 자동으로 썸네일이 나타납니다.</div>';
      return;
    }
    grid.innerHTML = '';
    const ordered = [...list].sort((a,b)=> (b && b.featured ? 1 : 0) - (a && a.featured ? 1 : 0));
    ordered.forEach(item=>{
      const card = document.createElement('article');
      card.className = 'media-card';
      if(item && item.featured) card.dataset.featured = 'true';

      const preview = document.createElement('div');
      preview.className = 'media-preview';

      const ytId = item && (item.youtubeId || getYouTubeId(item.youtube || item.link || item.embed));
      const linkUrl = (item && item.link) || (ytId ? `https://youtu.be/${ytId}` : null);

      if(ytId){
        const anchor = document.createElement('a');
        anchor.className = 'media-thumb';
        anchor.href = linkUrl;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer';

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = (item && item.thumbnail) || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        img.alt = (item && item.title) ? `${item.title} 썸네일` : 'YouTube thumbnail';
        anchor.appendChild(img);

        const play = document.createElement('span');
        play.className = 'media-play';
        play.textContent = '▶';
        anchor.appendChild(play);

        preview.appendChild(anchor);
      }else if(item && item.embed){
        const iframe = document.createElement('iframe');
        iframe.src = item.embed;
        iframe.title = item.title || 'video';
        iframe.loading = 'lazy';
        iframe.setAttribute('allowfullscreen', '');
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        preview.appendChild(iframe);
      }else if(item.src){
        const video = document.createElement('video');
        video.controls = true;
        video.preload = 'metadata';
        if(item.poster) video.poster = item.poster;
        const source = document.createElement('source');
        source.src = item.src;
        source.type = item.type || 'video/mp4';
        video.appendChild(source);
        const fallback = document.createElement('p');
        fallback.className = 'hint';
        fallback.textContent = '해당 브라우저에서 영상을 재생할 수 없습니다.';
        video.appendChild(fallback);
        preview.appendChild(video);
      }else{
        const empty = document.createElement('div');
        empty.className = 'hint';
        empty.textContent = '영상 경로가 설정되지 않았습니다.';
        preview.appendChild(empty);
      }

      const meta = document.createElement('div');
      meta.className = 'media-meta';
      const title = document.createElement('h3');
      const baseTitle = (item && item.title) ? item.title : '제목 미정';
      title.textContent = (item && item.featured) ? `⭐ ${baseTitle}` : baseTitle;
      meta.appendChild(title);
      if(item && item.description){
        const desc = document.createElement('p');
        desc.className = 'hint';
        desc.textContent = item.description;
        meta.appendChild(desc);
      }
      const tools = Array.isArray(item && item.tools) ? item.tools : (item && typeof item.tools === 'string' ? [item.tools] : []);
      if(tools.length){
        const toolLine = document.createElement('p');
        toolLine.className = 'hint';
        toolLine.textContent = `툴 · ${tools.join(', ')}`;
        meta.appendChild(toolLine);
      }
      if(linkUrl){
        const link = document.createElement('a');
        link.className = 'btn link-btn';
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = (item && item.linkText) || (ytId ? 'YouTube로 보기' : '원본 보기');
        meta.appendChild(link);
      }

      card.appendChild(preview);
      card.appendChild(meta);
      grid.appendChild(card);
    });
  }catch(err){
    grid.innerHTML = '<div class="hint">영상 데이터를 불러오는 중 오류가 발생했습니다.</div>';
  }
}
loadVideoGrid();

/* ========= App showcase loader ========= */
async function loadApps(){
  const grid = $('#appGrid');
  if(!grid) return;
  try{
    const res = await fetch('./data/apps.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('status '+res.status);
    const list = await res.json();
    if(!Array.isArray(list) || !list.length){
      grid.innerHTML = '<div class="hint">`data/apps.json` 파일에 앱 정보를 추가하면 이곳에 나타납니다.</div>';
      return;
    }
    grid.innerHTML = '';
    list.forEach(app=>{
      const wrapper = document.createElement(app.storeUrl ? 'a' : 'article');
      wrapper.className = 'app-card';
      if(app.storeUrl){
        wrapper.href = app.storeUrl;
        wrapper.target = '_blank';
        wrapper.rel = 'noreferrer';
      }

      const icon = document.createElement('div');
      icon.className = 'app-icon';
      if(app.icon){
        const img = document.createElement('img');
        img.src = app.icon;
        img.alt = app.name ? `${app.name} icon` : 'app icon';
        img.loading = 'lazy';
        icon.appendChild(img);
      }else{
        icon.textContent = '📱';
      }

      const meta = document.createElement('div');
      meta.className = 'app-meta';
      const name = document.createElement('h3');
      name.textContent = app.name || '이름 미정';
      meta.appendChild(name);
      if(app.tagline){
        const tagline = document.createElement('p');
        tagline.className = 'hint';
        tagline.textContent = app.tagline;
        meta.appendChild(tagline);
      }
      const platforms = Array.isArray(app.platforms) ? app.platforms : (typeof app.platforms === 'string' ? [app.platforms] : []);
      if(platforms.length){
        const platform = document.createElement('p');
        platform.className = 'hint';
        platform.textContent = platforms.join(' · ');
        meta.appendChild(platform);
      }

      wrapper.appendChild(icon);
      wrapper.appendChild(meta);

      grid.appendChild(wrapper);
    });
  }catch(err){
    grid.innerHTML = '<div class="hint">앱 데이터를 불러오는 중 오류가 발생했습니다.</div>';
  }
}
loadApps();

/* ========= Gallery loader (from /assets via GitHub API) ========= */
const G_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
let galleryList = []; let galleryIndex = 0;
async function fetchAssets(){
  const user = document.documentElement.dataset.user;
  const repo = document.documentElement.dataset.repo;
  const branches=['main','master'];
  for(const b of branches){
    const url = `https://api.github.com/repos/${user}/${repo}/contents/assets?ref=${b}`;
    try{
      const res = await fetch(url, {headers:{'Accept':'application/vnd.github+json'}});
      if(!res.ok) continue;
      const arr = await res.json();
      const files = arr.filter(x=>x.type==='file' && G_EXT.test(x.name)).map(x=>`/assets/${x.name}`);
      if(files.length) return files;
    }catch{}
  }
  // fallback: 기본 이름들
  return ['/assets/shot1.jpg','/assets/shot2.jpg','/assets/shot3.jpg'];
}
async function renderGallery(){
  const grid = $('#galleryGrid');
  try{
    galleryList = await fetchAssets();
    grid.innerHTML = '';
    galleryList.forEach((src,i)=>{
      const a = document.createElement('a'); a.href = src; a.dataset.index = i;
      const img = document.createElement('img'); img.loading='lazy'; img.alt='gallery';
      img.src = src;
      // 실패하면 심플 SVG 대체
      img.onerror = ()=> img.src = 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="50%" fill="#9aa0ad" font-size="20" text-anchor="middle" dominant-baseline="middle">image not found</text></svg>`);
      a.appendChild(img); grid.appendChild(a);
      a.addEventListener('click', (e)=>{ e.preventDefault(); openLightbox(+a.dataset.index); });
    });
  }catch{
    grid.innerHTML = '<div class="hint">갤러리를 불러올 수 없음</div>';
  }
}
renderGallery();

/* ========= Lightbox ========= */
const lb = $('#lightbox'), lbImg = $('#lightImg');
function openLightbox(i){ galleryIndex = i; lb.setAttribute('aria-hidden','false'); lbImg.src = galleryList[galleryIndex]; }
function closeLightbox(){ lb.setAttribute('aria-hidden','true'); lbImg.src=''; }
$('#closeImg').onclick=closeLightbox;
$('#prevImg').onclick=()=>{ galleryIndex=(galleryIndex-1+galleryList.length)%galleryList.length; lbImg.src=galleryList[galleryIndex]; };
$('#nextImg').onclick=()=>{ galleryIndex=(galleryIndex+1)%galleryList.length; lbImg.src=galleryList[galleryIndex]; };
// Floating overlay arrow buttons
$('#prevOverlay').onclick=()=>$('#prevImg').click();
$('#nextOverlay').onclick=()=>$('#nextImg').click();
// Close when clicking outside the image (overlay background)
lb.addEventListener('click', (e)=>{
  if(e.target === lb) closeLightbox();
});
// Close when tapping/clicking the image itself
lbImg.addEventListener('click', (e)=>{
  e.stopPropagation();
  closeLightbox();
});
document.addEventListener('keydown', e=>{
  if(lb.getAttribute('aria-hidden')==='false'){
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') $('#prevImg').click();
    if(e.key==='ArrowRight') $('#nextImg').click();
  }
});

/* ========= Command palette ========= */
const cmd = $('#cmdk'), cmdInput = $('#cmdInput'), cmdList = $('#cmdList');
const CMDS = [
  {label:'Go: Top', action:()=>window.scrollTo({top:0,behavior:'smooth'})},
  {label:'Go: Video Works', action:()=>location.hash='#videos'},
  {label:'Go: Projects', action:()=>location.hash='#projects'},
  {label:'Go: Apps', action:()=>location.hash='#apps'},
  {label:'Go: Gallery', action:()=>location.hash='#gallery'},
  {label:'Theme: Toggle', action:toggleTheme},
  {label:'Copy: Email', action:async()=>{try{await navigator.clipboard.writeText(EMAIL);}catch{}}},
  {label:'Open: GitHub profile', action:()=>window.open('https://github.com/'+document.documentElement.dataset.user,'_blank')},
];
function openCmd(){ cmd.setAttribute('aria-hidden','false'); cmdInput.value=''; renderCmd(''); cmdInput.focus(); }
function closeCmd(){ cmd.setAttribute('aria-hidden','true'); }
function renderCmd(q){
  const query = q.toLowerCase();
  const items = CMDS.filter(c=>c.label.toLowerCase().includes(query));
  cmdList.innerHTML = items.map(it=>`<div class="cmdk-item" role="option"><strong>${it.label}</strong></div>`).join('');
  $$('.cmdk-item', cmdList).forEach((el,i)=>{ el.addEventListener('click', ()=>{ items[i].action(); closeCmd(); }); });
}
$('#cmdBtn').onclick=openCmd;
cmd.addEventListener('click', e=>{ if(e.target===cmd) closeCmd(); });
cmdInput.addEventListener('input', ()=>renderCmd(cmdInput.value));
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && cmd.getAttribute('aria-hidden')==='false') closeCmd();
});

/* ========= Service Worker (옵션) ========= */
if('serviceWorker' in navigator){
  // sw.js 파일이 있을 때만 작동. 없으면 무시.
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
