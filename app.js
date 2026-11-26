const KEY='tab_companion_v1';

const ic=f=>`<img src="assets/${f}" alt="" class="cur-ic">`;
const CR=ic('credits.png'),AM=ic('upcreds.png'),HC=ic('hypercredits.png');
const Z=[0,0],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sumP=a=>a.reduce(add,Z),$=s=>document.querySelector(s),
fmt=n=>Math.round(n).toLocaleString('fr-FR'),esc=s=>s.replace(/[&<>\"']/g,c=>'&#'+c.charCodeAt(0)+';');
const def=()=>({tab:0,chars:[],ops:Object.fromEntries(Object.keys(OPS).map(k=>[k,{own:+!OPS[k].price,lvl:1,tgt:30,done:0,sk:[0,0,0,0]}])),lg:{cur:0,tgt:54900},act:SIM.act,stats:{min:SIM.min,win:SIM.win,tw:SIM.tw,tl:SIM.tl},bpl:0,bps:0,bpr:0,cols:3});
let S;try{S={...def(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=def()}
const fixS=()=>S.chars.forEach(c=>{if(c.fav===undefined)c.fav=1});fixS();   // chars créés avant les favoris : considérés comme favoris
const newId=()=>{let i=Date.now();while(S.chars.some(c=>c.id===i))i++;return i};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const go=()=>{save();render()};
let D={lvl:1,mods:[0,0,0,0,0],img:null};
let UI={m:null,t:{h:false,o:false,l:false,s:false,a:false,c:false}};   // état d'affichage (fenêtre ouverte), non sauvegardé

const row=(l,v,b)=>{const p=[];if(v[0]||!v[1])p.push(fmt(v[0])+' '+CR);if(v[1])p.push(fmt(v[1])+' '+AM);return `<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${p.join(' · ')}</span></div>`};
const kv=(l,v)=>`<div class="flex justify-between"><span>${l}</span><b class="text-mand">${v}</b></div>`;
const netLine=(l,x,u)=>x>=0?kv(l,fmt(x)+' '+u):`<div class="flex justify-between"><span>${l}</span><b class="text-emerald-400">Excédent de +${fmt(-x)} ${u}</b></div>`;
const hm=m=>{const t=Math.round(m);return `${Math.floor(t/60)} h ${String(t%60).padStart(2,'0')} min`};
const slider=(max,v,cb)=>`<div class="flex items-center gap-2"><input type="range" min="1" max="${max}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" onchange="setTimeout(()=>{${cb}},0)"><b class="text-mand w-8 text-right">${v}</b></div>`;
const boxes=(L,lvl,ck,cb,p)=>`<div class="grid gap-1" style="grid-template-columns:repeat(${L.length},1fr)">${L.map((m,i)=>{const d=lvl<m[0];return `<label class="text-center text-xs ${d?'opacity-40':''}"><input type="checkbox" ${ck[i]&&!d?'checked':''} ${d?'disabled':''} onchange="${cb(i)}"><br>${p}${i+1}<br>Niv. ${m[0]}</label>`}).join('')}</div>`;
const dBoxes=()=>boxes(MODS,D.lvl,D.mods,i=>`D.mods[${i}]=+this.checked`,'M');

/* ---- Calculs de base ---- */
function hangar(){let L=Z,M=Z;S.chars.forEach(c=>{if(!c.fav)return;L=add(L,sumP(LEVEL_COSTS.slice(c.lvl-1)));MODS.forEach((m,i)=>{if(!c.mods[i])M=add(M,[m[1],0])})});return{L,M,T:add(L,M)}}
const owned=()=>Object.keys(OPS).filter(k=>S.ops[k].own);
const tgtOf=p=>Math.max(p.tgt||30,p.lvl);
const skLeft=p=>OP_SKILLS.reduce((t,a,i)=>p.sk[i]||a[0]>tgtOf(p)?t:t+a[1],0);
function opRem(p){const l=p.lvl,t=tgtOf(p);if(l>=t)return{g:Z,a:Z,m:0};const cur=Math.max(0,OP_MATCHES[l-1]-(p.done||0));return{g:sumP(OP_REWARDS.slice(l,t)),a:[skLeft(p),0],m:cur+OP_MATCHES.slice(l,t-1).reduce((x,y)=>x+y,0)}}
const opNeed=()=>[owned().reduce((t,k)=>t+skLeft(S.ops[k]),0),0];
const bpSum=(f,t=S.bps)=>BP_REWARDS.filter(f).reduce((s,r)=>{const m=t&&r[4]?2:1;return[s[0]+r[1]*m,s[1]+r[2]*m,s[2]+r[3]*m]},[0,0,0]);
const withV2=(s,t)=>t===2?s.map((x,i)=>x+BP_V2[i]):s;
const bpRest=()=>bpSum(r=>r[0]>S.bpl);
const bpGot=()=>withV2(bpSum(r=>r[0]<=S.bpl),S.bps);

/* ---- Rythme de jeu & quota de farm ---- */
const dec=(n,d)=>n.toFixed(d).replace('.',',');
const gs=k=>S.stats[k]??SIM[k];
const winR=()=>Math.min(100,Math.max(0,gs('win')))/100;
const avgTr=()=>winR()*gs('tw')-(1-winR())*gs('tl');
const matchMin=()=>gs('min')+SIM.extra;   // durée du match + temps hors combat (non paramétrable)
const perDay=()=>S.act*avgTr();
const crDay=()=>Math.min(DAILY_CAP,S.act*CR_PER_FIGHT);
const capHit=()=>S.act*CR_PER_FIGHT>=DAILY_CAP;
const daysToTarget=()=>{const pd=perDay();return pd>0?Math.ceil(Math.max(0,S.lg.tgt-S.lg.cur)/pd):null};

/* ---- Ligue : récompenses obtenues en montant de S.lg.cur jusqu'à T trophées (plafonné au palier visé) ---- */
const lgGain=(T,c=S.lg.tgt)=>{const e=Math.min(T,c);return sumP(TROPHY_LEAGUE_REWARDS.filter(r=>r[0]>S.lg.cur&&r[0]<=e).map(r=>[r[1],r[2]]))};
function proj(d){const gain=Math.min(Math.max(0,S.lg.tgt-S.lg.cur),perDay()*d),end=S.lg.cur+gain;return{gain,end,v:lgGain(end)}}

/* ---- Battle Pass : pass complet et réinitialisation mensuelle ---- */
const MAXD=3650,MAXACT=99;
const bc=k=>S.bpc?.[k]??BP_RESET[k];
const bpFull=()=>withV2(bpSum(()=>true,S.bpr),S.bpr);
const nextReset=from=>{const d=new Date(from);let t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),bc('day'),bc('utcHour'));if(t<=from)t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,bc('day'),bc('utcHour'));return t};
const resetDays=now=>{const a=[],st=bc('dur')*864e5;let r=nextReset(now);while((r-now)/864e5<=MAXD+bc('dur')){a.push(Math.ceil((r-now)/864e5));r+=st}return a};

/* ---- Bilan : simulation jour par jour jusqu'à couvrir les dépenses en Crédits ----
   Dépenses : chars (niveaux + modules) + aptitudes opérateurs
   Récompenses : crédits journaliers (plafonnés) + opérateurs (étalés sur les matchs) + ligue (trophées gagnés) + Battle Pass (reste du pass, puis pass complet à chaque reset) */
function calc(){
const h=hangar(),dop=opNeed(),need=add(h.T,dop),os=opSum(),G=os.g,M=os.m,f=S.act,b=crDay(),pd=perDay(),cur=S.lg.cur;
const opAt=t=>{const x=M>0?Math.min(1,f*t/M):1;return[G[0]*x,G[1]*x]};
const lgA=t=>lgGain(cur+pd*t,1/0);
const bp0=bpRest(),bf=bpFull(),rs=resetDays(Date.now());
let D=null,k=0;
for(let t=0;t<=MAXD;t++){
while(k<rs.length&&rs[k]<=t)k++;
if(b*t+opAt(t)[0]+lgA(t)[0]+bp0[0]+k*bf[0]>=need[0]&&opAt(t)[1]+lgA(t)[1]+bp0[1]+k*bf[1]>=need[1]){D=t;break}}
const Dd=D===null?MAXD:D,op=opAt(Dd),lg=lgA(Dd),bp=[bp0[0]+k*bf[0],bp0[1]+k*bf[1]],farm=b*Dd,dT=daysToTarget();
const bB=bpSum(r=>r[0]>S.bpl,0),fB=bpSum(()=>true,0),fT=bpSum(()=>true,S.bpr),rT=bpRest(),sb=(a,c)=>a.map((x,i)=>x-c[i]),v1r=sb(rT,bB),v1f=sb(fT,fB);
const bpB=[bB[0]+k*fB[0],bB[1]+k*fB[1]],bpV1=[v1r[0]+k*v1f[0],v1r[1]+k*v1f[1]],bpV2=S.bpr===2?[k*BP_V2[0],k*BP_V2[1]]:[0,0];
return{need,dc:h.T,dop,op,lg,bp,bpB,bpV1,bpV2,k,D,Dd,b,farm,tot:[farm+bp[0]+lg[0]+op[0],bp[1]+lg[1]+op[1]],dT,p:proj(dT||0)}}

/* ---- Fenêtre modale (bulles du Hangar) ---- */
const openM=(t,id)=>{UI.m=t==='c'?{t:'c',id}:{t:'a'};render()};
const closeM=()=>{UI.m=null;render()};
/* ---- Tableaux de nivellement (dépliables) ---- */
const toggleT=k=>{UI.t[k]=!UI.t[k];render()};
const lvlTbl=(head,rows)=>`<div class="overflow-x-auto"><table class="lvl-tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const pair=v=>`${fmt(v[0])} ${CR}`+(v[1]?` · ${fmt(v[1])} ${AM}`:'');
const foldable=(k,title,html)=>`<button class="btn bev w-full" onclick="toggleT('${k}')">${UI.t[k]?'▲ Masquer le tableau':'▼ '+title}</button>${UI.t[k]?`<section class="card bev p-3 space-y-3">${html}</section>`:''}`;
const totRow=cells=>cells.map(c=>`<b class="text-mand">${c}</b>`);
function tblChars(){
const lv=LEVEL_COSTS.map((c,i)=>[`${i+1} → ${i+2}`,`${fmt(c[0])} ${CR}`,`${fmt(c[1])} ${AM}`,pair(sumP(LEVEL_COSTS.slice(i)))]);
const tot=sumP(LEVEL_COSTS);lv.push(totRow(['Total',`${fmt(tot[0])} ${CR}`,`${fmt(tot[1])} ${AM}`,'—']));
const md=MODS.map((m,i)=>[`Module ${i+1}`,`Niv. ${m[0]}`,`${fmt(m[1])} ${CR}`]);
md.push(totRow(['Total','—',`${fmt(MODS.reduce((t,m)=>t+m[1],0))} ${CR}`]));
return `<h2 class="text-mand text-sm">Nivellement des chars</h2>${lvlTbl(['Niveau',CR,AM,"Reste jusqu'au niv. 20"],lv)}
<h2 class="text-mand text-sm">Modules</h2>${lvlTbl(['Module','Niveau requis','Coût'],md)}`}
function tblOps(){
const lv=OP_MATCHES.map((m,i)=>[`${i+1} → ${i+2}`,fmt(m),fmt(OP_MATCHES.slice(i).reduce((a,b)=>a+b,0)),pair(OP_REWARDS[i+1]||[0,0])]);
const sumM=OP_MATCHES.reduce((a,b)=>a+b,0);lv.push(totRow(['Total',fmt(sumM),'—',pair(sumP(OP_REWARDS.slice(1,30)))]));
const sk=OP_SKILLS.map((a,i)=>[`A${i+1}`,`Niv. ${a[0]}`,`${fmt(a[1])} ${CR}`]);
sk.push(totRow(['Total','—',`${fmt(OP_SKILLS.reduce((t,a)=>t+a[1],0))} ${CR}`]));
return `<h2 class="text-mand text-sm">Combats par niveau</h2>${lvlTbl(['Niveau','Matchs','Restants','Récompenses'],lv)}
<h2 class="text-mand text-sm">Aptitudes</h2>${lvlTbl(['Aptitude','Niveau requis','Coût'],sk)}`}
function vHangar(){return vHangar0()+foldable('h','Tableau de nivellement',tblChars())}
function vOps(){return vOps0()+foldable('o','Tableau de nivellement',tblOps())}

function renderModal(){const m=$('#modal');
if(!UI.m){m.className='';m.innerHTML='';m.onclick=null;return}
let body;
if(UI.m.t==='a')body=addForm();
else{const c=byId(UI.m.id);if(!c){UI.m=null;m.className='';m.innerHTML='';return}body=charCard(c)}
m.className='open';
let down=false;m.onpointerdown=e=>{down=e.target===m};m.onclick=e=>{const ok=down&&e.target===m;down=false;if(ok)closeM()};
m.innerHTML=`<div>${body.replace('</section>','<button class="btn bev w-full mt-2" onclick="closeM()">Fermer</button></section>')}</div>`;}

/* ---- Onglet 1 : Mon Hangar ---- */
/* ---- Chars de la boutique (masquée) : nom/image dérivés de CHARS via c.key ---- */
const catOf=c=>c.key&&CHARS.find(x=>x[0]===c.key);
const cName=c=>{const x=catOf(c);return x?(x[1]||x[0]):c.name};
const cImg=c=>{const x=catOf(c);return c.img||(x?`assets/${x[0]}.webp`:null)};
const GRID=()=>`<div class="grid gap-3" style="grid-template-columns:repeat(${S.cols||3},minmax(0,1fr))">`;
const STAR=f=>`<svg viewBox="0 0 24 24" class="w-5 h-5" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>`;
const TRASH='<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
const bub=(c,a='',lvl=1,tag='button')=>{const im=cImg(c);return `<${tag} class="bubble${im?' has-img':''}" ${a}>${im?`<i class="art" style="background-image:url(${im})"></i>`:''}<b>${esc(cName(c))}</b>${lvl?`<small>Niv. ${c.lvl}</small>`:''}${lvl&&c.fav&&tag==='button'?'<span class="fav-b">★</span>':''}</${tag}>`};
function vHangar0(){const h=hangar(),shop=CHARS.filter(x=>!S.chars.some(c=>c.key===x[0]));return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total</h2>${row('Niveaux',h.L)}${row('Modules',h.M)}${row('Total complet',h.T,1)}</section>
<section id="hangarZone" class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Mon Hangar</h2>${GRID()}${S.chars.map(c=>bub(c,`data-drag="${c.id}" data-from="h" onclick="hClick(${c.id})" oncontextmenu="return false"`)).join('')}<button class="bubble add" onclick="openM('a')" aria-label="Ajouter un char"><span class="pl">+</span></button></div></section>`
+`<div id="shopZone" class="space-y-3"><button class="btn bev w-full" onclick="toggleT('c')">${UI.t.c?'▲':'▼'} Chars</button>${UI.t.c?`<section class="card bev p-3">${GRID()}${shop.map(x=>bub({key:x[0]},`data-drag="${esc(x[0])}" data-from="s" onclick="shopClick(this.dataset.drag)" oncontextmenu="return false"`,0)).join('')}</div></section>`:''}</div>`}
function addCat(key,to){const x=CHARS.find(x=>x[0]===key);if(!x||S.chars.some(c=>c.key===key))return;const n={id:newId(),key,name:x[1]||x[0],lvl:1,mods:[0,0,0,0,0],img:null,fav:0},ti=to==null?-1:S.chars.findIndex(c=>c.id===to);S.chars.splice(ti<0?S.chars.length:ti,0,n);go()}
function moveChar(id,to){const a=S.chars,i=a.findIndex(c=>c.id===id),ti=to==null?-1:a.findIndex(c=>c.id===to);if(i<0)return;const[c]=a.splice(i,1);a.splice(ti<0?a.length:ti,0,c);go()}
function toggleFav(id){const a=S.chars,i=a.findIndex(c=>c.id===id);if(i<0)return;const c=a[i];c.fav=c.fav?0:1;a.splice(i,1);let j;if(c.fav){j=a.findIndex(x=>!x.fav);if(j<0)j=a.length}else j=a.reduce((m,x,k)=>x.fav?k+1:m,0);a.splice(j,0,c);go()}
/* ---- Glisser-déposer boutique → hangar (Pointer Events ; tactile : appui long ~0,2 s pour ne pas bloquer le défilement) ---- */
let DRG=null,DRGEND=0,CLK=null;
const recent=()=>Date.now()-DRGEND<400;
function shopClick(k){if(!recent())addCat(k)}
function hClick(id){if(recent())return;if(CLK&&CLK.id===id){clearTimeout(CLK.t);CLK=null;toggleFav(id);return}CLK={id,t:setTimeout(()=>{CLK=null;openM('c',id)},260)}}   // simple clic : fiche ; double clic : favori
document.addEventListener('touchmove',e=>{if(DRG&&DRG.on)e.preventDefault()},{passive:false});
document.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest('[data-drag]');if(!el||DRG||(e.pointerType==='mouse'&&e.button!==0))return;
DRG={el,key:el.dataset.drag,from:el.dataset.from,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,on:false,id:e.pointerId,touch:e.pointerType!=='mouse',g:null,raf:0,t:0};
if(DRG.touch)DRG.t=setTimeout(dragStart,220)});
document.addEventListener('pointermove',e=>{if(!DRG||e.pointerId!==DRG.id)return;DRG.x=e.clientX;DRG.y=e.clientY;
if(!DRG.on){const d=Math.hypot(DRG.x-DRG.x0,DRG.y-DRG.y0);if(!DRG.touch&&d>5)dragStart();else if(DRG.touch&&d>10)dragEnd(false);return}
dragMove()});
document.addEventListener('pointerup',e=>{if(DRG&&e.pointerId===DRG.id)dragEnd(true)});
document.addEventListener('pointercancel',e=>{if(DRG&&e.pointerId===DRG.id)dragEnd(false)});
function dragStart(){if(!DRG||DRG.on)return;DRG.on=true;clearTimeout(DRG.t);const g=DRG.el.cloneNode(true);g.removeAttribute('data-drag');g.classList.add('drag-ghost');const r=DRG.el.getBoundingClientRect();DRG.w=r.width;DRG.h=r.height;g.style.width=r.width+'px';g.style.height=r.height+'px';document.body.appendChild(g);DRG.g=g;DRG.el.classList.add('drag-src');document.body.classList.add('dragging');if(navigator.vibrate)navigator.vibrate(15);dragMove();DRG.raf=requestAnimationFrame(dragLoop)}
function dragMove(){if(!DRG||!DRG.g)return;DRG.g.style.transform=`translate3d(${DRG.x-DRG.w/2}px,${DRG.y-DRG.h/2-(DRG.touch?40:0)}px,0)`;document.querySelectorAll('.drop-on').forEach(e=>e.classList.remove('drop-on'));const t=document.elementFromPoint(DRG.x,DRG.y);if(!t)return;const tile=t.closest('[data-from="h"]'),hz=t.closest('#hangarZone'),sz=t.closest('#shopZone');const z=DRG.from==='s'?(tile||hz):(tile&&tile!==DRG.el)?tile:(!tile&&hz)?hz:(sz||null);if(z)z.classList.add('drop-on')}
function dragLoop(){if(!DRG||!DRG.on)return;if(DRG.y<80)scrollBy(0,-14);else if(DRG.y>innerHeight-120)scrollBy(0,14);dragMove();DRG.raf=requestAnimationFrame(dragLoop)}
function dragEnd(drop){const d=DRG;if(!d)return;DRG=null;clearTimeout(d.t);cancelAnimationFrame(d.raf);if(d.g)d.g.remove();d.el.classList.remove('drag-src');document.body.classList.remove('dragging');document.querySelectorAll('.drop-on').forEach(e=>e.classList.remove('drop-on'));
if(d.on)DRGEND=Date.now();
if(drop&&d.on){const t=document.elementFromPoint(d.x,d.y);if(!t)return;const tile=t.closest('[data-from="h"]'),hz=t.closest('#hangarZone');
if(d.from==='s'){if(tile)addCat(d.key,+tile.dataset.drag);else if(hz)addCat(d.key)}
else if(tile&&tile!==d.el)moveChar(+d.key,+tile.dataset.drag);else if(!tile&&hz)moveChar(+d.key,null);else if(!tile&&t.closest('#shopZone'))delChar(+d.key)}}
function addForm(){return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ajouter un char</h2><input id="cn" type="text" placeholder="Nom du char" maxlength="30">${slider(20,D.lvl,'dLvl(+this.value)')}<div id="dm">${dBoxes()}</div><button class="btn bev w-full" onclick="addChar()">Ajouter</button>
<button class="btn bev w-full" onclick="pickImg(d=>{D.img=d;const e=$('#dimg');if(e)e.innerHTML=previewImg(d)})">Importer</button><div id="dimg">${D.img?previewImg(D.img):''}</div></section>`}
function previewImg(d){return `<img class="crop-16x10" src="${d}" alt="">`}
function toCrop(f,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const W=480,H=300,w=im.width,h=im.height;let sx=0,sy=0,sw=w,sh=h;
if(w/h>1.6){sw=h*1.6;sx=(w-sw)/2}else{sh=w/1.6;sy=(h-sh)/2}
const cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,W,H);cb(cv.toDataURL('image/jpeg',0.8))};im.src=r.result};r.readAsDataURL(f)}
function pickImg(cb){const i=document.createElement('input');i.type='file';i.accept='image/*';i.style.display='none';document.body.appendChild(i);
i.onchange=()=>{const f=i.files[0];i.remove();if(f)toCrop(f,cb)};i.click()}
function charCard(c){const nx=c.lvl<20?LEVEL_COSTS[c.lvl-1]:Z,md=MODS.reduce((t,m,i)=>c.mods[i]?t:t+m[1],0);
const lvlRest=sumP(LEVEL_COSTS.slice(c.lvl-1));
return `<section class="card bev p-3 space-y-2 relative"><button class="absolute ${c.fav?'text-mand':'text-mag'}" style="top:10px;right:10px" onclick="toggleFav(${c.id})" aria-label="Favori" aria-pressed="${!!c.fav}">${STAR(c.fav)}</button><div class="flex justify-center"><div class="relative" style="width:7rem">${bub(c,'',1,'div')}${c.img?`<button class="absolute text-mag font-bold px-2" style="left:100%;top:-8px" onclick="rmImg(${c.id})" aria-label="Retirer l'image">✕</button>`:''}</div></div>${c.img?'':`<div class="flex justify-center"><button class="btn bev text-xs" onclick="pickImg(d=>{byId(${c.id}).img=d;go()})">Importer</button></div>`}<div class="flex justify-between"><b class="ttl text-sm">${esc(cName(c))}</b><button onclick="delChar(${c.id})" class="text-mag px-2" aria-label="Supprimer ce char">${TRASH}</button></div>${slider(20,c.lvl,`cLvl(${c.id},+this.value)`)}${boxes(MODS,c.lvl,c.mods,i=>`cMod(${c.id},${i},this.checked)`,'M')}<div class="text-sm">${row('Niveau suivant',nx)}${row('Reste jusqu\'au niv. 20',sumP(LEVEL_COSTS.slice(c.lvl-1)))}${row('Modules restants',[md,0])}${row('Total complet',add(lvlRest,[md,0]),1)}</div></section>`}
const byId=id=>S.chars.find(c=>c.id===id);
function dLvl(v){D.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])D.mods[i]=0});$('#dm').innerHTML=dBoxes()}
function addChar(){S.chars.push({id:newId(),name:($('#cn').value.trim()||'Char '+(S.chars.length+1)).slice(0,30),lvl:D.lvl,mods:[...D.mods],img:D.img,fav:0});D={lvl:1,mods:[0,0,0,0,0],img:null};UI.m=null;go()}
function cLvl(id,v){const c=byId(id);c.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])c.mods[i]=0});go()}
function cMod(id,i,v){byId(id).mods[i]=+v;go()}
function rmImg(id){if(confirm(byId(id)?.key?"Rétablir l'image d'origine ?":'Supprimer cette image ?')){byId(id).img=null;go()}}
function delChar(id){if(confirm(byId(id)?.key?'Retirer ce char du hangar ? Son niveau et ses modules seront perdus.':'Supprimer ce char ? Il sera définitivement perdu.')){S.chars=S.chars.filter(c=>c.id!==id);UI.m=null;go()}}

/* ---- Onglet 2 : Opérateurs ---- */
function opSum(){return owned().reduce((t,k)=>{const r=opRem(S.ops[k]);return{g:add(t.g,r.g),a:add(t.a,r.a),m:t.m+r.m}},{g:Z,a:Z,m:0})}
function vOps0(){const o=opSum();return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total</h2>${row("Récompenses d'Opérateur restantes",o.g)}${row('Dépenses Aptitudes restantes',o.a)}${netLine('Total des Récompenses Restantes',o.a[0]-o.g[0],CR)}${kv('Matchs restants',fmt(o.m))}${kv('Temps de jeu estimé',hm(o.m*matchMin()))}</section>`+Object.entries(OPS).map(([k,o])=>{const p=S.ops[k],r=opRem(p),m=r.m,t=tgtOf(p);
const body=p.own?`${dualSlider(k,p.lvl,t)}${boxes(OP_SKILLS,p.lvl,p.sk,i=>`oSk('${k}',${i},this.checked)`,'A')}<div class="text-sm">${kv('Matchs restants (→ niv. '+t+')',fmt(m))}${kvDone(k,p)}${row("Récompenses d'Opérateur restants",r.g)}${row('Dépenses Aptitudes restantes',r.a)}</div>`:'<p class="text-sm opacity-60">Non acquis : exclu des calculs.</p>';
return `<section class="card bev op-card p-3 space-y-2"><div class="op-bg" aria-hidden="true"><img src="assets/${k}.png" alt="" onerror="this.parentNode.remove()"></div><div class="flex items-center gap-2"><b class="ttl">${o.n}</b><div class="ml-auto text-right">${o.price?`<label class="text-xs"><input type="checkbox" ${p.own?'checked':''} onchange="oOwn('${k}',this.checked)"> Acquis (${o.price} ${HC})</label>`:'<span class="text-xs text-mand font-bold">Gratuite</span>'}</div></div>${body}</section>`}).join('')}
function oOwn(k,v){S.ops[k].own=+v;go()}
function oLvl(k,v){const p=S.ops[k];if(v!==p.lvl)p.done=0;p.lvl=v;if(tgtOf(p)<v)p.tgt=v;OP_SKILLS.forEach((a,i)=>{if(v<a[0])p.sk[i]=0});go()}
function oTgt(k,v){const p=S.ops[k];p.tgt=Math.max(v,p.lvl);go()}
function opDone(k){const p=S.ops[k],max=OP_MATCHES[p.lvl-1];if(max==null)return;const v=prompt('Combats effectués sur le niveau '+p.lvl+' (sur '+max+') :',p.done||0);if(v===null)return;p.done=Math.min(max,Math.max(0,parseInt(v)||0));go()}
const kvDone=(k,p)=>p.lvl>=30?kv('Combats effectués','Niveau max'):`<div class="flex justify-between items-center"><span>Combats effectués (niv. ${p.lvl})</span><span class="flex items-center gap-1"><b class="text-mand">${Math.min(p.done||0,OP_MATCHES[p.lvl-1])} / ${OP_MATCHES[p.lvl-1]}</b><button class="text-xs opacity-60 px-1" onclick="opDone('${k}')" aria-label="Modifier les combats effectués">✎</button></span></div>`;
function dualSlider(k,lvl,tgt){return `<div class="flex items-center gap-2"><div class="dual" style="--a:${(lvl-1)/29*100}%;--b:${(tgt-1)/29*100}%"><div class="dual-track"></div><div class="dual-fill"></div><input class="da" type="range" min="1" max="30" value="${lvl}" oninput="dualIn(this,0)" onchange="setTimeout(()=>oLvl('${k}',+this.value),0)"><input class="db" type="range" min="1" max="30" value="${tgt}" oninput="dualIn(this,1)" onchange="setTimeout(()=>oTgt('${k}',+this.value),0)"></div><b class="text-mand w-16 text-right text-sm dv">${lvl} → ${tgt}</b></div>`}
function dualIn(el,w){const d=el.closest('.dual');const a=d.querySelector('.da'),b=d.querySelector('.db');let x=+a.value,y=+b.value;if(w===0&&x>y){b.value=x;y=x}if(w===1&&y<x){a.value=y;x=y}d.style.setProperty('--a',(x-1)/29*100+'%');d.style.setProperty('--b',(y-1)/29*100+'%');d.parentNode.querySelector('.dv').textContent=x+' → '+y}
function oSk(k,i,v){S.ops[k].sk[i]=+v;go()}

