let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') { populateSelect(); renderVisites(); }
}

// BIENS
function saveBienPro() {
    const b = {
        id: Date.now(),
        photo: document.getElementById('new-bien-photo').value || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400",
        nom: document.getElementById('new-bien-nom').value,
        type: document.getElementById('new-bien-type').value,
        loyer: document.getElementById('new-bien-loyer').value,
        proprio: document.getElementById('new-bien-proprio').value,
        commission: document.getElementById('new-bien-com').value,
        statut: 'Disponible',
        historique: [],
        jardin: document.getElementById('check-jardin').checked,
        clim: document.getElementById('check-clim').checked
    };
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    list.innerHTML = filtered.map(b => `
        <div class="bien-card">
            <img src="${b.photo}" class="bien-img">
            <strong>${b.nom}</strong>
            <div style="margin:5px 0; font-size:0.8rem">Bailleur: ${b.proprio} | Com: ${b.commission}</div>
            <div style="display:flex; gap:5px; margin-top:10px">
                <button class="wa-btn" style="background:var(--navy)" onclick="toggleStatut(${b.id})">${b.statut === 'Occupé' ? 'Libérer' : 'Louer'}</button>
                <button class="wa-btn" style="background:#eee; color:#333" onclick="voirHistorique(${b.id})"><i class="fas fa-history"></i></button>
            </div>
        </div>
    `).join('');
}

function toggleStatut(id) {
    const b = biens.find(x => x.id === id);
    if(b.statut === 'Disponible') {
        const nom = prompt("Nom du locataire ?");
        if(nom) { b.statut = 'Occupé'; b.locataireActuel = nom; b.dateEntree = new Date().toLocaleDateString(); }
    } else {
        b.historique.push({nom: b.locataireActuel, date: b.dateEntree});
        b.statut = 'Disponible';
    }
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

// VISITES (VERSION ORIGINALE RÉTABLIE)
function populateSelect() {
    const sel = document.getElementById('p-bien-select');
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const v = {
        id: Date.now(),
        nom: document.getElementById('p-name').value,
        date: document.getElementById('p-date').value,
        bien: document.getElementById('p-bien-select').value,
        status: 'prévu',
        note: '',
        qualif: ''
    };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    list.innerHTML = visites.map(v => `
        <div class="visite-item" style="border-left:5px solid ${v.status === 'terminé' ? '#ccc' : '#2ECC71'}">
            <strong>${v.nom}</strong> ${v.qualif ? ' - ' + v.qualif : ''}<br>
            <small>${v.bien} | ${v.date}</small>
            ${v.status === 'prévu' ? `<button class="wa-btn" onclick="ouvrirRapport(${v.id})">Terminer Visite</button>` : `<p style="font-size:0.8rem; margin-top:5px; color:#666">Note: ${v.note}</p>`}
        </div>
    `).reverse().join('');
}

function ouvrirRapport(id) { currentVisiteId = id; document.getElementById('modal-rapport').style.display = 'flex'; }
function setClientStatus(s) { currentQualif = s; }
function validerRapport() {
    const v = visites.find(x => x.id === currentVisiteId);
    v.status = 'terminé';
    v.note = document.getElementById('rapport-note').value;
    v.qualif = currentQualif === 'chaud' ? '🔥 Chaud' : '❄️ Froid';
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display = 'none';
    renderVisites();
}

window.onload = () => showView('dashboard');
