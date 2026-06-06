const KEY="immohub_senegal_v5_roles";
const state={
  logged:false,
  currentUser:null,
  users:[],
  clients:[],
  properties:[],
  payments:[],
  visits:[],
  edls:[],
  histories:[],
  trackingId:null
};
let photos=[];

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=p=>`${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const money=n=>new Intl.NumberFormat("fr-FR").format(Math.round(Number(n||0)))+" FCFA";
const norm=n=>{let x=String(n||"").replace(/\D/g,"");return x.startsWith("221")?x:(x.length===9?"221"+x:x)};
const wa=(n,m)=>`https://wa.me/${norm(n)}?text=${encodeURIComponent(m)}`;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const load=()=>{try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){}};
const user=()=>state.users.find(u=>u.id===state.currentUser);
const isAdmin=()=>user()?.role==="SuperAdmin";
function applyRoleUI(){
  const admin = isAdmin();
  document.body.classList.toggle("admin-mode", admin);
  document.body.classList.toggle("courtier-mode", !admin);
  const panel = $("#adminPanel");
  if(panel) panel.classList.toggle("hidden", !admin);
}

const brokerName=id=>state.users.find(u=>u.id===id)?.name||"Courtier";
const signature=id=>state.users.find(u=>u.id===id)?.signature||brokerName(id);
const scoped=a=>isAdmin()?a:a.filter(x=>x.ownerId===state.currentUser);
const client=id=>state.clients.find(c=>c.id===id);
const prop=id=>state.properties.find(p=>p.id===id);
const closeModals=()=>$$(".modal").forEach(m=>m.classList.remove("open"));
let activeHistoryPropertyId = null;
let activeHistoryFilter = "Tous";
let historyVisibleCount = 5;

function addHistory(propertyId, type, title, details=""){
  if(!propertyId) return;
  if(!Array.isArray(state.histories)) state.histories=[];
  const p = prop(propertyId);
  state.histories.unshift({
    id: uid("hist"),
    propertyId,
    ownerId: p?.ownerId || state.currentUser,
    type,
    title,
    details,
    actor: user()?.name || "Utilisateur",
    date: new Date().toISOString()
  });
}

function propertyHistory(propertyId){
  return (state.histories || []).filter(h=>h.propertyId===propertyId).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
}
function histIcon(type){return {"Création":"🟢","Modification":"✏️","Paiement":"💰","Relance":"📲","Visite":"📅","EDL":"🧾"}[type] || "•";}
function formatDateTime(iso){try{return new Date(iso).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return iso||""}}
function openHistory(propertyId){
  activeHistoryPropertyId=propertyId; activeHistoryFilter="Tous"; historyVisibleCount=5;
  $$(".hist-filter").forEach(b=>b.classList.toggle("active",b.dataset.histFilter==="Tous"));
  renderHistory();
  $("#historyModal").classList.add("open");
}
function renderHistory(){
  const p=prop(activeHistoryPropertyId); if(!p) return;
  const all=propertyHistory(p.id);
  const filtered=activeHistoryFilter==="Tous"?all:all.filter(h=>h.type===activeHistoryFilter);
  const visible=filtered.slice(0,historyVisibleCount);
  const paymentCount=all.filter(h=>h.type==="Paiement").length;
  const relanceCount=all.filter(h=>h.type==="Relance").length;
  $("#historyHeader").innerHTML=`<strong>${p.name}</strong><span>${all.length} événement(s) • ${paymentCount} paiement(s) • ${relanceCount} relance(s)</span>`;
  $("#historyList").innerHTML=visible.length?visible.map(h=>`<article class="history-item"><div class="history-icon">${histIcon(h.type)}</div><div><strong>${h.title}</strong><small>${formatDateTime(h.date)} • par ${h.actor||"Utilisateur"}</small>${h.details?`<p>${h.details}</p>`:""}</div></article>`).join(""):`<div class="empty-state"><p>Aucun événement.</p><small>Les actions liées à ce bien apparaîtront ici.</small></div>`;
  $("#historyMoreBtn").classList.toggle("hidden",filtered.length<=historyVisibleCount);
}

function monthLabel(ym){return ym?new Date(ym+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):""}
function daysInMonth(ym){const [y,m]=ym.split("-").map(Number);return new Date(y,m,0).getDate()}

function ensureBase(){
  if(!Array.isArray(state.histories)) state.histories=[];
  if(!state.users.length){
    state.users=[
      {id:"admin",role:"SuperAdmin",name:"SuperAdmin ImmoHub",email:"admin@immohub.sn",password:"1234",phone:"",signature:"ImmoHub Sénégal"},
      {id:"khalifa",role:"Courtier",name:"Khalifa Gueye Immobilier",email:"khalifa@immohub.sn",password:"1234",phone:"",wave:"",orangeMoney:"",freeMoney:"",signature:"Khalifa Gueye Immobilier"},
      {id:"ndiaye",role:"Courtier",name:"M. Ndiaye Immobilier",email:"ndiaye@immohub.sn",password:"1234",phone:"",wave:"",orangeMoney:"",freeMoney:"",signature:"M. Ndiaye Immobilier"}
    ];
  }
}

