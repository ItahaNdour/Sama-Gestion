let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
let mesBiens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let adminName = localStorage.getItem('sama_admin') || "Gestionnaire Immo";
let historique = JSON.parse(localStorage.getItem('sama_history')) || [];
let zonesInspectees = [];

function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    if (viewId === 'biens') renderBiens(mesBiens);
    if (viewId === 'collecter') renderCollecte();
    if (viewId === 'dashboard') updateUI();
    if (viewId === 'etat') initSignature();
}

function updateUI() {
    document.getElementById('totalDisplay').innerText = collected.toLocaleString() + " CFA";
    document.getElementById('displayAdminName').innerText = adminName;
    renderHistory();
    const percent = (collected / 10000000) * 100;
    document.getElementById('gaugeFill').style.width = Math.min(percent, 100) + "%";
}

// --- FILTRE ET RECHERCHE ---
function filterBiens() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = mesBiens.filter(b => 
        b.nom.toLowerCase().includes(val) || b.adresse.toLowerCase().includes(val)
    );
    renderBiens(filtered);
}

// --- COLLECTE ET HISTORIQUE ---
function encaisser(index) {
    const bien = mesBiens[index];
    const methode = document.getElementById('paymentMethod').value;
    const date = new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    collected += bien.loyer;
    const paiement = {
        nom: bien.nom,
        montant: bien.loyer,
        date: date,
        methode: methode,
        auteur: adminName
    };

    historique.unshift(paiement);
    if(historique.length > 5) historique.pop();

    localStorage.setItem('sama_collected', collected);
    localStorage.setItem('sama_history', JSON.stringify(historique));
    showView('dashboard');
}

function renderHistory() {
    const container = document.getElementById('dashboardHistory');
    container.innerHTML = historique.map(p => `
        <div class="history-item">
            <strong>${p.nom}</strong> : ${p.montant.toLocaleString()} CFA
            <small>${p.date} • via ${p.methode} • par ${p.auteur}</small>
        </div>
    `).join('');
}

// --- GESTION DES BIENS ---
function saveNewBien() {
    const nom = document.getElementById('addNom').value;
    const adresse = document.getElementById('addAdresse').value;
    const loyer = document.getElementById('addLoyer').value;
    if(!nom || !adresse || !loyer) return alert("Champs vides !");
    mesBiens.push({ nom, adresse, loyer: parseFloat(loyer) });
    localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
    showView('biens');
}

function renderBiens(liste) {
    const container = document.getElementById('biensList');
    container.innerHTML = liste.map((b, i) => `
        <div class="history-item" style="border-left-color: var(--primary)">
            <h4>${b.nom}</h4>
            <p>${b.adresse}</p>
            <strong>${b.loyer.toLocaleString()} CFA</strong>
        </div>
    `).join('');
}

function updateAdminName() {
    const val = document.getElementById('adminNameInput').value;
    if(val) { adminName = val; localStorage.setItem('sama_admin', val); updateUI(); showView('dashboard'); }
}

// --- SIGNATURE (Simplié pour l'exemple) ---
function initSignature() { /* Logique canvas habituelle */ }
function toggleZone(z) { /* Logique toggle zones habituelle */ }
function sendWhatsAppReport() { alert("Rapport envoyé via WhatsApp !"); }

window.onload = updateUI;
