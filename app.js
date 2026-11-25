const KEY='tab_companion_v1';

const ic=f=>`<img src="assets/${f}" alt="" class="cur-ic">`;
const CR=ic('credits.png'),AM=ic('upcreds.png'),HC=ic('hypercredits.png');
const Z=[0,0],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sumP=a=>a.reduce(add,Z),$=s=>document.querySelector(s),
fmt=n=>Math.round(n).toLocaleString('fr-FR'),esc=s=>s.replace(/[&<>\"']/g,c=>'&#'+c.charCodeAt(0)+';');
const def=()=>({tab:0,chars:[],ops:Object.fromEntries(Object.keys(OPS).map(k=>[k,{own:+!OPS[k].price,lvl:1,tgt:30,done:0,sk:[0,0,0,0]}])),lg:{cur:0,tgt:54900},act:SIM.act,stats:{min:SIM.min,win:SIM.win,tw:SIM.tw,tl:SIM.tl},bpl:0,bps:0,bpr:0});
let S;try{S={...def(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=def()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const go=()=>{save();render()};
let D={lvl:1,mods:[0,0,0,0,0],img:null};
let UI={m:null,t:{h:false,o:false,l:false,s:false}};   // état d'affichage (fenêtre ouverte), non sauvegardé

const row=(l,v,b)=>{const p=[];if(v[0]||!v[1])p.push(fmt(v[0])+' '+CR);if(v[1])p.push(fmt(v[1])+' '+AM);return `<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${p.join(' · ')}</span></div>`};
const kv=(l,v)=>`<div class="flex justify-between"><span>${l}</span><b class="text-mand">${v}</b></div>`;
const netLine=(l,x,u)=>x>=0?kv(l,fmt(x)+' '+u):`<div class="flex justify-between"><span>${l}</span><b class="text-emerald-400">Excédent de +${fmt(-x)} ${u}</b></div>`;
const hm=m=>{const t=Math.round(m);return `${Math.floor(t/60)} h ${String(t%60).padStart(2,'0')} min`};
const slider=(max,v,cb)=>`<div class="flex items-center gap-2"><input type="range" min="1" max="${max}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" onchange="setTimeout(()=>{${cb}},0)"><b class="text-mand w-8 text-right">${v}</b></div>`;
const boxes=(L,lvl,ck,cb,p)=>`<div class="grid gap-1" style="grid-template-columns:repeat(${L.length},1fr)">${L.map((m,i)=>{const d=lvl<m[0];return `<label class="text-center text-xs ${d?'opacity-40':''}"><input type="checkbox" ${ck[i]&&!d?'checked':''} ${d?'disabled':''} onchange="${cb(i)}"><br>${p}${i+1}<br>Niv. ${m[0]}</label>`}).join('')}</div>`;
const dBoxes=()=>boxes(MODS,D.lvl,D.mods,i=>`D.mods[${i}]=+this.checked`,'M');

/* ---- Calculs de base ---- */
function hangar(){let L=Z,M=Z;S.chars.forEach(c=>{L=add(L,sumP(LEVEL_COSTS.slice(c.lvl-1)));MODS.forEach((m,i)=>{if(!c.mods[i])M=add(M,[m[1],0])})});return{L,M,T:add(L,M)}}
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
if(b*t+opAt(t)[0]+lgA(t)[0]+bp0[0]+k*bf[0]>=need[0]){D=t;break}}
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
function vHangar0(){const h=hangar();return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total</h2>${row('Niveaux',h.L)}${row('Modules',h.M)}${row('Total complet',h.T,1)}</section>
<section class="card bev p-3"><div class="grid grid-cols-4 gap-3 justify-items-center">${S.chars.map(c=>`<button class="bubble${c.img?' has-img':''}" onclick="openM('c',${c.id})" style="${c.img?`background-image:url(${c.img});background-size:cover;background-position:center`:''}"><b>${esc(c.name)}</b><small>Niv. ${c.lvl}</small></button>`).join('')}<button class="bubble add" onclick="openM('a')" aria-label="Ajouter un char">+</button></div></section>`}
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
return `<section class="card bev p-3 space-y-2">${c.img?`<div class="relative">${previewImg(c.img)}<button class="absolute top-1 right-1 text-mag font-bold px-2" onclick="rmImg(${c.id})">✕</button></div>`:`<div class="flex justify-start"><button class="btn bev text-xs" onclick="pickImg(d=>{byId(${c.id}).img=d;go()})">Importer</button></div>`}<div class="flex justify-between"><b class="ttl text-sm">${esc(c.name)}</b><button onclick="delChar(${c.id})" class="text-mag font-bold px-2">✕</button></div>${slider(20,c.lvl,`cLvl(${c.id},+this.value)`)}${boxes(MODS,c.lvl,c.mods,i=>`cMod(${c.id},${i},this.checked)`,'M')}<div class="text-sm">${row('Niveau suivant',nx)}${row('Reste jusqu\'au niv. 20',sumP(LEVEL_COSTS.slice(c.lvl-1)))}${row('Modules restants',[md,0])}${row('Total complet',add(lvlRest,[md,0]),1)}</div></section>`}
const byId=id=>S.chars.find(c=>c.id===id);
function dLvl(v){D.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])D.mods[i]=0});$('#dm').innerHTML=dBoxes()}
function addChar(){S.chars.push({id:Date.now(),name:($('#cn').value.trim()||'Char '+(S.chars.length+1)).slice(0,30),lvl:D.lvl,mods:[...D.mods],img:D.img});D={lvl:1,mods:[0,0,0,0,0],img:null};UI.m=null;go()}
function cLvl(id,v){const c=byId(id);c.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])c.mods[i]=0});go()}
function cMod(id,i,v){byId(id).mods[i]=+v;go()}
function rmImg(id){if(confirm('Supprimer cette image ?')){byId(id).img=null;go()}}
function delChar(id){if(confirm('Supprimer ce char ?')){S.chars=S.chars.filter(c=>c.id!==id);UI.m=null;go()}}

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
const bpLine=(l,v,b)=>row(l,[v[0],v[1]],b)+(v[2]?`<div class="flex justify-between ${b?'text-mand font-bold':''}"><span>${l}</span><span>${fmt(v[2])} ${HC}</span></div>`:'');
function upd3(){const e=$('#net');if(!e)return;const c=calc(),pd=perDay();
const L=$('#lgr');if(L)L.innerHTML=kv('Temps estimé',c.dT===null?'—':c.dT+' j')+kv('Trophées gagnés',fmt(c.p.gain))+rowBoth('Récompenses',c.p.v,1);
const cp=$('#crp');if(cp)cp.innerHTML=`<b class="text-mand">${fmt(crDay())} ${CR} / j</b>`;
const col=(n,l)=>`<div><b class="text-mand">${fmt(n)} ${TRI} / ${l}</b><div class="text-sm">= ${fmt(S.lg.cur+n)} ${TRI}</div></div>`;
$('#rate').innerHTML=`<div class="flex flex-wrap justify-between gap-x-3">${col(pd,'j')}${col(pd*7,'sem')}${col(pd*30,'mois')}</div>`;
$('#bpr').innerHTML=bpLine('Déjà obtenu',bpGot())+bpLine('Restant à obtenir',bpRest(),1);
const sep='<hr class="border-mag/40 my-1">';
const pl=c.k>1?'s':'',bpL='Battle Pass'+(c.k?` (+${c.k} BP complété${pl})`:'');
e.innerHTML=row('Dépenses Chars',c.dc)+row('Dépenses Opérateurs',c.dop)+row('Dépenses Total',c.need,1)+sep
+row('Crédits journalier',[c.farm,0])+row(bpL,c.bpB)+((S.bps||S.bpr)?row('Battle Pass VIP niv1',c.bpV1):'')+(S.bpr===2&&c.k?row(`Battle Pass VIP niv2 (+${c.k} abonnement${pl})`,c.bpV2):'')+row('Ligue',c.lg)+row("Récompenses d'Opérateur",c.op)+row('Récompenses Total',c.tot,1)+sep
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
function vSet(){return `<h1 class="ttl text-mand text-sm">Paramètres</h1>${bpSetHtml()}${ioHtml()}`}
function download(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function pickFile(acc,cb){const i=document.createElement('input');i.type='file';i.accept=acc;i.style.display='none';document.body.appendChild(i);i.onchange=()=>{const f=i.files[0];i.remove();if(f)cb(f)};i.click()}
async function expZip(){if(typeof JSZip==='undefined'){alert('Bibliothèque ZIP absente : vérifiez le dossier lib/ sur GitHub.');return}try{const z=new JSZip();const chars=S.chars.map(({img,...r})=>{if(!img)return r;const f=`images/${r.id}.jpg`;z.file(f,img.split(',')[1],{base64:true});return{...r,imgFile:f}});z.file('data.json',JSON.stringify({...S,chars}));download(await z.generateAsync({type:'blob'}),'tank-a-boom-sauvegarde.zip')}catch(e){alert('Export impossible : '+e.message)}}
async function impZip(f){if(typeof JSZip==='undefined'){alert('Bibliothèque ZIP absente : vérifiez le dossier lib/ sur GitHub.');return}try{const z=await JSZip.loadAsync(f);const df=z.file('data.json');if(!df)throw new Error('data.json absent');const o=JSON.parse(await df.async('string'));if(!Array.isArray(o.chars))throw new Error('format invalide');
o.chars=await Promise.all(o.chars.map(async c=>{const{imgFile,...r}=c;if(imgFile&&z.file(imgFile)){return{...r,img:'data:image/jpeg;base64,'+await z.file(imgFile).async('base64')}}return{...r,img:r.img||null}}));
S={...def(),...o};go();alert('Sauvegarde ZIP importée.')}catch(e){alert('Import impossible : '+e.message)}}
render();
