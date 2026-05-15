let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let encaisséCeMois = JSON.parse(localStorage.getItem('sama_paye')) || 0; // Futur module Collecte

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    if(viewId === 'dashboard') updateDashboard();
    if(viewId === 'biens') renderBiens();
}

function updateDashboard() {
    // Le chiffre ne bouge que sur encaissement manuel (encaisséCeMois)
    document.getElementById('total-display').innerText = encaisséCeMois.toLocaleString() + " CFA";
}

function toggleDateEntree() {
    const statut = document.getElementById('new-bien-statut').value;
    document.getElementById('date-entree-group').style.display = (statut === 'Occupé') ? 'block' : 'none';
}

function saveBienPro() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('new-bien-nom').value,
        type: document.getElementById('new-bien-type').value,
        loyer: document.getElementById('new-bien-loyer').value,
        statut: document.getElementById('new-bien-statut').value,
        dateEntree: document.getElementById('new-bien-date').value || "Non définie"
    };
    if(!b.nom || !b.loyer) return alert("Nom et Loyer requis");
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    list.innerHTML = biens.map(b => `
        <div class="bien-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong style="font-size:1.1rem;">${b.nom}</strong><br>
                    <small style="color:var(--blue); font-weight:bold;">${b.type}</small>
                </div>
                <span class="badge ${b.statut === 'Occupé' ? 'occupe' : 'dispo'}">${b.statut}</span>
            </div>
            <div style="margin: 12px 0; font-size:1.2rem; font-weight:bold;">${parseInt(b.loyer).toLocaleString()} CFA</div>
            <div style="font-size:0.8rem; color:#888; border-top:1px solid #eee; padding-top:8px; display:flex; justify-content:space-between;">
                <span><i class="fas fa-calendar-alt"></i> Entrée: ${b.dateEntree}</span>
                <i class="fas fa-trash" style="color:#ff4d4d" onclick="deleteBien(${b.id})"></i>
            </div>
        </div>
    `).reverse().join('') || '<p style="text-align:center;padding:20px;">Aucun bien enregistré.</p>';
}

function deleteBien(id) {
    if(confirm("Supprimer ce bien ?")) {
        biens = biens.filter(b => b.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        renderBiens();
    }
}

window.onload = () => showView('dashboard');
