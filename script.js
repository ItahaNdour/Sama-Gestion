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
function monthLabel(ym){return ym?new Date(ym+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):""}
function daysInMonth(ym){const [y,m]=ym.split("-").map(Number);return new Date(y,m,0).getDate()}

function ensureBase(){
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
        <button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button>
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
      <div class="actions"><a class="mini-btn green" target="_blank" href="${links.tenant}">Locataire</a><a class="mini-btn blue" target="_blank" href="${links.owner}">Proprio</a>${p.remaining>0?`<a class="mini-btn red" target="_blank" href="${relanceLink(p.id)}">Relance</a>`:""}</div>
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
  <div class="compact-transactions">${transactions.length?transactions.map(t=>`<div class="transaction-row ${t.remaining>0?'has-rest':''}"><div><strong>${monthLabel(t.month)}</strong><small>${t.type}</small></div><div class="transaction-money"><span>${money(t.amount)}</span>${t.remaining>0?`<em>Reste ${money(t.remaining)}</em>`:""}</div>${t.remaining>0?`<a class="mini-btn red" target="_blank" href="${relanceLink(t.id)}">Relance</a>`:""}</div>`).join(""):'<div class="card"><p>Aucune transaction.</p></div>'}</div>`;
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
async function photoInput(e){let files=[...e.target.files].slice(0,3); if(e.target.files.length>3)alert("Maximum 3 photos."); photos=await Promise.all(files.map(resize)); $("#photoPreview").innerHTML=photos.map(x=>`<img src="${x}">`).join("")}
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
  $("#propertyForm").onsubmit=e=>{e.preventDefault(); const id=$("#propertyId").value||uid("prop"); const ownerId=isAdmin()?$("#propertyOwnerBroker").value:state.currentUser; const p={id,ownerId,name:$("#propertyName").value,dealType:$("#propertyDealType").value,status:$("#propertyStatus").value,type:$("#propertyType").value,area:$("#propertyArea").value,price:+$("#propertyPrice").value,charges:+$("#propertyCharges").value,moveInDate:$("#propertyMoveInDate").value,managementRate:+$("#propertyManagementRate").value,ownerClientId:$("#propertyOwner").value,occupantId:$("#propertyOccupant").value,photos:photos.slice(0,3),description:$("#propertyDescription").value}; const i=state.properties.findIndex(x=>x.id===id); i>=0?state.properties[i]=p:state.properties.unshift(p); save();closeModals();render()};
  $("#paymentForm").onsubmit=e=>{e.preventDefault(); calculatePayment(); const p=prop($("#paymentProperty").value); if(!canCollectProperty(p)){alert(collectBlockMessage(p));return} const amount=+$("#paymentAmount").value, type=$("#paymentType").value, ym=$("#paymentMonth").value, expected=+$("#paymentExpected").value, remaining=+$("#paymentRemaining").value, rate=+$("#paymentManagementRate").value||p.managementRate||0; const dup=state.payments.find(x=>x.propertyId===p.id&&x.month===ym&&x.type==="Loyer mensuel"&&x.remaining===0&&x.status==="Confirmé"); if(dup&&type==="Loyer mensuel"){calculatePayment();return} const payment={id:uid("pay"),ownerId:p.ownerId,propertyId:p.id,clientId:$("#paymentClient").value,type,month:ym,expected,amount,paymentMethod:$("#paymentMethod").value,status:remaining>0?"Partiel":"Confirmé",remaining,agencyCommission:type==="Entrée location 3 mois"?Math.round(p.price||0):0,managementCommission:Math.round(amount*rate/100),date:new Date().toISOString()}; state.payments.unshift(payment); save(); render(); const links=paymentShareLinks(payment); $("#shareTenantBtn").href=links.tenant; $("#shareOwnerBtn").href=links.owner; $("#paymentShareBox").classList.remove("hidden")};
  $("#visitForm").onsubmit=e=>{e.preventDefault(); const p=prop($("#visitProperty").value); if(!p){alert("Crée d'abord un bien.");return} const dt=$("#visitDateTime").value; state.visits.unshift({id:uid("visit"),ownerId:p.ownerId,name:$("#visitProspectName").value,phone:$("#visitProspectPhone").value,propertyId:p.id,date:dt.slice(0,10),time:dt.slice(11,16),qualification:$("#visitQualification").value,note:$("#visitNote").value}); save();closeModals();render();nav("visits")};
  $("#edlForm").onsubmit=e=>{e.preventDefault(); const p=prop($("#edlProperty").value); if(!p){alert("Crée d'abord un bien.");return} state.edls.unshift({id:uid("edl"),ownerId:p.ownerId,propertyId:p.id,type:$("#edlType").value,water:$("#edlWater").value,power:$("#edlPower").value,notes:$("#edlNotes").value,date:new Date().toISOString()}); save();closeModals();render();nav("edl")};
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
