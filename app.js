const KEY='tab_companion_v1';

const ic=f=>`<img src="assets/${f}" alt="" class="cur-ic">`;
const CR=ic('credits.png'),AM=ic('upcreds.png'),HC=ic('hypercredits.png');
const Z=[0,0],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sumP=a=>a.reduce(add,Z),$=s=>document.querySelector(s),
fmt=n=>Math.round(n).toLocaleString('fr-FR'),esc=s=>s.replace(/[&<>\"']/g,c=>'&#'+c.charCodeAt(0)+';');
const def=()=>({tab:0,chars:[],ops:Object.fromEntries(Object.keys(OPS).map(k=>[k,{own:+!OPS[k].price,lvl:1,tgt:30,done:0,sk:[0,0,0,0]}])),lg:{cur:0,tgt:54900},act:SIM.act,stats:{min:SIM.min,extra:SIM.extra,win:SIM.win,tw:SIM.tw,tl:SIM.tl},bpl:0,bps:0});
let S;try{S={...def(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=def()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const go=()=>{save();render()};
let D={lvl:1,mods:[0,0,0,0,0],img:null};
let UI={m:null,t:{h:false,o:false}};   // état d'affichage (fenêtre ouverte), non sauvegardé

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
const opGain=()=>sumP(owned().map(k=>opRem(S.ops[k]).g));
const bpSum=f=>BP_REWARDS.filter(f).reduce((t,r)=>{const m=S.bps&&r[4]?2:1;return[t[0]+r[1]*m,t[1]+r[2]*m,t[2]+r[3]*m]},[0,0,0]);
const bpRest=()=>bpSum(r=>r[0]>S.bpl);
const bpGot=()=>bpSum(r=>r[0]<=S.bpl);

/* ---- Rythme de jeu & quota de farm ---- */
const dec=(n,d)=>n.toFixed(d).replace('.',',');
const gs=k=>S.stats[k]??SIM[k];
const winR=()=>Math.min(100,Math.max(0,gs('win')))/100;
const avgTr=()=>winR()*gs('tw')-(1-winR())*gs('tl');
const matchMin=()=>gs('min')+gs('extra');
const perDay=()=>S.act*avgTr();
const minDay=()=>S.act*matchMin();
const crDay=()=>Math.min(DAILY_CAP,S.act*CR_PER_FIGHT);
const capHit=()=>S.act*CR_PER_FIGHT>=DAILY_CAP;
const nextPalier=()=>TROPHY_LEAGUE_REWARDS.find(r=>r[0]>S.lg.cur);
const horizonEnd=()=>{const n=nextPalier();return n?Math.min(n[0],S.lg.tgt):S.lg.tgt};
const days=()=>{const pd=perDay();return pd>0?Math.ceil(Math.max(0,horizonEnd()-S.lg.cur)/pd):0};

/* ---- Projection "au fil de l'eau" de la Ligue ---- */
function proj(d){const gain=Math.min(Math.max(0,S.lg.tgt-S.lg.cur),perDay()*d),end=S.lg.cur+gain,l=TROPHY_LEAGUE_REWARDS.filter(r=>r[0]>S.lg.cur&&r[0]<=end);return{gain,end,n:l.length,v:sumP(l.map(r=>[r[1],r[2]]))}}

/* ---- Bilan net sur la période ---- */
function calc(){const h=hangar(),og=opGain(),p=proj(days()),bp=bpRest(),need=add(add(h.L,h.M),opNeed()),gain=add(add(og,p.v),[bp[0],bp[1]]),net=[need[0]-gain[0],need[1]-gain[1]];
return{og,p,bp,need,gain,net,farm:Math.max(0,net[0])}}

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
function vOps0(){const o=opSum();return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total</h2>${row('Aptitudes à acheter',o.a)}${row('Ressources à obtenir',o.g)}${kv('Matchs restants',fmt(o.m))}${kv('Temps de jeu',hm(o.m*matchMin()))}${netLine('Total restant',o.a[0]-o.g[0],CR)}<p class="text-xs opacity-70">(${fmt(o.a[0])} ${CR} à acheter − ${fmt(o.g[0])} ${CR} obtenus)</p></section>`+Object.entries(OPS).map(([k,o])=>{const p=S.ops[k],r=opRem(p),m=r.m,t=tgtOf(p);
const body=p.own?`${dualSlider(k,p.lvl,t)}${boxes(OP_SKILLS,p.lvl,p.sk,i=>`oSk('${k}',${i},this.checked)`,'A')}<div class="text-sm">${kv('Matchs restants (→ niv. '+t+')',fmt(m))}${kvDone(k,p)}${row('Ressources à obtenir',r.g)}${row('Aptitudes à acheter',r.a)}</div>`:'<p class="text-sm opacity-60">Non acquis : exclu des calculs.</p>';
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
const trophyInputs=()=>`<div class="grid grid-cols-2 gap-2"><label class="text-xs">Trophées actuels<input data-lg="cur" type="number" min="0" value="${S.lg.cur}" oninput="lgIn('cur',this.value)"></label><label class="text-xs">Trophées visés<input data-lg="tgt" type="number" min="0" value="${S.lg.tgt}" oninput="lgIn('tgt',this.value)"></label></div>`;
function lgIn(k,v){S.lg[k]=Math.max(0,+v||0);save();document.querySelectorAll(`[data-lg="${k}"]`).forEach(e=>{if(e!==document.activeElement)e.value=S.lg[k]});upd3()}

/* ---- Onglet 3 : Récompenses ---- */
function vEval(){return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ligue des trophées</h2>${trophyInputs()}<div id="lgr" class="text-sm space-y-1"></div><div id="rate" class="text-sm space-y-1 border-t border-mag/40 pt-2"></div></section>
<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Battle Pass</h2>${bpSlider()}<label class="flex items-center gap-2 text-sm"><input type="checkbox" ${S.bps?'checked':''} onchange="bpStd(this.checked)"> Pass Standard (récompenses ×2)</label><div id="bpr" class="text-sm space-y-1"></div></section>
<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Reste net à farmer</h2><div id="net" class="text-sm space-y-1"></div></section>`}
function bpSlider(){return `<div class="flex items-center gap-2"><input type="range" min="0" max="${BP_MAX}" value="${S.bpl}" oninput="this.nextElementSibling.textContent=this.value" onchange="setTimeout(()=>bpLvl(+this.value),0)"><b class="text-mand w-8 text-right">${S.bpl}</b></div><p class="text-xs opacity-70">Niveau actuel du Pass (paliers déjà obtenus)</p>`}
function bpLvl(v){S.bpl=Math.max(0,Math.min(BP_MAX,v));go()}
function bpStd(v){S.bps=+v;go()}
function upd3(){const e=$('#net');if(!e)return;const c=calc(),d=days(),pd=perDay(),m=minDay();
$('#rate').innerHTML=kv('Trophées / jour',fmt(pd))+kv('Trophées / semaine',fmt(pd*7))+kv('Trophées / mois',fmt(pd*30))+kv('Temps de jeu / jour',hm(m))+kv('Farm Crédits / jour',fmt(crDay())+(capHit()?' (plafond)':''));
const nx=nextPalier();$('#lgr').innerHTML=kv('Horizon (palier suivant)',(nx?'palier '+nx[0]:'Aucun')+' · '+d+' j')+kv('Trophées atteints',fmt(c.p.end)+' / '+fmt(S.lg.tgt))+kv('Trophées gagnés',fmt(c.p.gain))+kv('Paliers débloqués',c.p.n)+row(`Gains ligue (${c.p.n} paliers)`,c.p.v,1)+kv('Temps de jeu sur la période',hm(m*d));
const bpLine=(l,v,b)=>row(l,[v[0],v[1]],b)+(v[2]?`<div class="flex justify-between ${b?'text-mand font-bold':''}"><span>${l}</span><span>${fmt(v[2])} ${HC}</span></div>`:'');
$('#bpr').innerHTML=bpLine('Déjà obtenu',bpGot())+bpLine('Restant à obtenir',c.bp,1);
const fd=capHit()?`<p class="text-xs text-mand">⚠️ Quota journalier de ${fmt(DAILY_CAP)} Crédits atteint.</p>`:'';
e.innerHTML=row('Besoin (hangar + aptitudes)',c.need)+row('Gains opérateurs',c.og)+row('Gains ligue',c.p.v)+row('Gains Battle Pass',[c.bp[0],c.bp[1]])
+netLine('Reste net Crédits',c.net[0],CR)+netLine("Reste net Crédits d'amél.",c.net[1],AM)
+kv('Farm estimé',c.farm?Math.ceil(c.farm/crDay())+' jour(s) plein(s)':'Aucun')
+`<p class="text-xs opacity-70">Farm de ${fmt(crDay())} ${CR}/jour (${S.act} combats/jour).</p>${fd}`}


/* ---- Navigation, sauvegarde ---- */
const TABS=[['assets/tanks.png','Hangar'],['assets/iconhank.png','Opérateurs'],['assets/trophy.png','Récompenses'],['⚙','Paramètres']];
function render(){$('#nav').innerHTML=TABS.map((t,i)=>`<button onclick="S.tab=${i};UI.m=null;go()" class="py-2 ttl text-[10px] ${S.tab==i?'text-mand bg-night':'opacity-70'}">${t[0].startsWith('assets/')?`<img src="${t[0]}" alt="" class="h-7 mx-auto object-contain">`:`<div class="text-2xl leading-none">${t[0]}</div>`}<div>${t[1]}</div></button>`).join('');
if(S.tab>3)S.tab=0;
$('#app').innerHTML=[vHangar,vOps,vEval,vSet][S.tab]();[,,upd3][S.tab]?.();renderModal()}
function statsHtml(){const v=k=>gs(k);const inp=(k,l,step,val)=>`<label class="text-xs flex justify-between items-center gap-2"><span>${l}</span><input type="number" step="${step}" min="0" value="${val}" style="width:6rem" onchange="statsIn('${k}',this.value)"></label>`;
return `<section id="statsBlock" class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Statistiques de combat</h2>
<div class="text-xs flex items-center gap-2"><span class="w-40">Combats par jour <b id="actVal" class="text-mand">${S.act}</b></span><input type="range" min="1" max="30" value="${S.act}" oninput="actLive(this.value)"></div>
${inp('min','Durée moyenne d\'un match (min)','0.01',v('min'))}${inp('extra','Temps hors combat / match (min)','0.01',v('extra'))}${inp('win','Taux de victoires (%)','0.01',v('win'))}${inp('tw','Trophées / combat gagnant','0.1',v('tw'))}${inp('tl','Trophées / combat perdu','0.1',v('tl'))}
<div class="flex justify-between text-sm"><span>Trophées / combat (moyenne)</span><b class="text-mand">${dec(avgTr(),2)}</b></div>
<div class="flex justify-between text-sm"><span>Temps par match</span><b class="text-mand">${dec(matchMin(),2)} min</b></div>
<button class="btn bev text-xs" onclick="statsReset()">Rétablir les valeurs par défaut</button></section>`}
function statsRefresh(){if(S.tab===3){const b=$('#statsBlock');if(b){b.outerHTML=statsHtml();return}}render()}
function statsIn(k,v){const n=+v;if(!(n>=0)||v==='')return;S.stats[k]=k==='win'?Math.min(100,n):n;save();statsRefresh()}
function statsReset(){S.stats={min:SIM.min,extra:SIM.extra,win:SIM.win,tw:SIM.tw,tl:SIM.tl};S.act=SIM.act;save();statsRefresh()}
function actLive(v){S.act=Math.max(1,Math.min(30,+v||1));save();const a=$('#actVal');if(a)a.textContent=S.act}
function ioHtml(){return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Sauvegarde · texte (copier-coller)</h2><p class="text-xs opacity-70">Données uniquement, sans les images des chars.</p><textarea id="iot" rows="4" placeholder="Collez ici un code de sauvegarde à importer"></textarea><div class="flex gap-2"><button class="btn bev" onclick="exp()">Exporter</button><button class="btn bev" onclick="imp()">Importer</button></div></section>
<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Sauvegarde · fichier ZIP</h2><p class="text-xs opacity-70">Inclut les images de personnalisation des chars.</p><div class="flex gap-2"><button class="btn bev" onclick="expZip()">Exporter .zip</button><button class="btn bev" onclick="pickFile('.zip',impZip)">Importer .zip</button></div></section>`}
function vSet(){return `<h1 class="ttl text-mand text-sm">Paramètres</h1>${statsHtml()}${ioHtml()}`}
async function exp(){const t=JSON.stringify({...S,chars:S.chars.map(({img,...r})=>r)});$('#iot').value=t;try{await navigator.clipboard.writeText(t);alert('Sauvegarde copiée.')}catch{$('#iot').select()}}
function imp(){try{const o=JSON.parse($('#iot').value);if(!Array.isArray(o.chars))throw 0;o.chars=o.chars.map(c=>({...c,img:c.img||(S.chars.find(x=>x.id===c.id)||{}).img||null}));S={...def(),...o};go();alert('Sauvegarde importée.')}catch{alert('Code invalide.')}}
function download(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function pickFile(acc,cb){const i=document.createElement('input');i.type='file';i.accept=acc;i.style.display='none';document.body.appendChild(i);i.onchange=()=>{const f=i.files[0];i.remove();if(f)cb(f)};i.click()}
async function expZip(){if(typeof JSZip==='undefined'){alert('Bibliothèque ZIP absente : vérifiez le dossier lib/ sur GitHub.');return}try{const z=new JSZip();const chars=S.chars.map(({img,...r})=>{if(!img)return r;const f=`images/${r.id}.jpg`;z.file(f,img.split(',')[1],{base64:true});return{...r,imgFile:f}});z.file('data.json',JSON.stringify({...S,chars}));download(await z.generateAsync({type:'blob'}),'tank-a-boom-sauvegarde.zip')}catch(e){alert('Export impossible : '+e.message)}}
async function impZip(f){if(typeof JSZip==='undefined'){alert('Bibliothèque ZIP absente : vérifiez le dossier lib/ sur GitHub.');return}try{const z=await JSZip.loadAsync(f);const df=z.file('data.json');if(!df)throw new Error('data.json absent');const o=JSON.parse(await df.async('string'));if(!Array.isArray(o.chars))throw new Error('format invalide');
o.chars=await Promise.all(o.chars.map(async c=>{const{imgFile,...r}=c;if(imgFile&&z.file(imgFile)){return{...r,img:'data:image/jpeg;base64,'+await z.file(imgFile).async('base64')}}return{...r,img:r.img||null}}));
S={...def(),...o};go();alert('Sauvegarde ZIP importée.')}catch(e){alert('Import impossible : '+e.message)}}
render();
