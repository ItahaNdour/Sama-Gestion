// --- INITIALISATION DES DONNÉES ---
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentFilter = 'Disponible';
let currentVisiteId = null;
let currentQualif = '';
let selectedPhotoBase64 = "";

// --- NAVIGATION ---
function showView(viewId) {
    // Masquer toutes les vues
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    
    // Afficher la vue demandée
    const target = document.getElementById('view-' + viewId);
    if(target) {
        target.style.display = 'block';
    }

    // Chargements spécifiques
    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') {
        updateBienSelect();
        renderVisites();
    }
}

// --- GESTION DES BIENS (Module "Mes Biens") ---

// Aperçu de la photo (Appareil photo)
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotoBase64 = e.target.result;
            const preview = document.getElementById('preview-img');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Sauvegarder un nouveau bien
function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    
    if(!nom || !loyer) {
        alert("Veuillez remplir au moins le nom et le loyer.");
        return;
    }

    const b = {
        id: Date.now(),
        nom: nom,
        loyer: loyer,
        proprio: document.getElementById('new-bien-proprio').value || "Non spécifié",
        com: document.getElementById('new-bien-com').value || "0",
        photo: selectedPhotoBase64 || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400",
        statut: 'Disponible',
        historique: [],
        jardin: document.getElementById('check-jardin').checked,
        clim: document.getElementById('check-clim').checked,
        parking: document.getElementById('check-parking')?.checked || false,
        gardien: document.getElementById('check-gardien')?.checked || false
    };

    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    
    // Reset formulaire
    selectedPhotoBase64 = "";
    document.getElementById('new-bien-nom').value = "";
    document.getElementById('new-bien-loyer').value = "";
    document.getElementById('preview-img').style.display = 'none';
    
    showView('biens');
}

// Filtrer les biens (Dispo / Occupé)
function filterBiens(statut, e) {
    currentFilter = statut;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(e) e.target.classList.add('active');
    renderBiens();
}

// Afficher la liste des biens
function renderBiens() {
    const list = document.getElementById('biens-list');
    const filtered = biens.filter(b => b.statut === currentFilter);
    
    list.innerHTML = filtered.map(b => `
        <div class="bien-card">
            <img src="${b.photo}" class="bien-img">
            <div class="bien-content">
                <div style="display:flex; justify-content:space-between; align-items:start">
                    <div>
                        <strong style="font-size:1.2rem">${b.nom}</strong><br>
                        <small style="color:#64748b">Bailleur: ${b.proprio}</small>
                    </div>
                    <span class="com-tag">Com: ${b.com}</span>
                </div>
                <div style="margin:10px 0; font-weight:bold; color:#4A69FF; font-size:1.1rem">
                    ${parseInt(b.loyer).toLocaleString()} CFA / mois
                </div>
                <div style="display:flex; gap:5px; margin-bottom:15px; flex-wrap:wrap;">
                    ${b.jardin ? '<span class="com-tag" style="background:#f1f5f9;color:#475569">🌳 Jardin</span>' : ''}
                    ${b.clim ? '<span class="com-tag" style="background:#f1f5f9;color:#475569">❄️ Clim</span>' : ''}
                </div>
                <div style="display:flex; gap:10px">
                    <button class="btn-primary" style="flex:2" onclick="gererLocation(${b.id})">
                        ${b.statut === 'Occupé' ? 'Libérer le bien' : 'Marquer Loué'}
                    </button>
                    <button class="btn-primary" style="flex:1; background:#f1f5f9; color:#1A2B49" onclick="ouvrirHistorique(${b.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
                <div style="text-align:right; margin-top:10px">
                    <i class="fas fa-trash" style="color:#cbd5e1; cursor:pointer" onclick="deleteBien(${b.id})"></i>
                </div>
            </div>
        </div>
    `).reverse().join('') || '<p style="text-align:center; color:#94a3b8; margin-top:30px">Aucun bien enregistré.</p>';
}

// Gérer l'entrée/sortie locataire
function gererLocation(id) {
    const idx = biens.findIndex(x => x.id === id);
    const b = biens[idx];
    
    if(b.statut === 'Disponible') {
        const nom = prompt("Nom du nouveau locataire ?");
        if(nom) {
            b.statut = 'Occupé';
            b.locataireActuel = nom;
            b.dateEntree = new Date().toLocaleDateString();
            alert("Bien marqué comme Loué !");
        }
    } else {
        if(confirm("Confirmer la libération du bien ? Le locataire sera archivé dans l'historique.")) {
            b.historique.push({
                nom: b.locataireActuel, 
                date: b.dateEntree,
                sortie: new Date().toLocaleDateString()
            });
            b.statut = 'Disponible';
            b.locataireActuel = null;
        }
    }
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    renderBiens();
}

