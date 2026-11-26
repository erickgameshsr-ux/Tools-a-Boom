const KEY='tab_companion_v1';

const ic=f=>`<img src="assets/${f}" alt="" class="cur-ic">`;
const CR=ic('credits.png'),AM=ic('upcreds.png'),HC=ic('hypercredits.png');
const Z=[0,0],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sumP=a=>a.reduce(add,Z),$=s=>document.querySelector(s),
fmt=n=>Math.round(n).toLocaleString('fr-FR'),esc=s=>s.replace(/[&<>\"']/g,c=>'&#'+c.charCodeAt(0)+';');
const def=()=>({tab:0,chars:[],ops:Object.fromEntries(Object.keys(OPS).map(k=>[k,{own:+!OPS[k].price,lvl:1,tgt:30,done:0,sk:[0,0,0,0],fav:0}])),lg:{cur:0,tgt:54900},act:SIM.act,stats:{min:SIM.min,win:SIM.win,tw:SIM.tw,tl:SIM.tl},bpl:0,bps:0,bpr:0,cols:3,res:[0,0,0]});
let S;try{S={...def(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=def()}
const fixS=()=>S.chars.forEach(c=>{if(c.fav===undefined)c.fav=1});fixS();   // chars créés avant les favoris : considérés comme favoris
const RES_MAX=999999999;   // plafond de saisie des ressources actuelles (évite débordements de mise en page et pertes de précision)
const clampRes=v=>Math.min(RES_MAX,Math.max(0,Math.floor(+v||0)));
const fixRes=()=>{S.res=Array.isArray(S.res)&&S.res.length===3?S.res.map(clampRes):[0,0,0]};fixRes();   // anciennes sauvegardes sans ressources : [0,0,0]
const newId=()=>{let i=Date.now();while(S.chars.some(c=>c.id===i))i++;return i};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const go=()=>{save();render()};
let D={lvl:1,mods:[0,0,0,0,0],img:null,ind:'',cls:''};
let UI={m:null,t:{h:false,o:false,l:false,s:false,a:false,c:false},f:{h:{o:false,ind:[],cls:[]},c:{o:false,ind:[],cls:[]}}};   // état d'affichage (fenêtre ouverte), non sauvegardé

/* row : accepte [Crédits, Crédits d'amél., Hypercrédits] ; les HC ne s'affichent que s'ils sont > 0 */
const row=(l,v,b)=>{const p=[];if(v[0]||(!v[1]&&!v[2]))p.push(fmt(v[0])+' '+CR);if(v[1])p.push(fmt(v[1])+' '+AM);if(v[2])p.push(fmt(v[2])+' '+HC);return `<div class="flex justify-between gap-2 ${b?'text-mand font-bold':''}"><span>${l}</span><span class="text-right">${p.join(' · ')}</span></div>`};
const kv=(l,v)=>`<div class="flex justify-between"><span>${l}</span><b class="text-mand">${v}</b></div>`;
const netLine=(l,x,u)=>x>=0?kv(l,fmt(x)+' '+u):`<div class="flex justify-between"><span>${l}</span><b class="text-emerald-400">Excédent de +${fmt(-x)} ${u}</b></div>`;
const hm=m=>{const t=Math.round(m);return `${Math.floor(t/60)} h ${String(t%60).padStart(2,'0')} min`};
const slider=(max,v,cb)=>`<div class="flex items-center gap-2"><input type="range" min="1" max="${max}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" onchange="setTimeout(()=>{${cb}},0)"><b class="text-mand w-8 text-right">${v}</b></div>`;
const boxes=(L,lvl,ck,cb,p)=>`<div class="grid gap-1" style="grid-template-columns:repeat(${L.length},1fr)">${L.map((m,i)=>{const d=lvl<m[0];return `<label class="text-center text-xs ${d?'opacity-40':''}"><input type="checkbox" ${ck[i]&&!d?'checked':''} ${d?'disabled':''} onchange="${cb(i)}"><br>${p}${i+1}<br>Niv. ${m[0]}</label>`}).join('')}</div>`;
const dBoxes=()=>boxes(MODS,D.lvl,D.mods,i=>`D.mods[${i}]=+this.checked`,'M');

/* ---- Calculs de base ---- */
const is100=c=>c.lvl>=20&&MODS.every((m,i)=>c.mods[i]);
const hangarList=()=>{const favs=S.chars.filter(c=>c.fav);return favs.length?favs:S.chars.filter(c=>!is100(c))};
function hangar(){let L=Z,M=Z;hangarList().forEach(c=>{L=add(L,sumP(LEVEL_COSTS.slice(c.lvl-1)));MODS.forEach((m,i)=>{if(!c.mods[i])M=add(M,[m[1],0])})});return{L,M,T:add(L,M)}}
/* Opérateurs pris en compte : favoris s'il y en a au moins un, sinon tous.
   - acquis (owned) : progression seule (aptitudes en Crédits, récompenses de niveaux, matchs)
   - non acquis (locked) : uniquement le prix de déblocage en Hypercrédits */
const opList=()=>{const f=Object.keys(OPS).filter(k=>S.ops[k].fav);return f.length?f:Object.keys(OPS)};
const owned=()=>opList().filter(k=>S.ops[k].own);
const locked=()=>opList().filter(k=>!S.ops[k].own);
const opHC=()=>locked().reduce((t,k)=>t+OPS[k].price,0);
const tgtOf=p=>Math.max(p.tgt||30,p.lvl);
const skLeft=p=>OP_SKILLS.reduce((t,a,i)=>p.sk[i]||a[0]>tgtOf(p)?t:t+a[1],0);
function opRem(p){const l=p.lvl,t=tgtOf(p);if(l>=t)return{g:Z,a:Z,m:0};const cur=Math.max(0,OP_MATCHES[l-1]-(p.done||0));return{g:sumP(OP_REWARDS.slice(l,t)),a:[skLeft(p),0],m:cur+OP_MATCHES.slice(l,t-1).reduce((x,y)=>x+y,0)}}
const opNeed=()=>[owned().reduce((t,k)=>t+skLeft(S.ops[k]),0),0,opHC()];   // [Crédits aptitudes, Amél., Hypercrédits de déblocage]
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
const bpFull=()=>withV2(bpSum(()=>true,S.bpr),S.bpr);
/* Réinitialisation du Battle Pass : durée fixe BP_DUR (30 j), toujours à 9h UTC+0 (heure serveur).
   S.bpc.next (horodatage ms) est la prochaine réinitialisation telle que calibrée par le joueur (voir bpcSetRemaining) ;
   tant qu'il n'a rien calibré, on retombe sur la prochaine occurrence de 9h UTC à partir de maintenant. */
const nextReset=from=>{if(S.bpc?.next){let t=S.bpc.next;while(t<=from)t+=BP_DUR*864e5;return t}const d=new Date(from);let t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),9,0);if(t<=from)t+=864e5;return t};
const resetDays=now=>{const a=[],st=BP_DUR*864e5;let r=nextReset(now);while((r-now)/864e5<=MAXD+BP_DUR){a.push(Math.ceil((r-now)/864e5));r+=st}return a};
function bpcSetRemaining(){const d=Math.max(0,+$('#bpcD').value||0),h=Math.max(0,+$('#bpcH').value||0);S.bpc={next:Date.now()+(d*24+h)*3600000};go()}

/* ---- Battle Pass : simulation jour par jour (paliers, missions quotidiennes/de saison, VIP) ----
   Une seule progression, au rythme réel du joueur (missions de saison à 3/jour si VIP sinon 2/jour, bonus ×1,20
   d'XP si VIP niv.2) : les paliers franchis sont donc rigoureusement les mêmes, qu'on soit VIP ou non — il n'y a
   qu'une trajectoire d'XP possible pour un joueur donné. Pour chaque palier franchi, sa récompense BP_REWARDS est
   ventilée a posteriori en trois parts : cum = somme complète (gratuite + VIP niv.1 + VIP niv.2) ; vip1 = le
   doublement du Battle Pass payant (×1 supplémentaire) sur les paliers qui le permettent ; vip2 = le seul bonus
   immédiat d'activation du VIP niv.2 (BP_V2 : Crédits, Amél., Hypercrédits). La part gratuite affichée ("Battle Pass")
   se déduit toujours de cum-vip1-vip2, sans seconde simulation : bp+vip1+vip2 = cum, exactement.
   Chaque vecteur a 3 composantes : [Crédits, Crédits d'amél., Hypercrédits]. */
function bpRun(rs){
const cumArr=new Array(MAXD+1),vip1Arr=new Array(MAXD+1),vip2Arr=new Array(MAXD+1),kArr=new Array(MAXD+1),stArr=new Array(MAXD+1);
let tier=S.bpl,xp=0,seasonStock=0,vip=S.bps,cum=[0,0,0],vip1=[0,0,0],vip2=[0,0,0],k=0,ri=0;
cumArr[0]=[0,0,0];vip1Arr[0]=[0,0,0];vip2Arr[0]=[0,0,0];kArr[0]=0;stArr[0]={tier,xp,ss:seasonStock,vip,cum,vip1,vip2,k}; // t=0 : aucune journée de jeu écoulée, donc aucune XP de mission encore gagnée
for(let t=1;t<=MAXD;t++){
while(ri<rs.length&&rs[ri]===t){tier=0;xp=0;seasonStock=0;vip=S.bpr;if(vip===2){cum=[cum[0]+BP_V2[0],cum[1]+BP_V2[1],cum[2]+BP_V2[2]];vip2=[vip2[0]+BP_V2[0],vip2[1]+BP_V2[1],vip2[2]+BP_V2[2]]}k++;ri++}
const daily=Math.min(S.act,BP_DAILY_MISSION_MATCHES)*(BP_DAILY_MISSION_XP*BP_DAILY_MISSION_COUNT/BP_DAILY_MISSION_MATCHES);
const seasonAdd=vip?BP_SEASON_MISSION_XP*BP_SEASON_MISSION_COUNT_VIP:BP_SEASON_MISSION_XP*BP_SEASON_MISSION_COUNT_F2P;
seasonStock+=seasonAdd;
const rate=vip?BP_SEASON_RATE_VIP:BP_SEASON_RATE_F2P;
const consumed=Math.min(seasonStock,S.act*rate);
seasonStock-=consumed;
let gain=daily+consumed;
if(vip===2)gain*=BP_VIP2_BONUS;
xp+=gain;
while(tier<BP_MAX&&xp>=BP_XP_REQ[tier]){xp-=BP_XP_REQ[tier];tier++;const rw=BP_REWARDS.find(r=>r[0]===tier);if(rw){cum=[cum[0]+rw[1],cum[1]+rw[2],cum[2]+rw[3]];if(vip&&rw[4]){cum=[cum[0]+rw[1],cum[1]+rw[2],cum[2]+rw[3]];vip1=[vip1[0]+rw[1],vip1[1]+rw[2],vip1[2]+rw[3]]}}}
cumArr[t]=cum;vip1Arr[t]=vip1;vip2Arr[t]=vip2;kArr[t]=k;stArr[t]={tier,xp,ss:seasonStock,vip,cum,vip1,vip2,k}}
return{cumArr,vip1Arr,vip2Arr,kArr,stArr}}

/* ---- Bilan : simulation jour par jour jusqu'à couvrir les dépenses (Crédits, Crédits d'amél. ET Hypercrédits) ----
   Dépenses : chars (niveaux + modules) + aptitudes des opérateurs acquis + prix de déblocage (HC) des opérateurs non acquis
   Stock : ressources actuelles S.res (capital déjà en banque à t = 0), compté dans la condition d'arrêt mais PAS dans les récompenses affichées
   Récompenses : crédits journaliers (plafonnés) + opérateurs (étalés sur les matchs) + ligue (trophées gagnés) + Battle Pass (simulation XP/palier, dont HC)
   Les HC proviennent du capital S.res[2], du Battle Pass (paliers 10/20/30/45, doublés en VIP) et du bonus VIP niv.2 (BP_V2[2]).
   dR[i] = premier jour t où la ressource i couvre sa dépense ; D = max(dR) (jour où les trois sont couvertes). */
const add3=(a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]];
function calc(){
const h=hangar(),dop=opNeed(),need=[h.T[0]+dop[0],h.T[1]+dop[1],dop[2]],os=opSum(),G=os.g,M=os.m,f=S.act,b=crDay(),pd=perDay(),cur=S.lg.cur,tr=avgTr(),res=S.res;
const opN=n=>{const x=M>0?Math.min(1,n/M):1;return[G[0]*x,G[1]*x]};
const opAt=t=>opN(f*t);
const lgA=t=>lgGain(cur+pd*t,1/0);
const rs=resetDays(Date.now()),sim=bpRun(rs);
/* Premier jour t où chaque ressource couvre sa dépense (gains monotones : D = max des trois) */
const dR=[null,null,null];
for(let t=0;t<=MAXD;t++){
const bpT=sim.cumArr[t],o=opAt(t),l=lgA(t),ok=[res[0]+b*t+o[0]+l[0]+bpT[0]>=need[0],res[1]+o[1]+l[1]+bpT[1]>=need[1],res[2]+bpT[2]>=need[2]];
for(let i=0;i<3;i++)if(dR[i]===null&&ok[i])dR[i]=t;
if(dR.every(x=>x!==null))break}
const D=dR.every(x=>x!==null)?Math.max(...dR):null,dT=daysToTarget();
const Dd=D===null?MAXD:D;
let farm=b*Dd,op=opAt(Dd),lg=lgA(Dd),bpFull=sim.cumArr[Dd],bpVip1=sim.vip1Arr[Dd],bpVip2=sim.vip2Arr[Dd],k=sim.kArr[Dd];
/* Affinage du jour D, match par match, à partir de l'état de fin du jour D-1 */
let mS=0;
if(D>=1){
let{tier,xp,ss,vip,cum,vip1,vip2,k:kk}=sim.stArr[D-1];
const n0=(D-1)*f,f0=(D-1)*b;
const chk=m=>{const n=n0+m,fm=f0+Math.min(DAILY_CAP,m*CR_PER_FIGHT),o=opN(n),l=lgGain(cur+tr*n,1/0);
return{fm,o,l,hit:res[0]+fm+o[0]+l[0]+cum[0]>=need[0]&&res[1]+o[1]+l[1]+cum[1]>=need[1]&&res[2]+cum[2]>=need[2]}};
// m = 0 : reset éventuel + stock de missions de saison du jour
if(rs.includes(D)){tier=0;xp=0;ss=0;vip=S.bpr;if(vip===2){cum=add3(cum,BP_V2);vip2=add3(vip2,BP_V2)}kk++}
ss+=vip?BP_SEASON_MISSION_XP*BP_SEASON_MISSION_COUNT_VIP:BP_SEASON_MISSION_XP*BP_SEASON_MISSION_COUNT_F2P;
const rate=vip?BP_SEASON_RATE_VIP:BP_SEASON_RATE_F2P;
let m=0,r=chk(0);
while(!r.hit&&m<f){
m++;
let g=m<=BP_DAILY_MISSION_MATCHES?BP_DAILY_MISSION_XP*BP_DAILY_MISSION_COUNT/BP_DAILY_MISSION_MATCHES:0;
const c=Math.min(ss,rate);ss-=c;g+=c;
if(vip===2)g*=BP_VIP2_BONUS;
xp+=g;
while(tier<BP_MAX&&xp>=BP_XP_REQ[tier]){xp-=BP_XP_REQ[tier];tier++;const rw=BP_REWARDS.find(x=>x[0]===tier);
if(rw){const v=[rw[1],rw[2],rw[3]];cum=add3(cum,v);if(vip&&rw[4]){cum=add3(cum,v);vip1=add3(vip1,v)}}}
r=chk(m)}
mS=m;
farm=r.fm;op=r.o;lg=r.l;bpFull=cum;bpVip1=vip1;bpVip2=vip2;k=kk}
// bp = voie gratuite seule : bp+bpVip1+bpVip2=bpFull toujours
const bp=[bpFull[0]-bpVip1[0]-bpVip2[0],bpFull[1]-bpVip1[1]-bpVip2[1],bpFull[2]-bpVip1[2]-bpVip2[2]];
// tot = farm + bp + vip1 + vip2 + lg + op : uniquement les récompenses réellement obtenues (sans le stock res)
const tot=[farm+bpFull[0]+lg[0]+op[0],bpFull[1]+lg[1]+op[1],bpFull[2]];
// left = reste à farmer après déduction du stock actuel
const left=[Math.max(0,need[0]-res[0]),Math.max(0,need[1]-res[1]),Math.max(0,need[2]-res[2])];
// surplus = reste net de chaque ressource une fois les dépenses payées
const surplus=tot.map((x,i)=>Math.max(0,res[i]+x-need[i]));
// Mtot = matchs futurs simulés jusqu'à l'arrêt
const Mtot=D===null?null:(D===0?0:(D-1)*f+mS);
return{need,dc:h.T,dop,res,left,op,lg,bp,bpVip1,bpVip2,k,D,Dd,dR,Mtot,surplus,b,farm,tot,dT,p:proj(dT||0)}}

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
m.innerHTML=`<div>${UI.m.t==='a'?body:body.replace('</section>','<button class="btn bev w-full mt-2" onclick="closeM()">Fermer</button></section>')}</div>`;}