function login(){
  const email=$("#loginEmail").value.trim().toLowerCase();
  const pass=$("#loginPassword").value;
  const found=state.users.find(u=>u.email.toLowerCase()===email && u.password===pass);
  if(!found){$("#loginError").classList.remove("hidden");return}
  state.currentUser=found.id;
  state.logged=true;
  $("#loginError").classList.add("hidden");
  $("#loginScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  applyRoleUI();
  save();
  nav("dashboard");
}

function logout(){
  state.logged=false;
  state.currentUser=null;
  save();
  document.body.classList.remove("courtier-mode");
  $("#loginScreen").classList.remove("hidden");
  $("#app").classList.add("hidden");
}

function nav(view){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#"+view).classList.add("active");
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  render();
}

function openModal(id){
  resetForms();
  $("#"+id).classList.add("open");
  if(id==="paymentModal") prefillPayment();
}

function ownerOptions(){
  return state.users.filter(u=>u.role==="Courtier").map(u=>`<option value="${u.id}">${u.name}</option>`).join("");
}

function opts(){
  $("#propertyOwnerBroker").innerHTML=ownerOptions();
  $("#clientOwnerBroker").innerHTML=ownerOptions();
  if(!isAdmin()){
    $("#propertyOwnerBroker").value=state.currentUser;
    $("#clientOwnerBroker").value=state.currentUser;
  }

  const contacts=scoped(state.clients);
  const owners=contacts.filter(c=>c.type==="Propriétaire");
  const occupants=contacts.filter(c=>["Prospect","Client","Locataire","Acheteur"].includes(c.type));
  const payers=contacts.filter(c=>["Client","Locataire","Acheteur"].includes(c.type));
  $("#propertyOwner").innerHTML='<option value="">Non renseigné</option>'+owners.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("#propertyOccupant").innerHTML='<option value="">Non renseigné</option>'+occupants.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("#paymentClient").innerHTML='<option value="">Non renseigné</option>'+payers.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("#paymentMethodsRecipient").innerHTML='<option value="">Choisir</option>'+contacts.filter(c=>c.phone).map(c=>`<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");

  const allProps=scoped(state.properties);
  const collectable=allProps.filter(canCollectProperty);
  const dueMap = new Map(getDueItems().map(d => [d.property.id, d]));
  const ps=allProps.map(p=>`<option value="${p.id}">${p.name} — ${p.area}</option>`).join("");
  const dueFirst=[...collectable].sort((a,b)=>(dueMap.has(b.id)-dueMap.has(a.id)));
  const cs=dueFirst.map(p=>{
    const d=dueMap.get(p.id);
    return `<option value="${p.id}">${d ? "À encaisser • " : ""}${p.name} — ${p.area}${d ? ` — reste ${money(d.remaining)}` : ""}</option>`;
  }).join("");
  $("#visitProperty").innerHTML=ps||'<option value="">Créer un bien d’abord</option>';
  $("#edlProperty").innerHTML=ps||'<option value="">Créer un bien d’abord</option>';
  $("#paymentProperty").innerHTML=cs||'<option value="">Aucun bien loué/occupé</option>';
}

function render(){
  if(!state.currentUser) return;
  const u=user();
  applyRoleUI();
  $("#headerSubtitle").textContent=u.role==="SuperAdmin"?"Vue globale SuperAdmin":u.name;
  $("#rolePill").textContent=u.role==="SuperAdmin"?"SuperAdmin":"Espace privé";
  $("#welcomeTitle").textContent=u.role==="SuperAdmin"?"Pilotage global":u.name;
  $("#welcomeText").textContent=u.role==="SuperAdmin"?"Vous voyez tous les courtiers et toutes les données.":"Vos biens restent privés dans votre espace.";
  applyRoleUI();
  opts();

  const props=scoped(state.properties), pays=scoped(state.payments), visits=scoped(state.visits);
  $("#kpiRevenue").textContent=money(pays.reduce((s,p)=>s+Number(p.amount||0),0));
  $("#kpiCommissions").textContent=money(pays.reduce((s,p)=>s+Number(p.agencyCommission||0)+Number(p.managementCommission||0),0));
  $("#kpiProperties").textContent=props.length;
  $("#kpiVisits").textContent=visits.length;
  $("#kpiDue").textContent=0;

  const duePayments = pays
    .filter(p => p.remaining > 0 || p.status !== "Confirmé")
    .map(p => ({property:prop(p.propertyId), month:p.month, remaining:p.remaining, dueDate:(p.month || "")+"-01"}));

  const due = [...getDueItems(), ...duePayments]
    .filter(item => item.property)
    .slice(0,6);

  $("#kpiDue").textContent = due.length;
  $("#dueList").innerHTML = due.length
    ? due.map(d => `<div class="card clickable-alert" onclick="showTracking('${d.property.id}')"><p>⏰ ${d.property.name}</p><small>${monthLabel(d.month)} • reste ${money(d.remaining)} • échéance ${d.dueDate}</small></div>`).join("")
    : '<div class="card empty-state"><p>Aucune échéance en attente.</p><small>Les restes à payer apparaîtront ici.</small></div>';

  renderBrokers();renderProperties();renderClients();renderPayments();renderVisits();renderEdl();renderTracking();
}

function badge(s){let c=["Confirmé","Disponible","Chaud","Entrée"].includes(s)?"green":["En attente","Partiel","Pas intéressé"].includes(s)?"red":["Vente","En vente","Sortie"].includes(s)?"orange":"gray";return `<span class="badge ${c}">${s}</span>`}

function renderBrokers(){
  $("#brokersList").innerHTML=state.users.filter(u=>u.role==="Courtier").map(u=>`
    <article class="card">
      <div class="card-top"><div><h3>${u.name}</h3><p>${u.email}</p></div><span class="badge orange">${state.properties.filter(p=>p.ownerId===u.id).length} biens</span></div>
      <p>Clients : ${state.clients.filter(c=>c.ownerId===u.id).length} • Paiements : ${state.payments.filter(p=>p.ownerId===u.id).length}</p>
      <div class="actions"><button class="mini-btn blue" onclick="editBroker('${u.id}')">Modifier</button><button class="mini-btn red" onclick="deleteBroker('${u.id}')">Supprimer</button></div>
    </article>`).join("");
}

function renderProperties(){
  const q=($("#propertySearch").value||"").toLowerCase();
  let list=scoped(state.properties);
  if(q) list=list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
  $("#propertiesList").innerHTML=list.length?list.map(p=>`
    <article class="card">
      <div class="card-top"><div><h3>${p.name}</h3><p>📍 ${p.area} • ${p.type}</p></div></div>
      ${(p.photos||[]).length?`<div class="photo-strip">${p.photos.map(x=>`<img src="${x}" onclick="openImageViewer('${x}')">`).join("")}</div>`:""}
      <p>💼 ${p.dealType} • <strong>${money(p.price)}</strong></p>
      <p>👤 ${client(p.ownerClientId)?.name||"Proprio non renseigné"} • 🏠 ${client(p.occupantId)?.name||"Libre / non renseigné"}</p>
      ${isAdmin()?`<p>🔐 ${brokerName(p.ownerId)}</p>`:""}
      <div class="actions">
        <button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button><button class="mini-btn blue" onclick="openHistory('${p.id}')">Historique</button>
        ${canCollectProperty(p)?`<button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button>`:`<button class="mini-btn disabled" onclick="payForProperty('${p.id}')">Non encaissable</button>`}
        <button class="mini-btn blue" onclick="editProperty('${p.id}')">Modifier</button>
        <button class="mini-btn red" onclick="del('properties','${p.id}')">Supprimer</button>
      </div>
    </article>`).join(""):'<div class="card empty-state"><p>Aucun bien trouvé.</p><small>Ajoute un bien avec le bouton +.</small></div>';
}

function renderClients(){
  const q=($("#clientSearch").value||"").toLowerCase();
  let list=scoped(state.clients);
  if(q) list=list.filter(c=>JSON.stringify(c).toLowerCase().includes(q));
  $("#clientsList").innerHTML=list.length?list.map(c=>`
    <article class="card">
      <div class="card-top"><div><h3>👤 ${c.name}</h3><p>${c.type}${isAdmin()?` • ${brokerName(c.ownerId)}`:""}</p></div>${badge(c.type)}</div>
      <p>📱 ${c.phone}</p><p>${c.notes||""}</p>
      <div class="actions"><button class="mini-btn blue" onclick="editClient('${c.id}')">Modifier</button><a class="mini-btn green" target="_blank" href="${wa(c.phone,'Bonjour '+c.name+'\\n\\n— '+signature(c.ownerId))}">WhatsApp</a><button class="mini-btn red" onclick="del('clients','${c.id}')">Supprimer</button></div>
    </article>`).join(""):'<div class="card empty-state"><p>Aucun contact.</p><small>Ajoute un contact avec le bouton +.</small></div>';
}

function renderPayments(){
  const list=scoped(state.payments);
  $("#paymentsList").innerHTML=list.length?list.map(p=>{
    const pr=prop(p.propertyId), links=paymentShareLinks(p);
    return `<article class="card compact-payment-card">
      <div class="compact-payment-top"><div><h3>${pr?.name||"Bien"}</h3><small>${monthLabel(p.month)} • ${p.type}${isAdmin()?` • ${brokerName(p.ownerId)}`:""}</small></div><strong>${money(p.amount)}</strong></div>
      <div class="compact-payment-meta"><span>💳 ${p.paymentMethod||"Non renseigné"}</span>${p.remaining>0?`<span class="reste-inline">Reste : ${money(p.remaining)}</span>`:`<span class="paid-inline">Payé</span>`}</div>
      <div class="actions"><a class="mini-btn green" target="_blank" href="${links.tenant}">Locataire</a><a class="mini-btn blue" target="_blank" href="${links.owner}">Proprio</a>${p.remaining>0?`<a class="mini-btn red" target="_blank" href="${relanceLink(p.id)}" onclick="logRelance('${p.id}')">Relance</a>`:""}</div>
    </article>`}).join(""):'<div class="card empty-state"><p>Aucun paiement.</p><small>Les encaissements apparaîtront ici.</small></div>';
}

function renderVisits(){
  const today=new Date().toISOString().slice(0,10);
  const list=scoped(state.visits).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("#visitsList").innerHTML=list.length?list.map(v=>{
    const p=prop(v.propertyId), locked=v.qualification && v.qualification!=="À qualifier";
    const msg=`Bonjour ${v.name}, rappel de votre visite pour ${p?.name||"le bien"} prévue le ${v.date} à ${v.time}.\\n\\n— ${signature(v.ownerId)}`;
    return `<article class="card" style="${v.date<today?'opacity:.55':''}">
      <div class="card-top"><div><h3>📅 ${v.name}</h3><p>${p?.name||"Bien"} • ${v.date} à ${v.time}</p></div>${badge(v.qualification)}</div>
      <p>📱 ${v.phone}</p><p>📝 ${v.note||"Aucune note"}</p>
      <div class="actions"><a class="mini-btn green" target="_blank" href="${wa(v.phone,msg)}">Relance</a>${locked?`<span class="mini-btn disabled">Terminée</span>`:`<button class="mini-btn blue" onclick="qualifyVisit('${v.id}','Chaud')">Chaud</button><button class="mini-btn" onclick="qualifyVisit('${v.id}','Froid')">Froid</button><button class="mini-btn red" onclick="qualifyVisit('${v.id}','Pas intéressé')">Pas intéressé</button>`}<button class="mini-btn red" onclick="del('visits','${v.id}')">Supprimer</button></div>
    </article>`}).join(""):'<div class="card empty-state"><p>Aucune visite.</p><small>Ajoute une visite avec le bouton +.</small></div>';
}

function renderEdl(){
  const list=scoped(state.edls);
  $("#edlList").innerHTML=list.length?list.map(e=>`<article class="card"><div class="card-top"><div><h3>🧾 PV ${e.type}</h3><p>${prop(e.propertyId)?.name||"Bien"}</p></div>${badge(e.type)}</div><p>Eau: ${e.water||"-"} • Électricité: ${e.power||"-"}</p><p>${(e.notes||"").replaceAll("\\n","<br>")}</p></article>`).join(""):'<div class="card empty-state"><p>Aucun état des lieux.</p><small>Crée un PV avec le bouton +.</small></div>';
}

function renderTracking(){
  const p=prop(state.trackingId);
  if(!p){$("#trackingContent").innerHTML='<div class="card"><p>Sélectionne un bien depuis la page Biens.</p></div>';return}
  $("#trackingSubtitle").textContent=`${p.name} • ${p.area}`;
  const transactions=state.payments.filter(x=>x.propertyId===p.id).sort((a,b)=>(b.month||"").localeCompare(a.month||""));
  $("#trackingContent").innerHTML=`<article class="card tracking-head"><div><h3>${p.name}</h3><p>${p.dealType} • ${money(p.price)}</p><p class="small-muted">Entrée : ${p.moveInDate||"à renseigner"} • Occupant : ${client(p.occupantId)?.name||"non renseigné"}</p></div><button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button></article>
  <div class="compact-transactions">${transactions.length?transactions.map(t=>`<div class="transaction-row ${t.remaining>0?'has-rest':''}"><div><strong>${monthLabel(t.month)}</strong><small>${t.type}</small></div><div class="transaction-money"><span>${money(t.amount)}</span>${t.remaining>0?`<em>Reste ${money(t.remaining)}</em>`:""}</div>${t.remaining>0?`<a class="mini-btn red" target="_blank" href="${relanceLink(t.id)}" onclick="logRelance('${t.id}')">Relance</a>`:""}</div>`).join(""):'<div class="card"><p>Aucune transaction.</p></div>'}</div>`;
}

function canCollectProperty(p){return !!p && ["Loué","Réservé","Vendu"].includes(p.status) && !!p.occupantId}
function dueDayForProperty(p){
  if(!p?.moveInDate) return 1;
  return Number(p.moveInDate.slice(8,10)) || 1;
}

function currentDueMonthForProperty(p){
  const today = new Date();
  const dueDay = dueDayForProperty(p);
  let y = today.getFullYear();
  let m = today.getMonth();
  if(today.getDate() < dueDay) m -= 1;
  return new Date(y,m,1).toISOString().slice(0,7);
}

function expectedForPropertyMonth(p, ym, type="Loyer mensuel"){
  if(!p) return 0;
  if(type === "Entrée location 3 mois") return Number(p.price || 0) * 3;
  let expected = Number(p.price || 0);

  if(p.moveInDate && p.moveInDate.slice(0,7) === ym){
    const day = Number(p.moveInDate.slice(8,10));
    expected = Math.round(Number(p.price || 0) * (daysInMonth(ym) - day + 1) / daysInMonth(ym));
  }

  return expected;
}

function paidForPropertyMonth(propertyId, ym){
  return state.payments
    .filter(p => p.propertyId === propertyId && p.month === ym && ["Loyer mensuel","Entrée location 3 mois"].includes(p.type))
    .reduce((sum,p) => sum + Number(p.amount || 0), 0);
}

function getDueItems(){
  return scoped(state.properties)
    .filter(canCollectProperty)
    .map(p => {
      const month = currentDueMonthForProperty(p);
      const expected = expectedForPropertyMonth(p, month, "Loyer mensuel");
      const paid = paidForPropertyMonth(p.id, month);
      const remaining = Math.max(0, expected - paid);
      const dueDate = `${month}-${String(dueDayForProperty(p)).padStart(2,"0")}`;
      return {property:p, month, expected, paid, remaining, dueDate};
    })
    .filter(item => item.remaining > 0)
    .sort((a,b) => a.dueDate.localeCompare(b.dueDate));
}

function collectBlockMessage(p){if(!p)return"Bien introuvable."; if(!p.occupantId)return"Impossible d’encaisser : aucun locataire/acheteur n’est rattaché à ce bien."; return`Impossible d’encaisser : le bien « ${p.name} » est au statut « ${p.status} ». Il doit être occupé/loué pour encaisser.`}
function showTracking(id){state.trackingId=id;save();nav("tracking")}
function payForProperty(id){const p=prop(id); if(!canCollectProperty(p)){alert(collectBlockMessage(p));return} state.trackingId=id;openModal("paymentModal");$("#paymentProperty").value=id;prefillPayment();}
function ownerForNew(){return isAdmin()?($("#propertyOwnerBroker").value||state.users.find(u=>u.role==="Courtier")?.id):state.currentUser}

function paymentMethodsText(ownerId){const u=state.users.find(x=>x.id===ownerId);const lines=[]; if(u?.wave)lines.push(`Wave : ${u.wave}`); if(u?.orangeMoney)lines.push(`Orange Money : ${u.orangeMoney}`); if(u?.freeMoney)lines.push(`Free Money : ${u.freeMoney}`); return lines.length?lines.join("\\n"):"Moyens de paiement non renseignés."}
function logRelance(paymentId){
  const pmt=state.payments.find(x=>x.id===paymentId);
  if(!pmt) return;
  addHistory(pmt.propertyId,"Relance","Relance envoyée",`Reste à payer : ${money(pmt.remaining)}`);
  save();
}

function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId);
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);

  const methods = paymentMethodsText(pmt.ownerId);
  const methodsBlock = methods && methods !== "Moyens de paiement non renseignés."
    ? `

Moyens de paiement :
${methods}`
    : "";

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement pour ${pr?.name || "le bien"}.

Mois : ${monthLabel(pmt.month)}
Montant payé : ${money(pmt.amount)}
Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
Montant attendu : ${money(pmt.expected)}
Reste à payer : ${money(pmt.remaining)}${methodsBlock}

— ${signature(pmt.ownerId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Paiement reçu pour ${pr?.name || "votre bien"}.

Mois : ${monthLabel(pmt.month)}
Montant brut : ${money(pmt.amount)}
Commission courtier/agence : ${money(pmt.agencyCommission || 0)}
Commission gestion : ${money(pmt.managementCommission || 0)}
Net propriétaire : ${money(net)}
Reste locataire : ${money(pmt.remaining)}

— ${signature(pmt.ownerId)}`;

  return {
    tenant: wa(tenant?.phone, tenantMsg),
    owner: wa(owner?.phone, ownerMsg)
  };
}

function relanceLink(id){
  const pmt = state.payments.find(x => x.id === id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);

  const methods = paymentMethodsText(pmt.ownerId);
  const methodsBlock = methods && methods !== "Moyens de paiement non renseignés."
    ? `

Moyens de paiement :
${methods}`
    : "";

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, il reste ${money(pmt.remaining)} à régler pour ${pr?.name || "le bien"} (${monthLabel(pmt.month)}).${methodsBlock}

— ${signature(pmt.ownerId)}`;

  return wa(c?.phone, msg);
}

async function resize(file){return new Promise(res=>{let r=new FileReader();r.onload=e=>{let img=new Image();img.onload=()=>{let c=document.createElement("canvas"),m=900,w=img.width,h=img.height;if(w>h&&w>m){h=h*m/w;w=m}else if(h>m){w=w*m/h;h=m}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",.72))};img.src=e.target.result};r.readAsDataURL(file)})}
async function photoInput(e){
  let files=[...e.target.files];
  if(!files.length) return;
  const remaining=Math.max(0,3-photos.length);
  if(remaining<=0){alert("Maximum 3 photos.");return;}
  files=files.slice(0,remaining);
  if(e.target.files.length>remaining) alert("Maximum 3 photos.");
  const newPhotos=await Promise.all(files.map(resize));
  photos=[...photos,...newPhotos].slice(0,3);
  $("#photoPreview").innerHTML=photos.map(x=>`<img src="${x}">`).join("");
}
function resetForms(){["brokerForm","propertyForm","clientForm","paymentForm","visitForm","edlForm","paymentMethodsForm"].forEach(id=>$("#"+id)?.reset());["brokerId","propertyId","clientId"].forEach(id=>$("#"+id).value="");photos=[];$("#photoPreview").innerHTML="";$("#paymentWarning").classList.add("hidden");$("#paymentShareBox").classList.add("hidden");opts();}

function editBroker(id){const u=state.users.find(x=>x.id===id); if(!u)return; openModal("brokerModal"); $("#brokerId").value=u.id; $("#brokerName").value=u.name; $("#brokerEmail").value=u.email; $("#brokerPassword").value=u.password; $("#brokerPhone").value=u.phone||""; $("#brokerWave").value=u.wave||""; $("#brokerOrange").value=u.orangeMoney||""; $("#brokerSignature").value=u.signature||""}
function deleteBroker(id){if(!confirm("Supprimer ce courtier ?"))return; state.users=state.users.filter(u=>u.id!==id); state.clients=state.clients.filter(x=>x.ownerId!==id); state.properties=state.properties.filter(x=>x.ownerId!==id); state.payments=state.payments.filter(x=>x.ownerId!==id); state.visits=state.visits.filter(x=>x.ownerId!==id); state.edls=state.edls.filter(x=>x.ownerId!==id); save();render();}
function editProperty(id){const p=prop(id); if(!p)return; openModal("propertyModal"); $("#propertyId").value=p.id; $("#propertyOwnerBroker").value=p.ownerId; $("#propertyName").value=p.name; $("#propertyDealType").value=p.dealType; $("#propertyStatus").value=p.status; $("#propertyType").value=p.type; $("#propertyArea").value=p.area; $("#propertyPrice").value=p.price; $("#propertyCharges").value=p.charges; $("#propertyMoveInDate").value=p.moveInDate||""; $("#propertyManagementRate").value=p.managementRate||0; $("#propertyOwner").value=p.ownerClientId||""; $("#propertyOccupant").value=p.occupantId||""; $("#propertyDescription").value=p.description||""; photos=p.photos||[]; $("#photoPreview").innerHTML=photos.map(x=>`<img src="${x}">`).join("")}
function editClient(id){const c=client(id); if(!c)return; openModal("clientModal"); $("#clientId").value=c.id; $("#clientOwnerBroker").value=c.ownerId; $("#clientName").value=c.name; $("#clientType").value=c.type; $("#clientPhone").value=c.phone; $("#clientEmail").value=c.email||""; $("#clientNotes").value=c.notes||""}
function del(k,id){if(!confirm("Supprimer ?"))return; state[k]=state[k].filter(x=>x.id!==id); save();render();}
function qualifyVisit(id,q){const v=state.visits.find(x=>x.id===id); if(v){v.qualification=q;save();render();}}

function prefillPayment(){
  if(!$("#paymentProperty").value && scoped(state.properties).filter(canCollectProperty)[0]) $("#paymentProperty").value=scoped(state.properties).filter(canCollectProperty)[0].id;
  const p=prop($("#paymentProperty").value); if(!p)return;
  const due=getDueItems().find(d=>d.property.id===p.id);
  const ym=due?.month || new Date().toISOString().slice(0,7);
  $("#paymentMonth").value=$("#paymentMonth").value||ym;
  $("#paymentClient").value=p.occupantId||"";
  $("#paymentExpected").value=due?.remaining || p.price || 0;
  $("#paymentManagementRate").value=p.managementRate||0;
  $("#paymentMoveInDate").value=p.moveInDate||"";
  calculatePayment();
}
function calculatePayment(){
  const p=prop($("#paymentProperty").value), ym=$("#paymentMonth").value, type=$("#paymentType").value; if(!p||!ym)return;
  let expected=Number(p.price||0);
  if(type==="Entrée location 3 mois") expected=Number(p.price||0)*3;
  if($("#paymentProrata").checked && type==="Loyer mensuel"){
    const d=$("#paymentMoveInDate").value||p.moveInDate;
    if(d && d.slice(0,7)===ym){const day=Number(d.slice(8,10)); expected=Math.round(Number(p.price||0)*(daysInMonth(ym)-day+1)/daysInMonth(ym))}
  }
  $("#paymentExpected").value=expected;
  const amount=Number($("#paymentAmount").value||0);
  $("#paymentRemaining").value=Math.max(0,expected-amount);
  const duplicate=state.payments.find(x=>x.propertyId===p.id&&x.month===ym&&x.type==="Loyer mensuel"&&x.remaining===0&&x.status==="Confirmé");
  if(duplicate && type==="Loyer mensuel"){$("#paymentWarning").textContent=`Attention : le loyer de ${monthLabel(ym)} est déjà réglé pour ce bien.`;$("#paymentWarning").classList.remove("hidden")}else $("#paymentWarning").classList.add("hidden");
}

function bind(){
  $("#loginForm").onsubmit=e=>{e.preventDefault();login()};
  $("#logoutBtn").onclick=logout;
  $$(".nav").forEach(b=>b.onclick=()=>nav(b.dataset.view));
  $$("[data-open]").forEach(b=>b.onclick=()=>openModal(b.dataset.open));
  $$("[data-close]").forEach(b=>b.onclick=closeModals);
  $$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModals()});
  $("#propertySearch").oninput=renderProperties; $("#clientSearch").oninput=renderClients;
  $("#uploadPhotoBtn").onclick=()=>$("#propertyPhotosUpload").click(); $("#cameraPhotoBtn").onclick=()=>$("#propertyPhotosCamera").click(); $("#propertyPhotosUpload").onchange=photoInput; $("#propertyPhotosCamera").onchange=photoInput;
  ["paymentProperty","paymentMonth","paymentType","paymentAmount","paymentProrata","paymentMoveInDate"].forEach(id=>{$("#"+id).oninput=calculatePayment;$("#"+id).onchange=calculatePayment});
  $("#sharePaymentMethodsBtn").onclick=()=>{opts(); const owner=isAdmin()?state.users.find(u=>u.role==="Courtier")?.id:state.currentUser; $("#paymentMethodsMessage").value=`Bonjour,\\n\\nVoici les moyens de paiement disponibles :\\n${paymentMethodsText(owner)}\\n\\n— ${signature(owner)}`; openModal("paymentMethodsModal")};
  $("#paymentMethodsForm").onsubmit=e=>{e.preventDefault(); const c=client($("#paymentMethodsRecipient").value); if(!c?.phone){alert("Choisis un destinataire avec un numéro WhatsApp.");return} window.open(wa(c.phone,$("#paymentMethodsMessage").value),"_blank");closeModals()};
  $("#brokerForm").onsubmit=e=>{e.preventDefault(); const id=$("#brokerId").value||uid("broker"); const data={id,role:"Courtier",name:$("#brokerName").value,email:$("#brokerEmail").value.toLowerCase(),password:$("#brokerPassword").value,phone:$("#brokerPhone").value,wave:$("#brokerWave").value,orangeMoney:$("#brokerOrange").value,freeMoney:"",signature:$("#brokerSignature").value||$("#brokerName").value}; const i=state.users.findIndex(u=>u.id===id); i>=0?state.users[i]=data:state.users.push(data); save();closeModals();render()};
  $("#clientForm").onsubmit=e=>{e.preventDefault(); const id=$("#clientId").value||uid("client"); const ownerId=isAdmin()?$("#clientOwnerBroker").value:state.currentUser; const c={id,ownerId,name:$("#clientName").value,type:$("#clientType").value,phone:$("#clientPhone").value,email:$("#clientEmail").value,notes:$("#clientNotes").value}; const i=state.clients.findIndex(x=>x.id===id); i>=0?state.clients[i]=c:state.clients.unshift(c); save();closeModals();render()};
  $("#propertyForm").onsubmit=e=>{e.preventDefault(); const id=$("#propertyId").value||uid("prop"); const ownerId=isAdmin()?$("#propertyOwnerBroker").value:state.currentUser; const p={id,ownerId,name:$("#propertyName").value,dealType:$("#propertyDealType").value,status:$("#propertyStatus").value,type:$("#propertyType").value,area:$("#propertyArea").value,price:+$("#propertyPrice").value,charges:+$("#propertyCharges").value,moveInDate:$("#propertyMoveInDate").value,managementRate:+$("#propertyManagementRate").value,ownerClientId:$("#propertyOwner").value,occupantId:$("#propertyOccupant").value,photos:photos.slice(0,3),description:$("#propertyDescription").value}; const i=state.properties.findIndex(x=>x.id===id); if(i>=0){state.properties[i]=p; addHistory(id,"Modification","Bien modifié",`${p.name} • ${p.area}`);}else{state.properties.unshift(p); addHistory(id,"Création","Bien créé",`${p.name} • ${p.area}`);} save();closeModals();render()};
  $("#paymentForm").onsubmit=e=>{e.preventDefault(); calculatePayment(); const p=prop($("#paymentProperty").value); if(!canCollectProperty(p)){alert(collectBlockMessage(p));return} const amount=+$("#paymentAmount").value, type=$("#paymentType").value, ym=$("#paymentMonth").value, expected=+$("#paymentExpected").value, remaining=+$("#paymentRemaining").value, rate=+$("#paymentManagementRate").value||p.managementRate||0; const dup=state.payments.find(x=>x.propertyId===p.id&&x.month===ym&&x.type==="Loyer mensuel"&&x.remaining===0&&x.status==="Confirmé"); if(dup&&type==="Loyer mensuel"){calculatePayment();return} const payment={id:uid("pay"),ownerId:p.ownerId,propertyId:p.id,clientId:$("#paymentClient").value,type,month:ym,expected,amount,paymentMethod:$("#paymentMethod").value,status:remaining>0?"Partiel":"Confirmé",remaining,agencyCommission:type==="Entrée location 3 mois"?Math.round(p.price||0):0,managementCommission:Math.round(amount*rate/100),date:new Date().toISOString()}; state.payments.unshift(payment); addHistory(p.id,"Paiement",payment.remaining>0?"Paiement partiel":"Paiement enregistré",`${money(payment.amount)} • ${monthLabel(payment.month)}${payment.remaining>0?" • reste "+money(payment.remaining):""}`); save(); render(); const links=paymentShareLinks(payment); $("#shareTenantBtn").href=links.tenant; $("#shareOwnerBtn").href=links.owner; $("#paymentShareBox").classList.remove("hidden")};
  $("#visitForm").onsubmit=e=>{e.preventDefault(); const p=prop($("#visitProperty").value); if(!p){alert("Crée d'abord un bien.");return} const dt=$("#visitDateTime").value; state.visits.unshift({id:uid("visit"),ownerId:p.ownerId,name:$("#visitProspectName").value,phone:$("#visitProspectPhone").value,propertyId:p.id,date:dt.slice(0,10),time:dt.slice(11,16),qualification:$("#visitQualification").value,note:$("#visitNote").value}); addHistory(p.id,"Visite","Visite ajoutée",`${$("#visitProspectName").value} • ${dt.replace("T"," ")}`); save();closeModals();render();nav("visits")};
  $("#edlForm").onsubmit=e=>{e.preventDefault(); const p=prop($("#edlProperty").value); if(!p){alert("Crée d'abord un bien.");return} state.edls.unshift({id:uid("edl"),ownerId:p.ownerId,propertyId:p.id,type:$("#edlType").value,water:$("#edlWater").value,power:$("#edlPower").value,notes:$("#edlNotes").value,date:new Date().toISOString()}); addHistory(p.id,"EDL",`État des lieux ${$("#edlType").value}`,`Eau : ${$("#edlWater").value||"-"} • Électricité : ${$("#edlPower").value||"-"}`); save();closeModals();render();nav("edl")};
}

window.addEventListener("beforeunload",save);
load();ensureBase();bind();if(state.logged&&state.currentUser){$("#loginScreen").classList.add("hidden");$("#app").classList.remove("hidden");applyRoleUI();render()}else render();

/* V5.1 safety: make sure admin account always exists */
(function ensureAdminAccount(){
  try{
    const existing = state.users.find(u => u.id === "admin" || u.email === "admin@immohub.sn");
    if(!existing){
      state.users.unshift({
        id:"admin",
        role:"SuperAdmin",
        name:"SuperAdmin ImmoHub",
        email:"admin@immohub.sn",
        password:"1234",
        phone:"",
        signature:"ImmoHub Sénégal"
      });
      save();
    }else{
      existing.id = "admin";
      existing.role = "SuperAdmin";
      existing.email = "admin@immohub.sn";
      existing.password = existing.password || "1234";
    }
  }catch(e){}
})();


/* =========================
   V5.4 TERRAIN FIX PATCH
   ========================= */

function getCurrentOwnerIdSafe(){
  if(typeof isAdmin === "function" && isAdmin()){
    return state.users?.find?.(u=>u.role==="Courtier")?.id || state.currentUser || "main";
  }
  return state.currentUser || state.workspace || "main";
}

function getOwnerUserSafe(ownerId){
  return (state.users||[]).find(u=>u.id===ownerId) || (state.agents||[]).find(a=>a.id===ownerId) || user?.() || {};
}

function paymentMethodsText(ownerId){
  const u = getOwnerUserSafe(ownerId);
  const lines = [];
  if(u.wave) lines.push(`Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`Free Money : ${u.freeMoney}`);
  return lines.join("\n");
}

function signatureSafe(ownerId){
  const u = getOwnerUserSafe(ownerId);
  return u.signature || u.name || "ImmoHub Sénégal";
}

function openImageViewer(src){
  const img = $("#imageViewerImg");
  if(!img){ alert("Aperçu photo indisponible."); return; }
  img.src = src;
  $("#imageViewerModal").classList.add("open");
}

function makePhotoStrip(p){
  const arr = p.photos || [];
  if(!arr.length) return "";
  return `<div class="photo-strip">${arr.map((x,i)=>`<img src="${x}" onclick="openImageViewer(${JSON.stringify(x)})" alt="Photo ${i+1}">`).join("")}</div>`;
}

function renderProperties(){
  const search = $("#propertySearch");
  const q = (search?.value || "").toLowerCase();
  let list = scoped(state.properties || []);
  if(q) list = list.filter(p => JSON.stringify(p).toLowerCase().includes(q));
  const box = $("#propertiesList");
  if(!box) return;

  box.innerHTML = list.length ? list.map(p => `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${p.name}</h3>
          <p>📍 ${p.area || "-"} • ${p.type || "-"}</p>
        </div>
      </div>
      ${makePhotoStrip(p)}
      <p>💼 ${p.dealType || "Location mensuelle"} • <strong>${money(p.price)}</strong></p>
      <p>👤 ${client(p.ownerClientId || p.ownerId)?.name || "Proprio non renseigné"} • 🏠 ${client(p.occupantId)?.name || "Libre / non renseigné"}</p>
      ${typeof isAdmin==="function" && isAdmin()?`<p>🔐 ${brokerName?.(p.ownerId) || p.ownerId || ""}</p>`:""}
      <div class="actions">
        <button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button>
        <button class="mini-btn blue" onclick="openHistory?.('${p.id}')">Historique</button>
        <button class="mini-btn green" onclick="openRentModal('${p.id}')">Mettre en location</button>
        ${canCollectProperty(p)?`<button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button>`:`<button class="mini-btn disabled" onclick="payForProperty('${p.id}')">Non encaissable</button>`}
        <button class="mini-btn blue" onclick="editProperty('${p.id}')">Modifier</button>
        <button class="mini-btn red" onclick="del('properties','${p.id}')">Supprimer</button>
      </div>
    </article>`).join("") : '<div class="card empty-state"><p>Aucun bien trouvé.</p><small>Ajoute un bien avec le bouton +.</small></div>';
}

function currentContactsForProperty(p){
  const contacts = scoped(state.clients || []);
  return {
    owners: contacts.filter(c=>c.type==="Propriétaire"),
    tenants: contacts.filter(c=>["Client","Locataire","Acheteur"].includes(c.type))
  };
}

function openRentModal(propertyId){
  const p = prop(propertyId);
  if(!p) return;
  const {owners, tenants} = currentContactsForProperty(p);
  if(!owners.length || !tenants.length){
    alert("Avant de mettre ce bien en location, ajoute au moins un propriétaire et un locataire/client dans Contacts.");
    return;
  }
  $("#rentPropertyId").value = p.id;
  $("#rentOwner").innerHTML = owners.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("#rentTenant").innerHTML = tenants.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("#rentOwner").value = p.ownerClientId || p.ownerId || owners[0].id;
  $("#rentTenant").value = p.occupantId || tenants[0].id;
  $("#rentMoveInDate").value = p.moveInDate || new Date().toISOString().slice(0,10);
  $("#rentPrice").value = p.price || "";
  $("#rentModal").classList.add("open");
}

function canSavePropertyWithRentalRules(p){
  if(["Loué","Réservé"].includes(p.status)){
    if(!p.ownerClientId && !p.ownerId) return "Pour mettre un bien en location, le propriétaire est obligatoire.";
    if(!p.occupantId) return "Pour mettre un bien en location, le locataire est obligatoire.";
    if(!p.moveInDate) return "Pour mettre un bien en location, la date d’entrée est obligatoire.";
  }
  return "";
}

const originalPaymentShareLinksV54 = typeof paymentShareLinks === "function" ? paymentShareLinks : null;
function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);
  const methods = paymentMethodsText(pmt.ownerId || pr?.ownerId || pmt.agentId);
  const methodsBlock = methods ? `

Moyens de paiement :
${methods}` : "";

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement pour ${pr?.name || "le bien"}.

