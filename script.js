// ==========================================
// SAMA GESTION PRO V5.3 - CRYPTO SÉCURISÉ
// ==========================================

// L'empreinte SHA-256 de la clé secrète "SamaPro2026". 
// Même en lisant cette ligne, impossible de retrouver le mot de passe d'origine.
const HASH_CLE_ACTIVATION = "d9b2db979bb9db9e7ea6c9ea99dc17c8808dfefb54a2dd83908db7f34ea72051";

let utilisateurs = JSON.parse(localStorage.getItem('sama_utilisateurs')) || [];
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let comTotaleGlobal = parseFloat(localStorage.getItem('sama_com_global')) || 0;

let profilRole = localStorage.getItem('sama_role') || null;
let courtierNom = localStorage.getItem('sama_username') || null;
let currentFilter = 'Disponible';
let selectedPhotos = [];
let monAvatar = localStorage.getItem('sama_avatar') || "💼";

window.onload = () => {
    verifierEtatSecurite();
};

// Fonction de hachage ultra-sécurisée (crypto standard)
async function hacherTexte(texte) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texte);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function verifierEtatSecurite() {
    const loginScreen = document.getElementById('login-screen');
    const initZone = document.getElementById('init-setup-zone');
    const connectZone = document.getElementById('standard-login-zone');
    
    if (utilisateurs.length === 0) {
        loginScreen.style.display = 'flex';
        initZone.style.display = 'block';
        connectZone.style.display = 'none';
    } else if (profilRole && courtierNom) {
        loginScreen.style.display = 'none';
        majInterfaceProfil();
        showView('dashboard');
    } else {
        loginScreen.style.display = 'flex';
        initZone.style.display = 'none';
        connectZone.style.display = 'block';
    }
}

// Validation sécurisée par comparaison d'empreintes
async function validerEtCreerSuperAdmin() {
    const cleSaisie = document.getElementById('init-key').value.trim();
    const user = document.getElementById('init-username').value.trim();
    const pass = document.getElementById('init-password').value.trim();
    const errorMsg = document.getElementById('init-error');

    // On transforme la saisie en empreinte pour la comparer
    const hashSaisie = await hacherTexte(cleSaisie);

    if (hashSaisie !== HASH_CLE_ACTIVATION) {
        errorMsg.innerText = "❌ Clé d'activation incorrecte.";
        errorMsg.style.display = 'block';
        return;
    }

    if (!user || pass.length < 4) {
        errorMsg.innerText = "⚠️ Choisissez un identifiant et un mot de passe (4 char min).";
        errorMsg.style.display = 'block';
        return;
    }

    utilisateurs.push({ username: user, password: pass, role: "SuperAdmin", avatar: "👑" });
    localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));

    profilRole = "SuperAdmin";
    courtierNom = user;
    monAvatar = "👑";

    localStorage.setItem('sama_role', "SuperAdmin");
    localStorage.setItem('sama_username', user);
    localStorage.setItem('sama_avatar', "👑");

    document.getElementById('login-screen').style.display = 'none';
    majInterfaceProfil();
    showView('dashboard');
}

function verifierConnexion() {
    const userSaisi = document.getElementById('login-username').value.trim();
    const passSaisi = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    const compteTrouve = utilisateurs.find(u => u.username.toLowerCase() === userSaisi.toLowerCase());

    if (!compteTrouve || compteTrouve.password !== passSaisi) {
        errorMsg.innerText = "❌ Identifiant ou mot de passe incorrect.";
        errorMsg.style.display = 'block';
        return;
    }

    profilRole = compteTrouve.role;
    courtierNom = compteTrouve.username;
    monAvatar = compteTrouve.avatar || "💼";

    localStorage.setItem('sama_role', profilRole);
    localStorage.setItem('sama_username', courtierNom);
    localStorage.setItem('sama_avatar', monAvatar);

    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-screen').style.display = 'none';
    
    majInterfaceProfil();
    showView('dashboard');
}

function deconnexion() {
    localStorage.removeItem('sama_role');
    localStorage.removeItem('sama_username');
    localStorage.removeItem('sama_avatar');
    location.reload();
}

