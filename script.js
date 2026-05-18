let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let comTotale = parseFloat(localStorage.getItem('sama_com_totale')) || 0;
let currentFilter = 'Disponible';
let selectedPhotos = [];
let currentVisiteId = null;
let currentQualif = '';

// Mise à jour du dashboard au démarrage
document.getElementById('total-display').innerText = comTotale.toLocaleString() + " CFA";

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') { currentFilter = 'Disponible'; renderBiens(); }
    if(viewId === 'collecte') updateCollecteSelect();
}

// --- MODULE BIENS (LOCKÉ) ---
function ajusterChampsParType() {
    const type = document.getElementById('new-bien-type').value;
    document.getElementById('new-bien-loyer').placeholder = (type === 'Terrain') ? "Prix de vente (CFA)" : "Loyer mensuel (CFA)";
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        if (selectedPhotos.length >= 3) return alert("Max 3 photos");
        const reader = new FileReader();
        reader.onload = (e) => { selectedPhotos.push(e.target.result); renderPhotoPreviews(); };
        reader.readAsDataURL(input.files[0]);
    }
}

function renderPhotoPreviews() {
    document.getElementById('previews-container').innerHTML = selectedPhotos.map((p, idx) => `
        <img src="${p}" style="width:50px; height:50px; border-radius:5px; margin:2px;">`).join('');
}

function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    if(!nom || !loyer) return alert("Nom et Prix obligatoires");

    biens.push({
        id: Date.now(),
        nom: nom,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value,
        loyer: loyer,
        com: document.getElementById('new-bien-com').value || "10%",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://via.placeholder.com/150"],
        statut: 'Disponible'
    });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    selectedPhotos = [];
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    list.innerHTML = filtered.map(b => `
        <div class="form-card">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}" onclick="zoomPhoto('${p}')">`).join('')}</div>
            <strong>${b.nom}</strong> (${b.type}) <br>
            <span style="color:var(--blue); font-weight:bold">${parseInt(b.loyer).toLocaleString()} CFA</span><br>
            <button class="btn-primary" style="margin-top:10px" onclick="toggleStatus(${b.id})">${b.statut === 'Occupé' ? 'Libérer' : 'Louer/Vendre'}</button>
        </div>`).reverse().join('');
}

function toggleStatus(id) {
    biens = biens.map(b => { if(b.id === id) b.statut = (b.statut === 'Disponible' ? 'Occupé' : 'Disponible'); return b; });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function filterBiens(statut, e) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

// --- MODULE VISITES (LOCKÉ) ---
function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    sel.innerHTML = '<option value="">Choisir...</option>' + biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    visites.push({ id: Date.now(), nom: document.getElementById('p-name').value, date: document.getElementById('p-date').value, bien: document.getElementById('p-bien-select').value, status: 'prévu' });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visites-list').innerHTML = visites.map(v => `
        <div class="form-card" style="border-left:5px solid ${v.status==='terminé'?'#2ECC71':'#4A69FF'}">
            <strong>${v.nom}</strong> - ${v.bien} <br>
            ${v.status === 'prévu' && v.date.split('T')[0] === today ? `<button onclick="ouvrirRapport(${v.id})" class="btn-primary" style="padding:5px">Valider J-J</button>` : `<small>${v.date.replace('T',' ')}</small>`}
        </div>`).reverse().join('');
}

function ouvrirRapport(id) { currentVisiteId = id; document.getElementById('modal-rapport').style.display='flex'; }
function setQualif(q) { currentQualif = q; }
function validerRapport() {
    visites = visites.map(v => { if(v.id === currentVisiteId) { v.status='terminé'; v.qualif=currentQualif; v.note=document.getElementById('rapport-note').value; } return v; });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display='none';
    renderVisites();
}

// --- NOUVEAU MODULE COLLECTE ---
function updateCollecteSelect() {
    const sel = document.getElementById('c-bien-select');
    const occupes = biens.filter(b => b.statut === 'Occupé');
    sel.innerHTML = occupes.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function preRemplirLoyer() {
    const b = biens.find(x => x.nom === document.getElementById('c-bien-select').value);
    if(b) document.getElementById('c-montant').value = b.loyer;
}

function validerCollecte() {
    const montant = parseFloat(document.getElementById('c-montant').value);
    const bien = biens.find(b => b.nom === document.getElementById('c-bien-select').value);
    const mode = document.querySelector('input[name="pay-mode"]:checked').value;
    
    // Calcul de commission
    let maCom = bien.com.includes('%') ? (parseFloat(bien.com)/100) * montant : parseFloat(bien.com);
    comTotale += maCom;
    localStorage.setItem('sama_com_totale', comTotale);
    document.getElementById('total-display').innerText = comTotale.toLocaleString() + " CFA";

    const msg = `*REÇU SAMA GESTION*%0A------------------%0A🏠 *Bien:* ${bien.nom}%0A💰 *Payé:* ${montant.toLocaleString()} CFA%0A💳 *Mode:* ${mode}%0A📅 *Date:* ${new Date().toLocaleDateString()}%0A------------------%0A*Commission:* ${maCom.toLocaleString()} CFA%0A*Net Proprio:* ${(montant - maCom).toLocaleString()} CFA`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
    showView('dashboard');
}

function zoomPhoto(url) {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:3000; display:flex; align-items:center; justify-content:center;";
    overlay.innerHTML = `<img src="${url}" style="max-width:90%; border-radius:10px;">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}