Mois : ${monthLabel(pmt.month)}
Montant payé : ${money(pmt.amount)}
Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
Montant attendu : ${money(pmt.expected)}
Reste à payer : ${money(pmt.remaining)}${methodsBlock}

— ${signatureSafe(pmt.ownerId || pr?.ownerId || pmt.agentId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Paiement reçu pour ${pr?.name || "votre bien"}.

Mois : ${monthLabel(pmt.month)}
Montant brut : ${money(pmt.amount)}
Commission courtier/agence : ${money(pmt.agencyCommission || 0)}
Commission gestion : ${money(pmt.managementCommission || 0)}
Net propriétaire : ${money(net)}
Reste locataire : ${money(pmt.remaining)}

— ${signatureSafe(pmt.ownerId || pr?.ownerId || pmt.agentId)}`;

  return {
    tenant: wa(tenant?.phone, tenantMsg),
    owner: wa(owner?.phone, ownerMsg)
  };
}

function showReceiptPopup(payment){
  const links = paymentShareLinks(payment);
  const t = $("#receiptTenantLink") || $("#shareTenantBtn");
  const o = $("#receiptOwnerLink") || $("#shareOwnerBtn");
  if(t) t.href = links.tenant;
  if(o) o.href = links.owner;
  const share = $("#paymentShareBox");
  if(share) share.classList.remove("hidden");
  const modal = $("#paymentReceiptModal");
  if(modal) modal.classList.add("open");
}

function compactHistoryItem(h){
  return `
    <article class="history-item compact-history" onclick="this.classList.toggle('open')">
      <div class="history-icon">${histIcon?.(h.type) || "•"}</div>
      <div>
        <strong>${h.title}</strong>
        <small>${formatDateTime?.(h.date) || h.date || ""} • ${h.actor || "Utilisateur"}</small>
        ${h.details ? `<p>${h.details}</p>` : ""}
      </div>
    </article>`;
}

if(typeof renderHistory === "function"){
  const oldRenderHistory = renderHistory;
  renderHistory = function(){
    const p = prop(activeHistoryPropertyId);
    if(!p) return;
    const all = propertyHistory(p.id);
    const filtered = activeHistoryFilter === "Tous" ? all : all.filter(h => h.type === activeHistoryFilter);
    const visible = filtered.slice(0, historyVisibleCount || 5);
    const paymentCount = all.filter(h=>h.type==="Paiement").length;
    const relanceCount = all.filter(h=>h.type==="Relance").length;
    $("#historyHeader").innerHTML = `<strong>${p.name}</strong><span>${all.length} événement(s) • ${paymentCount} paiement(s) • ${relanceCount} relance(s)</span>`;
    $("#historyList").innerHTML = visible.length ? visible.map(compactHistoryItem).join("") : `<div class="empty-state"><p>Aucun événement.</p><small>Les actions liées à ce bien apparaîtront ici.</small></div>`;
    $("#historyMoreBtn").classList.toggle("hidden", filtered.length <= (historyVisibleCount || 5));
  };
}

/* Rebind after load */
setTimeout(()=>{
  const rentForm = $("#rentForm");
  if(rentForm && !rentForm.dataset.bound){
    rentForm.dataset.bound = "1";
    rentForm.onsubmit = e => {
      e.preventDefault();
      const p = prop($("#rentPropertyId").value);
      if(!p) return;
      p.status = "Loué";
      p.dealType = "Location mensuelle";
      p.ownerClientId = $("#rentOwner").value;
      p.ownerId = p.ownerId || p.ownerClientId;
      p.occupantId = $("#rentTenant").value;
      p.moveInDate = $("#rentMoveInDate").value;
      p.price = Number($("#rentPrice").value || p.price || 0);
      addHistory?.(p.id,"Modification","Bien mis en location",`${client(p.occupantId)?.name || "Locataire"} • ${money(p.price)}`);
      save();
      closeModals();
      render();
    };
  }

  const paymentForm = $("#paymentForm");
  if(paymentForm && !paymentForm.dataset.v54){
    const oldSubmit = paymentForm.onsubmit;
    paymentForm.dataset.v54 = "1";
    paymentForm.onsubmit = e => {
      if(oldSubmit) oldSubmit(e);
      setTimeout(()=>{
        const last = (state.payments || [])[0];
        if(last) showReceiptPopup(last);
      }, 80);
    };
  }
},100);


/* ===== V5.4.1 STABILISATION PAIEMENTS ===== */

function getOwnerUserV541(ownerId){
  const id = ownerId || state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}

function normalizeOwnerIdFromPropertyV541(p){
  return p?.ownerId || p?.agentId || state.currentUser || state.workspace || "main";
}

function paymentMethodsText(ownerId){
  const u = getOwnerUserV541(ownerId);
  const lines = [];
  if(u.wave) lines.push(`Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`Free Money : ${u.freeMoney}`);
  if(!lines.length && u.phone) lines.push(`Contact paiement : ${u.phone}`);
  return lines.join("\n");
}

function signatureSafe(ownerId){
  const u = getOwnerUserV541(ownerId);
  return u.signature || u.name || "ImmoHub Sénégal";
}

function propertyStatusGroup(p){
  if(["Loué","Réservé","Vendu"].includes(p.status) || p.occupantId) return "loues";
  return "disponibles";
}

function renderPropertyMiniCardV541(p){
  return `
    <article class="card property-mini-card">
      <div class="card-top">
        <div>
          <h3>${p.name}</h3>
          <p>📍 ${p.area || "-"} • ${money(p.price)}</p>
        </div>
        <span class="badge ${propertyStatusGroup(p)==="loues"?"green":"orange"}">${propertyStatusGroup(p)==="loues"?"Loué":"Disponible"}</span>
      </div>
      ${typeof makePhotoStrip==="function" ? makePhotoStrip(p) : ((p.photos||[]).length?`<div class="photo-strip">${p.photos.map(x=>`<img src="${x}" onclick="openImageViewer(${JSON.stringify(x)})">`).join("")}</div>`:"")}
      <p>👤 ${client(p.ownerClientId || p.ownerId)?.name || "Proprio non renseigné"} • 🏠 ${client(p.occupantId)?.name || "Libre"}</p>
      <div class="actions">
        <button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button>
        <button class="mini-btn blue" onclick="openHistory?.('${p.id}')">Historique</button>
        <button class="mini-btn green" onclick="openRentModal?.('${p.id}')">Mettre en location</button>
        ${canCollectProperty(p)?`<button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button>`:`<button class="mini-btn disabled" onclick="payForProperty('${p.id}')">Non encaissable</button>`}
        <button class="mini-btn blue" onclick="editProperty('${p.id}')">Modifier</button>
        <button class="mini-btn red" onclick="del('properties','${p.id}')">Supprimer</button>
      </div>
    </article>`;
}

function renderProperties(){
  const q = ($("#propertySearch")?.value || "").toLowerCase();
  let list = scoped(state.properties || []);
  if(q) list = list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
  const disponibles = list.filter(p=>propertyStatusGroup(p)==="disponibles");
  const loues = list.filter(p=>propertyStatusGroup(p)==="loues");
  const box = $("#propertiesList");
  if(!box) return;
  if(!list.length){
    box.innerHTML = '<div class="card empty-state"><p>Aucun bien trouvé.</p><small>Ajoute un bien avec le bouton +.</small></div>';
    return;
  }
  box.innerHTML = `
    <div class="property-columns">
      <section class="property-column">
        <div class="section-title-pill">Disponibles <span>${disponibles.length}</span></div>
        <div class="cards-list inner-list">${disponibles.length ? disponibles.map(renderPropertyMiniCardV541).join("") : '<div class="card empty-state"><p>Aucun bien disponible.</p></div>'}</div>
      </section>
      <section class="property-column">
        <div class="section-title-pill green">Loués <span>${loues.length}</span></div>
        <div class="cards-list inner-list">${loues.length ? loues.map(renderPropertyMiniCardV541).join("") : '<div class="card empty-state"><p>Aucun bien loué.</p></div>'}</div>
      </section>
    </div>`;
}

function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const ownerId = pmt.ownerId || normalizeOwnerIdFromPropertyV541(pr) || pmt.agentId;
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);
  const methods = paymentMethodsText(ownerId);
  const methodsBlock = methods ? `

Moyens de paiement :
${methods}` : "";

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement pour ${pr?.name || "le bien"}.

Mois : ${monthLabel(pmt.month)}
Montant payé : ${money(pmt.amount)}
Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
Montant attendu : ${money(pmt.expected)}
Reste à payer : ${money(pmt.remaining)}${methodsBlock}

