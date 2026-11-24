const KEY='tab_companion_v1';

const ic=f=>`<img src="assets/${f}" alt="" class="cur-ic">`;
const CR=ic('credits.png'),AM=ic('upcreds.png'),HC=ic('hypercredits.png');
const Z=[0,0],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sumP=a=>a.reduce(add,Z),$=s=>document.querySelector(s),
fmt=n=>Math.round(n).toLocaleString('fr-FR'),esc=s=>s.replace(/[&<>\"']/g,c=>'&#'+c.charCodeAt(0)+';');
const def=()=>({tab:0,chars:[],ops:Object.fromEntries(Object.keys(OPS).map(k=>[k,{own:+!OPS[k].price,lvl:1,sk:[0,0,0,0]}])),lg:{cur:0,tgt:54900},act:10,per:30,season:'',bp:{f2p:1,std:0,plus:0},bpc:{f2p:0,std:0,plus:0}});
let S;try{S={...def(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=def()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const go=()=>{save();render()};
let D={lvl:1,mods:[0,0,0,0,0],img:null};
let UI={m:null};   // état d'affichage (fenêtre ouverte), non sauvegardé

const row=(l,v,b)=>{const p=[];if(v[0]||!v[1])p.push(fmt(v[0])+' '+CR);if(v[1])p.push(fmt(v[1])+' '+AM);return `<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${p.join(' · ')}</span></div>`};
const kv=(l,v)=>`<div class="flex justify-between"><span>${l}</span><b class="text-mand">${v}</b></div>`;
const netLine=(l,x,u)=>x>0?kv(l,fmt(x)+' '+u):`<div class="flex justify-between"><span>${l}</span><b class="text-emerald-400">Excédent de +${fmt(-x)} ${u}</b></div>`;
const hm=m=>{const t=Math.round(m);return `${Math.floor(t/60)} h ${String(t%60).padStart(2,'0')} min`};
const slider=(max,v,cb)=>`<div class="flex items-center gap-2"><input type="range" min="1" max="${max}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" onchange="${cb}"><b class="text-mand w-8 text-right">${v}</b></div>`;
const boxes=(L,lvl,ck,cb,p)=>`<div class="grid gap-1" style="grid-template-columns:repeat(${L.length},1fr)">${L.map((m,i)=>{const d=lvl<m[0];return `<label class="text-center text-xs ${d?'opacity-40':''}"><input type="checkbox" ${ck[i]&&!d?'checked':''} ${d?'disabled':''} onchange="${cb(i)}"><br>${p}${i+1}<br>Niv. ${m[0]}</label>`}).join('')}</div>`;
const dBoxes=()=>boxes(MODS,D.lvl,D.mods,i=>`D.mods[${i}]=+this.checked`,'M');

/* ---- Calculs de base ---- */
function hangar(){let L=Z,M=Z;S.chars.forEach(c=>{L=add(L,sumP(LEVEL_COSTS.slice(c.lvl-1)));MODS.forEach((m,i)=>{if(!c.mods[i])M=add(M,[m[1],0])})});return{L,M,T:add(L,M)}}
const owned=()=>Object.keys(OPS).filter(k=>S.ops[k].own);
const skLeft=p=>OP_SKILLS.reduce((t,a,i)=>p.sk[i]?t:t+a[1],0);
const opNeed=()=>[owned().reduce((t,k)=>t+skLeft(S.ops[k]),0),0];
const opGain=()=>sumP(owned().map(k=>sumP(OP_REWARDS.slice(S.ops[k].lvl))));
const bpRest=()=>{let v=[0,0,0];for(const k in BP)if(S.bp[k]&&!S.bpc[k])v=[v[0]+BP[k].cr,v[1]+BP[k].up,v[2]+BP[k].hc];return v};

/* ---- Rythme de jeu & quota de farm ---- */
const perDay=()=>S.act*SIM.gain;
const minDay=()=>S.act*SIM.min;
const crDay=()=>Math.min(DAILY_CAP,S.act*CR_PER_FIGHT);
const capHit=()=>S.act*CR_PER_FIGHT>=DAILY_CAP;
const toTarget=()=>Math.ceil(Math.max(0,S.lg.tgt-S.lg.cur)/perDay());
const days=()=>S.per||toTarget();
const daysLeft=()=>S.season?Math.ceil((new Date(S.season+'T23:59:59')-new Date())/86400000):null;

/* ---- Projection "au fil de l'eau" de la Ligue ---- */
function proj(d){const gain=Math.min(Math.max(0,S.lg.tgt-S.lg.cur),perDay()*d),end=S.lg.cur+gain,l=TROPHY_LEAGUE_REWARDS.filter(r=>r[0]>S.lg.cur&&r[0]<=end);return{gain,end,n:l.length,v:sumP(l.map(r=>[r[1],r[2]]))}}

/* ---- Bilan net sur la période ---- */
function calc(){const h=hangar(),og=opGain(),p=proj(days()),bp=bpRest(),need=add(add(h.L,h.M),opNeed()),gain=add(add(og,p.v),[bp[0],bp[1]]),net=[need[0]-gain[0],need[1]-gain[1]];
return{og,p,bp,need,gain,net,farm:Math.max(0,net[0])}}

/* ---- Fenêtre modale (bulles du Hangar) ---- */
const openM=(t,id)=>{UI.m=t==='c'?{t:'c',id}:{t:'a'};render()};
const closeM=()=>{UI.m=null;render()};
function renderModal(){const m=$('#modal');
if(!UI.m){m.className='';m.innerHTML='';m.onclick=null;return}
let body;
if(UI.m.t==='a')body=addForm();
else{const c=byId(UI.m.id);if(!c){UI.m=null;m.className='';m.innerHTML='';return}body=charCard(c)}
m.className='open';
m.onclick=e=>{if(e.target===m)closeM()};
m.innerHTML=`<div>${body.replace('</section>','<button class="btn bev w-full mt-2" onclick="closeM()">Fermer</button></section>')}</div>`;}

/* ---- Onglet 1 : Mon Hangar ---- */
function vHangar(){const h=hangar();return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total restant du hangar</h2>${row('Niveaux',h.L)}${row('Modules',h.M)}${row('Total complet',h.T,1)}</section>
<section class="card bev p-3"><div class="grid grid-cols-4 gap-3 justify-items-center">${S.chars.map(c=>`<button class="bubble" onclick="openM('c',${c.id})" style="${c.img?`background-image:url(${c.img});background-size:cover;background-position:center`:''}"><b>${esc(c.name)}</b><small>Niv. ${c.lvl}</small></button>`).join('')}<button class="bubble add" onclick="openM('a')" aria-label="Ajouter un char">+</button></div></section>`}
function addForm(){return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ajouter un char</h2><input id="cn" type="text" placeholder="Nom du char" maxlength="30">${slider(20,D.lvl,'dLvl(+this.value)')}<div id="dm">${dBoxes()}</div><button class="btn bev w-full" onclick="addChar()">Ajouter</button>
<label class="btn bev w-full text-center cursor-pointer block">Importer une image<input type="file" accept="image/*" class="hidden" onchange="importImg(this.files[0])"></label><div id="dimg">${D.img?`<img class="crop-16x10" src="${D.img}" alt="">`:''}</div></section>`}
function importImg(f){if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const W=480,H=300,w=im.width,h=im.height;let sx=0,sy=0,sw=w,sh=h;
if(w/h>1.6){sw=h*1.6;sx=(w-sw)/2}else{sh=w/1.6;sy=(h-sh)/2}
const cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,W,H);
D.img=cv.toDataURL('image/jpeg',0.8);const e=$('#dimg');if(e)e.innerHTML=`<img class="crop-16x10" src="${D.img}" alt="">`};im.src=r.result};r.readAsDataURL(f)}
function charCard(c){const nx=c.lvl<20?LEVEL_COSTS[c.lvl-1]:Z,md=MODS.reduce((t,m,i)=>c.mods[i]?t:t+m[1],0);
const lvlRest=sumP(LEVEL_COSTS.slice(c.lvl-1));
return `<section class="card bev p-3 space-y-2">${c.img?`<img class="crop-16x10" src="${c.img}" alt="">`:''}<div class="flex justify-between"><b class="ttl text-sm">${esc(c.name)}</b><button onclick="delChar(${c.id})" class="text-mag font-bold px-2">✕</button></div>${slider(20,c.lvl,`cLvl(${c.id},+this.value)`)}${boxes(MODS,c.lvl,c.mods,i=>`cMod(${c.id},${i},this.checked)`,'M')}<div class="text-sm">${row('Niveau suivant',nx)}${row('Reste jusqu\'au niv. 20',sumP(LEVEL_COSTS.slice(c.lvl-1)))}${row('Modules restants',[md,0])}${row('Total complet',add(lvlRest,[md,0]),1)}</div></section>`}
const byId=id=>S.chars.find(c=>c.id===id);
function dLvl(v){D.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])D.mods[i]=0});$('#dm').innerHTML=dBoxes()}
function addChar(){S.chars.push({id:Date.now(),name:($('#cn').value.trim()||'Char '+(S.chars.length+1)).slice(0,30),lvl:D.lvl,mods:[...D.mods],img:D.img});D={lvl:1,mods:[0,0,0,0,0],img:null};UI.m=null;go()}
function cLvl(id,v){const c=byId(id);c.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])c.mods[i]=0});go()}
function cMod(id,i,v){byId(id).mods[i]=+v;go()}
function delChar(id){if(confirm('Supprimer ce char ?')){S.chars=S.chars.filter(c=>c.id!==id);UI.m=null;go()}}

