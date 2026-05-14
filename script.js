let mesBiens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let historique = JSON.parse(localStorage.getItem('sama_history')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let collectedTotal = parseFloat(localStorage.getItem('sama_collected')) || 0;

function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    
    if(viewId === 'biens') renderBiens(mesBiens);
    if(viewId === 'collecter') renderCollecte();
    if(viewId === 'visites') renderVisites();
    if(viewId === 'dashboard') updateDashboard();
    
    // Remplir les sélecteurs de biens
    if(['etat', 'visites'].includes(viewId)) {
        const selects = ['etatBienSelect', 'visiteBienSelect'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = mesBiens.map(b => `<option>${b.nom}</option>`).join('');
        });
    }
}

function updateDashboard() {
    document.getElementById('totalDisplay').innerText = collectedTotal.toLocaleString() + " CFA";
    const histContainer = document.getElementById('dashboardHistory');
    histContainer.innerHTML = historique.slice(0, 5).map(h => `
        <div class="card success">
            <strong>${h.bien}</strong> (${h.locataire})<br>
            <small>${h.date} • ${h.montant.toLocaleString()} CFA • ${h.methode}</small>
        </div>
    `).join('');
}

// --- GESTION DES BIENS ---
function saveNewBien() {
    const bien = {
        nom: document.getElementById('addNom').value,
        locataire: document.getElementById('addLocataire').value,
        adresse: document.getElementById('addAdresse').value,
        loyer: parseFloat(document.getElementById('addLoyer').value)
    };
    if(!bien.nom || !bien.loyer) return alert("Nom et Loyer requis !");
    mesBiens.push(bien);
    localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
    showView('biens');
}

function renderBiens(liste) {
    document.getElementById('biensList').innerHTML = liste.map((b, i) => `
        <div class="card">
            <h4>${b.nom}</h4>
            <p><i class="fas fa-user"></i> ${b.locataire || 'Pas de locataire'}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${b.adresse}</p>
            <strong>${b.loyer.toLocaleString()} CFA</strong>
            <button onclick="deleteBien(${i})" style="float:right; color:red; border:none; background:none"><i class="fas fa-trash"></i></button>
        </div>
    `).join('<br>');
}

function filterBiens() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = mesBiens.filter(b => b.nom.toLowerCase().includes(val) || b.adresse.toLowerCase().includes(val));
    renderBiens(filtered);
}

// --- COLLECTE ---
function renderCollecte() {
    document.getElementById('collecteList').innerHTML = mesBiens.map((b, i) => `
        <div class="card">
            <strong>${b.nom}</strong> - ${b.locataire}<br>
            <button class="primary-btn" style="margin-top:10px" onclick="encaisser(${i})">Encaisser ${b.loyer.toLocaleString()} CFA</button>
        </div>
    `).join('<br>');
}

function encaisser(index) {
    const b = mesBiens[index];
    const methode = document.getElementById('payMethod').value;
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR') + " " + now.getHours() + ":" + now.getMinutes();

    const paiement = { bien: b.nom, locataire: b.locataire, montant: b.loyer, methode: methode, date: dateStr };
    historique.unshift(paiement);
    collectedTotal += b.loyer;

    localStorage.setItem('sama_history', JSON.stringify(historique));
    localStorage.setItem('sama_collected', collectedTotal);
    showView('dashboard');
}

// --- VISITES ---
function addVisite() {
    const v = {
        client: document.getElementById('visiteClient').value,
        date: document.getElementById('visiteDate').value,
        bien: document.getElementById('visiteBienSelect').value
    };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    document.getElementById('visitesList').innerHTML = visites.map(v => `
        <div class="card" style="border-left-color:var(--primary)">
            <strong>${v.client}</strong> pour <strong>${v.bien}</strong><br>
            <small>RDV le : ${new Date(v.date).toLocaleString('fr-FR')}</small>
        </div>
    `).join('');
}

// --- ÉTAT DES LIEUX ---
function openCamera(zone) { alert("Ouverture Caméra pour : " + zone); }
function saveEtatLieux() { alert("Rapport enregistré et envoyé !"); showView('dashboard'); }

window.onload = updateDashboard;