— ${signatureSafe(ownerId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Paiement reçu pour ${pr?.name || "votre bien"}.

Mois : ${monthLabel(pmt.month)}
Montant brut : ${money(pmt.amount)}
Commission courtier/agence : ${money(pmt.agencyCommission || 0)}
Commission gestion : ${money(pmt.managementCommission || 0)}
Net propriétaire : ${money(net)}
Reste locataire : ${money(pmt.remaining)}

— ${signatureSafe(ownerId)}`;

  return {tenant:wa(tenant?.phone,tenantMsg), owner:wa(owner?.phone,ownerMsg)};
}

function relanceLink(id){
  const pmt = state.payments.find(x=>x.id===id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);
  const ownerId = pmt.ownerId || normalizeOwnerIdFromPropertyV541(pr) || pmt.agentId;
  const methods = paymentMethodsText(ownerId);
  const methodsBlock = methods ? `

Moyens de paiement :
${methods}` : "";

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, il reste ${money(pmt.remaining)} à régler pour ${pr?.name || "le bien"} (${monthLabel(pmt.month)}).${methodsBlock}

— ${signatureSafe(ownerId)}`;

  return wa(c?.phone,msg);
}

function bindHistoryFiltersV541(){
  $$(".hist-filter").forEach(b=>{
    b.onclick=()=>{
      activeHistoryFilter = b.dataset.histFilter;
      historyVisibleCount = 5;
      $$(".hist-filter").forEach(x=>x.classList.toggle("active",x===b));
      renderHistory?.();
    };
  });
  const more=$("#historyMoreBtn");
  if(more) more.onclick=()=>{historyVisibleCount=(historyVisibleCount||5)+5;renderHistory?.();};
}

function renderHistory(){
  const p = prop(activeHistoryPropertyId);
  if(!p) return;
  const all = propertyHistory(p.id);
  const filtered = activeHistoryFilter === "Tous" ? all : all.filter(h=>h.type===activeHistoryFilter);
  const visible = filtered.slice(0, historyVisibleCount || 5);
  const paymentCount = all.filter(h=>h.type==="Paiement").length;
  const relanceCount = all.filter(h=>h.type==="Relance").length;
  $("#historyHeader").innerHTML = `<strong>${p.name}</strong><span>${all.length} événement(s) • ${paymentCount} paiement(s) • ${relanceCount} relance(s)</span>`;
  $("#historyList").innerHTML = visible.length ? visible.map(h=>`
    <article class="history-item compact-history" onclick="this.classList.toggle('open')">
      <div class="history-icon">${histIcon?.(h.type)||"•"}</div>
      <div>
        <strong>${h.title}</strong>
        <small>${formatDateTime?.(h.date)||h.date||""} • ${h.actor||"Utilisateur"}</small>
        ${h.details?`<p>${h.details}</p>`:""}
      </div>
    </article>`).join("") : '<div class="empty-state"><p>Aucun événement.</p></div>';
  $("#historyMoreBtn").classList.toggle("hidden", filtered.length <= (historyVisibleCount || 5));
}

function selectedEdlChecks(){
  return $$(".edl-check:checked").map(x=>x.value);
}

setTimeout(()=>{
  bindHistoryFiltersV541();

  const edlForm=$("#edlForm");
  if(edlForm && !edlForm.dataset.v541){
    const old=edlForm.onsubmit;
    edlForm.dataset.v541="1";
    edlForm.onsubmit=e=>{
      const checks=selectedEdlChecks();
      if($("#edlNotes")) $("#edlNotes").value = `${checks.length ? checks.join("\n") + "\n\n" : ""}${$("#edlNotes").value || ""}`;
      if(old) old(e);
    };
  }
},150);


/* ===== V5.4.2 FIXES DEMANDÉS UNIQUEMENT ===== */
let activePropertyViewV542 = localStorage.getItem("immohub_property_tab_v542") || "disponibles";

function ownerIdFromContextV542(){
  return state.currentUser || state.workspace || "main";
}

function getOwnerUserV542(ownerId){
  const id = ownerId || ownerIdFromContextV542();
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}

/* Fix moyens de paiement : si vide, ouvrir un prompt simple pour renseigner une fois */
function ensurePaymentMethodsV542(ownerId){
  const u = getOwnerUserV542(ownerId);
  if(u.wave || u.orangeMoney || u.freeMoney) return true;

  const wave = prompt("Renseigne le numéro Wave à afficher dans les messages de paiement :", u.wave || "");
  if(wave === null) return false;
  const orange = prompt("Renseigne le numéro Orange Money :", u.orangeMoney || "");
  if(orange === null) return false;

  u.wave = wave.trim();
  u.orangeMoney = orange.trim();
  u.freeMoney = u.freeMoney || "";
  if(!u.signature) u.signature = u.name || "ImmoHub Sénégal";
  save();
  return true;
}

function paymentMethodsText(ownerId){
  const u = getOwnerUserV542(ownerId);
  const lines = [];
  if(u.wave) lines.push(`Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`Free Money : ${u.freeMoney}`);
  return lines.join("\n");
}

function signatureSafeV542(ownerId){
  const u = getOwnerUserV542(ownerId);
  return u.signature || u.name || "ImmoHub Sénégal";
}

/* Fix aperçu photo */
function openImageViewer(src){
  const modal = $("#imageViewerModal");
  const img = $("#imageViewerImg");
  if(!modal || !img){ alert("Aperçu photo indisponible."); return; }
  img.src = src;
  modal.classList.add("open");
}

function photoStripV542(p){
  const photos = p.photos || [];
  if(!photos.length) return "";
  return `<div class="photo-strip">${photos.map((x,i)=>`<img src="${x}" onclick="openImageViewer(${JSON.stringify(x)})" alt="Photo ${i+1}">`).join("")}</div>`;
}

/* Dispo / Loué : onglets, pas deux colonnes affichées en même temps */
function propertyGroupV542(p){
  return (["Loué","Réservé","Vendu"].includes(p.status) || p.occupantId) ? "loues" : "disponibles";
}

function renderPropertyCardV542(p){
  const isLoued = propertyGroupV542(p)==="loues";
  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${p.name}</h3>
          <p>📍 ${p.area || "-"} • ${p.type || "-"}</p>
        </div>
        <span class="badge ${isLoued ? "green" : "orange"}">${isLoued ? "Loué" : "Disponible"}</span>
      </div>
      ${photoStripV542(p)}
      <p>💼 ${p.dealType || "Location mensuelle"} • <strong>${money(p.price)}</strong></p>
      <p>👤 ${client(p.ownerClientId || p.ownerId)?.name || "Proprio non renseigné"} • 🏠 ${client(p.occupantId)?.name || "Libre"}</p>
      <div class="actions">
        <button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button>
        <button class="mini-btn blue" onclick="openHistory?.('${p.id}')">Historique</button>
        ${!isLoued ? `<button class="mini-btn green" onclick="openRentModal?.('${p.id}')">Louer</button>` : ""}
        ${canCollectProperty(p)?`<button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button>`:`<button class="mini-btn disabled" onclick="payForProperty('${p.id}')">Non encaissable</button>`}
        <button class="mini-btn blue" onclick="editProperty('${p.id}')">Modifier</button>
        <button class="mini-btn red" onclick="del('properties','${p.id}')">Supprimer</button>
      </div>
    </article>`;
}

function renderProperties(){
  const q = ($("#propertySearch")?.value || "").toLowerCase();
  let list = scoped(state.properties || []);
  if(q) list = list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));

  const disponibles = list.filter(p=>propertyGroupV542(p)==="disponibles");
  const loues = list.filter(p=>propertyGroupV542(p)==="loues");
  const shown = activePropertyViewV542 === "loues" ? loues : disponibles;

  $$(".property-tab").forEach(b=>{
    b.classList.toggle("active", b.dataset.propertyView === activePropertyViewV542);
    b.textContent = b.dataset.propertyView === "loues" ? `Loués (${loues.length})` : `Disponibles (${disponibles.length})`;
  });

  const box = $("#propertiesList");
  if(!box) return;
  box.innerHTML = shown.length
    ? shown.map(renderPropertyCardV542).join("")
    : `<div class="card empty-state"><p>Aucun bien ${activePropertyViewV542 === "loues" ? "loué" : "disponible"}.</p></div>`;
}

/* Blocage double encaissement d'un même mois */
function nextMonthV542(ym){
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,7);
}

function isMonthlyRentAlreadyPaidV542(propertyId, ym){
  return (state.payments || []).some(p =>
    p.propertyId === propertyId &&
    p.month === ym &&
    p.type === "Loyer mensuel" &&
    Number(p.remaining || 0) === 0 &&
    p.status === "Confirmé"
  );
}

function blockIfAlreadyPaidV542(propertyId, ym, type){
  if(type !== "Loyer mensuel") return false;
  if(!isMonthlyRentAlreadyPaidV542(propertyId, ym)) return false;
  alert(`Le loyer de ${monthLabel(ym)} est déjà réglé pour ce bien.\n\nProchaine période à encaisser : ${monthLabel(nextMonthV542(ym))}.`);
  return true;
}

/* Messages propres + moyens de paiement obligatoires si bouton Moyens */
function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const ownerId = pmt.ownerId || pr?.ownerId || pmt.agentId || ownerIdFromContextV542();
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);
  const methods = paymentMethodsText(ownerId);
  const methodsBlock = methods ? `

Moyens de paiement :
${methods}` : "";

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement pour ${pr?.name || "le bien"}.

Mois : ${monthLabel(pmt.month)}
Montant payé : ${money(pmt.amount)}
Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
Montant attendu : ${money(pmt.expected)}
Reste à payer : ${money(pmt.remaining)}${methodsBlock}

— ${signatureSafeV542(ownerId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Paiement reçu pour ${pr?.name || "votre bien"}.

Mois : ${monthLabel(pmt.month)}
Montant brut : ${money(pmt.amount)}
Commission courtier/agence : ${money(pmt.agencyCommission || 0)}
Commission gestion : ${money(pmt.managementCommission || 0)}
Net propriétaire : ${money(net)}
Reste locataire : ${money(pmt.remaining)}

— ${signatureSafeV542(ownerId)}`;

  return {tenant:wa(tenant?.phone,tenantMsg), owner:wa(owner?.phone,ownerMsg)};
}

/* Validation EDL : au moins une case OU une observation */
function validateEdlV542(){
  const checked = $$(".edl-check:checked").length;
  const note = ($("#edlNotes")?.value || "").trim();
  const msg = $("#edlValidationMessage");
  if(checked === 0 && !note){
    if(msg){
      msg.textContent = "Coche au moins un élément ou renseigne une observation avant d’enregistrer.";
      msg.classList.remove("hidden");
    } else {
      alert("Coche au moins un élément ou renseigne une observation avant d’enregistrer.");
    }
    return false;
  }
  if(msg) msg.classList.add("hidden");
  return true;
}

/* Bind uniquement les corrections demandées */
setTimeout(()=>{
  $$(".property-tab").forEach(b=>{
    b.onclick=()=>{
      activePropertyViewV542 = b.dataset.propertyView;
      localStorage.setItem("immohub_property_tab_v542", activePropertyViewV542);
      renderProperties();
    };
  });

  const moyenBtn = $("#sharePaymentMethodsBtn");
  if(moyenBtn && !moyenBtn.dataset.v542){
    const old = moyenBtn.onclick;
    moyenBtn.dataset.v542 = "1";
    moyenBtn.onclick = () => {
      const ownerId = ownerIdFromContextV542();
      if(!ensurePaymentMethodsV542(ownerId)) return;
      if(old) old();
      setTimeout(()=>{
        const msg = $("#paymentMethodsMessage");
        if(msg) msg.value = `Bonjour,

Voici les moyens de paiement disponibles :
${paymentMethodsText(ownerId)}

— ${signatureSafeV542(ownerId)}`;
      },30);
    };
  }

  const payForm = $("#paymentForm");
  if(payForm && !payForm.dataset.v542){
    const old = payForm.onsubmit;
    payForm.dataset.v542 = "1";
    payForm.onsubmit = (e) => {
      const propertyId = $("#paymentProperty")?.value;
      const ym = $("#paymentMonth")?.value;
      const type = $("#paymentType")?.value;
      if(blockIfAlreadyPaidV542(propertyId, ym, type)){
        e.preventDefault();
        return;
      }
      if(old) old(e);
    };
  }

  const edlForm = $("#edlForm");
  if(edlForm && !edlForm.dataset.v542){
    const old = edlForm.onsubmit;
    edlForm.dataset.v542 = "1";
    edlForm.onsubmit = (e) => {
      if(!validateEdlV542()){
        e.preventDefault();
        return;
      }
      const checks = $$(".edl-check:checked").map(x=>x.value);
      if(checks.length && $("#edlNotes")){
        $("#edlNotes").value = `${checks.join("\n")}${$("#edlNotes").value.trim() ? "\n\n" + $("#edlNotes").value.trim() : ""}`;
      }
      if(old) old(e);
    };
  }

  renderProperties();
},120);


/* ===== V5.4.3 — CORRECTIONS VALIDÉES UNIQUEMENT ===== */

let activePropertyViewV543 = localStorage.getItem("immohub_property_tab_v543") || "disponibles";

function ownerIdV543(){
  return state.currentUser || state.workspace || "main";
}

function ownerUserV543(ownerId){
  const id = ownerId || ownerIdV543();
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}

function ownerFromPropertyV543(p){
  return p?.ownerId || p?.agentId || ownerIdV543();
}

function signatureV543(ownerId){
  const u = ownerUserV543(ownerId);
  return u.signature || u.name || "ImmoHub Sénégal";
}

function paymentMethodsText(ownerId){
  const u = ownerUserV543(ownerId);
  const lines = [];
  if(u.wave) lines.push(`📱 Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`📱 Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`📱 Free Money : ${u.freeMoney}`);
  return lines.join("\n");
}

function ensurePaymentMethodsV543(ownerId){
  const u = ownerUserV543(ownerId);
  if(u.wave || u.orangeMoney || u.freeMoney) return true;

  const wave = prompt("Numéro Wave à afficher dans les messages :", u.wave || "");
  if(wave === null) return false;

  const orange = prompt("Numéro Orange Money à afficher dans les messages :", u.orangeMoney || "");
  if(orange === null) return false;

  u.wave = wave.trim();
  u.orangeMoney = orange.trim();
  u.freeMoney = u.freeMoney || "";
  if(!u.signature) u.signature = u.name || "ImmoHub Sénégal";
  save();
  return true;
}

/* Message automatique : moyens de paiement locataire */
function buildPaymentMethodsMessageV543(recipientName, ownerId){
  const methods = paymentMethodsText(ownerId);
  return `Bonjour ${recipientName || ""},

Pour rappel, vous pouvez régler vos échéances avec nos moyens de paiement :

${methods || "Aucun moyen de paiement renseigné."}

Merci de nous envoyer la preuve de paiement après règlement.

Cordialement,

${signatureV543(ownerId)}`;
}

/* Messages paiement */
function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const ownerId = pmt.ownerId || ownerFromPropertyV543(pr) || pmt.agentId;
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement.

🏠 Bien : ${pr?.name || "le bien"}
📅 Période : ${monthLabel(pmt.month)}
💰 Montant payé : ${money(pmt.amount)}
📱 Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
💰 Reste à payer : ${money(pmt.remaining)}

Merci pour votre règlement.

${signatureV543(ownerId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Nous vous informons que le loyer du bien suivant a été encaissé et reversé :

🏠 Bien : ${pr?.name || "votre bien"}
📅 Période : ${monthLabel(pmt.month)}

💰 Montant encaissé : ${money(pmt.amount)}
💼 Commission de gestion : ${money(pmt.managementCommission || 0)}
💵 Montant reversé : ${money(net)}

📱 Moyen de versement : ${pmt.paymentMethod || "Non renseigné"}
${tenant?.phone ? `📞 Numéro locataire : ${tenant.phone}` : ""}

Merci pour votre confiance.

${signatureV543(ownerId)}`;

  return {
    tenant: wa(tenant?.phone, tenantMsg),
    owner: wa(owner?.phone, ownerMsg)
  };
}

/* Message relance locataire */
function relanceLink(id){
  const pmt = state.payments.find(x=>x.id===id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);
  const ownerId = pmt.ownerId || ownerFromPropertyV543(pr) || pmt.agentId;
  const methods = paymentMethodsText(ownerId);

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, le règlement du mois de ${monthLabel(pmt.month)} n'a pas encore été reçu.

🏠 Bien : ${pr?.name || "le bien"}
💰 Montant restant : ${money(pmt.remaining)}

Vous pouvez effectuer le paiement via :

${methods || "Moyens de paiement non renseignés."}

Merci de nous transmettre la preuve de paiement après règlement.

${signatureV543(ownerId)}`;

  return wa(c?.phone, msg);
}

/* Onglets Disponibles / Loués */
function groupPropertyV543(p){
  return (["Loué","Réservé","Vendu"].includes(p.status) || p.occupantId) ? "loues" : "disponibles";
}

function openImageViewer(src){
  const modal = $("#imageViewerModal");
  const img = $("#imageViewerImg");
  if(!modal || !img){ alert("Aperçu photo indisponible."); return; }
  img.src = src;
  modal.classList.add("open");
}

function photoStripV543(p){
  const arr = p.photos || [];
  if(!arr.length) return "";
  return `<div class="photo-strip">${arr.map((x,i)=>`<img src="${x}" onclick="openImageViewer(${JSON.stringify(x)})" alt="Photo ${i+1}">`).join("")}</div>`;
}

function propertyCardV543(p){
  const isLoued = groupPropertyV543(p)==="loues";
  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${p.name}</h3>
          <p>📍 ${p.area || "-"} • ${p.type || "-"}</p>
        </div>
        <span class="badge ${isLoued ? "green" : "orange"}">${isLoued ? "Loué" : "Disponible"}</span>
      </div>
      ${photoStripV543(p)}
      <p>💼 ${p.dealType || "Location mensuelle"} • <strong>${money(p.price)}</strong></p>
      <p>👤 ${client(p.ownerClientId || p.ownerId)?.name || "Proprio non renseigné"} • 🏠 ${client(p.occupantId)?.name || "Libre"}</p>
      <div class="actions">
        <button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button>
        <button class="mini-btn blue" onclick="openHistory?.('${p.id}')">Historique</button>
        ${!isLoued ? `<button class="mini-btn green" onclick="openRentModal?.('${p.id}')">Louer</button>` : ""}
        ${canCollectProperty(p)?`<button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button>`:`<button class="mini-btn disabled" onclick="payForProperty('${p.id}')">Non encaissable</button>`}
        <button class="mini-btn blue" onclick="editProperty('${p.id}')">Modifier</button>
        <button class="mini-btn red" onclick="del('properties','${p.id}')">Supprimer</button>
      </div>
    </article>`;
}

function renderProperties(){
  const q = ($("#propertySearch")?.value || "").toLowerCase();
  let list = scoped(state.properties || []);
  if(q) list = list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));

  const disponibles = list.filter(p=>groupPropertyV543(p)==="disponibles");
  const loues = list.filter(p=>groupPropertyV543(p)==="loues");
  const shown = activePropertyViewV543 === "loues" ? loues : disponibles;

  $$(".property-tab").forEach(b=>{
    b.classList.toggle("active", b.dataset.propertyView === activePropertyViewV543);
    b.textContent = b.dataset.propertyView === "loues" ? `Loués (${loues.length})` : `Disponibles (${disponibles.length})`;
  });

  const box = $("#propertiesList");
  if(!box) return;
  box.innerHTML = shown.length
    ? shown.map(propertyCardV543).join("")
    : `<div class="card empty-state"><p>Aucun bien ${activePropertyViewV543 === "loues" ? "loué" : "disponible"}.</p></div>`;
}

/* EDL : impossible d'enregistrer vide */
function validateEdlV543(){
  const checked = $$(".edl-check:checked").length;
  const note = ($("#edlNotes")?.value || "").trim();
  const msg = $("#edlValidationMessage");
  if(checked === 0 && !note){
    if(msg){
      msg.textContent = "Coche au moins un élément ou renseigne une observation avant d’enregistrer.";
      msg.classList.remove("hidden");
    } else {
      alert("Coche au moins un élément ou renseigne une observation avant d’enregistrer.");
    }
    return false;
  }
  if(msg) msg.classList.add("hidden");
  return true;
}

/* Blocage double encaissement */
function nextMonthV543(ym){
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,7);
}

function rentAlreadyPaidV543(propertyId, ym){
  return (state.payments || []).some(p =>
    p.propertyId === propertyId &&
    p.month === ym &&
    p.type === "Loyer mensuel" &&
    Number(p.remaining || 0) === 0 &&
    p.status === "Confirmé"
  );
}

function blockDuplicateRentV543(propertyId, ym, type){
  if(type !== "Loyer mensuel") return false;
  if(!rentAlreadyPaidV543(propertyId, ym)) return false;
  alert(`Le loyer de ${monthLabel(ym)} est déjà réglé pour ce bien.

Prochaine période à encaisser : ${monthLabel(nextMonthV543(ym))}.`);
  return true;
}

