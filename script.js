const KEY="immohub_senegal_v32";
const state={logged:false,mode:"admin",currentAgentId:null,workspace:"global",agents:[],clients:[],properties:[],payments:[],visits:[],edls:[],filter:"Tous",trackingId:null};
let photos=[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=p=>`${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const money=n=>new Intl.NumberFormat("fr-FR").format(Math.round(Number(n||0)))+" FCFA";
const norm=n=>{let x=String(n||"").replace(/\D/g,"");return x.startsWith("221")?x:(x.length===9?"221"+x:x)};
const wa=(n,m)=>`https://wa.me/${norm(n)}?text=${encodeURIComponent(m)}`;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||"{}")); if(!state.mode) state.mode="admin";}catch(e){}}
function ensure(){if(!state.agents.length)state.agents=[{id:"main",name:"Agence principale",role:"Agence",phone:"221770000000",email:"admin@immohub.sn",wave:"77 000 00 00 - Agence principale",orangeMoney:"78 000 00 00 - Agence principale",freeMoney:"",signature:"Agence principale\nWhatsApp : 221770000000"}]}
const agent=id=>state.agents.find(a=>a.id===id)||state.agents[0];
const client=id=>state.clients.find(c=>c.id===id);
const prop=id=>state.properties.find(p=>p.id===id);
function canCollectProperty(p){
  if(!p) return false;
  const occupiedStatuses=["Loué","Réservé","Vendu"];
  const hasOccupant=!!p.occupantId;
  return occupiedStatuses.includes(p.status) && hasOccupant;
}
function collectBlockMessage(p){
  if(!p) return "Bien introuvable.";
  if(!p.occupantId) return "Impossible d’encaisser : aucun locataire/acheteur n’est rattaché à ce bien.";
  return `Impossible d’encaisser : le bien « ${p.name} » est actuellement au statut « ${p.status} ». Il doit être occupé/loué pour encaisser.`;
}

const scoped=a=>state.workspace==="global"?a:a.filter(x=>x.agentId===state.workspace);
function currentResponsibleAgent(){
  if(state.mode==="courtier") return state.currentAgentId || state.workspace || "main";
  return state.workspace==="global" ? (state.agents[0]?.id || "main") : state.workspace;
}
function applyAgentContext(){
  const id=currentResponsibleAgent();
  const a=agent(id);
  ["property","client"].forEach(prefix=>{
    const select=$("#"+prefix+"Agent");
    const wrap=$("#"+prefix+"AgentWrap");
    const note=$("#"+prefix+"AutoAgentNote");
    if(!select || !wrap) return;
    select.value=id;
    if(state.workspace!=="global"){
      wrap.classList.add("hidden");
      if(note) note.classList.add("hidden");
    }else{
      wrap.classList.remove("hidden");
      note.classList.add("hidden");
    }
  });
}

const sig=id=>`\n\n— ${agent(id)?.signature || agent(id)?.name || "ImmoHub Sénégal"}`;
function paymentMethodsText(agentId){
  const a=agent(agentId);
  const lines=[];
  if(a?.wave) lines.push(`Wave : ${a.wave}`);
  if(a?.orangeMoney) lines.push(`Orange Money : ${a.orangeMoney}`);
  if(a?.freeMoney) lines.push(`Free Money : ${a.freeMoney}`);
  return lines.length ? lines.join("\n") : "Moyens de paiement non renseignés.";
}
function paymentMethodsHtml(agentId){
  const a=agent(agentId);
  const lines=[];
  if(a?.wave) lines.push(`<span>📲 Wave : ${a.wave}</span>`);
  if(a?.orangeMoney) lines.push(`<span>🟠 Orange Money : ${a.orangeMoney}</span>`);
  if(a?.freeMoney) lines.push(`<span>💸 Free Money : ${a.freeMoney}</span>`);
  return `<div class="payment-methods">${lines.length?lines.join(""):"<span>Moyens de paiement non renseignés.</span>"}</div>`;
}
function refreshModeUI(){
  document.body.classList.toggle("courtier-mode", state.mode==="courtier");
}

const closeModals=()=>$$(".modal").forEach(m=>m.classList.remove("open"));
function daysInMonth(ym){const [y,m]=ym.split("-").map(Number);return new Date(y,m,0).getDate()}
function monthLabel(ym){return ym?new Date(ym+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):""}
function login(){
  const email=($("#loginEmail").value||"").trim().toLowerCase();
  ensure();
  if(email==="courtier@demo.sn"){
    let demoAgent=state.agents.find(a=>a.email==="courtier@demo.sn") || state.agents.find(a=>a.id==="a1");
    if(!demoAgent){
      demoAgent={id:"a1",name:"Aminata Courtage",role:"Courtier",phone:"221771112233",email:"courtier@demo.sn",wave:"77 111 22 33 - Aminata Courtage",orangeMoney:"78 111 22 33 - Aminata Courtage",freeMoney:"",signature:"Aminata Courtage\nCourtier immobilier\nWhatsApp : 221771112233"};
      state.agents.push(demoAgent);
    }
    state.mode="courtier";
    state.currentAgentId=demoAgent.id;
    state.workspace=demoAgent.id;
  }else{
    state.mode="admin";
    state.currentAgentId=null;
    if(!state.workspace) state.workspace="global";
  }
  $("#loginScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  state.logged=true;
  refreshModeUI();
  save();
  render();
}

function logout(){ state.logged=false; save(); document.body.classList.remove("courtier-mode"); $("#loginScreen").classList.remove("hidden"); $("#app").classList.add("hidden"); }
function nav(v){ $$(".view").forEach(x=>x.classList.remove("active")); $("#"+v).classList.add("active"); $$(".nav,.menu-item").forEach(b=>b.classList.toggle("active",b.dataset.view===v)); $("#moreMenu").classList.add("hidden"); render(); }
function openModal(id){
  resetForms();
  applyAgentContext();
  $("#"+id).classList.add("open");
  if(id==="paymentModal") prefillPayment();
}
function badge(s){let c=["Confirmé","Payé","Disponible","Chaud","Entrée"].includes(s)?"green":["En attente","Partiel","Pas intéressé"].includes(s)?"red":["Vente","En vente","Sortie"].includes(s)?"orange":"gray";return `<span class="badge ${c}">${s}</span>`}

function opts(){
  if(state.mode==="courtier"){
    state.workspace=state.currentAgentId || state.workspace;
    $("#workspaceSelect").innerHTML=state.agents.filter(a=>a.id===state.workspace).map(a=>`<option value="${a.id}">${a.name}</option>`).join("");
  }else{
    $("#workspaceSelect").innerHTML='<option value="global">Vue globale</option>'+state.agents.map(a=>`<option value="${a.id}">${a.name}</option>`).join("");
  }
  $("#workspaceSelect").value=state.workspace;
  $("#scopeLabel").textContent=state.workspace==="global"?"Vue globale":agent(state.workspace).name;
  const ag=state.agents.map(a=>`<option value="${a.id}">${a.name} — ${a.role}</option>`).join("");
  ["#propertyAgent","#clientAgent"].forEach(id=>$(id).innerHTML=ag); applyAgentContext();
  applyAgentContext();
  const contacts=scoped(state.clients), owners=contacts.filter(c=>c.type==="Propriétaire"), occupants=contacts.filter(c=>["Prospect","Client","Locataire","Acheteur"].includes(c.type)), payers=contacts.filter(c=>["Client","Locataire","Acheteur"].includes(c.type));
  $("#propertyOwner").innerHTML='<option value="">Non renseigné</option>'+owners.map(c=>`<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  $("#propertyOccupant").innerHTML='<option value="">Non renseigné</option>'+occupants.map(c=>`<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  $("#paymentClient").innerHTML='<option value="">Non renseigné</option>'+payers.map(c=>`<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  const allRecipients=contacts.filter(c=>c.phone);
  if($("#paymentMethodsRecipient")) $("#paymentMethodsRecipient").innerHTML='<option value="">Choisir un destinataire</option>'+allRecipients.map(c=>`<option value="${c.id}">${c.name} — ${c.type}</option>`).join("");
  const allProps=scoped(state.properties);
  const ps=allProps.map(p=>`<option value="${p.id}">${p.name} — ${p.area}</option>`).join("");
  const collectable=allProps.filter(canCollectProperty).map(p=>`<option value="${p.id}">${p.name} — ${p.area}</option>`).join("");
  $("#visitProperty").innerHTML=ps||'<option value="">Créer un bien d’abord</option>';
  $("#edlProperty").innerHTML=ps||'<option value="">Créer un bien d’abord</option>';
  $("#paymentProperty").innerHTML=collectable||'<option value="">Aucun bien occupé/loué</option>';
}

function render(){
  ensure(); opts();
  const props=scoped(state.properties), pays=scoped(state.payments), visits=scoped(state.visits);
  const revenue=pays.reduce((s,p)=>s+Number(p.amount||0),0);
  const commissions=pays.reduce((s,p)=>s+Number(p.agencyCommission||0)+Number(p.managementCommission||0),0);
  $("#kpiRevenue").textContent=money(revenue);
  $("#kpiCommissions").textContent=money(commissions);
  $("#kpiProperties").textContent=props.length;
  $("#kpiVisits").textContent=visits.length;
  $("#kpiDue").textContent=pays.filter(p=>p.remaining>0 || p.status!=="Confirmé").length;
  const due=pays.filter(p=>p.remaining>0 || p.status!=="Confirmé").slice(0,4);
  $("#dueList").innerHTML=due.length?due.map(p=>`<div class="card clickable-alert" onclick="showTracking('${p.propertyId}')"><p>⏰ ${monthLabel(p.month)} • ${prop(p.propertyId)?.name||"Bien"} • reste ${money(p.remaining)}</p><small>Toucher pour ouvrir le suivi</small></div>`).join(""):'<div class="card empty-state"><p>Aucune échéance en attente.</p><small>Les restes à payer apparaîtront ici.</small></div>';
  renderProperties(); renderClients(); renderVisits(); renderPayments(); renderEdl(); renderAgents(); renderTracking();
}

function renderProperties(){
  let q=$("#propertySearch").value?.toLowerCase()||"", list=scoped(state.properties);
  if(state.filter!=="Tous") list=list.filter(p=>p.dealType===state.filter);
  if(q) list=list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
  $("#propertiesList").innerHTML=list.length?list.map(p=>`<article class="card">
    <div class="card-top"><div><h3>${p.name}</h3><p>📍 ${p.area} • ${p.type}</p></div></div>
    ${(p.photos||[]).length?`<div class="photo-strip">${p.photos.map(x=>`<img src="${x}">`).join("")}</div>`:""}
    <p>💼 ${p.dealType} • <strong>${money(p.price)}</strong></p>
    <p>👤 Proprio : ${client(p.ownerId)?.name||"Non renseigné"}</p>
    <p>🏠 Occupant/client : ${client(p.occupantId)?.name||"Non renseigné"}</p>
    ${p.occupantId?`<p>📅 Date d’entrée : <strong>${p.moveInDate||"À renseigner"}</strong></p>`:""}
    <div class="actions"><button class="mini-btn blue" onclick="showTracking('${p.id}')">Suivi</button>${canCollectProperty(p)?`<button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser</button>`:`<button class="mini-btn disabled" onclick="payForProperty('${p.id}')">Non encaissable</button>`}<button class="mini-btn blue" onclick="editProperty('${p.id}')">Modifier</button><button class="mini-btn red" onclick="del('properties','${p.id}')">Supprimer</button></div>
  </article>`).join(""):'<div class="card empty-state"><p>Aucun bien trouvé.</p><small>Ajoute un bien avec le bouton +.</small></div>';
}

function renderTracking(){
  const p=prop(state.trackingId);
  if(!p){$("#trackingContent").innerHTML='<div class="card"><p>Sélectionne un bien depuis la page Biens.</p></div>';return}
  $("#trackingSubtitle").textContent=`${p.name} • ${p.area}`;
  const transactions=state.payments.filter(x=>x.propertyId===p.id).sort((a,b)=>(b.month||"").localeCompare(a.month||""));
  $("#trackingContent").innerHTML=`<article class="card tracking-head">
    <div>
      <h3>${p.name}</h3>
      <p>${p.dealType} • ${money(p.price)}</p>
      <p class="small-muted">Entrée : ${p.moveInDate||"à renseigner"} • Occupant : ${client(p.occupantId)?.name||"non renseigné"}</p>
    </div>
    <button class="mini-btn green" onclick="payForProperty('${p.id}')">Encaisser ce bien</button>
  </article>

  <div class="tracking-section-title">Suivi</div>

  <div class="compact-transactions">
    ${transactions.length?transactions.map(t=>`<div class="transaction-row ${t.remaining>0?'has-rest':''}">
      <div>
        <strong>${monthLabel(t.month)}</strong>
        <small>${t.type}</small>
      </div>
      <div class="transaction-money">
        <span>${money(t.amount)}</span>
        ${t.remaining>0?`<em>Reste ${money(t.remaining)}</em>`:""}
      </div>
      ${t.remaining>0?`<a class="mini-btn red tiny-btn" target="_blank" href="${relanceLink(t.id)}">Relance</a>`:""}
    </div>`).join(""):'<div class="card"><p>Aucune transaction pour ce bien.</p></div>'}
  </div>`;
}

function renderClients(){
  let q=$("#clientSearch").value?.toLowerCase()||"", list=scoped(state.clients);
  if(q) list=list.filter(c=>JSON.stringify(c).toLowerCase().includes(q));
  $("#clientsList").innerHTML=list.length?list.map(c=>`<article class="card"><div class="card-top"><div><h3>👤 ${c.name}</h3><p>${c.type} • ${agent(c.agentId)?.name}</p></div>${badge(c.type)}</div><p>📱 ${c.phone}</p><p>${c.notes||""}</p><div class="actions"><button class="mini-btn blue" onclick="editClient('${c.id}')">Modifier</button><a class="mini-btn green" target="_blank" href="${wa(c.phone,'Bonjour '+c.name+sig(c.agentId))}">WhatsApp</a><button class="mini-btn red" onclick="del('clients','${c.id}')">Supprimer</button></div></article>`).join(""):'<div class="card empty-state"><p>Aucun contact.</p><small>Ajoute un contact avec le bouton +.</small></div>';
}

function renderVisits(){
  const today=new Date().toISOString().slice(0,10);
  const list=scoped(state.visits).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("#visitsList").innerHTML=list.length?list.map(v=>{
    let past=v.date<today, p=prop(v.propertyId);
    const locked=v.qualification && v.qualification!=="À qualifier";
    let msg=`Bonjour ${v.name}, rappel de votre visite pour ${p?.name||"le bien"} prévue le ${v.date} à ${v.time}.${sig(v.agentId)}`;
    return `<article class="card" style="${past?'opacity:.55':''}">
      <div class="card-top">
        <div><h3>📅 ${v.name}</h3><p>${p?.name||"Bien"} • ${v.date} à ${v.time}</p></div>
        ${badge(v.qualification)}
      </div>
      <p>📱 ${v.phone}</p>
      <p>📝 ${v.note||"Aucune note"}</p>
      <div class="actions">
        <a class="mini-btn green" target="_blank" href="${wa(v.phone,msg)}">Relance</a>
        ${locked?`<span class="mini-btn disabled">Visite terminée</span>`:`<button class="mini-btn blue" onclick="qualifyVisit('${v.id}','Chaud')">Chaud</button><button class="mini-btn" onclick="qualifyVisit('${v.id}','Froid')">Froid</button><button class="mini-btn red" onclick="qualifyVisit('${v.id}','Pas intéressé')">Pas intéressé</button>`}
        <button class="mini-btn red" onclick="del('visits','${v.id}')">Supprimer</button>
      </div>
    </article>`
  }).join(""):'<div class="card"><p>Aucune visite. Clique sur + pour en créer une.</p></div>';
}

function relanceLink(id){const pmt=state.payments.find(x=>x.id===id), pr=prop(pmt.propertyId), c=client(pmt.clientId);return wa(c?.phone,`Bonjour ${c?.name||""}, sauf erreur de notre part, il reste ${money(pmt.remaining)} à régler pour ${pr?.name||"le bien"} (${monthLabel(pmt.month)}).

Moyens de paiement :
${paymentMethodsText(pmt.agentId)}${sig(pmt.agentId)}`)}
function paymentShareLinks(pmt){
  const pr=prop(pmt.propertyId), tenant=client(pmt.clientId), owner=client(pr?.ownerId);
  const net=Number(pmt.amount||0)-Number(pmt.agencyCommission||0)-Number(pmt.managementCommission||0);
  const tenantMsg=`Bonjour ${tenant?.name||""},\n\nNous confirmons la bonne réception de votre paiement pour ${pr?.name||"le bien"}.\nMois concerné : ${monthLabel(pmt.month)}\nMontant payé : ${money(pmt.amount)}\nMoyen de paiement : ${pmt.paymentMethod||"Non renseigné"}\nMontant attendu : ${money(pmt.expected)}\nReste à payer : ${money(pmt.remaining)}\nStatut : ${pmt.status}.\n\nMoyens de paiement pour un complément éventuel :\n${paymentMethodsText(pmt.agentId)}\n\nMerci.${sig(pmt.agentId)}`;
  const ownerMsg=`Bonjour ${owner?.name||""},\n\nNous vous informons qu’un paiement a été reçu pour ${pr?.name||"votre bien"}.\nMois concerné : ${monthLabel(pmt.month)}\nMontant brut reçu : ${money(pmt.amount)}\nCommission agence/courtier : ${money(pmt.agencyCommission||0)}\nCommission gestion : ${money(pmt.managementCommission||0)}\nMontant net propriétaire : ${money(net)}\nReste éventuel côté locataire : ${money(pmt.remaining)}.\n\n${sig(pmt.agentId)}`;
  return {tenant:wa(tenant?.phone,tenantMsg), owner:wa(owner?.phone,ownerMsg)};
}

function renderPayments(){
  const list=scoped(state.payments);
  $("#paymentsList").innerHTML=list.length?list.map(p=>{
    const pr=prop(p.propertyId);
    const links=paymentShareLinks(p);

    return `<article class="card compact-payment-card">
      <div class="compact-payment-top">
        <div>
          <h3>${pr?.name||"Bien"}</h3>
          <small>${monthLabel(p.month)} • ${p.type}</small>
        </div>

        <strong>${money(p.amount)}</strong>
      </div>

      <div class="compact-payment-meta">
        <span>💳 ${p.paymentMethod||"Non renseigné"}</span>
        ${p.remaining>0
          ? `<span class="reste-inline">Reste : ${money(p.remaining)}</span>`
          : `<span class="paid-inline">Payé</span>`}
      </div>

      <div class="actions">
        <a class="mini-btn green" target="_blank" href="${links.tenant}">Locataire</a>
        <a class="mini-btn blue" target="_blank" href="${links.owner}">Proprio</a>
        ${p.remaining>0
          ? `<a class="mini-btn red" target="_blank" href="${relanceLink(p.id)}">Relance</a>`
          : ""}
      </div>
    </article>`
  }).join(""):'<div class="card"><p>Aucun paiement.</p></div>';
}

function renderEdl(){$("#edlList").innerHTML=scoped(state.edls).length?scoped(state.edls).map(e=>`<article class="card"><div class="card-top"><div><h3>🧾 PV ${e.type}</h3><p>${prop(e.propertyId)?.name||"Bien"}</p></div>${badge(e.type)}</div><p>Eau: ${e.water||"-"} • Électricité: ${e.power||"-"}</p><p>${(e.notes||"").replaceAll("\n","<br>")}</p></article>`).join(""):'<div class="card"><p>Aucun état des lieux. Clique sur + pour créer un PV.</p></div>';}
function renderAgents(){$("#agentsList").innerHTML=state.agents.map(a=>`<article class="card"><div class="card-top"><div><h3>👤 ${a.name}</h3><p>${a.role} • ${a.email||""}</p></div><span class="badge orange">${state.properties.filter(p=>p.agentId===a.id).length} biens</span></div><p>📱 ${a.phone||"-"}</p><p>📲 Paiement : ${a.wave||a.orangeMoney||a.freeMoney?"renseigné":"non renseigné"}</p><p>Signature : ${a.signature||a.name}</p><div class="actions"><button class="mini-btn blue" onclick="editAgent('${a.id}')">Modifier</button>${a.id!=="main"?`<button class="mini-btn red" onclick="del('agents','${a.id}')">Supprimer</button>`:""}</div></article>`).join("");}

async function resize(file){return new Promise(res=>{let r=new FileReader();r.onload=e=>{let img=new Image();img.onload=()=>{let c=document.createElement("canvas"),m=900,w=img.width,h=img.height;if(w>h&&w>m){h=h*m/w;w=m}else if(h>m){w=w*m/h;h=m}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",.72))};img.src=e.target.result};r.readAsDataURL(file)})}
async function photoInput(e){let files=[...e.target.files].slice(0,3); if(e.target.files.length>3) alert("Maximum 3 photos."); photos=await Promise.all(files.map(resize)); $("#photoPreview").innerHTML=photos.map(x=>`<img src="${x}">`).join("")}
function resetForms(){["propertyForm","clientForm","visitForm","paymentForm","edlForm","agentForm"].forEach(id=>$("#"+id)?.reset());["propertyId","clientId","agentId"].forEach(id=>$("#"+id).value="");photos=[];$("#photoPreview").innerHTML="";$("#paymentWarning").classList.add("hidden");$("#paymentShareBox")?.classList.add("hidden");opts();applyAgentContext();}
function showTracking(id){state.trackingId=id;save();nav("tracking")}
function payForProperty(id){
  const p=prop(id);
  if(!canCollectProperty(p)){
    alert(collectBlockMessage(p));
    return;
  }
  state.trackingId=id;
  openModal("paymentModal");
  $("#paymentProperty").value=id;
  prefillPayment();
}
function editProperty(id){let p=prop(id); if(!p)return; openModal("propertyModal"); $("#propertyId").value=p.id; $("#propertyAgent").value=p.agentId; $("#propertyName").value=p.name; $("#propertyDealType").value=p.dealType; $("#propertyStatus").value=p.status; $("#propertyType").value=p.type; $("#propertyArea").value=p.area; $("#propertyPrice").value=p.price; $("#propertyCharges").value=p.charges; $("#propertyMoveInDate").value=p.moveInDate||""; $("#propertyManagementRate").value=p.managementRate; $("#propertyOwner").value=p.ownerId; $("#propertyOccupant").value=p.occupantId; $("#propertyDescription").value=p.description; photos=p.photos||[]; $("#photoPreview").innerHTML=photos.map(x=>`<img src="${x}">`).join("")}
function editClient(id){let c=client(id); openModal("clientModal"); $("#clientId").value=c.id; $("#clientAgent").value=c.agentId; $("#clientName").value=c.name; $("#clientType").value=c.type; $("#clientPhone").value=c.phone; $("#clientEmail").value=c.email; $("#clientNotes").value=c.notes}
function editAgent(id){let a=agent(id); openModal("agentModal"); $("#agentId").value=a.id; $("#agentName").value=a.name; $("#agentPhone").value=a.phone; $("#agentEmail").value=a.email; $("#agentRole").value=a.role; $("#agentWave").value=a.wave||""; $("#agentOrangeMoney").value=a.orangeMoney||""; $("#agentFreeMoney").value=a.freeMoney||""; $("#agentSignature").value=a.signature||""}
function del(k,id){ if(!confirm("Supprimer ?"))return; state[k]=state[k].filter(x=>x.id!==id); save(); render(); }
function qualifyVisit(id,q){let v=state.visits.find(x=>x.id===id); v.qualification=q; save(); render();}

function prefillPayment(){
  if(!$("#paymentProperty").value && scoped(state.properties)[0]) $("#paymentProperty").value=scoped(state.properties)[0].id;
  const p=prop($("#paymentProperty").value); if(!p)return; const now=new Date(); const ym=now.toISOString().slice(0,7); $("#paymentMonth").value=$("#paymentMonth").value||ym; $("#paymentClient").value=p.occupantId||""; $("#paymentRent").value=p.price||0; $("#paymentManagementRate").value=p.managementRate||0; $("#paymentMoveInDate").value=p.moveInDate||""; $("#paymentMethodsPreview").innerHTML=`Moyens de paiement visibles dans les relances : ${paymentMethodsHtml(p.agentId)}`; calculatePayment();}
function calculatePayment(){
  const p=prop($("#paymentProperty").value), ym=$("#paymentMonth").value, type=$("#paymentType").value; if(!p||!ym)return;
  let expected=Number(p.price||0);
  if(type==="Entrée location 3 mois") expected=Number(p.price||0)*3;
  if($("#paymentProrata").checked && type==="Loyer mensuel"){
    const d=$("#paymentMoveInDate").value||p.moveInDate;
    if(d && d.slice(0,7)===ym){const day=Number(d.slice(8,10)); const total=daysInMonth(ym); expected=Math.round(Number(p.price||0)*(total-day+1)/total);}
  }
  $("#paymentRent").value=p.price||0; $("#paymentExpected").value=expected;
  const amount=Number($("#paymentAmount").value||0); $("#paymentRemaining").value=Math.max(0, expected-amount);
  const duplicate=state.payments.find(x=>x.propertyId===p.id && x.month===ym && x.type==="Loyer mensuel" && x.remaining===0 && x.status==="Confirmé");
  const warn=$("#paymentWarning");
  if(duplicate && type==="Loyer mensuel"){warn.textContent=`Attention : le loyer de ${monthLabel(ym)} est déjà réglé pour ce bien. Impossible d'encaisser une deuxième fois le même mois.`; warn.classList.remove("hidden");}
  else warn.classList.add("hidden");
}

function bind(){
  $("#loginForm").onsubmit=e=>{e.preventDefault();login()};
  $("#logoutBtn").onclick=logout; $("#moreBtn").onclick=()=>$("#moreMenu").classList.toggle("hidden");
  $$(".nav,.menu-item").forEach(b=>{if(b.dataset.view)b.onclick=()=>nav(b.dataset.view)});
  $$("[data-open]").forEach(b=>b.onclick=()=>openModal(b.dataset.open));
  $$("[data-close]").forEach(b=>b.onclick=closeModals);
  $$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModals()});
  $("#workspaceSelect").onchange=e=>{state.workspace=e.target.value;save();render()};
  $("#propertySearch").oninput=renderProperties; $("#clientSearch").oninput=renderClients;
  $$(".chip").forEach(c=>c.onclick=()=>{$$(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");state.filter=c.dataset.propFilter;renderProperties()});
  $("#uploadPhotoBtn").onclick=()=>$("#propertyPhotosUpload").click();
  $("#cameraPhotoBtn").onclick=()=>$("#propertyPhotosCamera").click();
  $("#propertyPhotosUpload").onchange=photoInput; $("#propertyPhotosCamera").onchange=photoInput;
  $("#demoBtn").onclick=seed; 
  $("#sharePaymentMethodsBtn").onclick=()=>{
    opts();
    const agentId=currentResponsibleAgent();
    $("#paymentMethodsMessage").value=`Bonjour,\n\nVoici les moyens de paiement disponibles :\n${paymentMethodsText(agentId)}${sig(agentId)}`;
    $("#paymentMethodsModal").classList.add("open");
  };
  $("#paymentMethodsForm").onsubmit=e=>{
    e.preventDefault();
    const c=client($("#paymentMethodsRecipient").value);
    if(!c?.phone){alert("Choisis un destinataire avec un numéro WhatsApp.");return;}
    window.open(wa(c.phone,$("#paymentMethodsMessage").value),"_blank");
    closeModals();
  };
  $("#resetBtn").onclick=()=>{if(confirm("Tout effacer ?")){localStorage.removeItem(KEY);location.reload()}};
  ["paymentProperty","paymentMonth","paymentType","paymentAmount","paymentProrata","paymentMoveInDate"].forEach(id=>{
    $("#"+id).oninput=calculatePayment;
    $("#"+id).onchange=calculatePayment;
  });

  $("#agentForm").onsubmit=e=>{e.preventDefault();let id=$("#agentId").value||uid("agent"), a={id,name:$("#agentName").value,phone:$("#agentPhone").value,email:$("#agentEmail").value,role:$("#agentRole").value,wave:$("#agentWave").value,orangeMoney:$("#agentOrangeMoney").value,freeMoney:$("#agentFreeMoney").value,signature:$("#agentSignature").value}; let i=state.agents.findIndex(x=>x.id===id); i>=0?state.agents[i]=a:state.agents.push(a); save(); closeModals(); render()};
  $("#clientForm").onsubmit=e=>{e.preventDefault();let id=$("#clientId").value||uid("client"), c={id,agentId:$("#clientAgent").value||currentResponsibleAgent()||currentResponsibleAgent(),name:$("#clientName").value,type:$("#clientType").value,phone:$("#clientPhone").value,email:$("#clientEmail").value,notes:$("#clientNotes").value}; let i=state.clients.findIndex(x=>x.id===id); i>=0?state.clients[i]=c:state.clients.unshift(c); save(); closeModals(); render()};
  $("#propertyForm").onsubmit=e=>{e.preventDefault();let id=$("#propertyId").value||uid("prop"), p={id,agentId:$("#propertyAgent").value||currentResponsibleAgent()||currentResponsibleAgent(),name:$("#propertyName").value,dealType:$("#propertyDealType").value,status:$("#propertyStatus").value,type:$("#propertyType").value,area:$("#propertyArea").value,price:+$("#propertyPrice").value,charges:+$("#propertyCharges").value,moveInDate:$("#propertyMoveInDate").value,managementRate:+$("#propertyManagementRate").value,ownerId:$("#propertyOwner").value,occupantId:$("#propertyOccupant").value,photos:photos.slice(0,3),description:$("#propertyDescription").value}; let i=state.properties.findIndex(x=>x.id===id); i>=0?state.properties[i]=p:state.properties.unshift(p); save(); closeModals(); render()};
  $("#visitForm").onsubmit=e=>{e.preventDefault();let p=prop($("#visitProperty").value); if(!p){alert("Crée d'abord un bien.");return;} state.visits.unshift({id:uid("visit"),agentId:p.agentId||"main",name:$("#visitProspectName").value,phone:$("#visitProspectPhone").value,propertyId:p.id,date:($("#visitDateTime").value||"").slice(0,10),time:($("#visitDateTime").value||"").slice(11,16),qualification:$("#visitQualification").value,note:$("#visitNote").value});save();closeModals();render();nav("visits")};
  $("#paymentForm").onsubmit=e=>{
    e.preventDefault();
    calculatePayment();
    let p=prop($("#paymentProperty").value), amount=+$("#paymentAmount").value, type=$("#paymentType").value, ym=$("#paymentMonth").value, expected=+$("#paymentExpected").value, remaining=+$("#paymentRemaining").value, rate=+$("#paymentManagementRate").value||p?.managementRate||0;
    if(!canCollectProperty(p)){ alert(collectBlockMessage(p)); return; }
    let duplicate=state.payments.find(x=>x.propertyId===p.id&&x.month===ym&&x.type==="Loyer mensuel"&&x.remaining===0&&x.status==="Confirmé");
    if(duplicate&&type==="Loyer mensuel"){calculatePayment();return;}
    let agency=type==="Entrée location 3 mois"?Math.round((p.price||0)):0;
    const newPayment={id:uid("pay"),agentId:p?.agentId||"main",propertyId:p?.id,clientId:$("#paymentClient").value,type,month:ym,expected,amount,paymentMethod:$("#paymentMethod").value,status:remaining>0?"Partiel":"Confirmé",remaining,agencyCommission:agency,managementCommission:Math.round(amount*rate/100),dueDate:$("#paymentDueDate").value,date:new Date().toISOString()};
    state.payments.unshift(newPayment);
    save();
    render();
    const links=paymentShareLinks(newPayment);
    $("#shareTenantBtn").href=links.tenant;
    $("#shareOwnerBtn").href=links.owner;
    $("#paymentShareBox").classList.remove("hidden");
    $("#paymentWarning").classList.add("hidden");
  };
  $("#edlForm").onsubmit=e=>{e.preventDefault();let p=prop($("#edlProperty").value); if(!p){alert("Crée d'abord un bien.");return;} state.edls.unshift({id:uid("edl"),agentId:p.agentId||"main",propertyId:p.id,type:$("#edlType").value,water:$("#edlWater").value,power:$("#edlPower").value,notes:$("#edlNotes").value,date:new Date().toISOString()});save();closeModals();render();nav("edl")};
}


function seed(){
  state.agents=[
    {
      id:"a1",
      name:"Aminata Courtage",
      role:"Courtier",
      phone:"221771112233",
      email:"courtier@demo.sn",
      wave:"",
      orangeMoney:"",
      freeMoney:"",
      signature:""
    }
  ];
  state.clients=[];
  state.properties=[];
  state.payments=[];
  state.visits=[];
  state.edls=[];
  save();
  render();
}


load();ensure();bind(); refreshModeUI(); if(state.logged){ $("#loginScreen").classList.add("hidden"); $("#app").classList.remove("hidden"); render(); } else render();

window.addEventListener("beforeunload", save);
