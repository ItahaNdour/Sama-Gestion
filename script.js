let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';
let selectedPhotoBase64 = "";

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') renderBiens();
}

// --- LOGIQUE VISITE (VERROUILLÉE) ---
function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(!sel) return;
    if(biens.length === 0) { sel.innerHTML = '<option>Aucun bien</option>'; return; }
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;
    if(!nom || !date) return alert("Remplir nom et date !");
    
    visites.push({ id: Date.now(), nom, date, bien, status: 'prévu', qualif: '', note: '' });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    const today = new Date().toLocaleDateString();
    list.innerHTML = visites.map(v => {
        const isToday = (today === new Date(v.date).toLocaleDateString());
        return `
        <div class="form-card" style="border-left: 5px solid ${v.status==='terminé'?'#ccc':'#4A69FF'}">
            <strong>${v.nom}</strong> <span>${v.qualif}</span><br>
            <small>${v.bien} | ${v.date.replace('T', ' à ')}</small>
            ${v.status === 'prévu' ? `
                <button class="btn-primary" style="margin-top:10px; background:${isToday?'#4A69FF':'#cbd5e1'}" 
                onclick="${isToday?`ouvrirRapport(${v.id})`:`alert('Revenez le jour J')`}">
                ${isToday?'Terminer la visite':'Bloqué (Pas aujourd\'hui)'}</button>` : `<p>${v.note}</p>`}
        </div>`;
    }).reverse().join('');
}

function ouvrirRapport(id) { currentVisiteId = id; document.getElementById('modal-rapport').style.display='flex'; }
function setQualif(q) { currentQualif = q; alert("Client qualifié : " + q); }
function validerRapport() {
    const v = visites.find(x => x.id === currentVisiteId);
    v.status = 'terminé'; v.qualif = currentQualif; v.note = document.getElementById('rapport-note').value;
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display='none';
    renderVisites();
}

// --- LOGIQUE MES BIENS (AVANCÉES) ---
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotoBase64 = e.target.result;
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('preview-img').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveBienPro() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('new-bien-nom').value,
        loyer: document.getElementById('new-bien-loyer').value,
        proprio: document.getElementById('new-bien-proprio').value,
        com: document.getElementById('new-bien-com').value,
        photo: selectedPhotoBase64 || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400",
        statut: 'Disponible', historique: []
    };
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    selectedPhotoBase64 = "";
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    list.innerHTML = filtered.map(b => `
        <div class="form-card">
            <img src="${b.photo}" style="width:100%; height:120px; object-fit:cover; border-radius:15px; margin-bottom:10px">
            <strong>${b.nom}</strong><br>
            <small>Bailleur: ${b.proprio} | Com: ${b.com}</small><br>
            <div style="color:#4A69FF; font-weight:bold; margin:5px 0">${b.loyer} CFA</div>
            <button class="btn-primary" onclick="toggleStatus(${b.id})">${b.statut === 'Occupé'?'Libérer':'Louer'}</button>
        </div>`).join('') || '<p>Aucun bien.</p>';
}

function toggleStatus(id) {
    const b = biens.find(x => x.id === id);
    b.statut = (b.statut === 'Disponible') ? 'Occupé' : 'Disponible';
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function filterBiens(statut, e) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

window.onload = () => showView('dashboard');