/* Bind strict des corrections */
setTimeout(()=>{
  $$(".property-tab").forEach(b=>{
    b.onclick=()=>{
      activePropertyViewV543 = b.dataset.propertyView;
      localStorage.setItem("immohub_property_tab_v543", activePropertyViewV543);
      renderProperties();
    };
  });

  const moyensBtn = $("#sharePaymentMethodsBtn");
  if(moyensBtn && !moyensBtn.dataset.v543){
    const old = moyensBtn.onclick;
    moyensBtn.dataset.v543="1";
    moyensBtn.onclick=()=>{
      const ownerId = ownerIdV543();
      if(!ensurePaymentMethodsV543(ownerId)) return;
      if(old) old();
      setTimeout(()=>{
        const recipientId = $("#paymentMethodsRecipient")?.value;
        const recipient = client(recipientId);
        const msg = $("#paymentMethodsMessage");
        if(msg) msg.value = buildPaymentMethodsMessageV543(recipient?.name || "", ownerId);
      },80);
    };
  }

  const methodsRecipient = $("#paymentMethodsRecipient");
  if(methodsRecipient && !methodsRecipient.dataset.v543){
    methodsRecipient.dataset.v543="1";
    methodsRecipient.onchange=()=>{
      const ownerId = ownerIdV543();
      const recipient = client(methodsRecipient.value);
      const msg = $("#paymentMethodsMessage");
      if(msg) msg.value = buildPaymentMethodsMessageV543(recipient?.name || "", ownerId);
    };
  }

  const payForm = $("#paymentForm");
  if(payForm && !payForm.dataset.v543){
    const old = payForm.onsubmit;
    payForm.dataset.v543="1";
    payForm.onsubmit=(e)=>{
      const propertyId = $("#paymentProperty")?.value;
      const ym = $("#paymentMonth")?.value;
      const type = $("#paymentType")?.value;
      if(blockDuplicateRentV543(propertyId, ym, type)){
        e.preventDefault();
        return;
      }
      if(old) old(e);
    };
  }

  const edlForm = $("#edlForm");
  if(edlForm && !edlForm.dataset.v543){
    const old = edlForm.onsubmit;
    edlForm.dataset.v543="1";
    edlForm.onsubmit=(e)=>{
      if(!validateEdlV543()){
        e.preventDefault();
        return;
      }
      if(old) old(e);
    };
  }

  renderProperties();
},120);


/* ===== V5.4.4 — FIX BUGS PAIEMENTS UNIQUEMENT ===== */

function ownerUserV544(ownerId){
  const id = ownerId || state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}

function ownerIdFromPropertyV544(p){
  return p?.ownerId || p?.agentId || state.currentUser || state.workspace || "main";
}

function signatureV544(ownerId){
  const u = ownerUserV544(ownerId);
  return u.signature || u.name || "ImmoHub Sénégal";
}

function paymentMethodsText(ownerId){
  const u = ownerUserV544(ownerId);
  const lines = [];
  if(u.wave) lines.push(`📱 Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`📱 Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`📱 Free Money : ${u.freeMoney}`);
  return lines.join("\n");
}

function ensurePaymentMethodsV544(ownerId){
  const u = ownerUserV544(ownerId);
  if(u.wave || u.orangeMoney || u.freeMoney) return true;

  const wave = prompt("Numéro Wave à afficher dans les messages :", u.wave || "");
  if(wave === null) return false;

  const orange = prompt("Numéro Orange Money à afficher dans les messages :", u.orangeMoney || "");
  if(orange === null) return false;

  u.wave = wave.trim();
  u.orangeMoney = orange.trim();
  u.freeMoney = u.freeMoney || "";
  if(!u.signature) u.signature = u.name || "ImmoHub Sénégal";
  save();
  return true;
}

/* 1) Message moyens de paiement — locataire */
function buildTenantPaymentMethodsMessageV544(name, ownerId){
  const methods = paymentMethodsText(ownerId);
  return `Bonjour ${name || ""},

Pour rappel, vous pouvez régler vos échéances avec nos moyens de paiement :

${methods || "Moyens de paiement non renseignés."}

Merci de nous envoyer la preuve de paiement après règlement.

Cordialement,

${signatureV544(ownerId)}`;
}

/* 2) Message moyens de paiement — propriétaire */
function buildOwnerPaymentMethodsMessageV544(name, ownerId){
  const methods = paymentMethodsText(ownerId);
  return `Bonjour ${name || ""},

Pour tout versement ou remboursement éventuel, vous pouvez utiliser les moyens de paiement suivants :

${methods || "Moyens de paiement non renseignés."}

Merci.

${signatureV544(ownerId)}`;
}

/* 3) Message paiement reçu locataire + versement propriétaire */
function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const ownerId = pmt.ownerId || ownerIdFromPropertyV544(pr) || pmt.agentId;
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement.

🏠 Bien : ${pr?.name || "le bien"}
📅 Période : ${monthLabel(pmt.month)}
💰 Montant payé : ${money(pmt.amount)}
📱 Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
💰 Reste à payer : ${money(pmt.remaining)}

Merci pour votre règlement.

${signatureV544(ownerId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Nous vous informons que le loyer du bien suivant a été encaissé et reversé :

🏠 Bien : ${pr?.name || "votre bien"}
📅 Période : ${monthLabel(pmt.month)}

💰 Montant encaissé : ${money(pmt.amount)}
💼 Commission de gestion : ${money(pmt.managementCommission || 0)}
💵 Montant reversé : ${money(net)}

📱 Moyen de versement : ${pmt.paymentMethod || "Non renseigné"}

Merci pour votre confiance.

${signatureV544(ownerId)}`;

  return {
    tenant: wa(tenant?.phone, tenantMsg),
    owner: wa(owner?.phone, ownerMsg)
  };
}

/* 4) Relance locataire */
function relanceLink(id){
  const pmt = state.payments.find(x=>x.id===id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);
  const ownerId = pmt.ownerId || ownerIdFromPropertyV544(pr) || pmt.agentId;
  const methods = paymentMethodsText(ownerId);

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, le règlement du mois de ${monthLabel(pmt.month)} n'a pas encore été reçu.

🏠 Bien : ${pr?.name || "le bien"}
💰 Montant restant : ${money(pmt.remaining)}

Vous pouvez effectuer le paiement via :

${methods || "Moyens de paiement non renseignés."}

Merci de nous transmettre la preuve de paiement après règlement.

${signatureV544(ownerId)}`;

  return wa(c?.phone, msg);
}

/* 5) Paiement partiel : fusionner sur la même échéance au lieu de créer une nouvelle ligne */
function findMonthlyRentPaymentV544(propertyId, ym){
  return (state.payments || []).find(p =>
    p.propertyId === propertyId &&
    p.month === ym &&
    p.type === "Loyer mensuel"
  );
}

function nextMonthV544(ym){
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,7);
}

function isMonthlyRentSoldedV544(propertyId, ym){
  const p = findMonthlyRentPaymentV544(propertyId, ym);
  return !!p && Number(p.remaining || 0) === 0 && p.status === "Confirmé";
}

function mergeOrBlockRentPaymentV544(e){
  const propertyId = $("#paymentProperty")?.value;
  const ym = $("#paymentMonth")?.value;
  const type = $("#paymentType")?.value;
  const amount = Number($("#paymentAmount")?.value || 0);
  const method = $("#paymentMethod")?.value || "Non renseigné";
  const pr = prop(propertyId);

  if(type !== "Loyer mensuel") return false;
  if(!propertyId || !ym || !pr) return false;

  const existing = findMonthlyRentPaymentV544(propertyId, ym);

  if(existing && Number(existing.remaining || 0) === 0 && existing.status === "Confirmé"){
    alert(`Le loyer de ${monthLabel(ym)} est déjà soldé pour ce bien.

Prochaine période à encaisser : ${monthLabel(nextMonthV544(ym))}.`);
    e.preventDefault();
    return true;
  }

  if(existing && Number(existing.remaining || 0) > 0){
    e.preventDefault();

    const newAmount = Number(existing.amount || 0) + amount;
    const expected = Number(existing.expected || $("#paymentExpected")?.value || pr.price || 0);
    const remaining = Math.max(0, expected - newAmount);

    existing.amount = newAmount;
    existing.remaining = remaining;
    existing.paymentMethod = method;
    existing.status = remaining > 0 ? "Partiel" : "Confirmé";
    existing.managementCommission = Math.round(newAmount * (Number($("#paymentManagementRate")?.value || pr.managementRate || 0) / 100));

    if(typeof addHistory === "function"){
      addHistory(
        propertyId,
        "Paiement",
        remaining > 0 ? "Paiement partiel complété" : "Loyer soldé",
        `${money(amount)} ajouté • Total reçu : ${money(newAmount)}${remaining>0 ? " • reste "+money(remaining) : ""}`
      );
    }

    save();
    render();

    if(typeof showReceiptPopup === "function") showReceiptPopup(existing);
    else {
      const links = paymentShareLinks(existing);
      if($("#shareTenantBtn")) $("#shareTenantBtn").href = links.tenant;
      if($("#shareOwnerBtn")) $("#shareOwnerBtn").href = links.owner;
      if($("#paymentShareBox")) $("#paymentShareBox").classList.remove("hidden");
    }

    alert(remaining > 0
      ? `Paiement ajouté sur l’échéance de ${monthLabel(ym)}.\n\nReste à payer : ${money(remaining)}.`
      : `Le loyer de ${monthLabel(ym)} est maintenant soldé.\n\nProchaine période : ${monthLabel(nextMonthV544(ym))}.`
    );

    return true;
  }

  return false;
}

/* 6) Bind strict : paiement + moyens de paiement */
setTimeout(()=>{
  const paymentForm = $("#paymentForm");
  if(paymentForm && !paymentForm.dataset.v544){
    const oldSubmit = paymentForm.onsubmit;
    paymentForm.dataset.v544 = "1";
    paymentForm.onsubmit = (e)=>{
      if(mergeOrBlockRentPaymentV544(e)) return;
      if(oldSubmit) oldSubmit(e);
    };
  }

  const btn = $("#sharePaymentMethodsBtn");
  if(btn && !btn.dataset.v544){
    const oldClick = btn.onclick;
    btn.dataset.v544 = "1";
    btn.onclick = ()=>{
      const ownerId = state.currentUser || state.workspace || "main";
      if(!ensurePaymentMethodsV544(ownerId)) return;

      if(oldClick) oldClick();

      setTimeout(()=>{
        const recipient = client($("#paymentMethodsRecipient")?.value);
        const type = recipient?.type || "";
        const msg = $("#paymentMethodsMessage");
        if(!msg) return;

        if(type === "Propriétaire"){
          msg.value = buildOwnerPaymentMethodsMessageV544(recipient?.name || "", ownerId);
        }else{
          msg.value = buildTenantPaymentMethodsMessageV544(recipient?.name || "", ownerId);
        }
      },80);
    };
  }

  const recipientSelect = $("#paymentMethodsRecipient");
  if(recipientSelect && !recipientSelect.dataset.v544){
    recipientSelect.dataset.v544 = "1";
    recipientSelect.onchange = ()=>{
      const ownerId = state.currentUser || state.workspace || "main";
      const recipient = client(recipientSelect.value);
      const msg = $("#paymentMethodsMessage");
      if(!msg) return;

      if(recipient?.type === "Propriétaire"){
        msg.value = buildOwnerPaymentMethodsMessageV544(recipient?.name || "", ownerId);
      }else{
        msg.value = buildTenantPaymentMethodsMessageV544(recipient?.name || "", ownerId);
      }
    };
  }
},120);


/* ===== V5.4.5 — FIX STRICT ENCAISSEMENT UNIQUEMENT ===== */

function monthlyRentPaymentsV545(propertyId, ym){
  return (state.payments || []).filter(p =>
    p.propertyId === propertyId &&
    p.month === ym &&
    p.type === "Loyer mensuel"
  );
}

function expectedRentV545(propertyId, ym){
  const p = prop(propertyId);
  if(!p) return 0;

  if(typeof expectedForPropertyMonth === "function"){
    return Number(expectedForPropertyMonth(p, ym, "Loyer mensuel") || p.price || 0);
  }

  return Number(p.price || 0);
}

function paidRentTotalV545(propertyId, ym){
  return monthlyRentPaymentsV545(propertyId, ym)
    .reduce((sum,p)=>sum + Number(p.amount || 0), 0);
}

function remainingRentV545(propertyId, ym){
  return Math.max(0, expectedRentV545(propertyId, ym) - paidRentTotalV545(propertyId, ym));
}

function nextMonthV545(ym){
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,7);
}

/* Préremplir le bon montant : reste réel à payer */
function prefillPayment(){
  if(!$("#paymentProperty")?.value){
    const first = scoped(state.properties || []).filter(canCollectProperty)[0];
    if(first) $("#paymentProperty").value = first.id;
  }

  const p = prop($("#paymentProperty")?.value);
  if(!p) return;

  const ym = $("#paymentMonth")?.value || new Date().toISOString().slice(0,7);
  $("#paymentMonth").value = ym;

  if($("#paymentClient")) $("#paymentClient").value = p.occupantId || "";

  const type = $("#paymentType")?.value || "Loyer mensuel";
  let expected = type === "Loyer mensuel" ? expectedRentV545(p.id, ym) : Number(p.price || 0);
  let remaining = type === "Loyer mensuel" ? remainingRentV545(p.id, ym) : expected;

  if($("#paymentExpected")) $("#paymentExpected").value = expected;
  if($("#paymentAmount")) $("#paymentAmount").value = remaining > 0 ? remaining : expected;
  if($("#paymentRemaining")) $("#paymentRemaining").value = Math.max(0, expected - Number($("#paymentAmount")?.value || 0));
  if($("#paymentManagementRate")) $("#paymentManagementRate").value = p.managementRate || 0;
  if($("#paymentMoveInDate")) $("#paymentMoveInDate").value = p.moveInDate || "";
}

/* Recalculer correctement à chaque changement */
function calculatePayment(){
  const propertyId = $("#paymentProperty")?.value;
  const p = prop(propertyId);
  const ym = $("#paymentMonth")?.value;
  const type = $("#paymentType")?.value || "Loyer mensuel";
  if(!p || !ym) return;

  let expected = Number(p.price || 0);

  if(type === "Entrée location 3 mois"){
    expected = Number(p.price || 0) * 3;
  }else if(type === "Loyer mensuel"){
    expected = expectedRentV545(p.id, ym);
  }

  if($("#paymentExpected")) $("#paymentExpected").value = expected;

  const alreadyPaid = type === "Loyer mensuel" ? paidRentTotalV545(p.id, ym) : 0;
  const amount = Number($("#paymentAmount")?.value || 0);
  const remaining = Math.max(0, expected - alreadyPaid - amount);

  if($("#paymentRemaining")) $("#paymentRemaining").value = remaining;

  const warning = $("#paymentWarning");
  if(warning){
    if(type === "Loyer mensuel" && alreadyPaid >= expected){
      warning.textContent = `Le loyer de ${monthLabel(ym)} est déjà soldé. Prochaine période : ${monthLabel(nextMonthV545(ym))}.`;
      warning.classList.remove("hidden");
    }else{
      warning.classList.add("hidden");
    }
  }
}

/* Bloquer strictement : un mois soldé ne peut plus être encaissé */
function blockSoldedRentBeforeSubmitV545(e){
  const propertyId = $("#paymentProperty")?.value;
  const ym = $("#paymentMonth")?.value;
  const type = $("#paymentType")?.value || "Loyer mensuel";
  if(type !== "Loyer mensuel" || !propertyId || !ym) return false;

  const expected = expectedRentV545(propertyId, ym);
  const alreadyPaid = paidRentTotalV545(propertyId, ym);

  if(alreadyPaid >= expected){
    e.preventDefault();
    alert(`Le loyer de ${monthLabel(ym)} est déjà soldé pour ce bien.

Prochaine période à encaisser : ${monthLabel(nextMonthV545(ym))}.`);
    return true;
  }

  return false;
}

/* Si paiement partiel déjà existant : on complète la même échéance */
function mergePartialRentBeforeSubmitV545(e){
  const propertyId = $("#paymentProperty")?.value;
  const ym = $("#paymentMonth")?.value;
  const type = $("#paymentType")?.value || "Loyer mensuel";
  if(type !== "Loyer mensuel" || !propertyId || !ym) return false;

  const expected = expectedRentV545(propertyId, ym);
  const existing = monthlyRentPaymentsV545(propertyId, ym)[0];
  const alreadyPaid = paidRentTotalV545(propertyId, ym);
  const amount = Number($("#paymentAmount")?.value || 0);

  if(!existing || alreadyPaid === 0) return false;

  e.preventDefault();

  const newTotal = Math.min(expected, alreadyPaid + amount);
  const remaining = Math.max(0, expected - newTotal);

  existing.amount = newTotal;
  existing.expected = expected;
  existing.remaining = remaining;
  existing.status = remaining > 0 ? "Partiel" : "Confirmé";
  existing.paymentMethod = $("#paymentMethod")?.value || existing.paymentMethod || "Non renseigné";
  existing.managementCommission = Math.round(newTotal * (Number($("#paymentManagementRate")?.value || prop(propertyId)?.managementRate || 0) / 100));

  if(typeof addHistory === "function"){
    addHistory(
      propertyId,
      "Paiement",
      remaining > 0 ? "Paiement partiel complété" : "Loyer soldé",
      `${money(amount)} ajouté • Total reçu : ${money(newTotal)}${remaining>0 ? " • reste "+money(remaining) : ""}`
    );
  }

  save();
  render();

  if(typeof showReceiptPopup === "function") showReceiptPopup(existing);
  else{
    const links = paymentShareLinks(existing);
    if($("#shareTenantBtn")) $("#shareTenantBtn").href = links.tenant;
    if($("#shareOwnerBtn")) $("#shareOwnerBtn").href = links.owner;
    if($("#paymentShareBox")) $("#paymentShareBox").classList.remove("hidden");
  }

  alert(remaining > 0
    ? `Paiement ajouté sur l’échéance de ${monthLabel(ym)}.

Reste à payer : ${money(remaining)}.`
    : `Le loyer de ${monthLabel(ym)} est maintenant soldé.

Prochaine période : ${monthLabel(nextMonthV545(ym))}.`
  );

  return true;
}

setTimeout(()=>{
  ["paymentProperty","paymentMonth","paymentType"].forEach(id=>{
    const el = $("#"+id);
    if(!el || el.dataset.v545) return;
    el.dataset.v545 = "1";
    el.addEventListener("change", ()=>{
      prefillPayment();
      calculatePayment();
    });
  });

  const amount = $("#paymentAmount");
  if(amount && !amount.dataset.v545){
    amount.dataset.v545 = "1";
    amount.addEventListener("input", calculatePayment);
  }

  const form = $("#paymentForm");
  if(form && !form.dataset.v545strict){
    const oldSubmit = form.onsubmit;
    form.dataset.v545strict = "1";
    form.onsubmit = (e)=>{
      if(blockSoldedRentBeforeSubmitV545(e)) return;
      if(mergePartialRentBeforeSubmitV545(e)) return;
      if(oldSubmit) oldSubmit(e);
    };
  }
},150);