/* ---- Onglet 1 : Mon Hangar ---- */
/* ---- Chars de la boutique (masquée) : nom/image dérivés de CHARS via c.key ---- */
const catOf=c=>c.key&&CHARS.find(x=>x[0]===c.key);
const cName=c=>{const x=catOf(c);return x?(x[1]||x[0]):c.name};
const cInd=c=>{const x=catOf(c);return x?x[2]:c.ind};
const cCls=c=>{const x=catOf(c);return x?x[3]:c.cls};
const cImg=c=>{const x=catOf(c);return c.img||(x?`assets/${x[0]}.webp`:null)};
const GRID=()=>`<div class="grid gap-3" style="grid-template-columns:repeat(${S.cols||3},minmax(0,1fr))">`;
const STAR=f=>`<svg viewBox="0 0 24 24" class="w-5 h-5" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>`;
const TRASH='<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
const bub=(c,a='',lvl=1,tag='button')=>{const im=cImg(c);return `<${tag} class="bubble${im?' has-img':''}${cCls(c)?' k-'+cCls(c):''}" ${a}>${im?`<i class="art" style="background-image:url(${im})"></i>`:''}<b>${esc(cName(c))}</b>${lvl?`<small>Niv. ${c.lvl}</small>`:''}${lvl&&c.fav&&tag==='button'?'<span class="fav-b">★</span>':''}</${tag}>`};
/* ---- Filtres Industriel / Classe (affichage uniquement, non sauvegardés ; aucun effet sur les calculs) ---- */
const SLID='<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
const fOn=k=>UI.f[k].ind.length+UI.f[k].cls.length>0;
const fPass=(k,c)=>{const f=UI.f[k];return(!f.ind.length||f.ind.includes(cInd(c)))&&(!f.cls.length||f.cls.includes(cCls(c)))};
const fBtn=k=>`<button class="${fOn(k)?'text-mand':'text-mag'} px-2" onclick="fOpen('${k}')" aria-label="Filtres" aria-expanded="${UI.f[k].o}">${SLID}</button>`;
const filtHtml=k=>{const f=UI.f[k],chip=(t,v,l,col)=>`<button class="btn bev text-xs" ${f[t].includes(v)?'style="background:#ff8a1f;color:#070e3a" ':''}onclick="fTog('${k}','${t}','${v}')">${col?`<span style="color:${col}">●</span> `:''}${l}</button>`;
return `<div class="space-y-2 border-t border-mag/40 pt-2"><div class="text-xs">Industriel</div><div class="flex flex-wrap gap-2">${Object.entries(INDUSTRIES).map(([v,l])=>chip('ind',v,l)).join('')}</div><div class="text-xs">Classe</div><div class="flex flex-wrap gap-2">${Object.entries(CLASSES).map(([v,[l,c]])=>chip('cls',v,l,c)).join('')}</div></div>`};
function fOpen(k){UI.f[k].o=!UI.f[k].o;render()}
function fTog(k,t,v){const a=UI.f[k][t],i=a.indexOf(v);i<0?a.push(v):a.splice(i,1);render()}
function vHangar0(){const h=hangar(),shop=CHARS.filter(x=>!S.chars.some(c=>c.key===x[0]));return `<section class="card bev p-3 space-y-1"><h2 class="text-mand text-sm">Total</h2>${row('Niveaux',h.L)}${row('Modules',h.M)}${row('Total complet',h.T,1)}</section>
<section id="hangarZone" class="card bev p-3 space-y-2"><div class="flex justify-between items-center"><h2 class="text-mand text-sm">Mon Hangar</h2>${fBtn('h')}</div>${UI.f.h.o?filtHtml('h'):''}${GRID()}${S.chars.filter(c=>fPass('h',c)).map(c=>bub(c,`data-drag="${c.id}" data-from="h" onclick="hClick(${c.id})" oncontextmenu="return false"`)).join('')}</div></section>`
+`<div id="shopZone" class="space-y-3"><button class="btn bev w-full" onclick="toggleT('c')">${UI.t.c?'▲':'▼'} Chars</button>${UI.t.c?`<section class="card bev p-3 space-y-2"><div class="flex justify-end">${fBtn('c')}</div>