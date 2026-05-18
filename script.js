let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let selectedPhotos = [];

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') {
        currentFilter = 'Disponible';
        renderBiens(); 
    }
}

// --- GESTION DU FORMULAIRE DYNAMIQUE ---
// Cette fonction change le texte "Loyer" en "Prix" si c'est un terrain
function ajusterChampsParType() {
    const type = document.getElementById('new-bien-type').value;
    const loyerInput = document.getElementById('new-bien-loyer');
    if(type === 'Terrain') {
        loyerInput.placeholder = "Prix de vente total (CFA)";
    } else {
        loyerInput.placeholder = "Loyer mensuel (CFA)";
    }
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        if (selectedPhotos.length >= 3) return alert("Max 3 photos");
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotos.push(e.target.result);
            renderPhotoPreviews();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function renderPhotoPreviews() {
    const container = document.getElementById('previews-container');
    container.innerHTML = selectedPhotos.map((p, idx) => `
        <div style="position:relative; display:inline-block; margin:5px">
            <img src="${p}" style="width:60px; height:60px; border-radius:10px; object-fit:cover; border:2px solid #4A69FF">
            <i class="fas fa-times-circle" onclick="selectedPhotos.splice(${idx},1);renderPhotoPreviews()" 
               style="position:absolute; top:-5px; right:-5px; color:red; background:white; border-radius:50%; font-size:1.2rem; cursor:pointer"></i>
        </div>
    `).join('');
}

function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    const type = document.getElementById('new-bien-type').value;

    if(!nom || !loyer) return alert("Nom et Prix obligatoires !");

    const b = {
        id: Date.now(),
        nom: nom,
        type: type,
        adresse: document.getElementById('new-bien-adresse').value || "Sénégal",
        loyer: loyer,
        proprio: document.getElementById('new-bien-proprio').value || "-",
        com: document.getElementById('new-bien-com').value || "Non précisée",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400"],
        statut: 'Disponible'
    };

    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    
    // Reset complet
    selectedPhotos = [];
    document.getElementById('new-bien-nom').value = "";
    document.getElementById('new-bien-loyer').value = "";
    document.getElementById('new-bien-adresse').value = "";
    document.getElementById('new-bien-proprio').value = "";
    document.getElementById('new-bien-com').value = "";
    document.getElementById('previews-container').innerHTML = "";
    
    currentFilter = 'Disponible';
    alert("Bien enregistré !");
    showView('biens');
    renderBiens();
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    if(!list) return;

    biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
    const filtered = biens.filter(b => b.statut === currentFilter);
    
    if(filtered.length === 0) {
        list.innerHTML = `<p style="text-align:center; margin-top:40px; color:#64748b;">Aucun bien ${currentFilter.toLowerCase()} trouvé.</p>`;
        return;
    }

    list.innerHTML = filtered.map(b => {
        const estTerrain = b.type === 'Terrain';
        const labelPrix = estTerrain ? 'Prix' : 'Loyer';
        const actionBouton = estTerrain ? 'Marquer comme Vendu' : 'Marquer comme Loué';

        return `
        <div class="form-card">
            <div class="bien-gallery" style="display:flex; gap:10px; overflow-x:auto; margin-bottom:10px; padding-bottom:5px">
                ${b.photos.map(p => `<img src="${p}" onclick="zoomPhoto('${p}')" style="width:120px; height:120px; object-fit:cover; border-radius:15px; flex-shrink:0;">`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between">
                <div>
                    <strong style="font-size:1.1rem">${b.nom}</strong> <small style="color:#4A69FF">(${b.type})</small><br>
                    <small style="color:#64748b"><i class="fas fa-map-marker-alt"></i> ${b.adresse}</small>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:bold; color:var(--blue)">${parseInt(b.loyer).toLocaleString()} CFA</div>
                    <small style="color:orange; font-size:0.7rem">Com: ${b.com}</small>
                </div>
            </div>
            <button class="btn-primary" style="margin-top:10px; background:${b.statut === 'Occupé'?'#94a3b8':'#4A69FF'}" onclick="toggleStatus(${b.id})">
                ${b.statut === 'Occupé' ? (estTerrain ? 'Remettre en Vente' : 'Libérer le bien') : actionBouton}
            </button>
        </div>`;
    }).reverse().join('');
}

function toggleStatus(id) {
    biens = biens.map(b => {
        if(b.id === id) b.statut = (b.statut === 'Disponible') ? 'Occupé' : 'Disponible';
        return b;
    });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function filterBiens(statut, e) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

// --- VISITES ---

function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(!sel) return;
    biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
    sel.innerHTML = '<option value="">Choisir un bien...</option>' + 
        biens.map(b => `<option value="${b.nom}">${b.nom} (${b.type})</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;
    if(!nom || !date || !bien) return alert("Remplis tout !");
    visites.push({ id: Date.now(), nom, date, bien, status: 'prévu', qualif: '', note: '' });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('p-name').value = "";
    renderVisites();
    alert("Visite ajoutée !");
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    if(!list) return;
    visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
    list.innerHTML = visites.map(v => `
        <div class="form-card">
            <strong>${v.nom}</strong> | ${v.bien} <br>
            <small>${v.date.replace('T', ' à ')}</small>
        </div>`).reverse().join('');
}

function zoomPhoto(url) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:3000; display:flex; align-items:center; justify-content:center;";
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:85%; border-radius:10px;">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

window.onload = () => showView('dashboard');
