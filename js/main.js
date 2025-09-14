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
  {label:'Go: Projects', action:()=>location.hash='#projects'},
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