// Historique
function ouvrirHistorique(id) {
    const b = biens.find(x => x.id === id);
    const content = b.historique.map(h => `
        <div style="padding:12px; border-bottom:1px solid #f1f5f9">
            <strong>${h.nom}</strong><br>
            <small>Du ${h.date} au ${h.sortie || 'Non précisé'}</small>
        </div>
    `).join('') || "<p style='padding:15px;'>Aucun ancien occupant.</p>";
    
    document.getElementById('hist-content').innerHTML = content;
    document.getElementById('modal-historique').style.display = 'flex';
}

function deleteBien(id) {
    if(confirm("Supprimer ce bien définitivement ?")) {
        biens = biens.filter(x => x.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        renderBiens();
    }
}

// --- GESTION DES VISITES (Module "Visite") ---

// Remplir le sélecteur de biens dans le formulaire visite
function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(biens.length === 0) {
        sel.innerHTML = '<option>Aucun bien disponible</option>';
        return;
    }
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

// Programmer une visite
function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;

    if(!nom || !date) {
        alert("Nom et date requis !");
        return;
    }

    const v = {
        id: Date.now(),
        nom: nom,
        date: date,
        bien: bien,
        status: 'prévu',
        note: '',
        qualif: ''
    };

    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    // Reset
    document.getElementById('p-name').value = "";
    document.getElementById('p-date').value = "";
    
    renderVisites();
}

// Afficher les visites avec blocage jour J
function renderVisites() {
    const list = document.getElementById('visites-list');
    const today = new Date().toLocaleDateString();

    list.innerHTML = visites.map(v => {
        const visiteDateObj = new Date(v.date);
        const visiteDateStr = visiteDateObj.toLocaleDateString();
        const isToday = (today === visiteDateStr);

        return `
        <div class="form-card" style="border-left:5px solid ${v.status === 'terminé' ? '#ccc' : '#4A69FF'}">
            <div style="display:flex; justify-content:space-between; align-items:start">
                <div>
                    <strong>${v.nom}</strong><br>
                    <small>${v.bien} | ${v.date.replace('T', ' à ')}</small>
                </div>
                <span style="font-weight:bold; color:${v.qualif.includes('🔥') ? 'red' : 'blue'}">${v.qualif}</span>
            </div>
            
            ${v.status === 'prévu' ? `
                <button 
                    class="btn-primary" 
                    style="padding:10px; margin-top:12px; background: ${isToday ? '#4A69FF' : '#cbd5e1'}; cursor: ${isToday ? 'pointer' : 'not-allowed'};" 
                    onclick="${isToday ? `ouvrirRapport(${v.id})` : `alert('Validation bloquée : Revenez le ${visiteDateStr} pour valider.')`}"
                >
                    ${isToday ? 'Terminer la visite' : 'Prévue le ' + visiteDateStr}
                </button>
            ` : `
                <div style="background:#f8fafc; padding:10px; border-radius:12px; margin-top:10px; font-size:0.85rem; color:#64748b; border:1px solid #edf2f7;">
                    <i class="fas fa-quote-left" style="opacity:0.3"></i> ${v.note || 'Aucune note.'}
                </div>
            `}
        </div>
        `;
    }).reverse().join('') || '<p style="text-align:center; color:#94a3b8;">Aucune visite programmée.</p>';
}

// Rapport de visite
function ouvrirRapport(id) {
    currentVisiteId = id;
    document.getElementById('modal-rapport').style.display = 'flex';
}

function setQualif(q) {
    currentQualif = q;
    // Feedback visuel simple (optionnel)
    alert("Client qualifié : " + q);
}

function validerRapport() {
    const v = visites.find(x => x.id === currentVisiteId);
    const note = document.getElementById('rapport-note').value;
    
    if(!currentQualif) {
        alert("Veuillez choisir Chaud 🔥 ou Froid ❄️");
        return;
    }

    v.status = 'terminé';
    v.note = note;
    v.qualif = currentQualif;
    
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    // Reset modal
    document.getElementById('modal-rapport').style.display = 'none';
    document.getElementById('rapport-note').value = "";
    currentQualif = "";
    
    renderVisites();
}

// --- DÉMARRAGE ---
window.onload = () => {
    showView('dashboard');
};
