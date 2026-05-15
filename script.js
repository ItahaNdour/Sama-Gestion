let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentVisiteId = null;
let currentStatus = '';

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'dashboard') updateDashboard();
    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') { populateSelect(); renderVisites(); }
}

// DASHBOARD LOGIC
function updateDashboard() {
    const total = biens.reduce((sum, b) => b.statut === 'Occupé' ? sum + parseInt(b.loyer) : sum, 0);
    document.getElementById('total-display').innerText = total.toLocaleString() + " CFA";
    
    // Animation barre de progression (max fictif 2.000.000)
    const goal = 2000000;
    const pct = Math.min((total / goal) * 100, 100);
    document.getElementById('main-progress').style.width = pct + "%";
}

// MODULE BIENS
function saveBienPro() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('new-bien-nom').value,
        type: document.getElementById('new-bien-type').value,
        loyer: document.getElementById('new-bien-loyer').value,
        statut: document.getElementById('new-bien-statut').value
    };
    if(!b.nom || !b.loyer) return alert("Champs obligatoires");
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    list.innerHTML = biens.map(b => `
        <div class="bien-card">
            <div class="bien-header">
                <div>
                    <strong>${b.nom}</strong><br>
                    <small style="color:#999">${b.type}</small>
                </div>
                <span class="badge ${b.statut === 'Occupé' ? 'occupe' : 'dispo'}">${b.statut}</span>
            </div>
            <div style="font-size:1.2rem; font-weight:bold; color:var(--blue); margin-top:10px;">
                ${parseInt(b.loyer).toLocaleString()} CFA
            </div>
            <div style="text-align:right">
                <i class="fas fa-trash" style="color:#ff4d4d; cursor:pointer;" onclick="deleteBien(${b.id})"></i>
            </div>
        </div>
    `).reverse().join('') || '<p style="text-align:center;padding:20px;">Aucun bien.</p>';
}

function deleteBien(id) {
    if(confirm("Supprimer ce bien ?")) {
        biens = biens.filter(b => b.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        renderBiens();
    }
}

// MODULE PLANNING
function populateSelect() {
    const sel = document.getElementById('p-bien-select');
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('') || '<option>Créez un bien d\'abord</option>';
}

function sauverVisitePro() {
    const v = {
        id: Date.now(),
        nom: document.getElementById('p-name').value,
        tel: document.getElementById('p-phone').value,
        date: document.getElementById('p-date').value,
        bien: document.getElementById('p-bien-select').value,
        status: 'prévu', qualif: '', note: ''
    };
    if(!v.nom || !v.date) return alert("Remplissez tout");
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const container = document.getElementById('visites-list');
    const today = new Date().toISOString().split('T')[0];
    container.innerHTML = visites.map(v => {
        const isToday = v.date.split('T')[0] === today;
        const isDone = v.status === 'terminé';
        return `
        <div class="visite-item ${isToday ? 'active' : ''} ${isDone ? 'done' : ''}">
            <div style="display:flex; justify-content:space-between">
                <strong>${v.nom}</strong>
                <small>${v.qualif ? v.qualif.toUpperCase() : ''}</small>
            </div>
            <div style="font-size:0.8rem; color:#666">${v.bien} | ${new Date(v.date).toLocaleString()}</div>
            ${!isDone ? `<button class="v-btn-check" ${!isToday ? 'disabled' : ''} onclick="ouvrirRapport(${v.id})">${isToday ? 'Débuter visite' : 'Jour J uniquement'}</button>` : `<p>📝 ${v.note}</p>`}
        </div>`;
    }).reverse().join('') || '<p style="text-align:center;padding:20px;">Pas de visites.</p>';
}

function ouvrirRapport(id) {
    currentVisiteId = id;
    document.getElementById('rapport-client-name').innerText = "Client : " + visites.find(v => v.id === id).nom;
    document.getElementById('modal-rapport').style.display = 'flex';
}

function setClientStatus(st) {
    currentStatus = st;
    document.querySelectorAll('.st-btn').forEach(b => b.classList.remove('selected-st'));
    document.getElementById('btn-'+st).classList.add('selected-st');
}

function validerRapport() {
    const idx = visites.findIndex(v => v.id === currentVisiteId);
    visites[idx].status = 'terminé';
    visites[idx].qualif = currentStatus;
    visites[idx].note = document.getElementById('rapport-note').value;
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display = 'none';
    renderVisites();
}

window.onload = () => showView('dashboard');
