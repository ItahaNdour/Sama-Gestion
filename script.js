let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let selectedPhotos = [];
let currentVisiteId = null;
let currentQualif = '';

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') { currentFilter = 'Disponible'; renderBiens(); }
}

// --- LOGIQUE DES BIENS ---

function ajusterChampsParType() {
    const type = document.getElementById('new-bien-type').value;
    const loyerInput = document.getElementById('new-bien-loyer');
    loyerInput.placeholder = (type === 'Terrain') ? "Prix de vente total (CFA)" : "Loyer mensuel (CFA)";
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
            <i class="fas fa-times-circle" onclick="selectedPhotos.splice(${idx},1);renderPhotoPreviews()" style="position:absolute; top:-5px; right:-5px; color:red; background:white; border-radius:50%; cursor:pointer"></i>
        </div>`).join('');
}

function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    if(!nom || !loyer) return alert("Nom et Prix obligatoires !");

    const b = {
        id: Date.now(),
        nom: nom,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value || "Sénégal",
        loyer: loyer,
        com: document.getElementById('new-bien-com').value || "Non précisée",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400"],
        statut: 'Disponible'
    };

    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    selectedPhotos = [];
    alert("Bien enregistré !");
    showView('biens');
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
    list.innerHTML = filtered.map(b => `
        <div class="form-card">
            <div class="bien-gallery" style="display:flex; gap:10px; overflow-x:auto; margin-bottom:10px;">
                ${b.photos.map(p => `<img src="${p}" onclick="zoomPhoto('${p}')" style="width:120px; height:120px; object-fit:cover; border-radius:15px; flex-shrink:0;">`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between">
                <div><strong>${b.nom}</strong> <small>(${b.type})</small></div>
                <div style="font-weight:bold; color:var(--blue)">${parseInt(b.loyer).toLocaleString()} CFA</div>
            </div>
            <button class="btn-primary" style="margin-top:10px" onclick="toggleStatus(${b.id})">${b.statut === 'Occupé' ? 'Libérer' : 'Louer/Vendre'}</button>
        </div>`).reverse().join('');
}

function toggleStatus(id) {
    biens = biens.map(b => { if(b.id === id) b.statut = (b.statut === 'Disponible' ? 'Occupé' : 'Disponible'); return b; });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

// --- LOGIQUE DES VISITES (RETOUR COMPLET) ---

function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(!sel) return;
    biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
    sel.innerHTML = '<option value="">Choisir un bien...</option>' + biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
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
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    if(!list) return;
    visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
    const today = new Date().toISOString().split('T')[0];

    list.innerHTML = visites.map(v => {
        const isToday = v.date.split('T')[0] === today;
        const isPast = v.date.split('T')[0] < today;
        
        return `
        <div class="form-card" style="border-left: 5px solid ${v.status === 'terminé' ? '#2ECC71' : '#4A69FF'}">
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <strong>${v.nom}</strong> <br>
                    <small><i class="fas fa-home"></i> ${v.bien}</small><br>
                    <small><i class="far fa-clock"></i> ${v.date.replace('T', ' à ')}</small>
                </div>
                <div onclick="supprimerVisite(${v.id})" style="color:#ff4a4a; cursor:pointer"><i class="fas fa-trash"></i></div>
            </div>

            <div style="margin-top:10px; display:flex; gap:5px;">
                ${v.status === 'prévu' ? (
                    isToday ? `<button class="btn-primary" onclick="ouvrirRapport(${v.id})" style="padding:8px">Valider la visite</button>` 
                            : `<button class="btn-primary" style="background:#cbd5e1; padding:8px" disabled>Rappel J-J</button>`
                ) : `
                    <div style="background:#f1f5f9; padding:10px; border-radius:10px; width:100%; font-size:0.85rem;">
                        <strong>${v.qualif}</strong> : ${v.note}
                    </div>
                `}
            </div>
        </div>`;
    }).reverse().join('');
}

function ouvrirRapport(id) {
    currentVisiteId = id;
    document.getElementById('modal-rapport').style.display = 'flex';
}

function setQualif(q) {
    currentQualif = q;
    document.querySelectorAll('.st-btn').forEach(b => b.style.border = "none");
    event.target.style.border = "2px solid var(--blue)";
}

function validerRapport() {
    const note = document.getElementById('rapport-note').value;
    visites = visites.map(v => {
        if(v.id === currentVisiteId) {
            v.status = 'terminé';
            v.qualif = currentQualif || 'Visité';
            v.note = note || 'Aucune note';
        }
        return v;
    });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display = 'none';
    document.getElementById('rapport-note').value = "";
    renderVisites();
}

function supprimerVisite(id) {
    if(confirm("Supprimer cette visite ?")) {
        visites = visites.filter(v => v.id !== id);
        localStorage.setItem('sama_visites', JSON.stringify(visites));
        renderVisites();
    }
}

function zoomPhoto(url) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:3000; display:flex; align-items:center; justify-content:center;";
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:85%; border-radius:10px;">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

window.onload = () => showView('dashboard');