/* ---- Trophées : saisie unique, synchronisée sur les deux onglets ---- */
const trophyCur=()=>`<label class="text-xs">Trophées actuels<input data-lg="cur" type="number" min="0" value="${S.lg.cur}" oninput="lgIn('cur',this.value)"></label>`;
const trophyTgt=()=>`<label class="text-xs">Trophées visés<input data-lg="tgt" type="number" min="0" value="${S.lg.tgt}" oninput="lgIn('tgt',this.value)"></label>`;
function lgIn(k,v){S.lg[k]=Math.max(0,+v||0);save();document.querySelectorAll(`[data-lg="${k}"]`).forEach(e=>{if(e!==document.activeElement)e.value=S.lg[k]});upd3()}

/* ---- Onglet 3 : Récompenses ---- */
const TRI=ic('trophy.png');
const CYC='<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
function statsHtml(){const v=k=>gs(k),mm=matchMin();const inp=(k,l,step,val)=>`<label class="text-xs flex justify-between items-center gap-2"><span>${l}</span><input type="number" step="${step}" min="0" value="${val}" style="width:6rem" onchange="statsIn('${k}',this.value)"></label>`;
const det=`<div class="space-y-2 border-t border-mag/40 pt-2"><div id="crp" class="text-sm text-right"></div>
${inp('min','Durée moyenne d\'un match (min)','0.01',v('min'))}${inp('win','Taux de victoires (%)','0.01',v('win'))}${inp('tw','Trophées / match gagnant','0.1',v('tw'))}${inp('tl','Trophées / match perdu','0.1',v('tl'))}
<div class="flex justify-between text-sm"><span>Trophées / match (moyenne)</span><b class="text-mand">${dec(avgTr(),2)}</b></div>
<button class="btn bev text-xs" onclick="statsReset()">Rétablir les valeurs par défaut</button></div>`;
return `<section id="statsBlock" class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Statistiques de Matchs</h2>
<div class="flex items-center gap-2 text-xs"><span class="w-28">Matchs / jour</span><input id="actS" type="range" min="1" max="${MAXACT}" value="${S.act}" oninput="actSync(this.value)"><b id="actV" class="text-mand w-12 text-right">${S.act}</b></div>
<div class="flex items-center gap-2 text-xs"><span class="w-28">Temps de jeu / j</span><input id="timeS" type="range" min="${mm}" max="${MAXACT*mm}" step="${mm}" value="${S.act*mm}" oninput="timeSync(this.value)"><b id="timeV" class="text-mand w-20 text-right">${hm(S.act*mm)}</b></div>
<button class="btn bev w-full text-xs" onclick="toggleT('s')">${UI.t.s?'▲ Masquer les statistiques':'▼ Détails des statistiques'}</button>${UI.t.s?det:''}</section>`}
function statsRefresh(){const b=$('#statsBlock');if(S.tab===2&&b){b.outerHTML=statsHtml();upd3();return}render()}
function statsIn(k,v){const n=+v;if(!(n>=0)||v==='')return;S.stats[k]=k==='win'?Math.min(100,n):n;save();statsRefresh()}
function statsReset(){S.stats={min:SIM.min,win:SIM.win,tw:SIM.tw,tl:SIM.tl};S.act=SIM.act;save();statsRefresh()}