/* ===== V5.4.6 — MINI FIX UNIQUEMENT ===== */

/* X / retour dans Suivi du bien */
function closeTrackingViewV546(){
  if(typeof nav === "function") nav("properties");
}

setTimeout(()=>{
  const btn = $("#trackingBackBtn");
  if(btn && !btn.dataset.v546){
    btn.dataset.v546 = "1";
    btn.onclick = closeTrackingViewV546;
  }
},100);

/* Aperçu photo robuste */
function openImageViewer(src){
  const modal = $("#imageViewerModal");
  const img = $("#imageViewerImg");
  if(!modal || !img){
    alert("Aperçu photo indisponible.");
    return;
  }
  img.src = src;
  modal.classList.add("open");
}

function photoStripV546(p){
  const photos = p.photos || [];
  if(!photos.length) return "";
  return `<div class="photo-strip">${photos.map((x,i)=>`<img src="${x}" onclick="openImageViewer(${JSON.stringify(x)})" alt="Photo ${i+1}">`).join("")}</div>`;
}

/* Si l'ancien rendu n'a pas branché les photos, on le rebranche sans changer le reste */
const oldRenderPropertiesV546 = typeof renderProperties === "function" ? renderProperties : null;
if(oldRenderPropertiesV546){
  renderProperties = function(){
    oldRenderPropertiesV546();
    document.querySelectorAll(".photo-strip img").forEach(img=>{
      if(!img.dataset.v546){
        img.dataset.v546 = "1";
        img.onclick = () => openImageViewer(img.getAttribute("src"));
      }
    });
  };
}


/* ===== V5.5 — SPRINT 2 DASHBOARD PAIEMENTS UNIQUEMENT ===== */

function currentMonthV55(){
  return new Date().toISOString().slice(0,7);
}

function scopedPaymentsV55(){
  return scoped(state.payments || []);
}

function scopedPropertiesV55(){
  return scoped(state.properties || []);
}

function expectedRentV55(p, ym){
  if(!p) return 0;
  if(typeof expectedForPropertyMonth === "function"){
    return Number(expectedForPropertyMonth(p, ym, "Loyer mensuel") || p.price || 0);
  }
  return Number(p.price || 0);
}

function paidForMonthV55(propertyId, ym){
  return (state.payments || [])
    .filter(p => p.propertyId === propertyId && p.month === ym && p.type === "Loyer mensuel")
    .reduce((s,p)=>s + Number(p.amount || 0),0);
}

function dashboardDueItemsV55(){
  const ym = currentMonthV55();
  return scopedPropertiesV55()
    .filter(p => typeof canCollectProperty === "function" ? canCollectProperty(p) : !!p.occupantId)
    .map(p=>{
      const expected = expectedRentV55(p, ym);
      const paid = paidForMonthV55(p.id, ym);
      const remaining = Math.max(0, expected - paid);
      return {property:p, month:ym, expected, paid, remaining};
    })
    .filter(x=>x.remaining>0);
}

function updatePaymentDashboardV55(){
  const ym = currentMonthV55();
  const payments = scopedPaymentsV55();
  const dueItems = dashboardDueItemsV55();

  const toCollect = dueItems.reduce((s,x)=>s+x.remaining,0);
  const reliquats = payments.filter(p=>Number(p.remaining||0)>0);
  const reliquatAmount = reliquats.reduce((s,p)=>s+Number(p.remaining||0),0);

  const monthPayments = payments.filter(p=>p.month===ym);
  const monthCommission = monthPayments.reduce((s,p)=>s+Number(p.agencyCommission||0)+Number(p.managementCommission||0),0);
  const toReverse = monthPayments.reduce((s,p)=>s + Math.max(0, Number(p.amount||0)-Number(p.agencyCommission||0)-Number(p.managementCommission||0)),0);

  if($("#dashToCollect")) $("#dashToCollect").textContent = money(toCollect);
  if($("#dashToCollectCount")) $("#dashToCollectCount").textContent = `${dueItems.length} bien(s)`;
  if($("#dashReliquats")) $("#dashReliquats").textContent = money(reliquatAmount);
  if($("#dashReliquatsCount")) $("#dashReliquatsCount").textContent = `${reliquats.length} paiement(s)`;
  if($("#dashMonthCommission")) $("#dashMonthCommission").textContent = money(monthCommission);
  if($("#dashToReverse")) $("#dashToReverse").textContent = money(toReverse);

  const priorities = [
    ...dueItems.map(x=>({
      label:x.property.name,
      sub:`${monthLabel(x.month)} • reste ${money(x.remaining)}`,
      propertyId:x.property.id,
      kind:"À encaisser"
    })),
    ...reliquats.slice(0,5).map(p=>({
      label:prop(p.propertyId)?.name || "Bien",
      sub:`Reliquat ${monthLabel(p.month)} • ${money(p.remaining)}`,
      propertyId:p.propertyId,
      kind:"Reliquat"
    }))
  ].slice(0,6);

  if($("#paymentPriorityList")){
    $("#paymentPriorityList").innerHTML = priorities.length ? priorities.map(item=>`
      <button class="priority-item" onclick="showTracking('${item.propertyId}')">
        <span>${item.kind}</span>
        <strong>${item.label}</strong>
        <small>${item.sub}</small>
      </button>
    `).join("") : '<div class="empty-state"><p>Aucune priorité paiement.</p><small>Les échéances et reliquats apparaîtront ici.</small></div>';
  }
}

const oldRenderV55 = typeof render === "function" ? render : null;
if(oldRenderV55 && !window.__v55DashboardPatched){
  window.__v55DashboardPatched = true;
  render = function(){
    oldRenderV55();
    updatePaymentDashboardV55();
  };
}

setTimeout(updatePaymentDashboardV55,150);


/* ===== V5.5.1 + SPRINT 3 — Corrections + quittance imprimable ===== */

function dueAlertItemsV551(){
  const items = [];
  const props = scoped(state.properties || []).filter(p => typeof canCollectProperty === "function" ? canCollectProperty(p) : !!p.occupantId);
  const ym = new Date().toISOString().slice(0,7);

  props.forEach(p=>{
    const expected = typeof expectedRentV55 === "function" ? expectedRentV55(p, ym) : Number(p.price || 0);
    const paid = (state.payments || [])
      .filter(pay=>pay.propertyId===p.id && pay.month===ym && pay.type==="Loyer mensuel")
      .reduce((s,pay)=>s+Number(pay.amount||0),0);
    const remaining = Math.max(0, expected - paid);
    if(remaining > 0){
      items.push({property:p, month:ym, remaining, kind:"À encaisser"});
    }
  });

  (scoped(state.payments || [])).forEach(pmt=>{
    const pr = prop(pmt.propertyId);
    if(pr && Number(pmt.remaining||0) > 0){
      const duplicate = items.some(x=>x.property.id===pr.id && x.month===pmt.month);
      if(!duplicate){
        items.push({property:pr, month:pmt.month, remaining:Number(pmt.remaining||0), kind:"Reliquat"});
      }
    }
  });

  return items.slice(0,6);
}

function renderDueAlertsV551(){
  const list = dueAlertItemsV551();
  if($("#dueList")){
    $("#dueList").innerHTML = list.length ? list.map(d=>`
      <div class="card clickable-alert" onclick="showTracking('${d.property.id}')">
        <p>⏰ ${d.property.name}</p>
        <small>${d.kind} • ${monthLabel(d.month)} • reste ${money(d.remaining)}</small>
      </div>
    `).join("") : '<div class="card empty-state"><p>Aucune échéance en attente.</p><small>Les biens soldés disparaissent automatiquement.</small></div>';
  }
}

function ownerUserV551(ownerId){
  const id = ownerId || state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}
function ownerIdFromPropertyV551(p){
  return p?.ownerId || p?.agentId || state.currentUser || state.workspace || "main";
}
function signatureV551(ownerId){
  const u = ownerUserV551(ownerId);
  return u.signature || u.name || "ImmoHub Sénégal";
}

function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const ownerId = pmt.ownerId || ownerIdFromPropertyV551(pr) || pmt.agentId;
  const net = Number(pmt.amount || 0) - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement.

🏠 Bien : ${pr?.name || "le bien"}
📍 Adresse : ${pr?.area || "Non renseignée"}
📅 Période : ${monthLabel(pmt.month)}
📄 Type : ${pmt.type || "Paiement"}
💰 Montant payé : ${money(pmt.amount)}
📱 Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
💰 Reste à payer : ${money(pmt.remaining)}

Merci pour votre règlement.

${signatureV551(ownerId)}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Nous vous informons que le paiement suivant a été encaissé et reversé :

🏠 Bien : ${pr?.name || "votre bien"}
📍 Adresse : ${pr?.area || "Non renseignée"}
📅 Période : ${monthLabel(pmt.month)}
📄 Type : ${pmt.type || "Paiement"}

💰 Montant encaissé : ${money(pmt.amount)}
💼 Commission de gestion : ${money(pmt.managementCommission || 0)}
💵 Montant reversé : ${money(net)}

📱 Moyen de versement : ${pmt.paymentMethod || "Non renseigné"}

Merci pour votre confiance.

${signatureV551(ownerId)}`;

  return {tenant:wa(tenant?.phone, tenantMsg), owner:wa(owner?.phone, ownerMsg)};
}

function relanceLink(id){
  const pmt = state.payments.find(x=>x.id===id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);
  const ownerId = pmt.ownerId || ownerIdFromPropertyV551(pr) || pmt.agentId;
  const methods = typeof paymentMethodsText === "function" ? paymentMethodsText(ownerId) : "";

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, le règlement suivant n'a pas encore été reçu :

🏠 Bien : ${pr?.name || "le bien"}
📍 Adresse : ${pr?.area || "Non renseignée"}
📅 Période : ${monthLabel(pmt.month)}
📄 Type : ${pmt.type || "Paiement"}
💰 Montant restant : ${money(pmt.remaining)}

Vous pouvez effectuer le paiement via :

${methods || "Moyens de paiement non renseignés."}

Merci de nous transmettre la preuve de paiement après règlement.

${signatureV551(ownerId)}`;

  return wa(c?.phone, msg);
}

function renderVisits(){
  const today = new Date().toISOString().slice(0,10);
  const list = scoped(state.visits || []).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const box = $("#visitsList");
  if(!box) return;

  box.innerHTML = list.length ? list.map(v=>{
    const p = prop(v.propertyId);
    const locked = v.qualification && v.qualification !== "À qualifier";
    const msg = `Bonjour ${v.name},

Petit rappel concernant votre visite.

🏠 Bien : ${p?.name || "le bien"}
📍 Adresse : ${p?.area || "Non renseignée"}
📅 Date : ${v.date}
🕒 Heure : ${v.time}

Merci de confirmer votre présence.

${signatureV551(v.ownerId || p?.ownerId || p?.agentId)}`;

    return `<article class="card" style="${v.date<today?'opacity:.55':''}">
      <div class="card-top">
        <div><h3>📅 ${v.name}</h3><p>${p?.name||"Bien"} • ${v.date} à ${v.time}</p></div>
        ${badge(v.qualification)}
      </div>
      <p>📱 ${v.phone}</p>
      <p>📝 ${v.note||"Aucune note"}</p>
      <div class="actions">
        <a class="mini-btn green" target="_blank" href="${wa(v.phone,msg)}">Relance</a>
        ${locked?`<span class="mini-btn disabled">Terminée</span>`:`<button class="mini-btn blue" onclick="qualifyVisit('${v.id}','Chaud')">Chaud</button><button class="mini-btn" onclick="qualifyVisit('${v.id}','Froid')">Froid</button><button class="mini-btn red" onclick="qualifyVisit('${v.id}','Pas intéressé')">Pas intéressé</button>`}
        <button class="mini-btn red" onclick="del('visits','${v.id}')">Supprimer</button>
      </div>
    </article>`;
  }).join("") : '<div class="card empty-state"><p>Aucune visite.</p><small>Ajoute une visite avec le bouton +.</small></div>';
}

function receiptHtmlV551(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const ownerId = pmt.ownerId || ownerIdFromPropertyV551(pr) || pmt.agentId;
  const agency = signatureV551(ownerId);
  const receiptNo = (pmt.id || "").slice(-8).toUpperCase() || Date.now();

  return `
    <div class="receipt-head">
      <div>
        <h1>QUITTANCE DE PAIEMENT</h1>
        <p>${agency}</p>
      </div>
      <strong>N° ${receiptNo}</strong>
    </div>
    <div class="receipt-section">
      <p><span>Locataire / client</span><strong>${tenant?.name || "Non renseigné"}</strong></p>
      <p><span>Bien</span><strong>${pr?.name || "Non renseigné"}</strong></p>
      <p><span>Adresse</span><strong>${pr?.area || "Non renseignée"}</strong></p>
      <p><span>Période</span><strong>${monthLabel(pmt.month)}</strong></p>
      <p><span>Type</span><strong>${pmt.type || "Paiement"}</strong></p>
    </div>
    <div class="receipt-section receipt-money">
      <p><span>Montant payé</span><strong>${money(pmt.amount)}</strong></p>
      <p><span>Moyen de paiement</span><strong>${pmt.paymentMethod || "Non renseigné"}</strong></p>
      <p><span>Montant attendu</span><strong>${money(pmt.expected)}</strong></p>
      <p><span>Reste à payer</span><strong>${money(pmt.remaining)}</strong></p>
    </div>
    <div class="receipt-footer">
      <p>Date : ${new Date().toLocaleDateString("fr-FR")}</p>
      <p>Signature / cachet</p>
      <div class="stamp">${agency}</div>
    </div>`;
}

function openReceiptV551(paymentId){
  const pmt = (state.payments || []).find(p=>p.id===paymentId) || (state.payments || [])[0];
  if(!pmt){ alert("Aucun paiement trouvé."); return; }
  $("#receiptContent").innerHTML = receiptHtmlV551(pmt);
  $("#receiptModal").classList.add("open");
}

function renderPayments(){
  const list=scoped(state.payments || []);
  const box=$("#paymentsList");
  if(!box) return;
  box.innerHTML=list.length?list.map(p=>{
    const pr=prop(p.propertyId);
    const links=paymentShareLinks(p);
    return `<article class="card compact-payment-card">
      <div class="compact-payment-top">
        <div><h3>${pr?.name||"Bien"}</h3><small>${monthLabel(p.month)} • ${p.type || "Paiement"}</small></div>
        <strong>${money(p.amount)}</strong>
      </div>
      <div class="compact-payment-meta">
        <span>💳 ${p.paymentMethod||"Non renseigné"}</span>
        ${Number(p.remaining)>0?`<span class="reste-inline">Reste : ${money(p.remaining)}</span>`:`<span class="paid-inline">Payé</span>`}
      </div>
      <div class="actions">
        <a class="mini-btn green" target="_blank" href="${links.tenant}">Locataire</a>
        <a class="mini-btn blue" target="_blank" href="${links.owner}">Proprio</a>
        <button class="mini-btn blue" onclick="openReceiptV551('${p.id}')">Quittance</button>
        ${Number(p.remaining)>0?`<a class="mini-btn red" target="_blank" href="${relanceLink(p.id)}">Relance</a>`:""}
      </div>
    </article>`;
  }).join(""):'<div class="card empty-state"><p>Aucun paiement.</p><small>Les encaissements apparaîtront ici.</small></div>';
}

setTimeout(()=>{
  const printBtn = $("#printReceiptBtn");
  if(printBtn && !printBtn.dataset.v551){
    printBtn.dataset.v551="1";
    printBtn.onclick = ()=>window.print();
  }
  const closeBtn = $("#closeReceiptBtn");
  if(closeBtn && !closeBtn.dataset.v551){
    closeBtn.dataset.v551="1";
    closeBtn.onclick = ()=>$("#receiptModal").classList.remove("open");
  }
},120);

const oldRenderV551 = typeof render === "function" ? render : null;
if(oldRenderV551 && !window.__v551Patch){
  window.__v551Patch = true;
  render = function(){
    oldRenderV551();
    renderDueAlertsV551();
    if(typeof updatePaymentDashboardV55 === "function") updatePaymentDashboardV55();
  };
}
setTimeout(()=>{renderDueAlertsV551();},150);

/* ===== V5.5.5 — Correctifs paiement/quittance/visites ===== */
function v555_isAdmin(){try{return typeof isAdmin==="function"&&isAdmin()}catch(e){return false}}
function v555_ownerUser(ownerId){const id=ownerId||state.currentUser||state.workspace||"main";return (state.users||[]).find(u=>u.id===id)||(state.agents||[]).find(a=>a.id===id)||{}}
function v555_ownerIdFromPayment(pmt){const pr=prop(pmt.propertyId);return pmt.ownerId||pr?.ownerId||pr?.agentId||state.currentUser||state.workspace||"main"}
function v555_agencyName(ownerId){const u=v555_ownerUser(ownerId);return u.name||u.signature||"ImmoHub Sénégal"}
function v555_isRelicatPayment(pmt){return Number(pmt.lastPaymentAmount||0)>0||Number(pmt.deltaAmount||0)>0}
function v555_paidNow(pmt){if(Number(pmt.lastPaymentAmount||0)>0)return Number(pmt.lastPaymentAmount);if(Number(pmt.deltaAmount||0)>0)return Number(pmt.deltaAmount);return Number(pmt.amount||0)}
function v555_transactionTypeLabel(pmt){const t=pmt.type||"Paiement";if(v555_isRelicatPayment(pmt)&&t==="Loyer mensuel")return `Paiement du reliquat du loyer de ${monthLabel(pmt.month)}`;if(t==="Loyer mensuel")return `Paiement du loyer de ${monthLabel(pmt.month)}`;return t}
function v555_receiptPrefix(method){return String(method||"").toLowerCase().includes("esp")?"ESP":"MOB"}
function v555_receiptNo(pmt){if(pmt.receiptNo||pmt.quittanceNo||pmt.receiptNumber)return pmt.receiptNo||pmt.quittanceNo||pmt.receiptNumber;const ownerId=v555_ownerIdFromPayment(pmt);const prefix=v555_receiptPrefix(pmt.paymentMethod);const ym=String(pmt.month||new Date().toISOString().slice(0,7)).replace("-","");const key=`immohub_receipt_seq_v555_${ownerId}_${prefix}`;const next=Number(localStorage.getItem(key)||"0")+1;localStorage.setItem(key,String(next));const no=`${prefix}-${ym}-${String(next).padStart(4,"0")}`;pmt.receiptNo=no;pmt.quittanceNo=no;save();return no}

