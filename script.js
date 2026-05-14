// --- DATA STORAGE ---
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') {
        populateBienSelect();
        renderVisites();
    }
    if(viewId === 'etat') renderEtatPieces();
}

// --- MODULE BIENS ---
function saveBien() {
    const nom = document.getElementById('new-bien-nom').value;
    const loc = document.getElementById('new-bien-locataire').value;
    const loy = document.getElementById('new-bien-loyer').value;

    if(!nom || !loy) return alert("Remplissez le nom et le loyer");

    biens.push({ id: Date.now(), nom, locataire: loc, loyer: parseInt(loy) });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    
    // Clear inputs
    document.getElementById('new-bien-nom').value = "";
    document.getElementById('new-bien-locataire').value = "";
    document.getElementById('new-bien-loyer').value = "";
    
    showView('biens');
}

function renderBiens() {
    const container = document.getElementById('biens-list');
    if(biens.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">Aucun bien enregistré.</div>`;
        return;
    }
    container.innerHTML = biens.map(b => `
        <div class="revenue-card" style="margin-bottom:12px;">
            <strong>${b.nom}</strong><br>
            <small>Locataire : ${b.locataire || 'N/A'}</small><br>
            <span style="color:var(--blue); font-weight:bold;">${b.loyer.toLocaleString()} CFA</span>
        </div>
    `).join('');
}

// --- MODULE PLANNING PRO ---
function populateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(biens.length === 0) {
        sel.innerHTML = `<option value="">Ajoutez d'abord un bien</option>`;
        return;
    }
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const tel = document.getElementById('p-phone').value;
    const bien = document.getElementById('p-bien-select').value;
    const date = document.getElementById('p-date').value;

    if(!nom || !date) return alert("Nom et Date obligatoires !");

    const newVisite = { id: Date.now(), nom, tel, bien, date };
    visites.push(newVisite);
    localStorage.setItem('sama_visites', JSON.stringify(visites));

    // Clear and Refresh
    document.getElementById('p-name').value = "";
    document.getElementById('p-phone').value = "";
    renderVisites();
}

function renderVisites() {
    const container = document.getElementById('visites-list');
    if(visites.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#999; padding:20px;">Aucune visite prévue.</p>`;
        return;
    }
    container.innerHTML = visites.map(v => `
        <div class="visite-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <strong>${v.nom}</strong>
                <small style="color:var(--blue)">${new Date(v.date).toLocaleDateString('fr-FR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</small>
            </div>
            <div style="font-size:0.85rem; color:#666;">Bien : ${v.bien}</div>
            <div class="visite-actions">
                <a href="tel:${v.tel}" class="action-link link-call"><i class="fas fa-phone"></i> Appeler</a>
                <a href="https://wa.me/${v.tel}" class="action-link link-wa"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                <button onclick="supprimerVisite(${v.id})" style="border:none; background:none; color:#ff4d4d; padding:10px;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).reverse().join('');
}

function supprimerVisite(id) {
    if(confirm("Supprimer ce RDV ?")) {
        visites = visites.filter(v => v.id !== id);
        localStorage.setItem('sama_visites', JSON.stringify(visites));
        renderVisites();
    }
}

// --- ÉTAT DES LIEUX ---
function renderEtatPieces() {
    const pieces = ["Salon", "Cuisine", "Chambre 1", "Chambre 2", "Salle de Bain"];
    const container = document.getElementById('pieces-container');
    container.innerHTML = pieces.map(p => `
        <div class="form-card" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${p}</span>
            <select style="width:auto; margin:0;" id="st-${p}">
                <option>Bon</option><option>Moyen</option><option>Mauvais</option>
            </select>
        </div>
    `).join('');
}

function sendWA() {
    let msg = "🏠 *ÉTAT DES LIEUX*\n\n";
    ["Salon", "Cuisine", "Chambre 1", "Chambre 2", "Salle de Bain"].forEach(p => {
        msg += `📍 ${p} : ${document.getElementById('st-'+p).value}\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

window.onload = () => showView('dashboard');