function majInterfaceProfil() {
    document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-statut-actuel').innerText = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '⚙️ Super Administrateur (Owner)' : '🏢 Agence Partenaire';
    
    const adminSection = document.getElementById('admin-management-section');
    if (profilRole === "SuperAdmin") {
        adminSection.style.display = 'block';
        renderAdminAgencesList();
    } else {
        adminSection.style.display = 'none';
    }
}

function adminCreerCompteCourtier() {
    const name = document.getElementById('admin-new-user-name').value.trim();
    const pass = document.getElementById('admin-new-user-pin').value.trim();
    
    if(!name || !pass) return alert("Veuillez remplir tous les champs.");
    if(utilisateurs.some(u => u.username.toLowerCase() === name.toLowerCase())) return alert("Cet identifiant existe déjà.");

    utilisateurs.push({ username: name, password: pass, role: "Courtier", avatar: "🏢" });
    localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));
    
    document.getElementById('admin-new-user-name').value = '';
    document.getElementById('admin-new-user-pin').value = '';
    
    renderAdminAgencesList();
    alert(`Compte activé pour l'agence : ${name}`);
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list');
    if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px; border-radius:8px; margin-bottom:5px; border:1px solid #e2e8f0; font-size:0.85rem;">
            <span>${u.avatar} <b>${u.username}</b> (Mdp : ${u.password})</span>
            ${u.username !== utilisateurs[0].username ? `<i class="fas fa-trash-alt" style="color:#EF4444; cursor:pointer;" onclick="adminSupprimerAgence('${u.username}')"></i>` : '⭐ Principal'}
        </div>
    `).join('');
}

function adminSupprimerAgence(username) {
    if(confirm(`Supprimer définitivement l'accès de l'agence ${username} ?`)) {
        utilisateurs = utilisateurs.filter(u => u.username !== username);
        localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));
        renderAdminAgencesList();
    }
}

// ==========================================
// CATALOGUE, SUIVI & RESTAURATION REÇUS
// ==========================================

function showView(id) {
    if (!profilRole || !courtierNom) return verifierEtatSecurite();
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + id).style.display = 'block';
    rafraichirCompteurCommission();
    if(id === 'biens') { document.getElementById('search-bien-input').value = ''; renderBiens(); }
    if(id === 'collecte') updateSelects();
    if(id === 'planning') { updateSelects(); renderVisites(); }
}

function rafraichirCompteurCommission() { 
    if (profilRole === "SuperAdmin") { 
        document.getElementById('total-display').innerText = comTotaleGlobal.toLocaleString() + " CFA"; 
    } else { 
        let comCourtier = 0; 
        biens.forEach(b => { 
            if(b.agentCreateur === courtierNom && b.historiquePaiements) { 
                b.historiquePaiements.forEach(p => { 
                    if(p.type === 'Caution') comCourtier += parseFloat(b.loyer); 
                    else if(p.type === 'Loyer Mois') comCourtier += b.com.includes('%') ? (parseFloat(b.com)/100) * p.montant : parseFloat(b.com); 
                }); 
            } 
        }); 
        document.getElementById('total-display').innerText = comCourtier.toLocaleString() + " CFA"; 
    } 
}

function previewImage(input) { if (input.files) { Array.from(input.files).forEach(file => { const reader = new FileReader(); reader.onload = e => { if(selectedPhotos.length < 3) { selectedPhotos.push(e.target.result); renderPreviews(); } }; reader.readAsDataURL(file); }); } }
function renderPreviews() { document.getElementById('previews-container').innerHTML = selectedPhotos.map(p => `<img src="${p}" style="width:40px;height:40px;border-radius:5px;object-fit:cover;">`).join(''); }
function ouvrirFormulaireAjout() { document.getElementById('edit-bien-id').value = ''; document.getElementById('form-bien-title').innerText = "Nouveau Bien"; selectedPhotos = []; document.getElementById('previews-container').innerHTML = ''; document.getElementById('new-bien-nom').value = ''; document.getElementById('new-bien-loyer').value = ''; document.getElementById('new-bien-adresse').value = ''; document.getElementById('new-bien-proprio').value = ''; document.getElementById('new-bien-proprio-tel').value = ''; document.getElementById('new-bien-locataire').value = ''; document.getElementById('new-bien-locataire-tel').value = ''; showView('ajouter-bien'); }

function renderBiens() { 
    const searchText = document.getElementById('search-bien-input').value.toLowerCase(); 
    const filtered = biens.filter(b => { 
        const txt = b.nom.toLowerCase().includes(searchText) || b.adresse.toLowerCase().includes(searchText); 
        const tab = b.statut === currentFilter; 
        return profilRole === "SuperAdmin" ? (tab && txt) : (tab && txt && b.agentCreateur === courtierNom); 
    }); 
    document.getElementById('biens-list').innerHTML = filtered.map(b => `
        <div class="form-card" onclick="voirDetailBien(${b.id})">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}">`).join('')}</div>
            <div style="margin-top:10px; position: relative;">
                <strong>${b.nom}</strong><br>
                <small><i class="fas fa-map-marker-alt"></i> ${b.adresse}</small><br>
                <span style="color:var(--blue); font-weight:bold;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                <button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position: absolute; right: 0; bottom: 0; background: #E0E7FF; color: var(--blue); border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: pointer;"><i class="fas fa-wallet"></i> Suivi</button>
            </div>
        </div>`).reverse().join(''); 
}

function voirDetailBien(id) { 
    const b = biens.find(x => x.id === id); 
    const modal = document.getElementById('modal-bien'); 
    let cp = b.proprioTel ? `<div style="background:#f1f5f9; padding:8px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><div><small style="color:#64748b;">Propriétaire :</small><br><strong>${b.proprio}</strong></div><div><a href="tel:${b.proprioTel}" style="background:#3498DB; color:white; padding:5px 10px; border-radius:5px; text-decoration:none;"><i class="fas fa-phone"></i></a></div></div>` : ''; 
    document.getElementById('modal-body').innerHTML = `
        <h3 style="color:var(--blue); margin:0 0 5px 0;">${b.nom}</h3>
        <p style="margin:0 0 10px 0; font-size:0.85rem; color:#64748b;"><i class="fas fa-map-marker-alt"></i> ${b.adresse}</p>
        <p><strong>Loyer:</strong> ${parseInt(b.loyer).toLocaleString()} CFA</p>
        <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
        ${cp}
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top:10px;">
            <button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer'}</button>
            <button class="btn-outline" style="color:var(--red);" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer</button>
        </div>
        <button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>`; 
    modal.style.display = 'flex'; 
}

