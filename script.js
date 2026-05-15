let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') { populateSelect(); renderVisites(); }
}

function filterBiens(statut, event) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderBiens();
}

function saveBienPro() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('new-bien-nom').value,
        quartier: document.getElementById('new-bien-quartier').value,
        type: document.getElementById('new-bien-type').value,
        etage: document.getElementById('new-bien-etage').value,
        loyer: document.getElementById('new-bien-loyer').value,
        maps: document.getElementById('new-bien-maps').value,
        proprio: document.getElementById('new-bien-proprio').value,
        statut: 'Disponible',
        clim: document.getElementById('check-clim').checked,
        parking: document.getElementById('check-parking').checked,
        jardin: document.getElementById('check-jardin').checked,
        gardien: document.getElementById('check-gardien').checked
    };

    if(!b.nom || !b.loyer) return alert("Nom et Loyer obligatoires");
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);

    list.innerHTML = filtered.map(b => `
        <div class="bien-card">
            <div style="display:flex; justify-content:space-between">
                <div>
                    <strong style="font-size:1.1rem">${b.nom}</strong><br>
                    <small style="color:#888"><i class="fas fa-map-marker-alt"></i> ${b.quartier}</small>
                </div>
                <span class="badge ${b.statut === 'Occupé' ? 'occupe' : 'dispo'}">${b.statut}</span>
            </div>
            
            <div style="margin:10px 0; font-weight:bold; color:var(--blue); font-size:1.2rem">
                ${parseInt(b.loyer).toLocaleString()} CFA <span style="font-size:0.7rem; color:#aaa">/mois</span>
            </div>

            <div class="tag-row">
                <span class="tag">${b.type}</span>
                <span class="tag">Étage: ${b.etage}</span>
                ${b.clim ? '<span class="tag">❄️ Clim</span>' : ''}
                ${b.parking ? '<span class="tag">🅿️ Parking</span>' : ''}
                ${b.jardin ? '<span class="tag">🌳 Jardin</span>' : ''}
                ${b.gardien ? '<span class="tag">🛡️ Gardien</span>' : ''}
            </div>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="wa-btn" style="background:var(--navy)" onclick="changerStatut(${b.id})">
                    ${b.statut === 'Occupé' ? 'Libérer' : 'Louer'}
                </button>
                <button class="wa-btn" onclick="partagerWA(${b.id})">
                    <i class="fab fa-whatsapp"></i> Partager
                </button>
            </div>
            <div style="text-align:right; margin-top:8px">
                <i class="fas fa-trash" style="color:#ff4d4d; cursor:pointer" onclick="deleteBien(${b.id})"></i>
            </div>
        </div>
    `).reverse().join('') || '<p style="text-align:center; color:#999; margin-top:20px;">Aucun bien trouvé.</p>';
}

function partagerWA(id) {
    const b = biens.find(x => x.id === id);
    const options = [b.clim?'Clim':'', b.parking?'Parking':'', b.jardin?'Jardin':'', b.gardien?'Gardien':''].filter(Boolean).join(', ');
    const texte = `*OFFRE IMMOBILIÈRE*%0A---%0A*Produit:* ${b.type} - ${b.nom}%0A*Quartier:* ${b.quartier}%0A*Loyer:* ${parseInt(b.loyer).toLocaleString()} CFA/mois%0A*Options:* ${options}%0A*Localisation:* ${b.maps || 'Sur demande'}%0A---%0A_Intéressé ? Contactez-moi._`;
    window.open(`https://wa.me/?text=${texte}`);
}

function changerStatut(id) {
    const idx = biens.findIndex(x => x.id === id);
    biens[idx].statut = biens[idx].statut === 'Occupé' ? 'Disponible' : 'Occupé';
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function deleteBien(id) {
    if(confirm("Supprimer ?")) {
        biens = biens.filter(x => x.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        renderBiens();
    }
}

// ... (Garder les fonctions de Visites existantes) ...
function populateSelect() {
    const sel = document.getElementById('p-bien-select');
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}
function renderVisites() { /* identique au précédent */ }

window.onload = () => showView('dashboard');
