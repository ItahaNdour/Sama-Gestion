// ==========================================
// SAMA GESTION PRO V5.0 - MOTEUR CLOUD SYNCHRO
// ==========================================

// Configuration de la base de données distante (Invisible pour l'utilisateur)
// Remplacer par tes clés API uniques une fois le serveur configuré
const CLOUD_API_URL = "https://api.jsonbin.io/v3/b/664c3c3ad1265a1234567890"; 
const CLOUD_MASTER_KEY = "$2b$10$Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// Variables d'état globales
let biens = [];
let visites = [];
let utilisateurs = [];
let comTotaleGlobal = 0;

let profilRole = localStorage.getItem('sama_role') || null;
let courtierNom = localStorage.getItem('sama_username') || null;
let currentFilter = 'Disponible';
let selectedPhotos = [];

// Liste des avatars disponibles pour le profil
const avatars = ["💼", "🏢", "👑", "🏠", "🌟", "🛡️"];
let monAvatar = localStorage.getItem('sama_avatar') || "💼";

window.onload = async () => {
    // 1. Charger d'abord les données depuis le Cloud de l'agence
    await chargerDonneesDuCloud();
    // 2. Vérifier si la session est active ou s'il faut initialiser
    verifierEtatSecurite();
};

// ==========================================
// SYNC AUTOMATIQUE : LECTURE / ÉCRITURE CLOUD
// ==========================================

async function chargerDonneesDuCloud() {
    // Récupération des données locales en secours si pas de réseau
    biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
    visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
    utilisateurs = JSON.parse(localStorage.getItem('sama_utilisateurs')) || [];
    comTotaleGlobal = parseFloat(localStorage.getItem('sama_com_global')) || 0;

    try {
        // Tentative de récupération en ligne en arrière-plan
        const response = await fetch(CLOUD_API_URL, {
            method: "GET",
            headers: { "X-Master-Key": CLOUD_MASTER_KEY }
        });
        if (response.ok) {
            const resData = await response.json();
            const cloud = resData.record;
            
            // On met à jour notre mémoire avec les données fraîches du serveur
            utilisateurs = cloud.utilisateurs || [];
            biens = cloud.biens || [];
            visites = cloud.visites || [];
            comTotaleGlobal = cloud.comTotaleGlobal || 0;
            
            // Sauvegarde locale de secours
            sauvegarderEnLocal();
        }
    } catch (error) {
        console.log("Mode hors-ligne activé (Données locales chargées).");
    }
}

async function synchroniserAvecLeCloud() {
    sauvegarderEnLocal();

    const dataPackage = {
        utilisateurs: utilisateurs,
        biens: biens,
        visites: visites,
        comTotaleGlobal: comTotaleGlobal
    };

    try {
        await fetch(CLOUD_API_URL, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": CLOUD_MASTER_KEY
            },
            body: JSON.stringify(dataPackage)
        });
    } catch (error) {
        console.error("Échec de la synchronisation instantanée au Cloud.");
    }
}

function sauvegarderEnLocal() {
    localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    localStorage.setItem('sama_com_global', comTotaleGlobal);
}

// ==========================================
// GESTION DU COMPTE ET SÉCURITÉ
// ==========================================

function verifierEtatSecurite() {
    const loginScreen = document.getElementById('login-screen');
    
    // Si la base cloud est totalement vide (Premier lancement de l'application)
    if (utilisateurs.length === 0) {
        loginScreen.style.display = 'flex';
        document.getElementById('login-title').innerText = "👑 Initialisation de l'App";
        document.getElementById('login-subtitle').innerHTML = "<b>Créez le compte unique du Propriétaire (SuperAdmin).</b><br>Ce compte gère toutes les agences.";
        document.getElementById('login-submit-btn').innerText = "Créer mon compte Maitre";
        document.getElementById('login-submit-btn').setAttribute('onclick', 'creerSuperAdminUnique()');
    } else if (profilRole && courtierNom) {
        // L'utilisateur est déjà connecté
        loginScreen.style.display = 'none';
        majInterfaceProfil();
        showView('dashboard');
    } else {
        // Demande de connexion standard
        loginScreen.style.display = 'flex';
        document.getElementById('login-title').innerText = "Sama Gestion Pro";
        document.getElementById('login-subtitle').innerText = "Connexion Agence / Courtier";
        document.getElementById('login-submit-btn').setAttribute('onclick', 'verifierConnexion()');
    }
}

