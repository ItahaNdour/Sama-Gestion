// --- DATA INITIALISATION ---
let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
let mesBiens = JSON.parse(localStorage.getItem('sama_biens')) || [
    { id: Date.now(), nom: "Villa Horizon", adresse: "Almadies", loyer: 850000, statut: "Occupé" }
];
const target = 10000000;
let zonesInspectees = [];

// --- NAVIGATION ---
function showView(viewId) {
    // Cache toutes les vues
    document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
    // Affiche la cible
    document.getElementById('view-' + viewId).style.display = 'block';
    
    // Initialisation selon la vue
    if (viewId === 'biens') renderBiens(mesBiens);
    if (viewId === 'collecter') renderCollecte();
    if (viewId === 'dashboard') updateDashboard();
}

// --- LOGIQUE DASHBOARD ---
function updateDashboard() {
    document.getElementById('totalDisplay').innerText = collected.toLocaleString() + " CFA";
    const percent = (collected / target) * 100;
    document.getElementById('gaugeFill').style.width = Math.min(percent, 100) + "%";
}

// --- LOGIQUE ÉTAT DES LIEUX ---
function toggleZone(zone) {
    const slot = document.getElementById('slot-' + zone.toLowerCase());
    if (zonesInspectees.includes(zone)) {
        zonesInspectees = zonesInspectees.filter(z => z !== zone);
        slot.classList.remove('active');
    } else {
        zonesInspectees.push(zone);
        slot.classList.add('active');
    }
}

function sendWhatsAppReport() {
    const notes = document.getElementById('etatNotes').value;
    const msg = `🏠 *ETAT DES LIEUX*\nZones: ${zonesInspectees.join(', ') || 'N/A'}\nNotes: ${notes || 'RAS'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

// --- LOGIQUE MES BIENS (AJOUT ET LISTE) ---
function renderBiens(liste) {
    const container = document.getElementById('biensList');
    container.innerHTML = liste.map(b => `
        <div class="bien-card">
            <div>
                <h4>${b.nom}</h4>
                <p style="font-size:12px; color:gray">${b.adresse} - ${b.loyer.toLocaleString()} CFA</p>
            </div>
            <div class="status-badge ${b.statut === 'Libre' ? 'status-libre' : 'status-occupe'}">${b.statut}</div>
        </div>
    `).join('');
}

function saveNewBien() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('addNom').value,
        adresse: document.getElementById('addAdresse').value,
        loyer: parseFloat(document.getElementById('addLoyer').value),
        statut: "Libre"
    };
    if (!b.nom || !b.loyer) return alert("Veuillez remplir le nom et le loyer");
    mesBiens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
    showView('biens');
}

function filterBiens() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtrage = mesBiens.filter(b => b.nom.toLowerCase().includes(val));
    renderBiens(filtrage);
}

// --- LOGIQUE COLLECTE ---
function renderCollecte() {
    const container = document.getElementById('collecteList');
    container.innerHTML = mesBiens.map(b => `
        <div class="bien-card">
            <h4>${b.nom}</h4>
            <button class="primary-btn" style="width:auto; padding:8px 15px" onclick="encaisser(${b.id}, ${b.loyer})">Encaisser</button>
        </div>
    `).join('');
}

function encaisser(id, montant) {
    collected += montant;
    localStorage.setItem('sama_collected', collected);
    alert("Encaissement réussi !");
    showView('dashboard');
}

// Init
window.onload = updateDashboard;
