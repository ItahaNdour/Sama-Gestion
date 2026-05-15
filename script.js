// --- BASE DE DONNÉES LOCALES ---
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';
let selectedPhoto = "";

// --- NAVIGATION (PROPRE ET FIXE) ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
}

// ==========================================
// MODULE VISITE (REMIS EXACTEMENT COMME AVANT)
// ==========================================

function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(biens.length === 0) {
        sel.innerHTML = '<option>Aucun bien disponible</option>';
        return;
    }
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;

    if(!nom || !date) return alert("Nom et Date obligatoires !");

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
    
    document.getElementById('p-name').value = "";
    document.getElementById('p-date').value = "";
    renderVisites();
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    const today = new Date().toLocaleDateString();

    list.innerHTML = visites.map(v => {
        const d = new Date(v.date);
        const dateV = d.toLocaleDateString();
        const isToday = (today === dateV);

        return `
        <div class="form-card" style="border-left: 5px solid ${v.status === 'terminé' ? '#ccc' : '#4A69FF'}; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between;">
                <strong>${v.nom}</strong>
                <span>${v.qualif}</span>
            </div>
            <small>${v.bien} | Le ${v.date.replace('T', ' à ')}</small>
            
            ${v.status === 'prévu' ? `
                <button class="btn-primary" 
                    style="margin-top:10px; background:${isToday ? '#4A69FF' : '#cbd5e1'}; cursor:${isToday ? 'pointer' : 'not-allowed'}"
                    onclick="${isToday ? `ouvrirRapport(${v.id})` : `alert('Validation bloquée jusqu\\'au ${dateV}')`}">
                    ${isToday ? 'Valider la visite' : 'Bloqué (Attendre le ' + dateV + ')'}
                </button>
            ` : `
                <div style="margin-top:10px; font-size:0.85rem; color:#666; font-style:italic;">
                    Note: ${v.note || 'Aucune note'}
                </div>
            `}
        </div>`;
    }).reverse().join('');
}

function ouvrirRapport(id) {
    currentVisiteId = id;
    document.getElementById('modal-rapport').style.display = 'flex';
}

function setQualif(q) { currentQualif = q; }

function validerRapport() {
    if(!currentQualif) return alert("Choisir Chaud ou Froid");
    const v = visites.find(x => x.id === currentVisiteId);
    v.status = 'terminé';
    v.qualif = currentQualif;
    v.note = document.getElementById('rapport-note').value;
    
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display = 'none';
    currentQualif = "";
    renderVisites();
}

// ==========================================
// MODULE MES BIENS (AVANCÉES VALIDÉES)
// ==========================================

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhoto = e.target.result;
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('preview-img').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    if(!nom || !loyer) return alert("Nom et Loyer requis");

    const b = {
        id: Date.now(),
        nom: nom,
        loyer: loyer,
        proprio: document.getElementById('new-bien-proprio').value,
        com: document.getElementById('new-bien-com').value,
        photo: selectedPhoto || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400",
        statut: 'Disponible',
        jardin: document.getElementById('check-jardin').checked,
        clim: document.getElementById('check-clim').checked,
        historique: []
    };
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    selectedPhoto = ""; // Reset
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    
    list.innerHTML = filtered.map(b => `
        <div class="bien-card">
            <img src="${b.photo}" class="bien-img">
            <div class="bien-content">
                <div style="display:flex; justify-content:space-between">
                    <strong>${b.nom}</strong>
                    <span style="color:orange; font-size:0.8rem">Com: ${b.com}</span>
                </div>
                <small>Bailleur: ${b.proprio}</small>
                <div style="margin:8px 0; color:var(--blue); font-weight:bold">${parseInt(b.loyer).toLocaleString()} CFA</div>
                <div style="display:flex; gap:10px">
                    <button class="btn-primary" style="flex:2" onclick="toggleLocation(${b.id})">
                        ${b.statut === 'Occupé' ? 'Libérer' : 'Louer'}
                    </button>
                    <button class="btn-primary" style="flex:1; background:#eee; color:#333" onclick="voirHistorique(${b.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </div>
        </div>
    `).reverse().join('') || '<p style="text-align:center; padding:20px;">Aucun bien enregistré.</p>';
}

function filterBiens(statut, e) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

function toggleLocation(id) {
    const b = biens.find(x => x.id === id);
    if(b.statut === 'Disponible') {
        const nom = prompt("Nom du locataire ?");
        if(nom) {
            b.statut = 'Occupé';
            b.locataireActuel = nom;
            b.dateEntree = new Date().toLocaleDateString();
        }
    } else {
        if(confirm("Libérer ce bien ?")) {
            b.historique.push({nom: b.locataireActuel, date: b.dateEntree});
            b.statut = 'Disponible';
        }
    }
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

function voirHistorique(id) {
    const b = biens.find(x => x.id === id);
    const hist = b.historique.map(h => `${h.nom} (Entrée: ${h.date})`).join('\n') || "Aucun historique.";
    alert("Historique des locataires pour " + b.nom + " :\n\n" + hist);
}

// --- DÉMARRAGE ---
window.onload = () => showView('dashboard');