async function creerSuperAdminUnique() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (!user || pass.length < 4) {
        errorMsg.innerText = "⚠️ Identifiant et mot de passe (4 char min) requis.";
        errorMsg.style.display = 'block';
        return;
    }

    const maitre = { username: user, password: pass, role: "SuperAdmin", avatar: "👑" };
    utilisateurs.push(maitre);
    
    profilRole = "SuperAdmin";
    courtierNom = user;
    monAvatar = "👑";
    
    localStorage.setItem('sama_role', "SuperAdmin");
    localStorage.setItem('sama_username', user);
    localStorage.setItem('sama_avatar', "👑");

    await synchroniserAvecLeCloud();
    
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

    // Connexion réussie
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
    profilRole = null;
    courtierNom = null;
    location.reload();
}

// ==========================================
// ESPACE DE GESTION DE L'ADMIN (TOI SEUL)
// ==========================================

function majInterfaceProfil() {
    document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-statut-actuel').innerText = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '⚙️ Super Administrateur' : '🏢 Agence / Courtier Partenaire';
    
    const adminSection = document.getElementById('admin-management-section');
    if (profilRole === "SuperAdmin") {
        adminSection.style.display = 'block';
        renderAdminAgencesList();
    } else {
        adminSection.style.display = 'none';
    }
}

async function adminCreerCompteCourtier() {
    const name = document.getElementById('admin-new-user-name').value.trim();
    const pass = document.getElementById('admin-new-user-pin').value.trim();
    
    if(!name || !pass) return alert("Veuillez remplir tous les champs.");
    if(utilisateurs.some(u => u.username.toLowerCase() === name.toLowerCase())) return alert("Cet identifiant existe déjà.");

    // Assigner un avatar aléatoire de la liste aux nouvelles agences
    const randomAvatar = avatars[Math.floor(Math.random() * (avatars.length - 1)) + 1];

    utilisateurs.push({ username: name, password: pass, role: "Courtier", avatar: randomAvatar });
    
    document.getElementById('admin-new-user-name').value = '';
    document.getElementById('admin-new-user-pin').value = '';
    
    await synchroniserAvecLeCloud();
    renderAdminAgencesList();
    alert(`L'accès pour l'agence/courtier "${name}" est actif sur tous les appareils !`);
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list');
    if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px; border-radius:8px; margin-bottom:5px; border:1px solid #e2e8f0; font-size:0.85rem;">
            <span>${u.avatar || '💼'} <b>${u.username}</b> (Mdp : ${u.password})</span>
            ${u.role !== 'SuperAdmin' ? `<i class="fas fa-trash-alt" style="color:#EF4444; cursor:pointer;" onclick="adminSupprimerAgence('${u.username}')"></i>` : '⭐ Principal'}
        </div>
    `).join('');
}

async function adminSupprimerAgence(username) {
    if(confirm(`Supprimer définitivement l'accès de ${username} ?`)) {
        utilisateurs = utilisateurs.filter(u => u.username !== username);
        await synchroniserAvecLeCloud();
        renderAdminAgencesList();
    }
}

// ==========================================
// VOS FONCTIONS DE GESTION (INCHANGÉES ET RESTAURÉES)
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
        document.querySelector('.revenue-card p').innerText = "Commission Totale de l'Application"; 
    } else { 
        let comCourtier = 0; 
        biens.forEach(b => { 
            if(b.agentCreateur === courtierNom && b.historiquePaiements) { 
                b.historiquePaiements.forEach(p => { 
                    if(p.type === 'Caution') comCourtier += parseFloat(b.loyer); 
                    else if(p.type === 'Loyer Mois') comCourtier += b.com.includes('%') ? (parseFloat(b.com)/100) * p.montant : parseFloat(b.com); 
                    else comCourtier += p.montant; 
                }); 
            } 
        }); 
        document.getElementById('total-display').innerText = comCourtier.toLocaleString() + " CFA"; 
        document.querySelector('.revenue-card p').innerText = `Ma Commission Collectée`; 
    } 
}