if(typeof payForProperty==="function"&&!window.__v555AdminPayPatch){window.__v555AdminPayPatch=true;const oldPayForProperty=payForProperty;payForProperty=function(id){if(v555_isAdmin()){alert("L’admin a une vue globale mais ne peut pas encaisser les biens des agences. L’encaissement doit être fait depuis l’espace du courtier concerné.");return}return oldPayForProperty(id)}}
setTimeout(()=>{const form=$("#paymentForm");if(form&&!form.dataset.v555admin){const old=form.onsubmit;form.dataset.v555admin="1";form.onsubmit=e=>{if(v555_isAdmin()){e.preventDefault();alert("L’admin ne peut pas enregistrer d’encaissement. Connecte-toi avec le compte du courtier concerné.");return}if(old)old(e)}}},120);

function paymentMethodsText(ownerId){const u=v555_ownerUser(ownerId);const lines=[];if(u.wave)lines.push(`- Wave : ${u.wave}`);if(u.orangeMoney)lines.push(`- Orange Money : ${u.orangeMoney}`);if(u.freeMoney)lines.push(`- Free Money : ${u.freeMoney}`);return lines.join("\n")}
function v555_forcePaymentMethods(ownerId){const u=v555_ownerUser(ownerId);if(u.wave&&u.orangeMoney)return true;const wave=prompt("Numéro Wave obligatoire pour les relances :",u.wave||"");if(wave===null||!wave.trim()){alert("Le numéro Wave est obligatoire pour envoyer une relance.");return false}const orange=prompt("Numéro Orange Money obligatoire pour les relances :",u.orangeMoney||"");if(orange===null||!orange.trim()){alert("Le numéro Orange Money est obligatoire pour envoyer une relance.");return false}u.wave=wave.trim();u.orangeMoney=orange.trim();if(!u.signature)u.signature=u.name||"ImmoHub Sénégal";save();return true}

function paymentShareLinks(pmt){const pr=prop(pmt.propertyId);const tenant=client(pmt.clientId);const owner=client(pr?.ownerClientId||pr?.ownerId);const ownerId=v555_ownerIdFromPayment(pmt);const paidNow=v555_paidNow(pmt);const typeLabel=v555_transactionTypeLabel(pmt);const net=paidNow-Number(pmt.agencyCommission||0)-Number(pmt.managementCommission||0);const agency=v555_agencyName(ownerId);const tenantMsg=`Bonjour ${tenant?.name||""},

Nous confirmons la bonne réception de votre paiement.

- Bien : ${pr?.name||"le bien"}
- Adresse : ${pr?.area||"Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${typeLabel}
- Montant payé : ${money(paidNow)}
- Moyen de paiement : ${pmt.paymentMethod||"Non renseigné"}
- Reste à payer : ${money(pmt.remaining)}

Merci pour votre règlement.

${agency}`;const ownerMsg=`Bonjour ${owner?.name||""},

Nous vous informons que le paiement suivant a été encaissé et reversé :

- Bien : ${pr?.name||"votre bien"}
- Adresse : ${pr?.area||"Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${typeLabel}

- Montant encaissé : ${money(paidNow)}
- Commission de gestion : ${money(pmt.managementCommission||0)}
- Montant reversé : ${money(Math.max(0,net))}
- Moyen de versement : ${pmt.paymentMethod||"Non renseigné"}

Merci pour votre confiance.

${agency}`;return{tenant:wa(tenant?.phone,tenantMsg),owner:wa(owner?.phone,ownerMsg)}}

function relanceLink(id){const pmt=state.payments.find(x=>x.id===id);const pr=prop(pmt.propertyId);const c=client(pmt.clientId);const ownerId=v555_ownerIdFromPayment(pmt);if(!v555_forcePaymentMethods(ownerId))return"#";const msg=`Bonjour ${c?.name||""},

Sauf erreur de notre part, le règlement suivant n'a pas encore été reçu :

- Bien : ${pr?.name||"le bien"}
- Adresse : ${pr?.area||"Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${v555_transactionTypeLabel(pmt)}
- Montant restant : ${money(pmt.remaining)}

Vous pouvez effectuer le paiement via :

${paymentMethodsText(ownerId)}

Merci de nous transmettre la preuve de paiement après règlement.

${v555_agencyName(ownerId)}`;return wa(c?.phone,msg)}

if(typeof mergePartialRentBeforeSubmitV545==="function"&&!window.__v555MergePatch){window.__v555MergePatch=true;const oldMerge=mergePartialRentBeforeSubmitV545;mergePartialRentBeforeSubmitV545=function(e){const amount=Number($("#paymentAmount")?.value||0);const propertyId=$("#paymentProperty")?.value;const ym=$("#paymentMonth")?.value;const existing=(state.payments||[]).find(p=>p.propertyId===propertyId&&p.month===ym&&p.type==="Loyer mensuel");if(existing&&Number(existing.remaining||0)>0){existing.lastPaymentAmount=amount;existing.deltaAmount=amount}return oldMerge(e)}}

function renderVisits(){const today=new Date().toISOString().slice(0,10);const list=scoped(state.visits||[]).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));const box=$("#visitsList");if(!box)return;box.innerHTML=list.length?list.map(v=>{const p=prop(v.propertyId);const locked=v.qualification&&v.qualification!=="À qualifier";const msg=`Bonjour ${v.name},

Petit rappel concernant votre visite.

- Bien : ${p?.name||"le bien"}
- Adresse : ${p?.area||"Non renseignée"}
- Date : ${v.date}
- Heure : ${v.time}

Merci de confirmer votre présence.

${v555_agencyName(v.ownerId||p?.ownerId||p?.agentId)}`;return `<article class="card" style="${v.date<today?'opacity:.55':''}">
      <div class="card-top"><div><h3>Visite - ${v.name}</h3><p>${p?.name||"Bien"} • ${v.date} à ${v.time}</p></div>${badge(v.qualification)}</div>
      <p>Téléphone : ${v.phone}</p><p>Note : ${v.note||"Aucune note"}</p>
      <div class="actions"><a class="mini-btn green" target="_blank" href="${wa(v.phone,msg)}">Relance</a>
        ${locked?`<span class="mini-btn disabled">Terminée</span>`:`<button class="mini-btn blue" onclick="qualifyVisit('${v.id}','Chaud')">Chaud</button><button class="mini-btn" onclick="qualifyVisit('${v.id}','Froid')">Froid</button><button class="mini-btn red" onclick="qualifyVisit('${v.id}','Pas intéressé')">Pas intéressé</button>`}
        <button class="mini-btn red" onclick="del('visits','${v.id}')">Supprimer</button></div></article>`}).join(""):'<div class="card empty-state"><p>Aucune visite.</p><small>Ajoute une visite avec le bouton +.</small></div>'}

function receiptHtmlV551(pmt){const pr=prop(pmt.propertyId);const tenant=client(pmt.clientId);const ownerId=v555_ownerIdFromPayment(pmt);const agency=v555_agencyName(ownerId);const receiptNo=v555_receiptNo(pmt);const paidNow=v555_paidNow(pmt);const typeLabel=v555_transactionTypeLabel(pmt);return `
    <section class="receipt-v555">
      <header class="receipt-v555-header"><div><strong class="receipt-v555-brand">IMMOHUB SÉNÉGAL</strong><h1>Quittance de paiement</h1><p>${agency}</p></div><div class="receipt-v555-number"><span>N° quittance</span><strong>${receiptNo}</strong></div></header>
      <div class="receipt-v555-grid">
        <div class="receipt-v555-card"><span>Locataire / client</span><strong>${tenant?.name||"Non renseigné"}</strong></div>
        <div class="receipt-v555-card"><span>Bien</span><strong>${pr?.name||"Non renseigné"}</strong></div>
        <div class="receipt-v555-card"><span>Adresse</span><strong>${pr?.area||"Non renseignée"}</strong></div>
        <div class="receipt-v555-card"><span>Période</span><strong>${monthLabel(pmt.month)}</strong></div>
        <div class="receipt-v555-card wide"><span>Type de transaction</span><strong>${typeLabel}</strong></div>
        <div class="receipt-v555-card"><span>Moyen de paiement</span><strong>${pmt.paymentMethod||"Non renseigné"}</strong></div>
      </div>
      <div class="receipt-v555-money"><div><span>Montant reçu</span><strong>${money(paidNow)}</strong></div><div><span>Montant attendu</span><strong>${money(pmt.expected)}</strong></div><div><span>Reste à payer</span><strong>${money(pmt.remaining)}</strong></div></div>
      <footer class="receipt-v555-footer"><div><span>Date d’émission</span><strong>${new Date().toLocaleDateString("fr-FR")}</strong></div><div class="receipt-v555-signature"><span>Signature agence</span><strong>${agency}</strong></div></footer>
    </section>`}