function vEval(){const ms=nextReset(Date.now())-Date.now(),nr=`${Math.floor(ms/864e5)}j ${Math.floor(ms%864e5/36e5)}h`;
const vip=(n,l)=>`<div class="flex items-center gap-2"><label class="flex items-center gap-2 text-sm flex-1"><input type="checkbox" ${S.bps===n?'checked':''} onchange="bpStd(${n},this.checked)"> ${l}</label><button class="cycle-btn ${S.bpr===n?'on':''}" onclick="bpRec(${n})" aria-pressed="${S.bpr===n}" aria-label="Récurrence ${l}" title="Récurrence">${CYC}</button></div>`;
return statsHtml()
+`<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ligue des trophées</h2>${trophyCur()}<div id="rate" class="text-sm"></div>
<button class="btn bev w-full text-xs" onclick="toggleT('l')">${UI.t.l?'▲ Masquer le calculateur':'▼ Calculateur de trophées visés'}</button>${UI.t.l?`<div class="space-y-2 border-t border-mag/40 pt-2">${trophyTgt()}<div id="lgr" class="text-sm space-y-1"></div></div>`:''}</section>`
+`<section class="card bev p-3 space-y-2"><div class="flex justify-between items-center"><h2 class="text-mand text-sm">Battle Pass</h2><span class="text-xs text-mand font-bold">${nr}</span></div>${bpSlider()}${vip(1,'Battle Pass VIP (niv 1)')}${vip(2,'Battle Pass VIP (niv 2)')}<div id="bpr" class="text-sm space-y-1"></div></section>`
+`<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Estimation de Farm</h2><div id="net" class="text-sm space-y-1"></div></section>`}
function applyAct(n){S.act=Math.max(1,Math.min(MAXACT,Math.round(n)||1));save();const mm=matchMin(),a=$('#actS'),t=$('#timeS'),av=$('#actV'),tv=$('#timeV');if(a)a.value=S.act;if(t)t.value=S.act*mm;if(av)av.textContent=S.act;if(tv)tv.textContent=hm(S.act*mm);upd3()}
function actSync(v){applyAct(+v)}
function timeSync(v){applyAct((+v)/matchMin())}
function bpRec(n){S.bpr=S.bpr===n?0:n;go()}
function bpSlider(){return `<div class="flex items-center gap-2"><input type="range" min="0" max="${BP_MAX}" value="${S.bpl}" oninput="this.nextElementSibling.textContent=this.value" onchange="setTimeout(()=>bpLvl(+this.value),0)"><b class="text-mand w-8 text-right">${S.bpl}</b></div>`}
function bpLvl(v){S.bpl=Math.max(0,Math.min(BP_MAX,v));go()}
function bpStd(n,ck){S.bps=ck?n:0;go()}
const rowBoth=(l,v,b)=>`<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${fmt(v[0])} ${CR} · ${fmt(v[1])} ${AM}</span></div>`;
const bpLine=(l,v,b)=>{const p=[];if(v[0]||!v[1])p.push(fmt(v[0])+' '+CR);if(v[1])p.push(fmt(v[1])+' '+AM);if(v[2])p.push(fmt(v[2])+' '+HC);return `<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${p.join(' · ')}</span></div>`};
function upd3(){const e=$('#net');if(!e)return;const c=calc(),pd=perDay();
const L=$('#lgr');if(L)L.innerHTML=kv('Temps estimé',c.dT===null?'—':c.dT+' j')+kv('Trophées gagnés',fmt(c.p.gain))+rowBoth('Récompenses',c.p.v,1);
const cp=$('#crp');if(cp)cp.innerHTML=`<b class="text-mand">${fmt(crDay())} ${CR} / j</b>`;
const col=(n,l)=>`<div><b class="text-mand">${fmt(n)} ${TRI} / ${l}</b><div class="text-sm">= ${fmt(S.lg.cur+n)} ${TRI}</div></div>`;
$('#rate').innerHTML=`<div class="flex flex-wrap justify-between gap-x-3">${col(pd,'j')}${col(pd*7,'sem')}${col(pd*30,'mois')}</div>`;
$('#bpr').innerHTML=bpLine('Déjà obtenu',bpGot())+bpLine('Restant à obtenir',bpRest(),1);
const sep='<hr class="border-mag/40 my-1">';
const pl=c.k>1?'s':'',bpL='Battle Pass'+(c.k?` (+${c.k} BP complété${pl})`:'');
e.innerHTML=row('Dépenses Chars',c.dc)+row('Dépenses Opérateurs',c.dop)+row('Dépenses Total',c.need,1)+sep
+row('Crédits journalier',[c.farm,0])+row(bpL,c.bpB)+((c.bpV1[0]||c.bpV1[1])?row('Battle Pass VIP niv1',c.bpV1):'')+(S.bpr===2&&c.k?row(`Battle Pass VIP niv2 (+${c.k} abonnement${pl})`,c.bpV2):'')+row('Ligue',c.lg)+row("Récompenses d'Opérateur",c.op)+row('Récompenses Total',c.tot,1)+sep
+kv('Temps Total de jeu estimé',c.D===null?'plus de 10 ans':c.D+' j')}