function previewImage(input) { if (input.files) { Array.from(input.files).forEach(file => { const reader = new FileReader(); reader.onload = e => { if(selectedPhotos.length < 3) { selectedPhotos.push(e.target.result); renderPreviews(); } }; reader.readAsDataURL(file); }); } }
function renderPreviews() { document.getElementById('previews-container').innerHTML = selectedPhotos.map(p => `<img src="${p}" style="width:40px;height:40px;border-radius:5px;object-fit:cover;">`).join(''); }
function ouvrirFormulaireAjout() { document.getElementById('edit-bien-id').value = ''; document.getElementById('form-bien-title').innerText = "Nouveau Bien"; document.getElementById('btn-valider-bien').innerText = "Enregistrer le bien"; selectedPhotos = []; document.getElementById('previews-container').innerHTML = ''; document.getElementById('new-bien-nom').value = ''; document.getElementById('new-bien-loyer').value = ''; document.getElementById('new-bien-adresse').value = ''; document.getElementById('new-bien-proprio').value = ''; document.getElementById('new-bien-proprio-tel').value = ''; document.getElementById('new-bien-locataire').value = ''; document.getElementById('new-bien-locataire-tel').value = ''; showView('ajouter-bien'); }

function lancerModificationBien(id) { 
    fermerModal(); 
    const b = biens.find(x => x.id === id); 
    if(!b) return; 
    document.getElementById('edit-bien-id').value = b.id; 
    document.getElementById('form-bien-title').innerText = "Modifier le Bien"; 
    document.getElementById('new-bien-type').value = b.type; 
    document.getElementById('new-bien-nom').value = b.nom; 
    document.getElementById('new-bien-adresse').value = b.adresse; 
    document.getElementById('new-bien-loyer').value = b.loyer; 
    document.getElementById('new-bien-com').value = b.com; 
    document.getElementById('new-bien-proprio').value = b.proprio; 
    document.getElementById('new-bien-proprio-tel').value = b.proprioTel; 
    document.getElementById('new-bien-locataire').value = b.locataire === 'Aucun' ? '' : b.locataire; 
    document.getElementById('new-bien-locataire-tel').value = b.locataireTel || ''; 
    selectedPhotos = [...b.photos]; 
    renderPreviews(); 
    showView('ajouter-bien'); 
}

async function saveBienPro() { 
    const idModification = document.getElementById('edit-bien-id').value; 
    const nom = document.getElementById('new-bien-nom').value; 
    const loyer = document.getElementById('new-bien-loyer').value; 
    if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix."); 
    const imageDefaut = ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"]; 
    const nomLocataire = document.getElementById('new-bien-locataire').value; 
    const statutInitial = nomLocataire.trim() !== "" ? "Occupé" : "Disponible"; 
    
    if(idModification) { 
        biens = biens.map(b => { 
            if(b.id == idModification) { 
                b.nom = nom; b.loyer = loyer; 
                b.type = document.getElementById('new-bien-type').value; 
                b.adresse = document.getElementById('new-bien-adresse').value || 'Non renseignée'; 
                b.proprio = document.getElementById('new-bien-proprio').value || 'Inconnu'; 
                b.proprioTel = document.getElementById('new-bien-proprio-tel').value || ''; 
                b.locataire = nomLocataire || 'Aucun'; 
                b.locataireTel = document.getElementById('new-bien-locataire-tel').value || ''; 
                b.com = document.getElementById('new-bien-com').value || "10%"; 
                b.photos = selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut; 
                b.statut = statutInitial; 
            } 
            return b; 
        }); 
    } else { 
        const nouveauBien = { 
            id: Date.now(), agentCreateur: courtierNom, nom: nom, loyer: loyer, 
            type: document.getElementById('new-bien-type').value, 
            adresse: document.getElementById('new-bien-adresse').value || 'Non renseignée', 
            proprio: document.getElementById('new-bien-proprio').value || 'Inconnu', 
            proprioTel: document.getElementById('new-bien-proprio-tel').value || '', 
            locataire: nomLocataire || 'Aucun', locataireTel: document.getElementById('new-bien-locataire-tel').value || '', 
            com: document.getElementById('new-bien-com').value || "10%", 
            photos: selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut, 
            statut: statutInitial, reliquat: 0, historiquePaiements: [] 
        }; 
        biens.push(nouveauBien); 
    } 
    await synchroniserAvecLeCloud(); 
    selectedPhotos = []; 
    showView('biens'); 
}

