let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let archiveVisites = JSON.parse(localStorage.getItem('sama_archive_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';
let selectedPhotos = []; // Tableau pour stocker jusqu'à 3 photos

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') renderBiens();
}

// --- MODULE VISITE (AMÉLIORÉ) ---

function renderVisites() {
    const list = document.getElementById('visites-list');
    const today = new Date().toLocaleDateString();
    
    // On ne montre que les visites non archivées
    list.innerHTML = visites.map(v => {
        const isToday = (today === new Date(v.date).toLocaleDateString());
        return `
        <div class="form-card" style="border-left: 5px solid ${v.status==='terminé'?'#ccc':'#4A69FF'}">
            <div style="display:flex; justify-content:space-between">
                <strong>${v.nom}</strong> <span>${v.qualif}</span>
            </div>
            <small>${v.bien} | ${v.date.replace('T', ' à ')}</small>
            
            ${v.status === 'prévu' ? `
                <button class="btn-primary" style="margin-top:10px; background:${isToday?'#4A69FF':'#cbd5e1'}" 
                onclick="${isToday?`ouvrirRapport(${v.id})`:`alert('Jour J uniquement')`}">
                Valider</button>` 
            : `<p style="font-size:0.8rem; margin:10px 0;">${v.note}</p>`}
            
            <div style="display:flex; gap:10px; margin-top:10px; border-top:1px solid #eee; pt:10px">
                <button onclick="archiverVisite(${v.id})" style="background:none; border:none; color:var(--blue); font-size:0.8rem; cursor:pointer"><i class="fas fa-archive"></i> Archiver</button>
                <button onclick="supprimerVisite(${v.id})" style="background:none; border:none; color:red; font-size:0.8rem; cursor:pointer"><i class="fas fa-trash"></i> Supprimer</button>
            </div>
        </div>`;
    }).reverse().join('');
}

function supprimerVisite(id) {
    if(confirm("Supprimer définitivement ?")) {
        visites = visites.filter(v => v.id !== id);
        saveAndRenderVisites();
    }
}

function archiverVisite(id) {
    const v = visites.find(x => x.id === id);
    archiveVisites.push(v);
    visites = visites.filter(x => x.id !== id);
    localStorage.setItem('sama_archive_visites', JSON.stringify(archiveVisites));
    saveAndRenderVisites();
}

function saveAndRenderVisites() {
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

// --- MODULE MES BIENS (PHOTOS MULTIPLES + ADRESSE) ---

function previewImage(input) {
    if (input.files && input.files[0]) {
        if (selectedPhotos.length >= 3) return alert("Maximum 3 photos");
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
        <div style="position:relative">
            <img src="${p}" style="width:60px; height:60px; border-radius:10px; object-fit:cover">
            <i class="fas fa-times-circle" onclick="selectedPhotos.splice(${idx},1);renderPhotoPreviews()" 
               style="position:absolute; top:-5px; right:-5px; color:red; background:white; border-radius:50%"></i>
        </div>
    `).join('');
}

function saveBienPro() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('new-bien-nom').value,
        adresse: document.getElementById('new-bien-adresse').value,
        loyer: document.getElementById('new-bien-loyer').value,
        proprio: document.getElementById('new-bien-proprio').value,
        com: document.getElementById('new-bien-com').value,
        photos: selectedPhotos.length > 0 ? selectedPhotos : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400"],
        statut: 'Disponible'
    };
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    selectedPhotos = [];
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    list.innerHTML = filtered.map(b => `
        <div class="form-card">
            <div style="display:flex; gap:5px; overflow-x:auto; margin-bottom:10px">
                ${b.photos.map(p => `<img src="${p}" onclick="zoomPhoto('${p}')" style="width:80px; height:80px; object-fit:cover; border-radius:10px; cursor:pointer">`).join('')}
            </div>
            <strong>${b.nom}</strong><br>
            <small><i class="fas fa-map-marker-alt"></i> ${b.adresse || 'Pas d\'adresse'}</small><br>
            <small>Bailleur: ${b.proprio} | Com: ${b.com}</small>
            <div style="color:#4A69FF; font-weight:bold; margin:5px 0">${parseInt(b.loyer).toLocaleString()} CFA</div>
            <button class="btn-primary" onclick="toggleStatus(${b.id})">${b.statut === 'Occupé'?'Libérer':'Louer'}</button>
        </div>`).join('');
}

function zoomPhoto(url) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; display:flex; align-items:center; justify-content:center;";
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:80%; border-radius:10px">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

// ... (Garder les autres fonctions comme setQualif, validerRapport, etc.)