/* ---- Onglet 2 : Opérateurs ---- */
function opSum(){return owned().reduce((t,k)=>{const p=S.ops[k];return{g:add(t.g,sumP(OP_REWARDS.slice(p.lvl))),a:add(t.a,[skLeft(p),0])}},{g:Z,a:Z})}
function vOps(){const o=opSum();return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total restant des opérateurs</h2>${row('Ressources à obtenir',o.g)}${row('Aptitudes à acheter',o.a)}${row('Total complet',add(o.g,o.a),1)}</section>`+Object.entries(OPS).map(([k,o])=>{const p=S.ops[k],m=OP_MATCHES.slice(p.lvl-1).reduce((a,b)=>a+b,0);
const body=p.own?`${slider(30,p.lvl,`oLvl('${k}',+this.value)`)}${boxes(OP_SKILLS,p.lvl,p.sk,i=>`oSk('${k}',${i},this.checked)`,'A')}<div class="text-sm">${kv('Matchs restants (→ niv. 30)',fmt(m))}${row('Ressources à obtenir',sumP(OP_REWARDS.slice(p.lvl)))}${row('Aptitudes à acheter',[skLeft(p),0])}</div>`:'<p class="text-sm opacity-60">Non acquis : exclu des calculs.</p>';
return `<section class="card bev op-card p-3 space-y-2"><div class="op-bg" aria-hidden="true"><img src="assets/${k}.png" alt="" onerror="this.parentNode.remove()"></div><div class="flex items-center gap-2"><b class="ttl">${o.n}</b><div class="ml-auto text-right">${o.price?`<label class="text-xs"><input type="checkbox" ${p.own?'checked':''} onchange="oOwn('${k}',this.checked)"> Acquis (${o.price} ${HC})</label>`:'<span class="text-xs text-mand font-bold">Gratuite</span>'}</div></div>${body}</section>`}).join('')}
function oOwn(k,v){S.ops[k].own=+v;go()}
function oLvl(k,v){const p=S.ops[k];p.lvl=v;OP_SKILLS.forEach((a,i)=>{if(v<a[0])p.sk[i]=0});go()}
function oSk(k,i,v){S.ops[k].sk[i]=+v;go()}

/* ---- Trophées : saisie unique, synchronisée sur les deux onglets ---- */
const trophyInputs=()=>`<div class="grid grid-cols-2 gap-2"><label class="text-xs">Trophées actuels<input data-lg="cur" type="number" min="0" value="${S.lg.cur}" oninput="lgIn('cur',this.value)"></label><label class="text-xs">Trophées visés<input data-lg="tgt" type="number" min="0" value="${S.lg.tgt}" oninput="lgIn('tgt',this.value)"></label></div>`;
function lgIn(k,v){S.lg[k]=Math.max(0,+v||0);save();document.querySelectorAll(`[data-lg="${k}"]`).forEach(e=>{if(e!==document.activeElement)e.value=S.lg[k]});upd3()}

/* ---- Onglet 3 : Récompenses ---- */
function vEval(){
const per=[[7,'7 jours'],[30,'30 jours'],[0,"Jusqu'au palier visé"]];
const dl=daysLeft();
return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ligue des trophées</h2>${trophyInputs()}
<label class="text-xs">Horizon de projection<select onchange="perIn(+this.value)">${per.map(([v,l])=>`<option value="${v}" ${S.per===v?'selected':''}>${l}</option>`).join('')}</select></label>
<div id="lgr" class="text-sm space-y-1"></div></section>
<section class="card bev p-3 space-y-2"><div class="flex justify-between items-center"><h2 class="text-mand text-sm">Rythme de jeu</h2><span class="text-[10px] px-2 py-1 bg-mand text-night font-bold uppercase">Estimation</span></div>
${slider(30,S.act,'actIn(+this.value)')}<p class="text-xs opacity-70">Combats par jour</p><div id="rate" class="text-sm space-y-1"></div>
<p class="text-xs opacity-70">Base : ${(SIM.win*100).toFixed(2).replace('.',',')} % de victoires, +${String(SIM.gain).replace('.',',')} trophées/match, ${String(SIM.min).replace('.',',')} min/combat.</p></section>
<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Battle Pass · La Cour des Grands</h2>${Object.entries(BP).map(([k,b])=>`<div class="flex items-center gap-2 text-sm"><span class="flex-1">${b.n}<br><span class="text-xs opacity-70">${fmt(b.cr)} ${CR} · ${fmt(b.up)} ${AM} · ${b.hc} ${HC}</span></span><label class="text-xs text-center">Acquis<br><input type="checkbox" ${S.bp[k]?'checked':''} onchange="bpIn('${k}',this.checked)"></label><label class="text-xs text-center">Récupéré<br><input type="checkbox" ${S.bpc[k]?'checked':''} onchange="bpClaim('${k}',this.checked)"></label></div>`).join('')}<div id="bpr" class="text-sm space-y-1"></div></section>
<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Saison en cours</h2><label class="text-xs">Fin de saison<input type="date" value="${S.season}" onchange="seasonIn(this.value)"></label>
<div class="text-sm">${dl===null?'<span class="opacity-70">Date de fin non renseignée.</span>':dl>0?`<b class="text-mand">${dl} jour(s)</b> avant la réinitialisation`:'<b class="text-mag">Saison terminée : pensez à réinitialiser le Pass.</b>'}</div>
<button class="btn bev w-full" onclick="bpReset()">Nouvelle saison / Reset Pass</button><p class="text-xs opacity-70">Le Hangar et les opérateurs sont conservés.</p></section>
<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Reste net à farmer</h2><div id="net" class="text-sm space-y-1"></div></section>`}
function perIn(v){S.per=v;go()}
function bpIn(k,v){S.bp[k]=+v;if(!v)S.bpc[k]=0;go()}
function bpClaim(k,v){S.bpc[k]=+v;go()}
function seasonIn(v){S.season=v;go()}
function bpReset(){if(confirm('Réinitialiser le Battle Pass ? Le Hangar et les opérateurs sont conservés.')){S.bp={f2p:1,std:0,plus:0};S.bpc={f2p:0,std:0,plus:0};go()}}
function upd3(){const e=$('#net');if(!e)return;const c=calc(),d=days(),pd=perDay(),m=minDay();
$('#rate').innerHTML=kv('Trophées / jour',fmt(pd))+kv('Trophées / semaine',fmt(pd*7))+kv('Trophées / mois',fmt(pd*30))+kv('Temps de jeu / jour',hm(m))+kv('Farm Crédits / jour',fmt(crDay())+(capHit()?' (plafond)':''));
$('#lgr').innerHTML=kv('Horizon',d?d+' jour(s)':toTarget()+' jour(s) (palier visé)')+kv('Trophées atteints',fmt(c.p.end)+' / '+fmt(S.lg.tgt))+kv('Trophées gagnés',fmt(c.p.gain))+kv('Paliers débloqués',c.p.n)+row(`Gains ligue (${c.p.n} paliers)`,c.p.v,1)+kv('Temps de jeu sur la période',hm(m*d));
$('#bpr').innerHTML=row('Battle Pass restant (non récupéré)',c.bp,1)+`<div class="text-xs">+ ${c.bp[2]} ${HC} Hypercrédits restants</div>`;
const fd=capHit()?`<p class="text-xs text-mand">⚠️ Quota journalier de ${fmt(DAILY_CAP)} Crédits atteint.</p>`:'';
e.innerHTML=row('Besoin (hangar + aptitudes)',c.need)+row('Gains opérateurs',c.og)+row('Gains ligue',c.p.v)+row('Gains Battle Pass',[c.bp[0],c.bp[1]])
+netLine('Reste net Crédits',c.net[0],CR)+netLine("Reste net Crédits d'amél.",c.net[1],AM)
+kv('Farm estimé',c.farm?Math.ceil(c.farm/crDay())+' jour(s) plein(s)':'Aucun')
+`<p class="text-xs opacity-70">Farm de ${fmt(crDay())} ${CR}/jour (${S.act} combats/jour).</p>${fd}`}

