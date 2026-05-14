let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') renderPlanningForm();
    if(viewId === 'etat') renderEtatForm();
}

// --- GESTION DES BIENS ---
function saveBien() {
    const nom = document.getElementById('new-bien-nom').value;
    const loc = document.getElementById('new-bien-locataire').value;
    const loyer = document.getElementById('new-bien-loyer').value;

    if(!nom || !loyer) return alert("Nom et Loyer obligatoires !");

    biens.push({ nom, locataire: loc, loyer: parseInt(loyer) });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    
    // Reset et retour
    document.getElementById('new-bien-nom').value = "";
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    list.innerHTML = biens.length === 0 ? "<p>Aucun bien. Cliquez sur +</p>" : 
        biens.map(b => `<div class="revenue-card" style="margin-bottom:10px">
            <strong>${b.nom}</strong><br><small>Locataire: ${b.locataire || 'N/A'}</small><br>
            <span style="color:var(--blue)">${b.loyer.toLocaleString()} CFA</span>
        </div>`).join('');
}

// --- PLANNING ---
function renderPlanningForm() {
    const sel = document.getElementById('v-bien-select');
    sel.innerHTML = biens.map(b => `<option>${b.nom}</option>`).join('');
}

function saveVisite() {
    const v = { nom: document.getElementById('v-nom').value, date: document.getElementById('v-date').value, bien: document.getElementById('v-bien-select').value };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    alert("Visite enregistrée !");
    showView('dashboard');
}

// --- ÉTAT DES LIEUX ---
const PIECES = ["Salon", "Cuisine", "Chambre 1", "Chambre 2", "Toilette"];
function renderEtatForm() {
    const container = document.getElementById('pieces-container');
    container.innerHTML = PIECES.map(p => `
        <div class="form-card" style="display:flex; justify-content:space-between">
            <span>${p}</span>
            <select style="width:auto; margin:0" id="st-${p}"><option>Bon</option><option>Moyen</option><option>Mauvais</option></select>
        </div>
    `).join('');
}

function sendWA() {
    let msg = "🏠 *ÉTAT DES LIEUX*\n";
    PIECES.forEach(p => { msg += `- ${p}: ${document.getElementById('st-'+p).value}\n`; });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

window.onload = () => showView('dashboard');