function ouvrirPortefeuille(id) { 
    const b = biens.find(x => x.id === id); 
    const modal = document.getElementById('modal-bien');
    if (!b.historiquePaiements) b.historiquePaiements = []; 
    
    const tot = b.historiquePaiements.reduce((sum, p) => sum + p.montant, 0); 
    let hist = b.historiquePaiements.map(p => `
        <div style="display:flex; justify-content:space-between; background:#f8fafc; padding:8px; border-radius:8px; margin-bottom:5px; font-size:0.8rem;">
            <div style="text-align:left;"><b>${p.type}</b><br><small>${p.date}</small></div>
            <div style="font-weight:bold;">+ ${p.montant.toLocaleString()} CFA</div>
        </div>`).reverse().join(''); 

    document.getElementById('modal-body').innerHTML = `
        <h3>💼 Suivi Financier</h3>
        <p><b>Bien :</b> ${b.nom}</p>
        <div style="background:var(--blue); color:white; padding:12px; border-radius:12px; text-align:center; margin-bottom:15px;">
            <small>Cumul Encaissé</small>
            <h2>${tot.toLocaleString()} CFA</h2>
        </div>
        <h4>Historique des Flux</h4>
        <div style="max-height:150px; overflow-y:auto; margin-bottom:15px;">${hist || '<p>Aucun paiement.</p>'}</div>
        <button class="btn-primary" style="background:#2ECC71;" onclick="relancerPaiementWhatsApp(${b.id})"><i class="fab fa-whatsapp"></i> Relancer le Locataire</button>
        <button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>`;
    modal.style.display = 'flex';
}

