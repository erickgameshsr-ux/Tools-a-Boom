const KEY='tab_companion_v1';

const Z=[0,0],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sumP=a=>a.reduce(add,Z),$=s=>document.querySelector(s),
fmt=n=>Math.round(n).toLocaleString('fr-FR'),esc=s=>s.replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const def=()=>({tab:0,chars:[],ops:Object.fromEntries(Object.keys(OPS).map(k=>[k,{own:+!OPS[k].price,lvl:1,sk:[0,0,0,0]}])),lg:{cur:0,tgt:54900},bp:{f2p:1,std:0,plus:0},sim:{cur:0,tgt:1000}});
let S;try{S={...def(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=def()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const go=()=>{save();render()};
let D={lvl:1,mods:[0,0,0,0,0]};

const row=(l,v,b)=>{const p=[];if(v[0]||!v[1])p.push(fmt(v[0])+' Cr');if(v[1])p.push(fmt(v[1])+' Am.');return `<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${p.join(' · ')}</span></div>`};
const kv=(l,v)=>`<div class="flex justify-between"><span>${l}</span><b class="text-mand">${v}</b></div>`;
const slider=(max,v,cb)=>`<div class="flex items-center gap-2"><input type="range" min="1" max="${max}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" onchange="${cb}"><b class="text-mand w-8 text-right">${v}</b></div>`;
const boxes=(L,lvl,ck,cb,p)=>`<div class="grid gap-1" style="grid-template-columns:repeat(${L.length},1fr)">${L.map((m,i)=>{const d=lvl<m[0];return `<label class="text-center text-xs ${d?'opacity-40':''}"><input type="checkbox" ${ck[i]&&!d?'checked':''} ${d?'disabled':''} onchange="${cb(i)}"><br>${p}${i+1}<br>Niv. ${m[0]}</label>`}).join('')}</div>`;
const dBoxes=()=>boxes(MODS,D.lvl,D.mods,i=>`D.mods[${i}]=+this.checked`,'M');

/* ---- Calculs ---- */
function hangar(){let L=Z,M=Z;S.chars.forEach(c=>{L=add(L,sumP(LEVEL_COSTS.slice(c.lvl-1)));MODS.forEach((m,i)=>{if(!c.mods[i])M=add(M,[m[1],0])})});return{L,M,T:add(L,M)}}
const owned=()=>Object.keys(OPS).filter(k=>S.ops[k].own);
const skLeft=p=>OP_SKILLS.reduce((t,a,i)=>p.sk[i]?t:t+a[1],0);
const opNeed=()=>[owned().reduce((t,k)=>t+skLeft(S.ops[k]),0),0];
const opGain=()=>sumP(owned().map(k=>sumP(OP_REWARDS.slice(S.ops[k].lvl))));
function lg(){const l=TROPHY_LEAGUE_REWARDS.filter(r=>r[0]>S.lg.cur&&r[0]<=S.lg.tgt);return{n:l.length,v:sumP(l.map(r=>[r[1],r[2]]))}}
const bpG=()=>{let v=[0,0,0];for(const k in BP)if(S.bp[k])v=[v[0]+BP[k].cr,v[1]+BP[k].up,v[2]+BP[k].hc];return v};

/* ---- Onglet 1 : Mon Hangar ---- */
function vHangar(){const h=hangar();return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total restant du hangar</h2>${row('Niveaux',h.L)}${row('Modules',h.M)}${row('Total complet',h.T,1)}</section>
<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ajouter un char</h2><input id="cn" type="text" placeholder="Nom du char" maxlength="30">${slider(20,D.lvl,'dLvl(+this.value)')}<div id="dm">${dBoxes()}</div><button class="btn bev w-full" onclick="addChar()">Ajouter</button></section>${S.chars.map(charCard).join('')}`}
function charCard(c){const nx=c.lvl<20?LEVEL_COSTS[c.lvl-1]:Z,md=MODS.reduce((t,m,i)=>c.mods[i]?t:t+m[1],0);
return `<section class="card bev p-3 space-y-2"><div class="flex justify-between"><b class="ttl text-sm">${esc(c.name)}</b><button onclick="delChar(${c.id})" class="text-mag font-bold px-2">✕</button></div>${slider(20,c.lvl,`cLvl(${c.id},+this.value)`)}${boxes(MODS,c.lvl,c.mods,i=>`cMod(${c.id},${i},this.checked)`,'M')}<div class="text-sm">${row('Niveau suivant',nx)}${row('Reste jusqu\'au niv. 20',sumP(LEVEL_COSTS.slice(c.lvl-1)))}${row('Modules restants',[md,0])}</div></section>`}
const byId=id=>S.chars.find(c=>c.id===id);
function dLvl(v){D.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])D.mods[i]=0});$('#dm').innerHTML=dBoxes()}
function addChar(){S.chars.push({id:Date.now(),name:($('#cn').value.trim()||'Char '+(S.chars.length+1)).slice(0,30),lvl:D.lvl,mods:[...D.mods]});D={lvl:1,mods:[0,0,0,0,0]};go()}
function cLvl(id,v){const c=byId(id);c.lvl=v;MODS.forEach((m,i)=>{if(v<m[0])c.mods[i]=0});go()}
function cMod(id,i,v){byId(id).mods[i]=+v;go()}
function delChar(id){if(confirm('Supprimer ce char ?')){S.chars=S.chars.filter(c=>c.id!==id);go()}}

/* ---- Onglet 2 : Opérateurs ---- */
function vOps(){return Object.entries(OPS).map(([k,o])=>{const p=S.ops[k],m=OP_MATCHES.slice(p.lvl-1).reduce((a,b)=>a+b,0);
const body=p.own?`${slider(30,p.lvl,`oLvl('${k}',+this.value)`)}${boxes(OP_SKILLS,p.lvl,p.sk,i=>`oSk('${k}',${i},this.checked)`,'A')}<div class="text-sm">${kv('Matchs restants (→ niv. 30)',fmt(m))}${row('Gains restants',sumP(OP_REWARDS.slice(p.lvl)))}${row('Aptitudes restantes',[skLeft(p),0])}</div>`:'<p class="text-sm opacity-60">Non acquis : exclu des calculs.</p>';
return `<section class="card bev p-3 space-y-2"><div class="flex justify-between items-center"><b class="ttl">${o.n}</b>${o.price?`<label class="text-xs"><input type="checkbox" ${p.own?'checked':''} onchange="oOwn('${k}',this.checked)"> Acquis (${o.price} ⬡)</label>`:'<span class="text-xs text-mand font-bold">Gratuite</span>'}</div>${body}</section>`}).join('')}
function oOwn(k,v){S.ops[k].own=+v;go()}
function oLvl(k,v){const p=S.ops[k];p.lvl=v;OP_SKILLS.forEach((a,i)=>{if(v<a[0])p.sk[i]=0});go()}
function oSk(k,i,v){S.ops[k].sk[i]=+v;go()}

/* ---- Onglet 3 : Évaluateur de récompenses ---- */
function vEval(){const f=(k,l)=>`<label class="text-xs">${l}<input type="number" min="0" value="${S.lg[k]}" oninput="lgIn('${k}',this.value)"></label>`;
return `<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Ligue des trophées</h2><div class="grid grid-cols-2 gap-2">${f('cur','Trophées actuels')}${f('tgt','Trophées visés')}</div><div id="lgr" class="text-sm"></div></section>
<section class="card bev p-3 space-y-2"><h2 class="text-mand text-sm">Battle Pass · La Cour des Grands</h2>${Object.entries(BP).map(([k,b])=>`<label class="flex items-center gap-2 text-sm"><input type="checkbox" ${S.bp[k]?'checked':''} onchange="bpIn('${k}',this.checked)"><span class="flex-1">${b.n}</span><span class="text-xs">${fmt(b.cr)} Cr · ${fmt(b.up)} Am. · ${b.hc} ⬡</span></label>`).join('')}<div id="bpr" class="text-sm"></div><p class="text-xs opacity-70">Farm journalier indicatif : max ${fmt(DAILY_FARM)} Cr/jour (${fmt(DAILY_FARM*30)} / mois).</p></section>
<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Reste net à farmer</h2><div id="net" class="text-sm"></div></section>`}
function lgIn(k,v){S.lg[k]=Math.max(0,+v||0);save();upd3()}
function bpIn(k,v){S.bp[k]=+v;save();upd3()}
function upd3(){const l=lg(),b=bpG(),h=hangar(),og=opGain(),need=add(add(h.L,h.M),opNeed()),bc=[b[0],b[1]],gain=add(add(og,l.v),bc),net=[need[0]-gain[0],need[1]-gain[1]];
$('#lgr').innerHTML=row(`Gains (${l.n} paliers)`,l.v,1);
$('#bpr').innerHTML=row('Pass sélectionnés',bc,1)+`<div>+ ${b[2]} ⬡ Hypercrédits</div>`;
$('#net').innerHTML=row('Besoin (hangar + aptitudes)',need)+row('Gains opérateurs',og)+row('Gains ligue',l.v)+row('Gains Battle Pass',bc)+row('Reste net',net,1)+`<p class="text-xs opacity-70">Négatif = excédent. ≈ ${Math.ceil(Math.max(0,net[0])/DAILY_FARM)} jours de farm max (Crédits).</p>`}

/* ---- Onglet 4 : Simulateur de trophées ---- */
function vSim(){const f=(k,l)=>`<label class="text-xs">${l}<input type="number" min="0" value="${S.sim[k]}" oninput="simIn('${k}',this.value)"></label>`;
return `<section class="card bev p-3 space-y-2"><div class="flex justify-between items-center"><h2 class="text-mand text-sm">Simulateur</h2><span class="text-[10px] px-2 py-1 bg-mand text-night font-bold uppercase">Estimation indicative</span></div><div class="grid grid-cols-2 gap-2">${f('cur','Trophées actuels')}${f('tgt','Trophées visés')}</div><div id="simr" class="text-sm space-y-1"></div><p class="text-xs opacity-70">Base : ${(SIM.win*100).toFixed(2).replace('.',',')} % de victoires, +${String(SIM.gain).replace('.',',')} trophées/match, ${String(SIM.min).replace('.',',')} min/combat.</p></section>`}
function simIn(k,v){S.sim[k]=Math.max(0,+v||0);save();updSim()}
function updSim(){const g=Math.max(0,S.sim.tgt-S.sim.cur),m=Math.ceil(g/SIM.gain),tm=Math.round(m*SIM.min);
$('#simr').innerHTML=kv('Écart',fmt(g)+' trophées')+kv('Matchs estimés',fmt(m))+kv('dont victoires / défaites','≈ '+fmt(m*SIM.win)+' / '+fmt(m*(1-SIM.win)))+kv('Temps de jeu',`${Math.floor(tm/60)} h ${String(tm%60).padStart(2,'0')} min`)+kv('Heures',(tm/60).toFixed(1).replace('.',','))}

/* ---- Navigation, sauvegarde ---- */
const TABS=[['🛡️','Hangar'],['🎖️','Opérateurs'],['🏆','Récompenses'],['⏱️','Trophées']];
function render(){$('#nav').innerHTML=TABS.map((t,i)=>`<button onclick="S.tab=${i};go()" class="py-2 ttl text-[10px] ${S.tab==i?'text-mand bg-night':'opacity-70'}"><div class="text-lg">${t[0]}</div>${t[1]}</button>`).join('');
$('#app').innerHTML=[vHangar,vOps,vEval,vSim][S.tab]();[,,upd3,updSim][S.tab]?.()}
const toggleIO=()=>$('#io').classList.toggle('hidden');
async function exp(){const t=JSON.stringify(S);$('#iot').value=t;try{await navigator.clipboard.writeText(t);alert('Sauvegarde copiée.')}catch{$('#iot').select()}}
function imp(){try{const o=JSON.parse($('#iot').value);if(!Array.isArray(o.chars))throw 0;S={...def(),...o};go();alert('Sauvegarde importée.')}catch{alert('Code invalide.')}}
render();
