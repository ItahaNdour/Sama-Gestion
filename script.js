let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let archiveVisites = JSON.parse(localStorage.getItem('sama_archive_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';
let selectedPhotos = []; 

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') renderBiens();
}

// --- LOGIQUE VISITE (SÉCURISÉE) ---

function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(!sel) return;
    
    if(biens.length === 0) {
        sel.innerHTML = '<option value="">⚠️ Ajoutez d\'abord un bien</option>';
        return;
    }
    // On remplit avec les biens existants
    sel.innerHTML = '<option value="">Choisir un bien...</option>' + 
        biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;

    if(biens.length === 0) return alert("Impossible : Vous n'avez aucun bien enregistré !");
    if(!nom || !date || !bien) return alert("Remplissez tous les champs (Nom, Bien et Date)");

    const v = {
        id: Date.now(),
        nom: nom,
        date: date,
        bien: bien,
        status: 'prévu',
        qualif: '',
        note: ''
    };

    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    // Reset champs
    document.getElementById('p-name').value = "";
    document.getElementById('p-date').value = "";
    renderVisites();
    alert("Visite programmée avec rappel !");
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    if(!list) return;
    const today = new Date().toLocaleDateString();
    
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
                onclick="${isToday?`ouvrirRapport(${v.id})`:`alert('Validation disponible le jour J')`}">
                ${isToday ? 'Valider la visite' : 'Rappel programmé'}</button>` 
            : `<p style="font-size:0.8rem; margin:10px 0; background:#f0f4ff; padding:5px; border-radius:5px;">${v.note}</p>`}
            
            <div style="display:flex; gap:15px; margin-top:10px; padding-top:10px; border-top:1px solid #f0f0f0">
                <span onclick="archiverVisite(${v.id})" style="color:var(--blue); font-size:0.8rem; cursor:pointer"><i class="fas fa-archive"></i> Archiver</span>
                <span onclick="supprimerVisite(${v.id})" style="color:#ff4a4a; font-size:0.8rem; cursor:pointer"><i class="fas fa-trash"></i> Supprimer</span>
            </div>
        </div>`;
    }).reverse().join('');
}

// --- LOGIQUE BIENS (3 PHOTOS + TERRAIN) ---

function previewImage(input) {
    if (input.files && input.files[0]) {
        if (selectedPhotos.length >= 3) return alert("Maximum 3 photos autorisées");
        
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
        <div style="position:relative; display:inline-block">
            <img src="${p}" style="width:60px; height:60px; border-radius:10px; object-fit:cover; border:2px solid var(--blue)">
            <i class="fas fa-times-circle" onclick="removePhoto(${idx})" 
               style="position:absolute; top:-8px; right:-8px; color:#ff4a4a; background:white; border-radius:50%; font-size:1.2rem; cursor:pointer"></i>
        </div>
    `).join('');
}

function removePhoto(idx) {
    selectedPhotos.splice(idx, 1);
    renderPhotoPreviews();
}

function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    
    if(!nom || !loyer) return alert("Le nom et le prix sont obligatoires !");

    const b = {
        id: Date.now(),
        nom: nom,
        adresse: document.getElementById('new-bien-adresse').value,
        loyer: loyer,
        proprio: document.getElementById('new-bien-proprio').value,
        com: document.getElementById('new-bien-com').value,
        // On enregistre le tableau de photos, ou une image par défaut si vide
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400"],
        statut: 'Disponible'
    };

    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    
    // Reset complet
    selectedPhotos = [];
    document.getElementById('previews-container').innerHTML = "";
    document.getElementById('new-bien-nom').value = "";
    document.getElementById('new-bien-loyer').value = "";
    
    showView('biens');
    alert("Bien enregistré avec succès !");
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    
    list.innerHTML = filtered.map(b => `
        <div class="form-card">
            <div class="bien-gallery" style="display:flex; gap:10px; overflow-x:auto; margin-bottom:12px; padding-bottom:5px">
                ${b.photos.map(p => `<img src="${p}" onclick="zoomPhoto('${p}')" style="width:120px; height:120px; object-fit:cover; border-radius:15px; flex-shrink:0; cursor:pointer; box-shadow:0 4px 8px rgba(0,0,0,0.1)">`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:start">
                <div>
                    <strong style="font-size:1.1rem">${b.nom}</strong><br>
                    <small style="color:#64748b"><i class="fas fa-map-marker-alt"></i> ${b.adresse || 'Sénégal'}</small>
                </div>
                <span style="background:#eef2ff; color:var(--blue); padding:4px 8px; border-radius:8px; font-size:0.8rem; font-weight:bold">${b.com}</span>
            </div>
            <div style="color:var(--blue); font-weight:bold; font-size:1.2rem; margin:10px 0">${parseInt(b.loyer).toLocaleString()} CFA</div>
            <button class="btn-primary" onclick="toggleStatus(${b.id})">${b.statut === 'Occupé'?'Libérer le bien':'Marquer comme Loué/Vendu'}</button>
        </div>`).join('') || '<p style="text-align:center; padding:20px;">Aucun bien disponible.</p>';
}

// Fonctions utilitaires gardées
function archiverVisite(id) {
    const v = visites.find(x => x.id === id);
    archiveVisites.push(v);
    visites = visites.filter(x => x.id !== id);
    localStorage.setItem('sama_archive_visites', JSON.stringify(archiveVisites));
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function supprimerVisite(id) {
    if(confirm("Supprimer cette visite ?")) {
        visites = visites.filter(v => v.id !== id);
        localStorage.setItem('sama_visites', JSON.stringify(visites));
        renderVisites();
    }
}

function toggleStatus(id) {
    const b = biens.find(x => x.id === id);
    b.statut = (b.statut === 'Disponible') ? 'Occupé' : 'Disponible';
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function zoomPhoto(url) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:3000; display:flex; align-items:center; justify-content:center; cursor:zoom-out";
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:90%; border-radius:10px; border:3px solid white">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

window.onload = () => showView('dashboard');