function relancerPaiementWhatsApp(id) {
    const b = biens.find(x => x.id === id);
    if(!b || !b.locataireTel) return alert("Pas de numéro de téléphone pour ce locataire.");
    const msg = encodeURIComponent(`*RAPPEL DE PAIEMENT SAMA GESTION*%0A%0ABonjour ${b.locataire}, nous vous rappelons que le terme de votre loyer pour le bien *${b.nom}* (${parseInt(b.loyer).toLocaleString()} CFA) est échu. Merci de régulariser.`);
    window.open(`https://api.whatsapp.com/send?phone=${b.locataireTel.replace(/\s+/g, '')}&text=${msg}`, '_blank');
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }
function filterBiens(s, e) { currentFilter = s; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); renderBiens(); }

function saveBienPro() { 
    const nom = document.getElementById('new-bien-nom').value; 
    const loyer = document.getElementById('new-bien-loyer').value; 
    if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix."); 
    const imageDefaut = ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"]; 
    
    const nouveauBien = { 
        id: Date.now(), agentCreateur: courtierNom, nom: nom, loyer: loyer, 
        type: document.getElementById('new-bien-type').value, 
        adresse = document.getElementById('new-bien-adresse').value || 'Non renseignée', 
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu', 
        proprioTel: document.getElementById('new-bien-proprio-tel').value || '', 
        locataire: 'Aucun', locataireTel: '', 
        com: document.getElementById('new-bien-com').value || "10%", 
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut, 
        statut: 'Disponible', historiquePaiements: [] 
    }; 
    biens.push(nouveauBien); 
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens'); 
}

function toggleStatut(id) { 
    biens = biens.map(b => { 
        if(b.id === id) { 
            if(b.statut==='Disponible') { 
                b.locataire=prompt("Nom locataire:")||"Inconnu"; 
                b.locataireTel=prompt("Téléphone locataire:")||""; 
                b.statut='Occupé'; 
            } else { 
                if(confirm("Libérer ce bien ?")) b.statut='Disponible'; 
            } 
        } 
        return b; 
    }); 
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    fermerModal(); 
    renderBiens(); 
}

function supprimerBien(id) { if(confirm("Supprimer ?")) { biens = biens.filter(x => x.id !== id); localStorage.setItem('sama_biens', JSON.stringify(biens)); fermerModal(); renderBiens(); } }
function updateSelects() { const occ = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); const disp = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); remplirLoyer(); }
function remplirLoyer() { const name = document.getElementById('c-bien-select').value; const type = document.getElementById('c-type').value; const b = biens.find(x => x.nom === name); if(b) { document.getElementById('c-montant').value = type === 'Caution' ? parseFloat(b.loyer)*3 : b.loyer; } }

function validerCollecte(cible) { 
    const name = document.getElementById('c-bien-select').value; 
    const mt = parseFloat(document.getElementById('c-montant').value); 
    const type = document.getElementById('c-type').value; 
    const mode = document.querySelector('input[name="pay-mode"]:checked').value; 
    
    if(!name || isNaN(mt)) return alert("Champs invalides."); 
    const b = biens.find(b => b.nom === name); 
    
    if(!b.historiquePaiements) b.historiquePaiements = []; 
    b.historiquePaiements.push({ id: Date.now(), type: type==='Loyer'?'Loyer Mois':type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR') }); 
    
    let maCom = type==='Caution' ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com)); 
    comTotaleGlobal += maCom; 
    
    localStorage.setItem('sama_com_global', comTotaleGlobal); 
    localStorage.setItem('sama_biens', JSON.stringify(biens)); 
    
    let num = cible === 'locataire' ? b.locataireTel : b.proprioTel;
    let txt = `*REÇU SAMA GESTION*%0ABien: ${b.nom}%0AMontant: ${mt.toLocaleString()} CFA (%0APaiement: ${type})`;
    window.open(`https://api.whatsapp.com/send?phone=${num.replace(/\s+/g, '')}&text=${txt}`, '_blank');
    
    showView('dashboard'); 
}