function actIn(v){S.act=Math.max(1,v||1);go()}

/* ---- Navigation, sauvegarde ---- */
const TABS=[['assets/tanks.png','Hangar'],['assets/iconhank.png','Opérateurs'],['assets/trophy.png','Récompenses']];
function render(){$('#nav').innerHTML=TABS.map((t,i)=>`<button onclick="S.tab=${i};UI.m=null;go()" class="py-2 ttl text-[10px] ${S.tab==i?'text-mand bg-night':'opacity-70'}"><img src="${t[0]}" alt="" class="h-7 mx-auto object-contain"><div>${t[1]}</div></button>`).join('');
if(S.tab>2)S.tab=0;
$('#app').innerHTML=[vHangar,vOps,vEval][S.tab]();[,,upd3][S.tab]?.();renderModal()}
const toggleIO=()=>$('#io').classList.toggle('hidden');
async function exp(){const t=JSON.stringify(S);$('#iot').value=t;try{await navigator.clipboard.writeText(t);alert('Sauvegarde copiée.')}catch{$('#iot').select()}}
function imp(){try{const o=JSON.parse($('#iot').value);if(!Array.isArray(o.chars))throw 0;S={...def(),...o};go();alert('Sauvegarde importée.')}catch{alert('Code invalide.')}}
render();
