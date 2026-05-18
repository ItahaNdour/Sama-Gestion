// Initialisation des données
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let archiveVisites = JSON.parse(localStorage.getItem('sama_archive_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';
let selectedPhotos = [];

// Fonction de navigation entre les vues
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') renderBiens();
}

// --- MODULE MES BIENS (CORRIGÉ) ---

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
    if(!container) return;
    container.innerHTML = selectedPhotos.map((p, idx) => `
        <div style="position:relative; display:inline-block">
            <img src="${p}" style="width:60px; height:60px; border-radius:10px; object-fit:cover; border:2px solid #4A69FF">
            <i class="fas fa-times-circle" onclick="removePhoto(${idx})" 
               style="position:absolute; top:-5px; right:-5px; color:red; background:white; border-radius:50%; cursor:pointer"></i>
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
    const type = document.getElementById('new-bien-type').value;

    if(!nom || !loyer) return alert("Le nom et le prix sont obligatoires !");

    const b = {
        id: Date.now(),
        nom: nom,
        type: type,
        adresse: document.getElementById('new-bien-adresse').value || "Non spécifiée",
        loyer: loyer,
        proprio: document.getElementById('new-bien-proprio').value || "Inconnu",
        com: document.getElementById('new-bien-com').value || "0",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400"],
        statut: 'Disponible' // Toujours Disponible à la création
    };

    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    
    // Reset du formulaire
    selectedPhotos = [];
    document.getElementById('new-bien-nom').value = "";
    document.getElementById('new-bien-loyer').value = "";
    document.getElementById('previews-container').innerHTML = "";
    
    alert("Bien enregistré !");
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    if(!list) return;

    // On recharge les données pour être à jour
    biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
    const filtered = biens.filter(b => b.statut === currentFilter);
    
    if(filtered.length === 0) {
        list.innerHTML = `<p style="text-align:center; margin-top:30px; color:#64748b;">Aucun bien ${currentFilter.toLowerCase()} trouvé.</p>`;
        return;
    }

    list.innerHTML = filtered.map(b => `
        <div class="form-card">
            <div class="bien-gallery" style="display:flex; gap:10px; overflow-x:auto; margin-bottom:10px">
                ${b.photos.map(p => `<img src="${p}" onclick="zoomPhoto('${p}')" style="width:120px; height:120px; object-fit:cover; border-radius:15px; flex-shrink:0;">`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between">
                <div>
                    <strong>${b.nom}</strong> <small style="color:#4A69FF">(${b.type})</small><br>
                    <small style="color:#64748b"><i class="fas fa-map-marker-alt"></i> ${b.adresse}</small>
                </div>
                <div style="text-align:right">
                    <span style="font-weight:bold; color:var(--blue)">${parseInt(b.loyer).toLocaleString()} CFA</span>
                </div>
            </div>
            <button class="btn-primary" style="margin-top:10px" onclick="toggleStatus(${b.id})">
                ${b.statut === 'Occupé' ? 'Remettre en Disponible' : 'Marquer comme Loué/Vendu'}
            </button>
        </div>
    `).reverse().join('');
}

function toggleStatus(id) {
    biens = biens.map(b => {
        if(b.id === id) {
            b.statut = (b.statut === 'Disponible') ? 'Occupé' : 'Disponible';
        }
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

// --- MODULE VISITE ---

function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(!sel) return;
    biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
    if(biens.length === 0) {
        sel.innerHTML = '<option value="">⚠️ Ajoutez d\'abord un bien</option>';
        return;
    }
    sel.innerHTML = '<option value="">Choisir un bien...</option>' + 
        biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;

    if(!nom || !date || !bien) return alert("Remplissez tous les champs !");

    const v = { id: Date.now(), nom, date, bien, status: 'prévu', qualif: '', note: '' };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    document.getElementById('p-name').value = "";
    renderVisites();
    alert("Visite programmée !");
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    if(!list) return;
    visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
    
    list.innerHTML = visites.map(v => `
        <div class="form-card" style="border-left: 5px solid ${v.status==='terminé'?'#ccc':'#4A69FF'}">
            <strong>${v.nom}</strong> | ${v.bien} <br>
            <small>${v.date.replace('T', ' à ')}</small>
            ${v.status === 'prévu' ? `
                <button class="btn-primary" style="margin-top:10px" onclick="ouvrirRapport(${v.id})">Valider</button>` 
            : `<p style="font-size:0.8rem; color:#64748b">${v.qualif} : ${v.note}</p>`}
        </div>`).reverse().join('');
}

// --- UTILITAIRES ---

function zoomPhoto(url) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:3000; display:flex; align-items:center; justify-content:center;";
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:85%; border-radius:10px;">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

function ouvrirRapport(id) { 
    currentVisiteId = id; 
    document.getElementById('modal-rapport').style.display='flex'; 
}

function setQualif(q) { currentQualif = q; }

function validerRapport() {
    visites = visites.map(v => {
        if(v.id === currentVisiteId) {
            v.status = 'terminé';
            v.qualif = currentQualif || 'Visité';
            v.note = document.getElementById('rapport-note').value;
        }
        return v;
    });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display='none';
    renderVisites();
}

// Lancement au chargement
window.onload = () => showView('dashboard');