function renderBiens() { 
    const searchText = document.getElementById('search-bien-input').value.toLowerCase(); 
    const filtered = biens.filter(b => { 
        const txt = b.nom.toLowerCase().includes(searchText) || b.adresse.toLowerCase().includes(searchText) || b.proprio.toLowerCase().includes(searchText); 
        const tab = b.statut === currentFilter; 
        return profilRole === "SuperAdmin" ? (tab && txt) : (tab && txt && b.agentCreateur === courtierNom); 
    }); 
    document.getElementById('biens-list').innerHTML = filtered.map(b => `<div class="form-card" onclick="voirDetailBien(${b.id})"><div class="bien-gallery">${b.photos.map(p => `<img src="${p}">`).join('')}</div><div style="margin-top:10px; position: relative;"><strong>${b.nom}</strong><br><small><i class="fas fa-map-marker-alt"></i> ${b.adresse}</small><br><span style="color:var(--blue); font-weight:bold;">${parseInt(b.loyer).toLocaleString()} CFA</span><button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position: absolute; right: 0; bottom: 0; background: #E0E7FF; color: var(--blue); border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: pointer;"><i class="fas fa-wallet"></i> Suivi</button></div></div>`).reverse().join(''); 
}

function voirDetailBien(id) { 
    const b = biens.find(x => x.id === id); 
    const modal = document.getElementById('modal-bien'); 
    let cp = b.proprioTel ? `<div style="background:#f1f5f9; padding:8px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><div><small style="color:#64748b;">Propriétaire :</small><br><strong>${b.proprio}</strong></div><div style="display:flex; gap:6px;"><a href="tel:${b.proprioTel}" style="background:#3498DB; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fas fa-phone"></i></a></div></div>` : `<p><strong>Propriétaire:</strong> ${b.proprio}</p>`; 
    document.getElementById('modal-body').innerHTML = `<h3 style="color:var(--blue); margin-top:0; margin-bottom:5px;">${b.nom}</h3><p style="margin:0 0 10px 0; font-size:0.85rem; color:#64748b;"><i class="fas fa-map-marker-alt"></i> ${b.adresse}</p><p style="margin:5px 0;"><strong>Loyer:</strong> ${parseInt(b.loyer).toLocaleString()} CFA</p><hr style="border:0; border-top:1px solid #eee; margin:10px 0;">${cp}<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;"><button class="btn-primary" style="background:#F39C12;" onclick="lancerModificationBien(${b.id})"><i class="fas fa-edit"></i> Modifier</button><button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer'}</button></div><button class="btn-outline" style="color:var(--red); margin-top:8px;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer</button><button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>`; 
    modal.style.display = 'flex'; 
}

function ouvrirPortefeuille(id) { const b = biens.find(x => x.id === id); if (!b.historiquePaiements) b.historiquePaiements = []; const tot = b.historiquePaiements.reduce((sum, p) => sum + p.montant, 0); let hist = b.historiquePaiements.map(p => `<div style="display:flex; justify-content:space-between; background:#f8fafc; padding:8px; border-radius:8px; margin-bottom:5px; font-size:0.8rem;"><div style="text-align:left;"><b>${p.type}</b><br><small>${p.date}</small></div><div style="font-weight:bold;">+ ${p.montant.toLocaleString()} CFA</div></div>`).reverse().join(''); document.getElementById('modal-body').innerHTML = `<h3>Portefeuille : ${b.nom}</h3><div style="background:var(--blue); color:white; padding:12px; border-radius:12px; text-align:center; margin-bottom:10px;"><small>Cumul Encaissé</small><h2>${tot.toLocaleString()} CFA</h2></div><h4>Historique</h4><div style="max-height:150px; overflow-y:auto;">${hist}</div><button class="btn-primary" style="margin-top:10px;" onclick="voirDetailBien(${b.id})">Retour</button>`; }
function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }
function filterBiens(s, e) { currentFilter = s; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); renderBiens(); }
async function toggleStatut(id) { biens = biens.map(b => { if(b.id === id) { if(b.statut==='Disponible') { b.locataire=prompt("Nom locataire:")||"Inconnu"; b.locataireTel=prompt("Téléphone locataire:")||""; b.statut='Occupé'; } else { if(confirm("Libérer ce bien ?")) b.statut='Disponible'; } } return b; }); await synchroniserAvecLeCloud(); fermerModal(); renderBiens(); }
async function supprimerBien(id) { if(confirm("Supprimer définitivement ?")) { biens = biens.filter(x => x.id !== id); await synchroniserAvecLeCloud(); fermerModal(); renderBiens(); } }
function updateSelects() { const occ = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); const disp = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); remplirLoyer(); }
function remplirLoyer() { const name = document.getElementById('c-bien-select').value; const type = document.getElementById('c-type').value; const b = biens.find(x => x.nom === name); if(b) { document.getElementById('c-montant').value = type === 'Caution' ? parseFloat(b.loyer)*3 : b.loyer; } }

