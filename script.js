const STORAGE_KEY = "immohub_senegal_v2";

const state = {
  role: "SuperAdmin",
  activeWorkspace: "global",
  agents: [],
  clients: [],
  properties: [],
  payments: [],
  visits: [],
  edls: [],
  activities: []
};

let pendingPhotos = [];

const titles = {
  dashboard: "Tableau de bord",
  properties: "Gestion des biens",
  clients: "Clients & propriétaires",
  payments: "Paiements",
  visits: "Visites",
  edl: "État des lieux",
  admin: "Administration"
};

const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

function uid(prefix="id"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{ Object.assign(state, JSON.parse(raw)); }
  catch(e){ console.error(e); }
}

function formatMoney(value){
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function normalizePhone(phone){
  const clean = String(phone || "").replace(/\D/g, "");
  if(clean.startsWith("221")) return clean;
  if(clean.length === 9) return "221" + clean;
  return clean;
}

function whatsappLink(phone, message){
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function isAgentMode(){
  return state.role === "Agent";
}

function requireAdmin(action="cette action"){
  if(isAgentMode()){
    alert(`Accès refusé : le rôle Agent ne peut pas faire ${action}.`);
    return false;
  }
  return true;
}

function ensureDefaultAgent(){
  if(!state.agents.length){
    state.agents.push({
      id: "agent_main",
      name: "Compte principal",
      phone: "",
      email: "",
      role: "SuperAdmin",
      createdAt: new Date().toISOString()
    });
  }
}

function currentAgentId(){
  if(state.activeWorkspace === "global") return null;
  return state.activeWorkspace;
}

function scoped(items){
  const agentId = currentAgentId();
  if(!agentId) return items;
  return items.filter(item => item.agentId === agentId);
}

function addActivity(text, agentId = currentAgentId() || "global"){
  state.activities.unshift({ id: uid("act"), text, agentId, date: new Date().toISOString() });
  state.activities = state.activities.slice(0, 12);
  save();
}

function getAgentName(id){
  if(!id) return "Non affecté";
  return state.agents.find(a => a.id === id)?.name || "Agent supprimé";
}

function getClient(id){
  return state.clients.find(c => c.id === id);
}

function getClientName(id){
  if(!id || id === "none") return "Non renseigné";
  return getClient(id)?.name || "Contact supprimé";
}

function getClientPhone(id){
  return getClient(id)?.phone || "";
}

function getProperty(id){
  return state.properties.find(p => p.id === id);
}

function getPropertyName(id){
  return getProperty(id)?.name || "Bien supprimé";
}

function commission(amount, rate){
  return Math.round(Number(amount || 0) * Number(rate || 0) / 100);
}

function statusBadge(status){
  const cls = ["Confirmé","Disponible"].includes(status) ? "green" :
              ["En attente","Annulé"].includes(status) ? "red" :
              ["Loué","Vendu"].includes(status) ? "dark" :
              ["Vente","En vente"].includes(status) ? "blue" : "";
  return `<span class="badge ${cls}">${status}</span>`;
}

function setView(viewId){
  qsa(".view").forEach(v => v.classList.remove("active"));
  qs(`#${viewId}`).classList.add("active");
  qsa(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === viewId));
  qs("#pageTitle").textContent = titles[viewId] || "ImmoHub";
  qs("#sidebar")?.classList.remove("open");
  renderAll();
}

function renderWorkspace(){
  const select = qs("#workspaceSelect");
  const options = [
    `<option value="global">Vue globale SuperAdmin</option>`,
    ...state.agents.map(a => `<option value="${a.id}">${a.name} — ${a.role}</option>`)
  ].join("");
  select.innerHTML = options;
  select.value = state.activeWorkspace || "global";
  qs("#activeScopeLabel").textContent = state.activeWorkspace === "global" ? "Vue globale" : getAgentName(state.activeWorkspace);
}

function renderAgentOptions(){
  const options = state.agents.map(a => `<option value="${a.id}">${a.name} — ${a.role}</option>`).join("");
  ["#propertyAgent","#clientAgent"].forEach(id => {
    const el = qs(id);
    if(el) el.innerHTML = options;
  });
}

function renderClientOptions(){
  const clients = scoped(state.clients);
  const base = `<option value="none">Non renseigné</option>`;
  const owners = clients.filter(c => ["Propriétaire","Client"].includes(c.type));
  const tenants = clients.filter(c => ["Locataire","Acheteur","Client","Prospect"].includes(c.type));
  const all = clients;

  qs("#propertyOwnerClient").innerHTML = base + owners.map(c => `<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  qs("#propertyTenantClient").innerHTML = base + tenants.map(c => `<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  ["#paymentClient","#visitClient"].forEach(id => {
    qs(id).innerHTML = base + all.map(c => `<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  });
}

function renderPropertyOptions(){
  const props = scoped(state.properties);
  const options = props.map(p => `<option value="${p.id}">${p.name} — ${p.dealType}</option>`).join("");
  ["#paymentProperty","#visitProperty","#edlProperty"].forEach(id => {
    qs(id).innerHTML = options || `<option value="">Ajoute d'abord un bien</option>`;
  });
}

function renderDashboard(){
  const payments = scoped(state.payments);
  const props = scoped(state.properties);
  const confirmed = payments.filter(p => p.status === "Confirmé");
  const revenue = confirmed.reduce((sum,p) => sum + Number(p.amount || 0), 0);
  const commissions = confirmed.reduce((sum,p) => sum + Number(p.commissionAmount || 0), 0);
  const alerts = payments.filter(p => p.status !== "Confirmé").length;

  qs("#kpiRevenue").textContent = formatMoney(revenue);
  qs("#kpiCommissions").textContent = formatMoney(commissions);
  qs("#kpiProperties").textContent = props.length;
  qs("#kpiAlerts").textContent = alerts;

  const scope = currentAgentId();
  const activities = state.activities.filter(a => !scope || a.agentId === scope || a.agentId === "global").slice(0,4);
  qs("#recentActivity").innerHTML = activities.length
    ? activities.map(a => `<div class="activity">${a.text}<br><small>${new Date(a.date).toLocaleString("fr-FR")}</small></div>`).join("")
    : `<div class="activity">Aucune activité. Commence par créer un agent, un client ou un bien.</div>`;
}

function renderProperties(){
  const status = qs("#propertyFilter").value;
  const deal = qs("#dealFilter").value;
  let list = scoped(state.properties);
  if(status !== "Tous") list = list.filter(p => p.status === status);
  if(deal !== "Tous") list = list.filter(p => p.dealType === deal);

  qs("#propertiesList").innerHTML = list.length ? list.map(p => {
    const photos = (p.photos || []).length ? `<div class="photo-strip">${p.photos.map(src => `<img src="${src}" alt="Photo bien">`).join("")}</div>` : "";
    return `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h4>${p.name}</h4>
            <p>${p.type} • ${p.area} • ${p.dealType}</p>
          </div>
          ${statusBadge(p.status)}
        </div>
        ${photos}
        <p><strong>${formatMoney(p.price)}</strong>${p.charges ? ` + ${formatMoney(p.charges)} charges` : ""}</p>
        <p>Commission : ${p.commissionRate || 0}% ≈ <strong>${formatMoney(commission(p.price, p.commissionRate))}</strong></p>
        <p>Agent : ${getAgentName(p.agentId)}</p>
        <p>Propriétaire : ${getClientName(p.ownerClientId)}</p>
        <p>Locataire / acheteur : ${getClientName(p.tenantClientId)}</p>
        <p>${p.description || ""}</p>
        <div class="card-actions">
          <button class="mini-btn" onclick="editProperty('${p.id}')">Modifier</button>
          <button class="mini-btn delete" onclick="deleteProperty('${p.id}')">Supprimer</button>
        </div>
      </article>`;
  }).join("") : `<div class="activity">Aucun bien trouvé.</div>`;
}

function renderClients(){
  const filter = qs("#clientFilter").value;
  let list = scoped(state.clients);
  if(filter !== "Tous") list = list.filter(c => c.type === filter);

  qs("#clientsList").innerHTML = list.length ? list.map(c => {
    const msg = `Bonjour ${c.name}, nous vous contactons concernant votre projet immobilier.`;
    return `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h4>${c.name}</h4>
            <p>${c.type} • ${getAgentName(c.agentId)}</p>
          </div>
          <span class="badge">${c.type}</span>
        </div>
        <p>WhatsApp : ${c.phone || "-"}</p>
        <p>Email : ${c.email || "-"}</p>
        <p>${c.notes || ""}</p>
        <div class="card-actions">
          <button class="mini-btn" onclick="editClient('${c.id}')">Modifier</button>
          <a class="mini-btn whatsapp" target="_blank" href="${whatsappLink(c.phone, msg)}">WhatsApp</a>
          <button class="mini-btn delete" onclick="deleteClient('${c.id}')">Supprimer</button>
        </div>
      </article>`;
  }).join("") : `<div class="activity">Aucun client/propriétaire trouvé.</div>`;
}

function renderPayments(){
  const list = scoped(state.payments);
  qs("#paymentsList").innerHTML = list.length ? list.map(p => {
    const client = getClient(p.clientId);
    const phone = client?.phone || "";
    const msg = `Bonjour ${getClientName(p.clientId)}, reçu de paiement : ${p.type} de ${formatMoney(p.amount)} pour ${getPropertyName(p.propertyId)}. Statut : ${p.status}. Merci.`;
    return `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h4>${p.type} — ${formatMoney(p.amount)}</h4>
            <p>${getClientName(p.clientId)} • ${getPropertyName(p.propertyId)}</p>
          </div>
          ${statusBadge(p.status)}
        </div>
        <p>Commission : ${p.commissionRate || 0}% = <strong>${formatMoney(p.commissionAmount)}</strong></p>
        <p>Date : ${new Date(p.date).toLocaleDateString("fr-FR")}</p>
        <div class="card-actions">
          <a class="mini-btn whatsapp" target="_blank" href="${whatsappLink(phone, msg)}">Reçu WhatsApp</a>
          <button class="mini-btn delete" onclick="deletePayment('${p.id}')">Supprimer</button>
        </div>
      </article>`;
  }).join("") : `<div class="activity">Aucun paiement enregistré.</div>`;
}

function renderVisits(){
  const stages = ["Planifié","Débuté","Qualifié"];
  const list = scoped(state.visits);
  qs("#visitsBoard").innerHTML = stages.map(stage => {
    const items = list.filter(v => v.status === stage);
    return `
      <div class="kanban-col">
        <h4>${stage}</h4>
        ${items.length ? items.map(v => {
          const phone = getClientPhone(v.clientId);
          const msg = `Bonjour ${getClientName(v.clientId)}, rappel de votre visite pour ${getPropertyName(v.propertyId)} prévue le ${v.date} à ${v.time}.`;
          return `
            <div class="visit-card">
              <strong>${getClientName(v.clientId)}</strong>
              <small>${getPropertyName(v.propertyId)}</small>
              <p>${v.date} à ${v.time}</p>
              <div class="card-actions">
                <a class="mini-btn whatsapp" target="_blank" href="${whatsappLink(phone, msg)}">Relancer</a>
                <button class="mini-btn" onclick="advanceVisit('${v.id}')">Avancer</button>
                <button class="mini-btn delete" onclick="deleteVisit('${v.id}')">Supprimer</button>
              </div>
            </div>`;
        }).join("") : `<p class="muted">Vide</p>`}
      </div>`;
  }).join("");
}

function renderEdl(){
  const list = scoped(state.edls);
  qs("#edlList").innerHTML = list.length ? list.map(e => `
    <article class="item-card">
      <div class="item-top">
        <div>
          <h4>PV ${e.type}</h4>
          <p>${getPropertyName(e.propertyId)}</p>
        </div>
        <span class="badge">${e.type}</span>
      </div>
      <p>Eau : ${e.water || "-"} • Électricité : ${e.power || "-"}</p>
      <p>${(e.checklist || "").replaceAll("\n","<br>")}</p>
      <div class="card-actions">
        <button class="mini-btn" onclick="printEdl('${e.id}')">Imprimer</button>
        <button class="mini-btn delete" onclick="deleteEdl('${e.id}')">Supprimer</button>
      </div>
    </article>`).join("") : `<div class="activity">Aucun PV enregistré.</div>`;
}

function renderAgents(){
  qs("#agentsList").innerHTML = state.agents.length ? state.agents.map(a => {
    const countProps = state.properties.filter(p => p.agentId === a.id).length;
    const countClients = state.clients.filter(c => c.agentId === a.id).length;
    return `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h4>${a.name}</h4>
            <p>${a.role} • ${a.email || "email non renseigné"}</p>
          </div>
          <span class="badge dark">${countProps} biens</span>
        </div>
        <p>WhatsApp : ${a.phone || "-"}</p>
        <p>Clients : ${countClients}</p>
        <div class="card-actions">
          <button class="mini-btn delete" onclick="deleteAgent('${a.id}')">Supprimer espace</button>
        </div>
      </article>`;
  }).join("") : `<div class="activity">Aucun agent créé.</div>`;
}

function renderAll(){
  ensureDefaultAgent();
  renderWorkspace();
  renderAgentOptions();
  renderClientOptions();
  renderPropertyOptions();
  renderDashboard();
  renderProperties();
  renderClients();
  renderPayments();
  renderVisits();
  renderEdl();
  renderAgents();
}

function resetForms(){
  ["propertyForm","clientForm","paymentForm","visitForm","edlForm","agentForm"].forEach(id => qs("#"+id)?.reset());
  qs("#propertyId").value = "";
  qs("#clientId").value = "";
  pendingPhotos = [];
  renderPhotoPreview([]);
  updateCommissionPreviews();
}

function renderPhotoPreview(photos){
  const box = qs("#photoPreview");
  box.innerHTML = (photos || []).map(src => `<img src="${src}" alt="Preview">`).join("");
}

function resizeImage(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 900;
        let {width, height} = img;
        if(width > height && width > max){ height = Math.round(height * max / width); width = max; }
        if(height >= width && height > max){ width = Math.round(width * max / height); height = max; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(e){
  const files = [...e.target.files].slice(0,3);
  if(e.target.files.length > 3) alert("Maximum 3 photos par bien.");
  pendingPhotos = await Promise.all(files.map(resizeImage));
  renderPhotoPreview(pendingPhotos);
}

function editProperty(id){
  const p = state.properties.find(x => x.id === id);
  if(!p) return;
  qs("#propertyId").value = p.id;
  qs("#propertyAgent").value = p.agentId;
  qs("#propertyName").value = p.name;
  qs("#propertyDealType").value = p.dealType;
  qs("#propertyStatus").value = p.status;
  qs("#propertyType").value = p.type;
  qs("#propertyArea").value = p.area;
  qs("#propertyPrice").value = p.price;
  qs("#propertyCharges").value = p.charges;
  qs("#propertyCommissionRate").value = p.commissionRate;
  qs("#propertyOwnerClient").value = p.ownerClientId || "none";
  qs("#propertyTenantClient").value = p.tenantClientId || "none";
  qs("#propertyDescription").value = p.description;
  pendingPhotos = p.photos || [];
  renderPhotoPreview(pendingPhotos);
  updateCommissionPreviews();
  setView("properties");
  window.scrollTo({top:0, behavior:"smooth"});
}

function editClient(id){
  const c = state.clients.find(x => x.id === id);
  if(!c) return;
  qs("#clientId").value = c.id;
  qs("#clientAgent").value = c.agentId;
  qs("#clientName").value = c.name;
  qs("#clientType").value = c.type;
  qs("#clientPhone").value = c.phone;
  qs("#clientEmail").value = c.email;
  qs("#clientNotes").value = c.notes;
  setView("clients");
  window.scrollTo({top:0, behavior:"smooth"});
}

function deleteProperty(id){
  if(!requireAdmin("la suppression d'un bien")) return;
  if(!confirm("Supprimer ce bien ?")) return;
  state.properties = state.properties.filter(p => p.id !== id);
  addActivity("Bien supprimé.");
  save(); renderAll();
}

function deleteClient(id){
  if(!requireAdmin("la suppression d'un contact")) return;
  if(!confirm("Supprimer ce contact ?")) return;
  state.clients = state.clients.filter(c => c.id !== id);
  addActivity("Contact supprimé.");
  save(); renderAll();
}

function deletePayment(id){
  if(!requireAdmin("la suppression d'un paiement")) return;
  state.payments = state.payments.filter(p => p.id !== id);
  addActivity("Paiement supprimé.");
  save(); renderAll();
}

function deleteVisit(id){
  if(!requireAdmin("la suppression d'une visite")) return;
  state.visits = state.visits.filter(v => v.id !== id);
  addActivity("Visite supprimée.");
  save(); renderAll();
}

function deleteEdl(id){
  if(!requireAdmin("la suppression d'un PV")) return;
  state.edls = state.edls.filter(e => e.id !== id);
  addActivity("PV supprimé.");
  save(); renderAll();
}

function deleteAgent(id){
  if(!requireAdmin("la suppression d'un espace agent")) return;
  if(id === "agent_main"){
    alert("Le compte principal ne peut pas être supprimé.");
    return;
  }
  if(!confirm("Supprimer cet agent ? Ses données resteront mais ne seront plus affectées correctement.")) return;
  state.agents = state.agents.filter(a => a.id !== id);
  if(state.activeWorkspace === id) state.activeWorkspace = "global";
  addActivity("Espace agent supprimé.");
  save(); renderAll();
}

function advanceVisit(id){
  const v = state.visits.find(x => x.id === id);
  if(!v) return;
  const flow = ["Planifié","Débuté","Qualifié"];
  const next = flow[flow.indexOf(v.status)+1];
  if(next) v.status = next;
  addActivity(`Visite passée au statut ${v.status}.`, v.agentId);
  save(); renderAll();
}

function printEdl(id){
  const e = state.edls.find(x => x.id === id);
  if(!e) return;
  const content = `
    <html><head><title>PV État des lieux</title>
    <style>body{font-family:Arial;padding:30px;line-height:1.6} h1{color:#74500e}</style></head>
    <body>
      <h1>PV État des lieux - ${e.type}</h1>
      <p><strong>Bien :</strong> ${getPropertyName(e.propertyId)}</p>
      <p><strong>Date :</strong> ${new Date(e.date).toLocaleDateString("fr-FR")}</p>
      <p><strong>Compteur eau :</strong> ${e.water || "-"}</p>
      <p><strong>Compteur électricité :</strong> ${e.power || "-"}</p>
      <h3>Checklist</h3>
      <p>${(e.checklist || "").replaceAll("\n","<br>")}</p>
      <br><br>
      <p>Signature propriétaire : ____________________</p>
      <p>Signature locataire : ____________________</p>
    </body></html>`;
  const win = window.open("", "_blank");
  win.document.write(content);
  win.document.close();
  win.print();
}

function updateCommissionPreviews(){
  const price = Number(qs("#propertyPrice")?.value || 0);
  const rate = Number(qs("#propertyCommissionRate")?.value || 0);
  qs("#propertyCommissionPreview").value = formatMoney(commission(price, rate));

  const amount = Number(qs("#paymentAmount")?.value || 0);
  const payRate = Number(qs("#paymentCommissionRate")?.value || 0);
  qs("#paymentCommissionAmount").value = formatMoney(commission(amount, payRate));
}

function seedDemo(){
  if(!requireAdmin("l'import de démo")) return;
  const agentA = {id:uid("agent"), name:"Aminata Courtage", phone:"221771112233", email:"aminata@demo.sn", role:"Courtier", createdAt:new Date().toISOString()};
  const agentB = {id:uid("agent"), name:"Mamadou Immo", phone:"221776667788", email:"mamadou@demo.sn", role:"Agent", createdAt:new Date().toISOString()};
  state.agents = [state.agents.find(a => a.id === "agent_main") || {id:"agent_main",name:"Compte principal",phone:"",email:"",role:"SuperAdmin"}, agentA, agentB];

  const owner = {id:uid("client"), agentId:agentA.id, name:"Mme Fall", type:"Propriétaire", phone:"221770000001", email:"", notes:"Propriétaire réactive."};
  const tenant = {id:uid("client"), agentId:agentA.id, name:"Awa Ba", type:"Locataire", phone:"221770000002", email:"", notes:"Recherche location longue durée."};
  const buyer = {id:uid("client"), agentId:agentB.id, name:"Cheikh Diallo", type:"Acheteur", phone:"221770000003", email:"", notes:"Budget élevé pour villa."};
  state.clients = [owner, tenant, buyer];

  const p1 = {id:uid("prop"), agentId:agentA.id, name:"Appartement Ngor Vue Mer", dealType:"Location mensuelle", status:"Disponible", type:"Appartement", area:"Ngor", price:450000, charges:35000, commissionRate:5, ownerClientId:owner.id, tenantClientId:"none", photos:[], description:"3 chambres, balcon, proche plage."};
  const p2 = {id:uid("prop"), agentId:agentB.id, name:"Villa familiale Mermoz", dealType:"Vente", status:"En vente", type:"Villa", area:"Mermoz", price:95000000, charges:0, commissionRate:3, ownerClientId:"none", tenantClientId:buyer.id, photos:[], description:"Grand terrain, garage, cour intérieure."};
  state.properties = [p1,p2];

  state.payments = [
    {id:uid("pay"), agentId:agentA.id, propertyId:p1.id, clientId:tenant.id, type:"Loyer", amount:450000, commissionRate:5, commissionAmount:22500, status:"Confirmé", date:new Date().toISOString()}
  ];
  state.visits = [
    {id:uid("visit"), agentId:agentB.id, clientId:buyer.id, propertyId:p2.id, date:new Date().toISOString().slice(0,10), time:"16:30", status:"Planifié"}
  ];
  state.edls = [];
  addActivity("Données de démonstration V2 chargées.");
  save(); renderAll();
}

function bindEvents(){
  qs("#mobileMenuBtn").addEventListener("click", () => qs("#sidebar").classList.toggle("open"));

  qsa(".nav-btn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  qsa("[data-view-target]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.viewTarget)));

  qs("#workspaceSelect").addEventListener("change", e => {
    state.activeWorkspace = e.target.value;
    save(); renderAll();
  });

  qs("#roleSelect").addEventListener("change", e => {
    state.role = e.target.value;
    save();
    addActivity(`Rôle actif : ${state.role}.`);
    renderAll();
  });

  qs("#seedBtn").addEventListener("click", seedDemo);
  qs("#resetBtn").addEventListener("click", () => {
    if(!requireAdmin("la réinitialisation")) return;
    if(confirm("Tout effacer sur cet appareil ?")){
      localStorage.removeItem(STORAGE_KEY);
      state.role = "SuperAdmin";
      state.activeWorkspace = "global";
      state.agents = [];
      state.clients = [];
      state.properties = [];
      state.payments = [];
      state.visits = [];
      state.edls = [];
      state.activities = [];
      ensureDefaultAgent();
      save(); resetForms(); renderAll();
    }
  });

  ["#propertyFilter","#dealFilter","#clientFilter"].forEach(id => qs(id).addEventListener("change", renderAll));
  ["#propertyPrice","#propertyCommissionRate","#paymentAmount","#paymentCommissionRate"].forEach(id => qs(id).addEventListener("input", updateCommissionPreviews));
  qs("#propertyPhotos").addEventListener("change", handlePhotoUpload);

  qs("#agentForm").addEventListener("submit", e => {
    e.preventDefault();
    if(!requireAdmin("la création d'un agent")) return;
    const agent = {
      id: uid("agent"),
      name: qs("#agentName").value.trim(),
      phone: qs("#agentPhone").value.trim(),
      email: qs("#agentEmail").value.trim(),
      role: qs("#agentRole").value,
      createdAt: new Date().toISOString()
    };
    state.agents.push(agent);
    addActivity(`Nouvel espace créé : ${agent.name}.`, "global");
    save(); resetForms(); renderAll();
  });

  qs("#clientForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = qs("#clientId").value || uid("client");
    const client = {
      id,
      agentId: qs("#clientAgent").value,
      name: qs("#clientName").value.trim(),
      type: qs("#clientType").value,
      phone: qs("#clientPhone").value.trim(),
      email: qs("#clientEmail").value.trim(),
      notes: qs("#clientNotes").value.trim()
    };
    const index = state.clients.findIndex(c => c.id === id);
    if(index >= 0) {
      state.clients[index] = client;
      addActivity(`Contact modifié : ${client.name}.`, client.agentId);
    } else {
      state.clients.unshift(client);
      addActivity(`Nouveau contact : ${client.name}.`, client.agentId);
    }
    save(); resetForms(); renderAll();
  });

  qs("#propertyForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = qs("#propertyId").value || uid("prop");
    const prop = {
      id,
      agentId: qs("#propertyAgent").value,
      name: qs("#propertyName").value.trim(),
      dealType: qs("#propertyDealType").value,
      status: qs("#propertyStatus").value,
      type: qs("#propertyType").value,
      area: qs("#propertyArea").value.trim(),
      price: Number(qs("#propertyPrice").value || 0),
      charges: Number(qs("#propertyCharges").value || 0),
      commissionRate: Number(qs("#propertyCommissionRate").value || 0),
      ownerClientId: qs("#propertyOwnerClient").value,
      tenantClientId: qs("#propertyTenantClient").value,
      photos: pendingPhotos.slice(0,3),
      description: qs("#propertyDescription").value.trim()
    };
    const index = state.properties.findIndex(p => p.id === id);
    if(index >= 0) {
      state.properties[index] = prop;
      addActivity(`Bien modifié : ${prop.name}.`, prop.agentId);
    } else {
      state.properties.unshift(prop);
      addActivity(`Nouveau bien : ${prop.name}.`, prop.agentId);
    }
    save(); resetForms(); renderAll();
  });

  qs("#paymentForm").addEventListener("submit", e => {
    e.preventDefault();
    const prop = getProperty(qs("#paymentProperty").value);
    const rate = Number(qs("#paymentCommissionRate").value || prop?.commissionRate || 0);
    const amount = Number(qs("#paymentAmount").value || 0);
    const payment = {
      id: uid("pay"),
      agentId: prop?.agentId || currentAgentId() || "agent_main",
      propertyId: qs("#paymentProperty").value,
      clientId: qs("#paymentClient").value,
      type: qs("#paymentType").value,
      amount,
      commissionRate: rate,
      commissionAmount: commission(amount, rate),
      status: qs("#paymentStatus").value,
      date: new Date().toISOString()
    };
    state.payments.unshift(payment);
    addActivity(`Paiement enregistré : ${formatMoney(amount)}.`, payment.agentId);
    save(); resetForms(); renderAll();
  });

  qs("#visitForm").addEventListener("submit", e => {
    e.preventDefault();
    const prop = getProperty(qs("#visitProperty").value);
    const visit = {
      id: uid("visit"),
      agentId: prop?.agentId || currentAgentId() || "agent_main",
      clientId: qs("#visitClient").value,
      propertyId: qs("#visitProperty").value,
      date: qs("#visitDate").value,
      time: qs("#visitTime").value,
      status: qs("#visitStatus").value
    };
    state.visits.unshift(visit);
    addActivity(`Visite planifiée pour ${getClientName(visit.clientId)}.`, visit.agentId);
    save(); resetForms(); renderAll();
  });

  qs("#edlForm").addEventListener("submit", e => {
    e.preventDefault();
    const prop = getProperty(qs("#edlProperty").value);
    const edl = {
      id: uid("edl"),
      agentId: prop?.agentId || currentAgentId() || "agent_main",
      propertyId: qs("#edlProperty").value,
      type: qs("#edlType").value,
      water: qs("#edlWater").value.trim(),
      power: qs("#edlPower").value.trim(),
      checklist: qs("#edlChecklist").value.trim(),
      date: new Date().toISOString()
    };
    state.edls.unshift(edl);
    addActivity(`PV ${edl.type} créé.`, edl.agentId);
    save(); resetForms(); renderAll();
  });

  qs("#exportBtn").addEventListener("click", () => {
    qs("#exportOutput").value = JSON.stringify(state, null, 2);
  });
}

load();
ensureDefaultAgent();
bindEvents();
qs("#roleSelect").value = state.role || "SuperAdmin";
renderAll();
updateCommissionPreviews();
