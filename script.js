let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
    if(viewId === 'biens') renderBiens();
}

function filterBiens(statut, e) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

function saveBienPro() {
    const b = {
        id: Date.now(),
        photo: document.getElementById('new-bien-photo').value || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400",
        nom: document.getElementById('new-bien-nom').value,
        type: document.getElementById('new-bien-type').value,
        loyer: document.getElementById('new-bien-loyer').value,
        proprio: document.getElementById('new-bien-proprio').value || "Inconnu",
        commission: document.getElementById('new-bien-com').value || "Non définie",
        statut: 'Disponible',
        historique: [],
        locataireActuel: null,
        jardin: document.getElementById('check-jardin').checked,
        clim: document.getElementById('check-clim').checked,
        parking: document.getElementById('check-parking').checked,
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
            <img src="${b.photo}" class="bien-img">
            <div style="display:flex; justify-content:space-between; align-items:start">
                <div>
                    <strong>${b.nom}</strong><br>
                    <span class="com-badge">Commission: ${b.commission}</span>
                </div>
                <span style="font-size:0.7rem; font-weight:bold; color:${b.statut==='Occupé'?'red':'green'}">${b.statut}</span>
            </div>
            <div style="margin:8px 0; font-size:0.85rem; color:#666">Bailleur: ${b.proprio}</div>
            <div style="margin-bottom:10px">
                <span class="tag">${b.type}</span>
                ${b.jardin?'<span class="tag">🌳 Jardin</span>':''}
                ${b.clim?'<span class="tag">❄️ Clim</span>':''}
            </div>
            <div style="display:flex; gap:10px">
                <button class="wa-btn" style="background:var(--navy); flex:2" onclick="toggleStatutLocataire(${b.id})">
                    ${b.statut === 'Occupé' ? 'Libérer' : 'Louer'}
                </button>
                <button class="wa-btn" style="background:#eee; color:#333; flex:1" onclick="voirHistorique(${b.id})">
                    <i class="fas fa-history"></i>
                </button>
            </div>
            <div style="text-align:right; margin-top:8px" onclick="deleteBien(${b.id})"><i class="fas fa-trash" style="color:red; font-size:0.8rem"></i></div>
        </div>
    `).reverse().join('') || '<p style="text-align:center; padding:20px; color:#999">Vide</p>';
}

function toggleStatutLocataire(id) {
    const idx = biens.findIndex(x => x.id === id);
    const b = biens[idx];
    if (b.statut === 'Disponible') {
        const nom = prompt("Nom du locataire ?");
        if(nom) {
            b.statut = 'Occupé';
            b.locataireActuel = nom;
            b.dateEntree = new Date().toLocaleDateString();
        }
    } else {
        if(confirm("Libérer ? Le locataire sera archivé.")) {
            b.historique.push({ nom: b.locataireActuel, date: b.dateEntree });
            b.statut = 'Disponible';
            b.locataireActuel = null;
        }
    }
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function voirHistorique(id) {
    const b = biens.find(x => x.id === id);
    const hist = b.historique.map(h => `<p style="font-size:0.8rem; border-bottom:1px solid #eee; padding:5px"><b>${h.nom}</b> (Entrée: ${h.date})</p>`).join('') || "Aucun historique.";
    document.getElementById('hist-content').innerHTML = hist;
    document.getElementById('modal-historique').style.display = 'flex';
}

function deleteBien(id) {
    if(confirm("Supprimer ?")) {
        biens = biens.filter(x => x.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        renderBiens();
    }
}

window.onload = () => showView('dashboard');