const GEAR='<svg viewBox="0 0 24 24" class="w-7 h-7" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="6.5" stroke-width="2.4"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><g stroke-width="3.4"><line x1="12" y1="1.8" x2="12" y2="5.4"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(45 12 12)"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(90 12 12)"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(135 12 12)"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(180 12 12)"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(225 12 12)"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(270 12 12)"/><line x1="12" y1="1.8" x2="12" y2="5.4" transform="rotate(315 12 12)"/></g></svg>';
const TABS=[['assets/tanks.png','Hangar'],['assets/iconhank.png','Opérateurs'],['assets/trophy.png','Récompenses'],['gear','Paramètres']];
function render(){$('#nav').innerHTML=TABS.map((t,i)=>`<button onclick="S.tab=${i};UI.m=null;go()" class="py-2 ttl text-[9px] flex flex-col items-center justify-start gap-1 min-w-0 ${S.tab==i?'text-mand bg-night':'opacity-70'}"><span class="w-7 h-7 flex items-center justify-center">${t[0]==='gear'?GEAR:`<img src="${t[0]}" alt="" class="w-7 h-7 object-contain">`}</span><span class="leading-none">${t[1]}</span></button>`).join('');
if(S.tab>3)S.tab=0;
$('#app').innerHTML=[vHangar,vOps,vEval,vSet][S.tab]();[,,upd3][S.tab]?.();renderModal()}
function ioHtml(){return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Sauvegarde</h2><div class="flex gap-2"><button class="btn bev" onclick="expZip()">Exporter</button><button class="btn bev" onclick="pickFile('.zip',impZip)">Importer</button></div></section>`}
function bpSetHtml(){const inp=(k,l,mn,mx)=>`<label class="text-xs flex justify-between items-center gap-2"><span>${l}</span><input type="number" step="1" min="${mn}" max="${mx}" value="${bc(k)}" style="width:6rem" onchange="bpcIn('${k}',this.value,${mn},${mx})"></label>`;
return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Battle Pass</h2>${inp('dur','Durée d\'un Battle Pass (jours)',1,365)}${inp('day','Jour de réinitialisation (du mois)',1,28)}${inp('utcHour','Heure de réinitialisation (UTC+0)',0,23)}<button class="btn bev text-xs" onclick="bpcReset()">Rétablir les valeurs par défaut</button></section>`}
function bpcIn(k,v,mn,mx){const n=Math.round(+v);if(v===''||!(n>=mn))return;S.bpc={...BP_RESET,...S.bpc,[k]:Math.min(mx,n)};go()}
function bpcReset(){S.bpc={...BP_RESET};go()}
function dispHtml(){return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Affichage</h2><div class="text-xs">Icônes par ligne</div><div class="grid grid-cols-5 gap-2">${[5,4,3,2,1].map(n=>`<button class="btn bev" ${S.cols===n?'style="background:#ff8a1f;color:#070e3a" ':''}aria-pressed="${S.cols===n}" onclick="setCols(${n})">${n}</button>`).join('')}</div></section>`}
function setCols(n){S.cols=n;go()}
function vSet(){return `<h1 class="ttl text-mand text-sm">Paramètres</h1>${dispHtml()}${bpSetHtml()}${ioHtml()}`}
function download(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function pickFile(acc,cb){const i=document.createElement('input');i.type='file';i.accept=acc;i.style.display='none';document.body.appendChild(i);i.onchange=()=>{const f=i.files[0];i.remove();if(f)cb(f)};i.click()}
async function expZip(){if(typeof JSZip==='undefined'){alert('Bibliothèque ZIP absente : vérifiez le dossier lib/ sur GitHub.');return}try{const z=new JSZip();const chars=S.chars.map(({img,...r})=>{if(!img)return r;const f=`images/${r.id}.jpg`;z.file(f,img.split(',')[1],{base64:true});return{...r,imgFile:f}});z.file('data.json',JSON.stringify({...S,chars}));download(await z.generateAsync({type:'blob'}),'tank-a-boom-sauvegarde.zip')}catch(e){alert('Export impossible : '+e.message)}}
async function impZip(f){if(typeof JSZip==='undefined'){alert('Bibliothèque ZIP absente : vérifiez le dossier lib/ sur GitHub.');return}try{const z=await JSZip.loadAsync(f);const df=z.file('data.json');if(!df)throw new Error('data.json absent');const o=JSON.parse(await df.async('string'));if(!Array.isArray(o.chars))throw new Error('format invalide');
o.chars=await Promise.all(o.chars.map(async c=>{const{imgFile,...r}=c;if(imgFile&&z.file(imgFile)){return{...r,img:'data:image/jpeg;base64,'+await z.file(imgFile).async('base64')}}return{...r,img:r.img||null}}));
S={...def(),...o};fixS();go();alert('Sauvegarde ZIP importée.')}catch(e){alert('Import impossible : '+e.message)}}
render();