async function validerCollecte(cible) { 
    const data = executerSauvegardeFinanciere(); 
    if(!data) return; 
    await synchroniserAvecLeCloud();
    showView('dashboard'); 
}

function executerSauvegardeFinanciere() { const name = document.getElementById('c-bien-select').value; const mt = parseFloat(document.getElementById('c-montant').value); const type = document.getElementById('c-type').value; const mode = document.querySelector('input[name="pay-mode"]:checked').value; if(!name || isNaN(mt)) return null; const idx = biens.findIndex(b => b.nom === name); if(idx===-1) return null; const b = biens[idx]; if(!b.historiquePaiements) b.historiquePaiements = []; b.historiquePaiements.push({ id: Date.now(), type: type==='Loyer'?'Loyer Mois':type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'short'}) }); let maCom = type==='Caution' ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com)); comTotaleGlobal += maCom; return { bien: b, montantPaye: mt, type, mode, maCom }; }

// ==========================================
// RESTAURATION COMPLÈTE DE TA LOGIQUE VISITE
// ==========================================
async function sauverVisite() { 
    const nom = document.getElementById('p-name').value; 
    const bien = document.getElementById('p-bien-select').value; 
    const date = document.getElementById('p-date').value; 
    if(!nom||!date||!bien) return alert("Champs invalides."); 
    visites.push({ id: Date.now(), nom, bien, date, statut: 'En attente', qualification: '', notes: '', rappelEnvoye: false }); 
    await synchroniserAvecLeCloud(); 
    document.getElementById('p-name').value=''; 
    renderVisites(); 
}

async function demarrerVisite(id) { visites = visites.map(v => { if(v.id === id) v.statut = 'En cours'; return v; }); await synchroniserAvecLeCloud(); renderVisites(); }
async function qualifierVisite(id, avis) { const note = prompt("Ajouter une note de débriefing (optionnel) :"); visites = visites.map(v => { if(v.id === id) { v.statut = 'Terminé'; v.qualification = avis; v.notes = note || ''; } return v; }); await synchroniserAvecLeCloud(); renderVisites(); }

function renderVisites() { 
    const vis = visites.filter(v => profilRole === "SuperAdmin" || (biens.find(b => b.nom === v.bien)?.agentCreateur === courtierNom)); 
    const maintenant = new Date();

    document.getElementById('visites-list').innerHTML = vis.map(v => {
        const dateVisite = new Date(v.date);
        const estPasse = dateVisite < maintenant;
        // Effet grisé si la date n'est pas encore arrivée
        const styleFutur = !estPasse && v.statut === 'En attente' ? 'opacity: 0.75; border-left: 4px solid #3498DB;' : 'border-left: 4px solid #2ECC71;';
        
        return `
        <div class="form-card" style="text-align:left; ${styleFutur}">
            <div style="display:flex; justify-content:space-between;">
                <b>👤 ${v.nom}</b> 
                <span class="badge">${v.qualification || v.statut}</span>
            </div>
            <small>🏠 Bien : <b>${v.bien}</b></small><br>
            <small>📅 Date : ${v.date.replace('T',' à ')} ${!estPasse ? '⏳ (À venir)' : '🔔 (Rappel disponible)'}</small>
            ${v.notes ? `<br><div style="background:#f1f5f9; padding:5px; border-radius:5px; margin-top:5px; font-size:0.8rem;">📝 <i>${v.notes}</i></div>` : ''}
            
            <div style="margin-top:8px; display:flex; gap:5px;">
                ${v.statut==='En attente' ? `<button class="btn-primary" style="padding:4px 8px; font-size:0.75rem; background:#2ECC71;" onclick="demarrerVisite(${v.id})">Démarrer</button>` : ''}
                ${v.statut==='En cours' ? `<button style="background:#2ECC71; color:white; padding:4px;" onclick="qualifierVisite(${v.id},'Chaud 🔥')">Intéressé</button> <button style="background:#E74C3C; color:white; padding:4px;" onclick="qualifierVisite(${v.id},'Froid ❄️')">Pas intéressé</button>` : ''}
            </div>
        </div>`;
    }).reverse().join(''); 
}