function downloadReceiptPdfV552(){const content=$("#receiptContent");if(!content||!content.innerHTML.trim()){alert("Aucune quittance à télécharger.");return}const htmlDoc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Quittance ImmoHub</title><style>${v555ReceiptCss()}</style></head><body>${content.innerHTML}</body></html>`;const blob=new Blob([htmlDoc],{type:"text/html;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="quittance-immohub.html";a.click();URL.revokeObjectURL(a.href)}
function v555ReceiptCss(){return `.receipt-v555{max-width:794px;margin:0 auto;padding:36px;border:1px solid #dfe7ef;font-family:Arial,sans-serif}.receipt-v555-header{display:flex;justify-content:space-between;border-bottom:3px solid #0b3a67;padding-bottom:18px;margin-bottom:24px}.receipt-v555-brand{color:#0b3a67;font-size:14px}.receipt-v555-header h1{margin:8px 0 4px;text-transform:uppercase;font-size:26px}.receipt-v555-header p{margin:0;color:#596775;font-weight:700}.receipt-v555-number{border:1px solid #dbeaf8;border-radius:12px;padding:12px;background:#f7fbff;text-align:right}.receipt-v555-number span,.receipt-v555-card span,.receipt-v555-money span,.receipt-v555-footer span{display:block;color:#6b7785;font-size:11px;font-weight:bold;margin-bottom:5px}.receipt-v555-number strong{color:#0b3a67}.receipt-v555-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}.receipt-v555-card,.receipt-v555-money div,.receipt-v555-footer>div{border:1px solid #e4ebf3;border-radius:12px;padding:12px;background:#fbfdff}.receipt-v555-card.wide{grid-column:1/-1}.receipt-v555-money{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:22px 0}.receipt-v555-money div:first-child{background:#eef7ff;border-color:#cfe4f8}.receipt-v555-money div:first-child strong{color:#0b3a67;font-size:18px}.receipt-v555-footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:60px}.receipt-v555-signature strong{display:block;margin-top:18px;border-top:2px solid #0b3a67;padding-top:10px;text-align:center;color:#0b3a67}@media print{@page{size:A4;margin:12mm}body{padding:0}.receipt-v555{border:0;padding:0}}`}
setTimeout(()=>{const dl=$("#downloadReceiptBtn");if(dl&&!dl.dataset.v555){dl.dataset.v555="1";dl.onclick=downloadReceiptPdfV552}},120);


/* ===== V5.5.6 — Profil courtier + moyens de paiement sans prompt ===== */

function v556_currentProfile(){
  const id = state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || null;
}

function v556_userByOwner(ownerId){
  const id = ownerId || state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}

function v556_profileOwnerIdFromPayment(pmt){
  const pr = prop(pmt.propertyId);
  return pmt.ownerId || pr?.ownerId || pr?.agentId || state.currentUser || state.workspace || "main";
}

function v556_hasRequiredPaymentInfo(ownerId){
  const u = v556_userByOwner(ownerId);
  return !!(u.wave && u.orangeMoney);
}

function v556_showProfileWarning(message){
  alert(message || "Complète d’abord ton profil : Wave et Orange Money sont obligatoires pour envoyer une relance.");
  if(typeof nav === "function") nav("profile");
  setTimeout(()=>$("#profileWave")?.focus(),100);
}

function paymentMethodsText(ownerId){
  const u = v556_userByOwner(ownerId);
  const lines = [];
  if(u.wave) lines.push(`- Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`- Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`- Free Money : ${u.freeMoney}`);
  return lines.join("\n");
}

function v556_agencyName(ownerId){
  const u = v556_userByOwner(ownerId);
  return u.name || u.signature || "ImmoHub Sénégal";
}

/* Remplace l'ancien prompt : maintenant on bloque et on renvoie au profil */
function v555_forcePaymentMethods(ownerId){
  if(v556_hasRequiredPaymentInfo(ownerId)) return true;
  v556_showProfileWarning("Complète d’abord ton profil de paiement : Wave et Orange Money sont obligatoires pour envoyer une relance.");
  return false;
}

function forcePaymentMethodsV553(ownerId){
  return v555_forcePaymentMethods(ownerId);
}

function relanceLink(id){
  const pmt = state.payments.find(x=>x.id===id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);
  const ownerId = v556_profileOwnerIdFromPayment(pmt);

  if(!v556_hasRequiredPaymentInfo(ownerId)){
    v556_showProfileWarning("Complète d’abord ton profil de paiement : Wave et Orange Money sont obligatoires pour envoyer une relance.");
    return "#";
  }

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, le règlement suivant n'a pas encore été reçu :

- Bien : ${pr?.name || "le bien"}
- Adresse : ${pr?.area || "Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${typeof v555_transactionTypeLabel === "function" ? v555_transactionTypeLabel(pmt) : (pmt.type || "Paiement")}
- Montant restant : ${money(pmt.remaining)}

Vous pouvez effectuer le paiement via :

${paymentMethodsText(ownerId)}

Merci de nous transmettre la preuve de paiement après règlement.

${v556_agencyName(ownerId)}`;

  return wa(c?.phone, msg);
}

/* Profil courtier */
function loadProfileV556(){
  const u = v556_currentProfile();
  if(!u) return;

  if($("#profileName")) $("#profileName").value = u.name || "";
  if($("#profilePhone")) $("#profilePhone").value = u.phone || "";
  if($("#profileWave")) $("#profileWave").value = u.wave || "";
  if($("#profileOrange")) $("#profileOrange").value = u.orangeMoney || "";
  if($("#profileFreeMoney")) $("#profileFreeMoney").value = u.freeMoney || "";
  if($("#profileSignature")) $("#profileSignature").value = u.signature || u.name || "";
}

function saveProfileV556(e){
  e.preventDefault();
  const u = v556_currentProfile();
  if(!u){
    alert("Profil introuvable.");
    return;
  }

  u.name = $("#profileName").value.trim();
  u.phone = $("#profilePhone").value.trim();
  u.wave = $("#profileWave").value.trim();
  u.orangeMoney = $("#profileOrange").value.trim();
  u.freeMoney = $("#profileFreeMoney").value.trim();
  u.signature = $("#profileSignature").value.trim() || u.name;

  save();
  render();

  const msg = $("#profileMessage");
  if(msg){
    msg.textContent = "Profil enregistré.";
    msg.classList.remove("hidden");
    setTimeout(()=>msg.classList.add("hidden"),1800);
  }
}

const oldNavV556 = typeof nav === "function" ? nav : null;
if(oldNavV556 && !window.__v556NavPatch){
  window.__v556NavPatch = true;
  nav = function(v){
    oldNavV556(v);
    if(v === "profile") loadProfileV556();
  };
}

const oldRenderV556 = typeof render === "function" ? render : null;
if(oldRenderV556 && !window.__v556RenderPatch){
  window.__v556RenderPatch = true;
  render = function(){
    oldRenderV556();
    loadProfileV556();
  };
}

setTimeout(()=>{
  const form = $("#profileForm");
  if(form && !form.dataset.v556){
    form.dataset.v556 = "1";
    form.onsubmit = saveProfileV556;
  }
  loadProfileV556();
},120);


/* ===== V5.6 — VERSION CONSOLIDÉE PROFIL + QUITTANCE PRO ===== */

/* Admin : ne peut pas encaisser */
function v56_isAdmin(){
  try{return typeof isAdmin==="function" && isAdmin()}catch(e){return false}
}
if(typeof payForProperty === "function" && !window.__v56AdminPayBlocked){
  window.__v56AdminPayBlocked = true;
  const oldPayForPropertyV56 = payForProperty;
  payForProperty = function(id){
    if(v56_isAdmin()){
      alert("L’admin a une vue globale mais ne peut pas encaisser. Connecte-toi avec le compte du courtier concerné.");
      return;
    }
    return oldPayForPropertyV56(id);
  };
}
setTimeout(()=>{
  const form = $("#paymentForm");
  if(form && !form.dataset.v56admin){
    const old = form.onsubmit;
    form.dataset.v56admin = "1";
    form.onsubmit = (e)=>{
      if(v56_isAdmin()){
        e.preventDefault();
        alert("L’admin ne peut pas enregistrer d’encaissement. Connecte-toi avec le compte du courtier concerné.");
        return;
      }
      if(old) old(e);
    };
  }
},120);

/* Utilitaires profil / agence */
function v56_ownerUser(ownerId){
  const id = ownerId || state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || {};
}
function v56_ownerIdFromPayment(pmt){
  const pr = prop(pmt.propertyId);
  return pmt.ownerId || pr?.ownerId || pr?.agentId || state.currentUser || state.workspace || "main";
}
function v56_agencyName(ownerId){
  const u = v56_ownerUser(ownerId);
  return u.name || u.signature || "ImmoHub Sénégal";
}

/* Profil courtier consolidé */
function v56_currentProfile(){
  const id = state.currentUser || state.workspace || "main";
  return (state.users||[]).find(u=>u.id===id) || (state.agents||[]).find(a=>a.id===id) || null;
}
function loadProfileV556(){
  const u = v56_currentProfile();
  if(!u) return;
  if($("#profileName")) $("#profileName").value = u.name || "";
  if($("#profilePhone")) $("#profilePhone").value = u.phone || "";
  if($("#profileWave")) $("#profileWave").value = u.wave || "";
  if($("#profileOrange")) $("#profileOrange").value = u.orangeMoney || "";
  if($("#profileFreeMoney")) $("#profileFreeMoney").value = u.freeMoney || "";
  if($("#profileSignature")) $("#profileSignature").value = u.signature || u.name || "";
}
function saveProfileV556(e){
  e.preventDefault();
  const u = v56_currentProfile();
  if(!u){ alert("Profil introuvable."); return; }
  u.name = $("#profileName").value.trim();
  u.phone = $("#profilePhone").value.trim();
  u.wave = $("#profileWave").value.trim();
  u.orangeMoney = $("#profileOrange").value.trim();
  u.freeMoney = $("#profileFreeMoney").value.trim();
  u.signature = $("#profileSignature").value.trim() || u.name;
  save();
  render();
  const msg = $("#profileMessage");
  if(msg){
    msg.textContent = "Profil enregistré.";
    msg.classList.remove("hidden");
    setTimeout(()=>msg.classList.add("hidden"),1800);
  }
}
setTimeout(()=>{
  const form = $("#profileForm");
  if(form && !form.dataset.v56){
    form.dataset.v56 = "1";
    form.onsubmit = saveProfileV556;
  }
  loadProfileV556();
},150);

/* Wave / Orange obligatoires via Profil, pas de prompt */
function paymentMethodsText(ownerId){
  const u = v56_ownerUser(ownerId);
  const lines = [];
  if(u.wave) lines.push(`- Wave : ${u.wave}`);
  if(u.orangeMoney) lines.push(`- Orange Money : ${u.orangeMoney}`);
  if(u.freeMoney) lines.push(`- Free Money : ${u.freeMoney}`);
  return lines.join("\n");
}
function v56_hasPaymentMethods(ownerId){
  const u = v56_ownerUser(ownerId);
  return !!(u.wave && u.orangeMoney);
}
function v56_requirePaymentProfile(ownerId){
  if(v56_hasPaymentMethods(ownerId)) return true;
  alert("Complète d’abord ton profil : Wave et Orange Money sont obligatoires pour les relances.");
  if(typeof nav === "function") nav("profile");
  return false;
}
function v555_forcePaymentMethods(ownerId){return v56_requirePaymentProfile(ownerId)}
function forcePaymentMethodsV553(ownerId){return v56_requirePaymentProfile(ownerId)}

/* Reliquat : montant réellement payé */
function v56_paidNow(pmt){
  if(Number(pmt.lastPaymentAmount || 0) > 0) return Number(pmt.lastPaymentAmount);
  if(Number(pmt.deltaAmount || 0) > 0) return Number(pmt.deltaAmount);
  return Number(pmt.amount || 0);
}
function v56_isReliquat(pmt){
  return Number(pmt.lastPaymentAmount || 0) > 0 || Number(pmt.deltaAmount || 0) > 0;
}
function v56_typeLabel(pmt){
  const t = pmt.type || "Paiement";
  if(v56_isReliquat(pmt) && t === "Loyer mensuel") return `Paiement du reliquat du loyer de ${monthLabel(pmt.month)}`;
  if(t === "Loyer mensuel") return `Paiement du loyer de ${monthLabel(pmt.month)}`;
  return t;
}
if(typeof mergePartialRentBeforeSubmitV545 === "function" && !window.__v56MergeReliquat){
  window.__v56MergeReliquat = true;
  const oldMerge = mergePartialRentBeforeSubmitV545;
  mergePartialRentBeforeSubmitV545 = function(e){
    const amount = Number($("#paymentAmount")?.value || 0);
    const propertyId = $("#paymentProperty")?.value;
    const ym = $("#paymentMonth")?.value;
    const existing = (state.payments||[]).find(p=>p.propertyId===propertyId && p.month===ym && p.type==="Loyer mensuel");
    if(existing && Number(existing.remaining||0)>0){
      existing.lastPaymentAmount = amount;
      existing.deltaAmount = amount;
    }
    return oldMerge(e);
  };
}

/* Messages WhatsApp sans emojis cassés */
function paymentShareLinks(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const owner = client(pr?.ownerClientId || pr?.ownerId);
  const ownerId = v56_ownerIdFromPayment(pmt);
  const agency = v56_agencyName(ownerId);
  const paidNow = v56_paidNow(pmt);
  const net = paidNow - Number(pmt.agencyCommission || 0) - Number(pmt.managementCommission || 0);
  const typeLabel = v56_typeLabel(pmt);

  const tenantMsg = `Bonjour ${tenant?.name || ""},

Nous confirmons la bonne réception de votre paiement.

- Bien : ${pr?.name || "le bien"}
- Adresse : ${pr?.area || "Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${typeLabel}
- Montant payé : ${money(paidNow)}
- Moyen de paiement : ${pmt.paymentMethod || "Non renseigné"}
- Reste à payer : ${money(pmt.remaining)}

Merci pour votre règlement.

${agency}`;

  const ownerMsg = `Bonjour ${owner?.name || ""},

Nous vous informons que le paiement suivant a été encaissé et reversé :

- Bien : ${pr?.name || "votre bien"}
- Adresse : ${pr?.area || "Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${typeLabel}

- Montant encaissé : ${money(paidNow)}
- Commission de gestion : ${money(pmt.managementCommission || 0)}
- Montant reversé : ${money(Math.max(0, net))}
- Moyen de versement : ${pmt.paymentMethod || "Non renseigné"}

Merci pour votre confiance.

${agency}`;

  return {tenant:wa(tenant?.phone, tenantMsg), owner:wa(owner?.phone, ownerMsg)};
}
function relanceLink(id){
  const pmt = state.payments.find(x=>x.id===id);
  const pr = prop(pmt.propertyId);
  const c = client(pmt.clientId);
  const ownerId = v56_ownerIdFromPayment(pmt);
  if(!v56_requirePaymentProfile(ownerId)) return "#";

  const msg = `Bonjour ${c?.name || ""},

Sauf erreur de notre part, le règlement suivant n'a pas encore été reçu :

- Bien : ${pr?.name || "le bien"}
- Adresse : ${pr?.area || "Non renseignée"}
- Période : ${monthLabel(pmt.month)}
- Type : ${v56_typeLabel(pmt)}
- Montant restant : ${money(pmt.remaining)}

Vous pouvez effectuer le paiement via :

${paymentMethodsText(ownerId)}

Merci de nous transmettre la preuve de paiement après règlement.

${v56_agencyName(ownerId)}`;

  return wa(c?.phone, msg);
}

/* Numérotation quittance ESP/MOB par agence, compteur continu */
function v56_receiptPrefix(method){
  return String(method||"").toLowerCase().includes("esp") ? "ESP" : "MOB";
}
function v56_receiptNo(pmt){
  if(pmt.receiptNo || pmt.quittanceNo || pmt.receiptNumber) return pmt.receiptNo || pmt.quittanceNo || pmt.receiptNumber;
  const ownerId = v56_ownerIdFromPayment(pmt);
  const prefix = v56_receiptPrefix(pmt.paymentMethod);
  const ym = String(pmt.month || new Date().toISOString().slice(0,7)).replace("-","");
  const key = `immohub_receipt_seq_v56_${ownerId}_${prefix}`;
  const next = Number(localStorage.getItem(key)||"0") + 1;
  localStorage.setItem(key, String(next));
  const no = `${prefix}-${ym}-${String(next).padStart(4,"0")}`;
  pmt.receiptNo = no;
  pmt.quittanceNo = no;
  save();
  return no;
}

/* Quittance pro deux colonnes + imprimable propre */
function receiptHtmlV551(pmt){
  const pr = prop(pmt.propertyId);
  const tenant = client(pmt.clientId);
  const ownerId = v56_ownerIdFromPayment(pmt);
  const agency = v56_agencyName(ownerId);
  const receiptNo = v56_receiptNo(pmt);
  const paidNow = v56_paidNow(pmt);
  const typeLabel = v56_typeLabel(pmt);

  return `
    <section class="receipt-v56">
      <header class="receipt-v56-header">
        <div>
          <div class="receipt-v56-brand">IMMOHUB SÉNÉGAL</div>
          <h1>Quittance de paiement</h1>
          <p>${agency}</p>
        </div>
        <div class="receipt-v56-number">
          <span>N° quittance</span>
          <strong>${receiptNo}</strong>
        </div>
      </header>

      <div class="receipt-v56-grid">
        <div><span>Locataire / client</span><strong>${tenant?.name || "Non renseigné"}</strong></div>
        <div><span>Bien</span><strong>${pr?.name || "Non renseigné"}</strong></div>
        <div><span>Adresse</span><strong>${pr?.area || "Non renseignée"}</strong></div>
        <div><span>Période</span><strong>${monthLabel(pmt.month)}</strong></div>
        <div class="wide"><span>Type de transaction</span><strong>${typeLabel}</strong></div>
        <div><span>Moyen de paiement</span><strong>${pmt.paymentMethod || "Non renseigné"}</strong></div>
      </div>

      <div class="receipt-v56-money">
        <div><span>Montant reçu</span><strong>${money(paidNow)}</strong></div>
        <div><span>Montant attendu</span><strong>${money(pmt.expected)}</strong></div>
        <div><span>Reste à payer</span><strong>${money(pmt.remaining)}</strong></div>
      </div>

      <footer class="receipt-v56-footer">
        <div><span>Date d’émission</span><strong>${new Date().toLocaleDateString("fr-FR")}</strong></div>
        <div class="receipt-v56-signature"><span>Signature agence</span><strong>${agency}</strong></div>
      </footer>
    </section>`;
}
function openReceiptV551(paymentId){
  const pmt = (state.payments||[]).find(p=>p.id===paymentId) || (state.payments||[])[0];
  if(!pmt){alert("Aucun paiement trouvé.");return}
  v56_receiptNo(pmt);
  $("#receiptContent").innerHTML = receiptHtmlV551(pmt);
  $("#receiptModal").classList.add("open");
}
function v56_receiptPrintCss(){
  return `.receipt-v56{max-width:794px;margin:0 auto;padding:34px;border:1px solid #dfe7ef;font-family:Arial,sans-serif;color:#111}.receipt-v56-header{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #0b3a67;padding-bottom:16px;margin-bottom:22px}.receipt-v56-brand{color:#0b3a67;font-weight:900;font-size:14px;letter-spacing:.05em}.receipt-v56-header h1{margin:8px 0 4px;text-transform:uppercase;font-size:26px}.receipt-v56-header p{margin:0;color:#596775;font-weight:700}.receipt-v56-number{border:1px solid #dbeaf8;border-radius:12px;padding:12px;background:#f7fbff;text-align:right;min-width:190px}.receipt-v56-number span,.receipt-v56-grid span,.receipt-v56-money span,.receipt-v56-footer span{display:block;color:#6b7785;font-size:11px;font-weight:bold;margin-bottom:5px}.receipt-v56-number strong{color:#0b3a67}.receipt-v56-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}.receipt-v56-grid>div,.receipt-v56-money>div,.receipt-v56-footer>div{border:1px solid #e4ebf3;border-radius:12px;padding:12px;background:#fbfdff}.receipt-v56-grid .wide{grid-column:1/-1}.receipt-v56-money{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:22px 0}.receipt-v56-money>div:first-child{background:#eef7ff;border-color:#cfe4f8}.receipt-v56-money>div:first-child strong{font-size:18px;color:#0b3a67}.receipt-v56-footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:54px}.receipt-v56-signature strong{display:block;margin-top:18px;border-top:2px solid #0b3a67;padding-top:10px;text-align:center;color:#0b3a67}@media print{@page{size:A4;margin:12mm}body{padding:0}.receipt-v56{border:0;padding:0}}`;
}
function downloadReceiptPdfV552(){
  const content = $("#receiptContent");
  if(!content || !content.innerHTML.trim()){alert("Aucune quittance à télécharger.");return}
  const htmlDoc = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Quittance ImmoHub</title><style>${v56_receiptPrintCss()}</style></head><body>${content.innerHTML}</body></html>`;
  const blob = new Blob([htmlDoc],{type:"text/html;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "quittance-immohub.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
setTimeout(()=>{
  const dl = $("#downloadReceiptBtn");
  if(dl && !dl.dataset.v56){dl.dataset.v56="1";dl.onclick=downloadReceiptPdfV552}
  const printBtn = $("#printReceiptBtn");
  if(printBtn && !printBtn.dataset.v56){printBtn.dataset.v56="1";printBtn.onclick=()=>window.print()}
},150);

/* Visites sans icônes bugguées */
function renderVisits(){
  const today = new Date().toISOString().slice(0,10);
  const list = scoped(state.visits || []).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const box = $("#visitsList");
  if(!box) return;
  box.innerHTML = list.length ? list.map(v=>{
    const p = prop(v.propertyId);
    const locked = v.qualification && v.qualification !== "À qualifier";
    const msg = `Bonjour ${v.name},

Petit rappel concernant votre visite.

- Bien : ${p?.name || "le bien"}
- Adresse : ${p?.area || "Non renseignée"}
- Date : ${v.date}
- Heure : ${v.time}

Merci de confirmer votre présence.

${v56_agencyName(v.ownerId || p?.ownerId || p?.agentId)}`;
    return `<article class="card" style="${v.date<today?'opacity:.55':''}">
      <div class="card-top"><div><h3>Visite - ${v.name}</h3><p>${p?.name||"Bien"} • ${v.date} à ${v.time}</p></div>${badge(v.qualification)}</div>
      <p>Téléphone : ${v.phone}</p>
      <p>Note : ${v.note || "Aucune note"}</p>
      <div class="actions">
        <a class="mini-btn green" target="_blank" href="${wa(v.phone,msg)}">Relance</a>
        ${locked?`<span class="mini-btn disabled">Terminée</span>`:`<button class="mini-btn blue" onclick="qualifyVisit('${v.id}','Chaud')">Chaud</button><button class="mini-btn" onclick="qualifyVisit('${v.id}','Froid')">Froid</button><button class="mini-btn red" onclick="qualifyVisit('${v.id}','Pas intéressé')">Pas intéressé</button>`}
        <button class="mini-btn red" onclick="del('visits','${v.id}')">Supprimer</button>
      </div>
    </article>`;
  }).join("") : '<div class="card empty-state"><p>Aucune visite.</p><small>Ajoute une visite avec le bouton +.</small></div>';
}


/* ===== V5.6.1 — Fix impression quittance + bouton téléchargement unique ===== */

function v561_receiptCss(){
  return `
    @page{size:A4;margin:12mm}
    *{box-sizing:border-box}
    body{background:#fff;margin:0;padding:0;font-family:Arial,sans-serif;color:#111}
    .receipt-v56{width:100%;max-width:794px;margin:0 auto;padding:30px;border:0;color:#111}
    .receipt-v56-header{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #0b3a67;padding-bottom:16px;margin-bottom:22px}
    .receipt-v56-brand{color:#0b3a67;font-weight:900;font-size:14px;letter-spacing:.05em}
    .receipt-v56-header h1{margin:8px 0 4px;text-transform:uppercase;font-size:26px;color:#17212b}
    .receipt-v56-header p{margin:0;color:#596775;font-weight:700}
    .receipt-v56-number{border:1px solid #dbeaf8;border-radius:12px;padding:12px;background:#f7fbff;text-align:right;min-width:190px;height:max-content}
    .receipt-v56-number span,.receipt-v56-grid span,.receipt-v56-money span,.receipt-v56-footer span{display:block;color:#6b7785;font-size:11px;font-weight:bold;margin-bottom:5px}
    .receipt-v56-number strong{color:#0b3a67}
    .receipt-v56-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}
    .receipt-v56-grid>div,.receipt-v56-money>div,.receipt-v56-footer>div{border:1px solid #e4ebf3;border-radius:12px;padding:12px;background:#fbfdff}
    .receipt-v56-grid .wide{grid-column:1/-1}
    .receipt-v56-money{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:22px 0}
    .receipt-v56-money>div:first-child{background:#eef7ff;border-color:#cfe4f8}
    .receipt-v56-money>div:first-child strong{font-size:18px;color:#0b3a67}
    .receipt-v56-footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:54px}
    .receipt-v56-signature strong{display:block;margin-top:18px;border-top:2px solid #0b3a67;padding-top:10px;text-align:center;color:#0b3a67}
    @media(max-width:520px){
      .receipt-v56{padding:18px}
      .receipt-v56-header,.receipt-v56-grid,.receipt-v56-money,.receipt-v56-footer{display:grid;grid-template-columns:1fr}
      .receipt-v56-number{text-align:left;min-width:0}
    }
  `;
}

function v561_receiptDocumentHtml(){
  const content = $("#receiptContent");
  if(!content || !content.innerHTML.trim()) return "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quittance ImmoHub</title>
<style>${v561_receiptCss()}</style>
</head>
<body>${content.innerHTML}</body>
</html>`;
}

function printReceiptV561(){
  const doc = v561_receiptDocumentHtml();
  if(!doc){ alert("Aucune quittance à imprimer."); return; }
  const w = window.open("", "_blank");
  if(!w){ alert("Autorise les popups pour imprimer la quittance."); return; }
  w.document.open();
  w.document.write(doc);
  w.document.close();
  setTimeout(()=>{ w.focus(); w.print(); }, 400);
}

function downloadReceiptPdfV552(){
  const doc = v561_receiptDocumentHtml();
  if(!doc){ alert("Aucune quittance à télécharger."); return; }
  const blob = new Blob([doc], {type:"text/html;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "quittance-immohub.html";
  a.click();
  URL.revokeObjectURL(a.href);
}

setTimeout(()=>{
  const printBtn = $("#printReceiptBtn");
  if(printBtn){
    printBtn.dataset.v561 = "1";
    printBtn.onclick = printReceiptV561;
  }

  const dlBtn = $("#downloadReceiptBtn");
  if(dlBtn){
    dlBtn.dataset.v561 = "1";
    dlBtn.onclick = downloadReceiptPdfV552;
  }

  const closeBtn = $("#closeReceiptBtn");
  if(closeBtn && !closeBtn.dataset.v561){
    closeBtn.dataset.v561 = "1";
    closeBtn.onclick = ()=>$("#receiptModal")?.classList.remove("open");
  }
},150);
