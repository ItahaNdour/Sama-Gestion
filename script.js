const STORAGE_KEY = "immohub_senegal_v1";

const state = {
  role: "SuperAdmin",
  properties: [],
  payments: [],
  visits: [],
  edls: [],
  activities: []
};

const titles = {
  dashboard: "Tableau de bord",
  properties: "Gestion des biens",
  payments: "Régie de recouvrement",
  visits: "Planning des visites",
  edl: "État des lieux",
  admin: "Administration"
};

const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

function uid(prefix="id"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatMoney(value){
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const data = JSON.parse(raw);
    Object.assign(state, data);
  }catch(e){
    console.error("Erreur lecture LocalStorage", e);
  }
}

function addActivity(text){
  state.activities.unshift({ id: uid("act"), text, date: new Date().toISOString() });
  state.activities = state.activities.slice(0, 8);
  save();
}

function isAgent(){
  return state.role === "Agent";
}

function requireAdmin(actionName="cette action"){
  if(isAgent()){
    alert(`Accès refusé : le rôle Agent ne peut pas faire ${actionName}.`);
    return false;
  }
  return true;
}

function setView(viewId){
  qsa(".view").forEach(v => v.classList.remove("active"));
  qs(`#${viewId}`).classList.add("active");

  qsa(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  qs("#pageTitle").textContent = titles[viewId] || "ImmoHub";
  renderAll();
}

function getPropertyName(id){
  return state.properties.find(p => p.id === id)?.name || "Bien supprimé";
}

function statusBadge(status){
  const cls = status === "Confirmé" || status === "Disponible" ? "green" :
              status === "En attente" || status === "Annulé" ? "red" :
              status === "Loué" ? "dark" : "";
  return `<span class="badge ${cls}">${status}</span>`;
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

function renderDashboard(){
  const confirmed = state.payments.filter(p => p.status === "Confirmé");
  const revenue = confirmed.reduce((sum,p) => sum + Number(p.amount || 0), 0);
  const commissions = confirmed
    .filter(p => ["Frais d'agence","Commission"].includes(p.type))
    .reduce((sum,p) => sum + Number(p.amount || 0), 0);
  const alerts = state.payments.filter(p => p.status !== "Confirmé").length;

  qs("#kpiRevenue").textContent = formatMoney(revenue);
  qs("#kpiCommissions").textContent = formatMoney(commissions);
  qs("#kpiProperties").textContent = state.properties.length;
  qs("#kpiAlerts").textContent = alerts;

  qs("#recentActivity").innerHTML = state.activities.length
    ? state.activities.map(a => `<div class="activity">${a.text}<br><small>${new Date(a.date).toLocaleString("fr-FR")}</small></div>`).join("")
    : `<div class="activity">Aucune activité pour le moment. Ajoute un bien pour commencer.</div>`;
}

function renderPropertyOptions(){
  const options = state.properties.map(p => `<option value="${p.id}">${p.name} — ${p.area}</option>`).join("");
  ["#paymentProperty","#visitProperty","#edlProperty"].forEach(id => {
    const el = qs(id);
    if(el) el.innerHTML = options || `<option value="">Ajoute d'abord un bien</option>`;
  });
}

function renderProperties(){
  const filter = qs("#propertyFilter")?.value || "Tous";
  const list = filter === "Tous" ? state.properties : state.properties.filter(p => p.status === filter);

  qs("#propertiesList").innerHTML = list.length ? list.map(p => `
    <article class="item-card">
      <div class="item-top">
        <div>
          <h4>${p.name}</h4>
          <p>${p.type} • ${p.area}</p>
        </div>
        ${statusBadge(p.status)}
      </div>
      <p><strong>${formatMoney(p.price)}</strong> ${p.charges ? `+ charges ${formatMoney(p.charges)}` : ""}</p>
      <p>Propriétaire : ${p.owner || "Non renseigné"} ${p.ownerPhone ? "• " + p.ownerPhone : ""}</p>
      <p>${p.description || ""}</p>
      <div class="card-actions">
        <button class="mini-btn" onclick="editProperty('${p.id}')">Modifier</button>
        <button class="mini-btn delete" onclick="deleteProperty('${p.id}')">Supprimer</button>
      </div>
    </article>
  `).join("") : `<div class="activity">Aucun bien dans cette catégorie.</div>`;
}

function renderPayments(){
  qs("#paymentsList").innerHTML = state.payments.length ? state.payments.map(p => {
    const msg = `Bonjour ${p.payer}, nous confirmons la réception de votre paiement : ${p.type} - ${formatMoney(p.amount)} pour ${getPropertyName(p.propertyId)}. Merci.`;
    return `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h4>${p.type} — ${formatMoney(p.amount)}</h4>
            <p>${p.payer} • ${getPropertyName(p.propertyId)}</p>
          </div>
          ${statusBadge(p.status)}
        </div>
        <p>Date : ${new Date(p.date).toLocaleDateString("fr-FR")}</p>
        <div class="card-actions">
          <a class="mini-btn whatsapp" target="_blank" href="${whatsappLink(p.phone, msg)}">Envoyer reçu WhatsApp</a>
          <button class="mini-btn delete" onclick="deletePayment('${p.id}')">Supprimer</button>
        </div>
      </article>
    `;
  }).join("") : `<div class="activity">Aucun paiement enregistré.</div>`;
}

function renderVisits(){
  const stages = ["Planifié","Débuté","Qualifié"];
  qs("#visitsBoard").innerHTML = stages.map(stage => {
    const items = state.visits.filter(v => v.status === stage);
    return `
      <div class="kanban-col">
        <h4>${stage}</h4>
        ${items.length ? items.map(v => {
          const msg = `Bonjour ${v.name}, rappel de votre visite pour ${getPropertyName(v.propertyId)} prévue le ${v.date} à ${v.time}. Merci.`;
          return `
            <div class="visit-card">
              <strong>${v.name}</strong>
              <small>${getPropertyName(v.propertyId)}</small>
              <p>${v.date} à ${v.time}</p>
              <div class="card-actions">
                <a class="mini-btn whatsapp" target="_blank" href="${whatsappLink(v.phone, msg)}">Relancer</a>
                <button class="mini-btn" onclick="advanceVisit('${v.id}')">Avancer</button>
                <button class="mini-btn delete" onclick="deleteVisit('${v.id}')">Supprimer</button>
              </div>
            </div>
          `;
        }).join("") : `<p class="muted">Vide</p>`}
      </div>
    `;
  }).join("");
}

function renderEdl(){
  qs("#edlList").innerHTML = state.edls.length ? state.edls.map(e => `
    <article class="item-card">
      <div class="item-top">
        <div>
          <h4>PV ${e.type} — ${getPropertyName(e.propertyId)}</h4>
          <p>${new Date(e.date).toLocaleDateString("fr-FR")}</p>
        </div>
        <span class="badge">${e.type}</span>
      </div>
      <p>Eau : ${e.water || "-"} • Électricité : ${e.power || "-"}</p>
      <p>${e.notes || "Aucune observation."}</p>
      <div class="card-actions">
        <button class="mini-btn" onclick="printEdl('${e.id}')">Imprimer</button>
        <button class="mini-btn delete" onclick="deleteEdl('${e.id}')">Supprimer</button>
      </div>
    </article>
  `).join("") : `<div class="activity">Aucun état des lieux enregistré.</div>`;
}

function renderAll(){
  renderPropertyOptions();
  renderDashboard();
  renderProperties();
  renderPayments();
  renderVisits();
  renderEdl();
}

function resetForms(){
  ["propertyForm","paymentForm","visitForm","edlForm"].forEach(id => qs("#"+id)?.reset());
  qs("#propertyId").value = "";
}

function editProperty(id){
  const p = state.properties.find(x => x.id === id);
  if(!p) return;
  qs("#propertyId").value = p.id;
  qs("#propertyName").value = p.name;
  qs("#propertyArea").value = p.area;
  qs("#propertyType").value = p.type;
  qs("#propertyStatus").value = p.status;
  qs("#propertyPrice").value = p.price;
  qs("#propertyCharges").value = p.charges;
  qs("#propertyOwner").value = p.owner;
  qs("#propertyOwnerPhone").value = p.ownerPhone;
  qs("#propertyDescription").value = p.description;
  window.scrollTo({top:0, behavior:"smooth"});
}

function deleteProperty(id){
  if(!requireAdmin("la suppression d'un bien")) return;
  if(!confirm("Supprimer ce bien ?")) return;
  state.properties = state.properties.filter(p => p.id !== id);
  addActivity("Bien supprimé du portefeuille.");
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
  addActivity("PV d'état des lieux supprimé.");
  save(); renderAll();
}

function advanceVisit(id){
  const v = state.visits.find(x => x.id === id);
  if(!v) return;
  const flow = ["Planifié","Débuté","Qualifié"];
  const next = flow[flow.indexOf(v.status) + 1];
  if(next) v.status = next;
  addActivity(`Visite avancée au statut ${v.status}.`);
  save(); renderAll();
}

function printEdl(id){
  const e = state.edls.find(x => x.id === id);
  if(!e) return;
  const content = `
    <html><head><title>PV État des lieux</title>
    <style>body{font-family:Arial;padding:30px;line-height:1.6} h1{color:#8c6516}</style></head>
    <body>
      <h1>PV État des lieux - ${e.type}</h1>
      <p><strong>Bien :</strong> ${getPropertyName(e.propertyId)}</p>
      <p><strong>Date :</strong> ${new Date(e.date).toLocaleDateString("fr-FR")}</p>
      <p><strong>Compteur eau :</strong> ${e.water || "-"}</p>
      <p><strong>Compteur électricité :</strong> ${e.power || "-"}</p>
      <h3>Observations</h3>
      <p>${(e.notes || "").replaceAll("\n","<br>")}</p>
      <br><br>
      <p>Signature propriétaire : ____________________</p>
      <p>Signature locataire : ____________________</p>
    </body></html>`;
  const win = window.open("", "_blank");
  win.document.write(content);
  win.document.close();
  win.print();
}

function seedDemo(){
  if(!requireAdmin("l'import de données démo")) return;
  state.properties = [
    {id:uid("prop"), name:"Appartement Ngor Vue Mer", area:"Ngor", type:"Appartement", status:"Disponible", price:450000, charges:35000, owner:"M. Diop", ownerPhone:"221771112233", description:"3 chambres, balcon, proche plage."},
    {id:uid("prop"), name:"Studio Plateau Business", area:"Plateau", type:"Studio", status:"Loué", price:280000, charges:20000, owner:"Mme Fall", ownerPhone:"221776667788", description:"Idéal jeune actif, immeuble sécurisé."},
    {id:uid("prop"), name:"Villa familiale Mermoz", area:"Mermoz", type:"Villa", status:"En vente", price:95000000, charges:0, owner:"M. Ndiaye", ownerPhone:"221781234567", description:"Grand terrain, garage, cour intérieure."}
  ];
  state.payments = [
    {id:uid("pay"), propertyId:state.properties[1].id, payer:"Awa Ba", phone:"221779998877", type:"Loyer", amount:280000, status:"Confirmé", date:new Date().toISOString()},
    {id:uid("pay"), propertyId:state.properties[0].id, payer:"Moussa Kane", phone:"221771010101", type:"Caution", amount:450000, status:"En attente", date:new Date().toISOString()}
  ];
  state.visits = [
    {id:uid("visit"), name:"Fatou Sarr", phone:"221771234000", propertyId:state.properties[0].id, date:new Date().toISOString().slice(0,10), time:"16:30", status:"Planifié"},
    {id:uid("visit"), name:"Cheikh Diallo", phone:"221778880000", propertyId:state.properties[2].id, date:new Date().toISOString().slice(0,10), time:"12:00", status:"Débuté"}
  ];
  state.edls = [];
  state.activities = [];
  addActivity("Données de démonstration chargées.");
  save(); renderAll();
}

function bindEvents(){
  qsa(".nav-btn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  qsa("[data-view-target]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.viewTarget)));

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
      state.properties = [];
      state.payments = [];
      state.visits = [];
      state.edls = [];
      state.activities = [];
      save(); renderAll(); resetForms();
    }
  });

  qs("#propertyFilter").addEventListener("change", renderProperties);

  qs("#propertyForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = qs("#propertyId").value || uid("prop");
    const payload = {
      id,
      name: qs("#propertyName").value.trim(),
      area: qs("#propertyArea").value.trim(),
      type: qs("#propertyType").value,
      status: qs("#propertyStatus").value,
      price: Number(qs("#propertyPrice").value || 0),
      charges: Number(qs("#propertyCharges").value || 0),
      owner: qs("#propertyOwner").value.trim(),
      ownerPhone: qs("#propertyOwnerPhone").value.trim(),
      description: qs("#propertyDescription").value.trim()
    };
    const index = state.properties.findIndex(p => p.id === id);
    if(index >= 0) {
      state.properties[index] = payload;
      addActivity(`Bien modifié : ${payload.name}.`);
    } else {
      state.properties.unshift(payload);
      addActivity(`Nouveau bien ajouté : ${payload.name}.`);
    }
    save(); resetForms(); renderAll();
  });

  qs("#paymentForm").addEventListener("submit", e => {
    e.preventDefault();
    const payment = {
      id: uid("pay"),
      propertyId: qs("#paymentProperty").value,
      payer: qs("#paymentPayer").value.trim(),
      phone: qs("#paymentPhone").value.trim(),
      type: qs("#paymentType").value,
      amount: Number(qs("#paymentAmount").value || 0),
      status: qs("#paymentStatus").value,
      date: new Date().toISOString()
    };
    state.payments.unshift(payment);
    addActivity(`Paiement enregistré : ${payment.type} - ${formatMoney(payment.amount)}.`);
    save(); resetForms(); renderAll();
  });

  qs("#visitForm").addEventListener("submit", e => {
    e.preventDefault();
    const visit = {
      id: uid("visit"),
      name: qs("#visitName").value.trim(),
      phone: qs("#visitPhone").value.trim(),
      propertyId: qs("#visitProperty").value,
      date: qs("#visitDate").value,
      time: qs("#visitTime").value,
      status: qs("#visitStatus").value
    };
    state.visits.unshift(visit);
    addActivity(`Visite planifiée pour ${visit.name}.`);
    save(); resetForms(); renderAll();
  });

  qs("#edlForm").addEventListener("submit", e => {
    e.preventDefault();
    const edl = {
      id: uid("edl"),
      propertyId: qs("#edlProperty").value,
      type: qs("#edlType").value,
      water: qs("#edlWater").value.trim(),
      power: qs("#edlPower").value.trim(),
      notes: qs("#edlNotes").value.trim(),
      date: new Date().toISOString()
    };
    state.edls.unshift(edl);
    addActivity(`PV d'état des lieux créé : ${edl.type}.`);
    save(); resetForms(); renderAll();
  });

  qs("#exportBtn").addEventListener("click", () => {
    qs("#exportOutput").value = JSON.stringify(state, null, 2);
  });
}

load();
bindEvents();
qs("#roleSelect").value = state.role || "SuperAdmin";
renderAll();