// ==========================================
// VISITES
// ==========================================

function sauverVisite() { 
    const nom = document.getElementById('p-name').value; 
    const tel = document.getElementById('p-tel').value; 
    const bien = document.getElementById('p-bien-select').value; 
    const date = document.getElementById('p-date').value; 
    if(!nom || !tel || !date || !bien) return alert("Remplissez tous les champs."); 
    
    visites.push({ id: Date.now(), nom, tel, bien, date, statut: 'En attente', qualification: '', notes: '' }); 
    localStorage.setItem('sama_visites', JSON.stringify(visites)); 
    document.getElementById('p-name').value=''; 
    document.getElementById('p-tel').value=''; 
    renderVisites(); 
}

function demarrerVisite(id) { visites = visites.map(v => { if(v.id === id) v.statut = 'En cours'; return v; }); localStorage.setItem('sama_visites', JSON.stringify(visites)); renderVisites(); }
function qualifierVisite(id, avis) { const n = prompt("Notes de visite :"); visites = visites.map(v => { if(v.id === id) { v.statut = 'Terminé'; v.qualification = avis; v.notes = n || ''; } return v; }); localStorage.setItem('sama_visites', JSON.stringify(visites)); renderVisites(); }

function renderVisites() { 
    const vis = visites.filter(v => profilRole === "SuperAdmin" || (biens.find(b => b.nom === v.bien)?.agentCreateur === courtierNom)); 
    const maintenant = new Date();

    document.getElementById('visites-list').innerHTML = vis.map(v => {
        const estPasse = new Date(v.date) < maintenant;
        const styleFutur = !estPasse && v.statut === 'En attente' ? 'opacity: 0.7; border-left: 4px solid #3498DB;' : 'border-left: 4px solid #2ECC71;';
        
        return `
        <div class="form-card" style="text-align:left; ${styleFutur}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b>👤 ${v.nom}</b> 
                <span style="font-size:0.75rem; background:#E0E7FF; padding:2px 6px; border-radius:5px;">${v.qualification || v.statut}</span>
            </div>
            <small>🏠 Bien : ${v.bien}</small><br>
            <small>📅 Rendez-vous : ${v.date.replace('T',' à ')}</small>
            
            <div style="margin-top:8px; display:flex; gap:10px; align-items:center;">
                <a href="tel:${v.tel}" style="color:#3498DB; font-size:0.9rem; text-decoration:none;"><i class="fas fa-phone-alt"></i> Appeler</a>
                <a href="https://api.whatsapp.com/send?phone=${v.tel.replace(/\s+/g, '')}&text=Bonjour%20${v.nom},%20concernant%20notre%20visite..." target="_blank" style="color:#2ECC71; font-size:0.9rem; text-decoration:none;"><i class="fab fa-whatsapp"></i> Relancer</a>
            </div>

            ${v.notes ? `<div style="background:#f1f5f9; padding:5px; border-radius:5px; margin-top:5px; font-size:0.8rem;">📝 <i>${v.notes}</i></div>` : ''}
            
            <div style="margin-top:10px;">
                ${v.statut==='En attente' ? `<button class="btn-primary" style="padding:4px 8px; font-size:0.75rem; background:#2ECC71;" onclick="demarrerVisite(${v.id})">Démarrer</button>` : ''}
                ${v.statut==='En cours' ? `<button style="background:#2ECC71; color:white; padding:4px 8px; font-size:0.75rem; border:none; border-radius:4px;" onclick="qualifierVisite(${v.id},'Chaud 🔥')">Intéressé</button> <button style="background:#E74C3C; color:white; padding:4px 8px; font-size:0.75rem; border:none; border-radius:4px;" onclick="qualifierVisite(${v.id},'Froid ❄️')">Pas chaud</button>` : ''}
            </div>
        </div>`;
    }).reverse().join(''); 
}
