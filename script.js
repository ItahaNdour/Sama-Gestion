// Sama Gestion Pro v3.3 - Initialisation Vierge et Sécurité Absolue
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let comTotaleGlobal = parseFloat(localStorage.getItem('sama_com_global')) || 0; 

// Base des utilisateurs : TOTALEMENT VIERGE AU DÉPART
let utilisateurs = JSON.parse(localStorage.getItem('sama_utilisateurs')) || [];

let profilRole = localStorage.getItem('sama_profil-role') || null; 
let courtierNom = localStorage.getItem('sama_courtier_nom') || null;
let currentFilter = 'Disponible';
let selectedPhotos = [];

window.onload = () => {
    verifierEtatBaseDonnees();
};

// --- LE BOUTON MAGIQUE : DÉTECTION DU PREMIER LANCEMENT ---
function verifierEtatBaseDonnees() {
    const loginScreen = document.getElementById('login-screen');
    
    // S'il n'y a absolument aucun compte dans la machine (Premier lancement)
    if (utilisateurs.length === 0) {
        loginScreen.style.display = 'flex';
        // On transforme l'écran de login en écran de configuration du Patron
        document.querySelector('#login-screen h3').innerText = "👑 Configuration Super Admin";
        document.querySelector('#login-screen p').style.color = "#E74C3C";
        document.querySelector('#login-screen p').innerHTML = "<b>Aucun compte détecté.</b><br>Créez le compte du Directeur Général maintenant.";
        
        // On change le texte du bouton pour être clair
        document.querySelector('#login-screen button').innerHTML = "<i class='fas fa-user-shield'></i> Initialiser mon compte Admin";
        // On redirige temporairement le clic vers la fonction de création initiale
        document.querySelector('#login-screen button').setAttribute('onclick', 'initialiserSuperAdmin()');
    } else {
        // La base contient déjà des comptes, on charge la session normale
        verifierSessionActive();
    }
}

// --- FONCTION UNIQUE DE CRÉATION DU COMPTE RACINE ---
function initialiserSuperAdmin() {
    const nomSaisi = document.getElementById('login-username').value.trim();
    const pinSaisi = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    errorMsg.style.display = 'none';

    if (!nomSaisi || pinSaisi.length < 4) {
        errorMsg.innerText = "⚠️ Veuillez entrer votre nom et un code PIN d'au moins 4 chiffres.";
        errorMsg.style.display = 'block';
        return;
    }

    // On crée ton compte SuperAdmin sur mesure dans le stockage local du téléphone/navigateur
    const monCompteAdmin = {
        nom: nomSaisi,
        pin: pinSaisi,
        role: "SuperAdmin"
    };

    utilisateurs.push(monCompteAdmin);
    localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));

    // On connecte immédiatement l'admin fraîchement créé
    profilRole = "SuperAdmin";
    courtierNom = nomSaisi;
    localStorage.setItem('sama_profil-role', profilRole);
    localStorage.setItem('sama_courtier_nom', courtierNom);

    // On remet le bouton de connexion dans son état normal pour le futur
    document.querySelector('#login-screen button').setAttribute('onclick', 'verifierConnexion()');

    // Nettoyage et ouverture du tableau de bord
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-screen').style.display = 'none';
    
    alert(`👑 Bienvenue Directeur. Votre compte "${nomSaisi}" a été configuré comme unique Super Admin.`);
    
    majInterfaceBadge();
    showView('dashboard');
}

function verifierSessionActive() {
    const loginScreen = document.getElementById('login-screen');
    if (profilRole && courtierNom) {
        loginScreen.style.display = 'none';
        majInterfaceBadge();
        showView('dashboard');
    } else {
        // On s'assure que l'écran affiche les textes standards de connexion
        document.querySelector('#login-screen h3').innerText = "Sama Gestion Pro";
        document.querySelector('#login-screen p').innerText = "Veuillez vous authentifier";
        document.querySelector('#login-screen p').style.color = "#64748b";
        document.querySelector('#login-screen button').innerHTML = "<i class='fas fa-sign-in-alt'></i> Se connecter";
        document.querySelector('#login-screen button').setAttribute('onclick', 'verifierConnexion()');
        loginScreen.style.display = 'flex';
    }
}

// --- VERIFICATION DE CONNEXION STANDARD ---
function verifierConnexion() {
    const nomSaisi = document.getElementById('login-username').value.trim();
    const pinSaisi = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    errorMsg.style.display = 'none';

    if (!nomSaisi || !pinSaisi) {
        errorMsg.innerText = "⚠️ Veuillez remplir les deux champs.";
        errorMsg.style.display = 'block';
        return;
    }

    const nomExiste = utilisateurs.some(u => u.nom.toLowerCase() === nomSaisi.toLowerCase());

    if (!nomExiste) {
        errorMsg.innerText = "❌ Vous n'avez pas de compte. Veuillez contacter l'administrateur.";
        errorMsg.style.display = 'block';
        return;
    }

    const utilisateurValide = utilisateurs.find(u => u.nom.toLowerCase() === nomSaisi.toLowerCase() && u.pin === pinSaisi);

    if (utilisateurValide) {
        profilRole = utilisateurValide.role;
        courtierNom = utilisateurValide.nom;
        
        localStorage.setItem('sama_profil-role', profilRole);
        localStorage.setItem('sama_courtier_nom', courtierNom);

        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-screen').style.display = 'none';
        
        majInterfaceBadge();
        showView('dashboard');
    } else {
        errorMsg.innerText = "❌ Code PIN incorrect ! Veuillez réessayer.";
        errorMsg.style.display = 'block';
    }
}

function deconnexion() {
    localStorage.removeItem('sama_profil-role');
    localStorage.removeItem('sama_courtier_nom');
    profilRole = null;
    courtierNom = null;
    verifierSessionActive();
}

// --- CRÉATION DES COMPTES COURTIERS PAR L'ADMIN ---
function adminCreerCompteCourtier() {
    if (profilRole !== "SuperAdmin") return;

    const nom = document.getElementById('admin-new-user-name').value.trim();
    const pin = document.getElementById('admin-new-user-pin').value.trim();
    
    if(!nom || pin.length < 4) return alert("Veuillez entrer un nom et un PIN à 4 chiffres.");
    
    if(utilisateurs.some(u => u.nom.toLowerCase() === nom.toLowerCase())) {
        return alert("Un membre de l'équipe possède déjà ce compte.");
    }

    utilisateurs.push({ nom: nom, pin: pin, role: "Courtier" });
    localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));
    
    document.getElementById('admin-new-user-name').value = '';
    document.getElementById('admin-new-user-pin').value = '';
    
    alert(`Compte créé ! L'agent "${nom}" peut maintenant se connecter.`);
    renderAdminUsersList();
}

function adminSupprimerCompte(nom) {
    // Le compte principal (le premier créé) ne peut pas s'auto-supprimer
    if(nom === courtierNom) return alert("Action impossible : Vous ne pouvez pas supprimer votre propre compte Super Admin actif.");
    
    if(confirm(`Supprimer définitivement les accès de ${nom} ?`)) {
        utilisateurs = utilisateurs.filter(u => u.nom !== nom);
        localStorage.setItem('sama_utilisateurs', JSON.stringify(utilisateurs));
        renderAdminUsersList();
    }
}

function renderAdminUsersList() {
    const conteneur = document.getElementById('admin-users-list');
    if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:8px 12px; border-radius:8px; margin-bottom:5px; border:1px solid #e2e8f0; font-size:0.85rem; text-align: left;">
            <span>👤 <b>${u.nom}</b> (PIN : ${u.pin}) — <i>${u.role === 'SuperAdmin' ? 'Directeur (Moi)' : 'Agent'}</i></span>
            ${u.role !== 'SuperAdmin' ? `<i class="fas fa-trash-alt" style="color:#EF4444; cursor:pointer;" onclick="adminSupprimerCompte('${u.nom}')"></i>` : ''}
        </div>
    `).join('');
}

function majInterfaceBadge() {
    if (document.getElementById('header-user-badge')) {
        document.getElementById('header-user-badge').innerHTML = `<i class="fas fa-user-circle"></i> ${courtierNom}`;
    }
    if (document.getElementById('profil-statut-actuel')) {
        document.getElementById('profil-statut-actuel').innerText = courtierNom;
        document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '⚙️ Directeur Général (Admin)' : '💼 Agent Commercial';
    }
    
    const adminSection = document.getElementById('admin-management-section');
    if(adminSection) {
        if(profilRole === "SuperAdmin") {
            adminSection.style.display = 'block';
            renderAdminUsersList();
        } else {
            adminSection.style.display = 'none';
        }
    }
}

function showView(id) {
    if (!profilRole || !courtierNom) return verifierSessionActive();
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + id).style.display = 'block';
    rafraichirCompteurCommission();
    if(id === 'biens') { document.getElementById('search-bien-input').value = ''; renderBiens(); }
    if(id === 'collecte') updateSelects();
    if(id === 'planning') { updateSelects(); renderVisites(); }
}

// [Le reste des fonctions financières, de biens et de visites reste inchangé pour garder tes données]
function rafraichirCompteurCommission() { if (!profilRole) return; if (profilRole === "SuperAdmin") { document.getElementById('total-display').innerText = comTotaleGlobal.toLocaleString() + " CFA"; document.querySelector('.revenue-card p').innerText = "Commission Totale Agence"; } else { let comCourtier = 0; biens.forEach(b => { if(b.agentCreateur === courtierNom && b.historiquePaiements) { b.historiquePaiements.forEach(p => { if(p.type === 'Caution') comCourtier += parseFloat(b.loyer); else if(p.type === 'Loyer Mois') comCourtier += b.com.includes('%') ? (parseFloat(b.com)/100) * p.montant : parseFloat(b.com); else comCourtier += p.montant; }); } }); document.getElementById('total-display').innerText = comCourtier.toLocaleString() + " CFA"; document.querySelector('.revenue-card p').innerText = `Ma Commission Encaissée`; } }
function previewImage(input) { if (input.files) { Array.from(input.files).forEach(file => { const reader = new FileReader(); reader.onload = e => { if(selectedPhotos.length < 3) { selectedPhotos.push(e.target.result); renderPreviews(); } }; reader.readAsDataURL(file); }); } }
function renderPreviews() { document.getElementById('previews-container').innerHTML = selectedPhotos.map(p => `<img src="${p}" style="width:40px;height:40px;border-radius:5px;object-fit:cover;">`).join(''); }
function ouvrirFormulaireAjout() { document.getElementById('edit-bien-id').value = ''; document.getElementById('form-bien-title').innerText = "Nouveau Bien"; document.getElementById('btn-valider-bien').innerText = "Enregistrer le bien"; selectedPhotos = []; document.getElementById('previews-container').innerHTML = ''; document.getElementById('new-bien-nom').value = ''; document.getElementById('new-bien-loyer').value = ''; document.getElementById('new-bien-adresse').value = ''; document.getElementById('new-bien-proprio').value = ''; document.getElementById('new-bien-proprio-tel').value = ''; document.getElementById('new-bien-locataire').value = ''; document.getElementById('new-bien-locataire-tel').value = ''; showView('ajouter-bien'); }
function lancerModificationBien(id) { fermerModal(); const b = biens.find(x => x.id === id); if(!b) return; document.getElementById('edit-bien-id').value = b.id; document.getElementById('form-bien-title').innerText = "Modifier le Bien"; document.getElementById('btn-valider-bien').innerText = "Sauvegarder les modifications"; document.getElementById('new-bien-type').value = b.type; document.getElementById('new-bien-nom').value = b.nom; document.getElementById('new-bien-adresse').value = b.adresse; document.getElementById('new-bien-loyer').value = b.loyer; document.getElementById('new-bien-com').value = b.com; document.getElementById('new-bien-proprio').value = b.proprio; document.getElementById('new-bien-proprio-tel').value = b.proprioTel; document.getElementById('new-bien-locataire').value = b.locataire === 'Aucun' ? '' : b.locataire; document.getElementById('new-bien-locataire-tel').value = b.locataireTel || ''; selectedPhotos = [...b.photos]; renderPreviews(); showView('ajouter-bien'); }
function saveBienPro() { const idModification = document.getElementById('edit-bien-id').value; const nom = document.getElementById('new-bien-nom').value; const loyer = document.getElementById('new-bien-loyer').value; if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix."); const imageDefaut = ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"]; const nomLocataire = document.getElementById('new-bien-locataire').value; const statutInitial = nomLocataire.trim() !== "" ? "Occupé" : "Disponible"; if(idModification) { biens = biens.map(b => { if(b.id == idModification) { b.nom = nom; b.loyer = loyer; b.type = document.getElementById('new-bien-type').value; b.adresse = document.getElementById('new-bien-adresse').value || 'Non renseignée'; b.proprio = document.getElementById('new-bien-proprio').value || 'Inconnu'; b.proprioTel = document.getElementById('new-bien-proprio-tel').value || ''; b.locataire = nomLocataire || 'Aucun'; b.locataireTel = document.getElementById('new-bien-locataire-tel').value || ''; b.com = document.getElementById('new-bien-com').value || "10%"; b.photos = selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut; b.statut = statutInitial; } return b; }); alert("Bien immobilier modifié !"); } else { const nouveauBien = { id: Date.now(), agentCreateur: courtierNom, nom: nom, loyer: loyer, type: document.getElementById('new-bien-type').value, adresse: document.getElementById('new-bien-adresse').value || 'Non renseignée', proprio: document.getElementById('new-bien-proprio').value || 'Inconnu', proprioTel: document.getElementById('new-bien-proprio-tel').value || '', locataire: nomLocataire || 'Aucun', locataireTel: document.getElementById('new-bien-locataire-tel').value || '', com: document.getElementById('new-bien-com').value || "10%", photos: selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut, statut: statutInitial, reliquat: 0, historiquePaiements: [] }; biens.push(nouveauBien); } localStorage.setItem('sama_biens', JSON.stringify(biens)); selectedPhotos = []; showView('biens'); }
function renderBiens() { const searchText = document.getElementById('search-bien-input').value.toLowerCase(); const filtered = biens.filter(b => { const txt = b.nom.toLowerCase().includes(searchText) || b.adresse.toLowerCase().includes(searchText) || b.type.toLowerCase().includes(searchText) || b.proprio.toLowerCase().includes(searchText); const tab = b.statut === currentFilter; return profilRole === "SuperAdmin" ? (tab && txt) : (tab && txt && b.agentCreateur === courtierNom); }); document.getElementById('biens-list').innerHTML = filtered.map(b => `<div class="form-card" onclick="voirDetailBien(${b.id})"><div class="bien-gallery">${b.photos.map(p => `<img src="${p}">`).join('')}</div><div style="margin-top:10px; position: relative;"><strong>${b.nom}</strong><br><small><i class="fas fa-map-marker-alt"></i> ${b.adresse}</small><br><span style="color:var(--blue); font-weight:bold;">${parseInt(b.loyer).toLocaleString()} CFA</span>${b.reliquat > 0 ? `<br><span style="color:var(--red); font-size:0.8rem; font-weight:bold;">⚠️ Reste : ${b.reliquat.toLocaleString()} CFA</span>` : ''}<button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position: absolute; right: 0; bottom: 0; background: #E0E7FF; color: var(--blue); border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: pointer;"><i class="fas fa-wallet"></i> Suivi</button></div></div>`).reverse().join(''); }
function voirDetailBien(id) { const b = biens.find(x => x.id === id); const modal = document.getElementById('modal-bien'); let cp = b.proprioTel ? `<div style="background:#f1f5f9; padding:8px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><div><small style="color:#64748b;">Propriétaire :</small><br><strong>${b.proprio}</strong></div><div style="display:flex; gap:6px;"><a href="tel:${b.proprioTel}" style="background:#3498DB; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fas fa-phone"></i></a><a href="https://api.whatsapp.com/send?phone=${b.proprioTel.replace(/\s+/g, '')}" target="_blank" style="background:#2ECC71; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fab fa-whatsapp"></i></a></div></div>` : `<p><strong>Propriétaire:</strong> ${b.proprio}</p>`; let cl = (b.statut === 'Occupé' && b.locataireTel) ? `<div style="background:#e0f2fe; padding:8px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;"><div><small style="color:#0369a1;">Locataire :</small><br><strong>${b.locataire}</strong></div><div style="display:flex; gap:6px;"><a href="tel:${b.locataireTel}" style="background:#3498DB; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fas fa-phone"></i></a><a href="https://api.whatsapp.com/send?phone=${b.locataireTel.replace(/\s+/g, '')}" target="_blank" style="background:#2ECC71; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fab fa-whatsapp"></i></a></div></div>` : (b.statut === 'Occupé' ? `<p><strong>Locataire:</strong> ${b.locataire}</p>` : ''); document.getElementById('modal-body').innerHTML = `<h3 style="color:var(--blue); margin-top:0; margin-bottom:5px;">${b.nom}</h3><p style="margin:0 0 10px 0; font-size:0.85rem; color:#64748b;"><i class="fas fa-map-marker-alt"></i> ${b.adresse}</p><p style="margin:5px 0;"><strong>Loyer:</strong> ${parseInt(b.loyer).toLocaleString()} CFA</p><p style="margin:5px 0;"><strong>Statut:</strong> <span style="font-weight:bold; color:${b.statut==='Disponible'?'#2ECC71':'#E74C3C'}">${b.statut}</span></p><hr style="border:0; border-top:1px solid #eee; margin:10px 0;">${cp}${cl}<hr style="border:0; border-top:1px solid #eee; margin:10px 0;"><div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;"><button class="btn-primary" style="background:#F39C12;" onclick="lancerModificationBien(${b.id})"><i class="fas fa-edit"></i> Modifier</button><button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer'}</button></div><button class="btn-outline" style="background:#F0F4FF; color:var(--blue); margin-top:8px;" onclick="ouvrirPortefeuille(${b.id})"><i class="fas fa-wallet"></i> Portefeuille</button><button class="btn-outline" style="color:var(--red); margin-top:8px;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer</button><button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>`; modal.style.display = 'flex'; }
function ouvrirPortefeuille(id) { const b = biens.find(x => x.id === id); if (!b.historiquePaiements) b.historiquePaiements = []; const tot = b.historiquePaiements.reduce((sum, p) => sum + p.montant, 0); let hist = b.historiquePaiements.length > 0 ? b.historiquePaiements.map(p => `<div style="display:flex; justify-content:space-between; background:#f8fafc; padding:8px; border-radius:8px; margin-bottom:5px; font-size:0.8rem;"><div style="text-align:left;"><b>${p.type}</b><br><small>${p.date}</small></div><div style="font-weight:bold;">+ ${p.montant.toLocaleString()} CFA</div></div>`).reverse().join('') : '<p style="text-align:center;font-size:0.85rem;color:#64748b;">Aucun flux.</p>'; document.getElementById('modal-body').innerHTML = `<h3>Portefeuille : ${b.nom}</h3><div style="background:var(--blue); color:white; padding:12px; border-radius:12px; text-align:center; margin-bottom:10px;"><small>Cumul Encaissé</small><h2>${tot.toLocaleString()} CFA</h2></div><h4>Historique</h4><div style="max-height:150px; overflow-y:auto;">${hist}</div><button class="btn-primary" style="margin-top:10px;" onclick="voirDetailBien(${b.id})">Retour</button>`; }
function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }
function filterBiens(s, e) { currentFilter = s; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); renderBiens(); }
function toggleStatut(id) { biens = biens.map(b => { if(b.id === id) { if(b.statut==='Disponible') { b.locataire=prompt("Nom locataire:")||"Inconnu"; b.locataireTel=prompt("Téléphone locataire:")||""; b.statut='Occupé'; } else { if(confirm("Libérer ce bien ?")) b.statut='Disponible'; } } return b; }); localStorage.setItem('sama_biens', JSON.stringify(biens)); fermerModal(); renderBiens(); }
function supprimerBien(id) { if(confirm("Supprimer définitivement ?")) { biens = biens.filter(x => x.id !== id); localStorage.setItem('sama_biens', JSON.stringify(biens)); fermerModal(); renderBiens(); } }
function updateSelects() { const occ = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); const disp = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); remplirLoyer(); }
function remplirLoyer() { const name = document.getElementById('c-bien-select').value; const type = document.getElementById('c-type').value; const b = biens.find(x => x.nom === name); if(b) { document.getElementById('c-montant').value = type === 'Caution' ? parseFloat(b.loyer)*3 : b.loyer; } }
function validerCollecte(cible) { const data = executerSauvegardeFinanciere(); if(!data) return; let msg = "", num = cible === 'locataire' ? data.bien.locataireTel : data.bien.proprioTel; num = num ? num.replace(/\s+/g, '') : ''; if(cible === 'locataire') { msg = `*REÇU DE PAIEMENT SAMA GESTION*%0A-------------------------------------%0A🏠 *Bien:* ${data.bien.nom}%0A💰 *Montant:* ${data.montantPaye.toLocaleString()} CFA%0A📝 *Type:* ${data.type}%0A💳 *Mode:* ${data.mode}%0A📅 *Date:* ${new Date().toLocaleDateString()}%0A• _Agent : ${courtierNom}_`; } else { msg = `*RAPPORT PROPRIÉTAIRE SAMA GESTION*%0A-------------------------------------%0A🏠 *Bien:* ${data.bien.nom}%0A💰 *Collecté:* ${data.montantPaye.toLocaleString()} CFA%0A📊 *Com:* -${data.maCom.toLocaleString()} CFA%0A💵 *NET À REVERSER:* *${(data.montantPaye - data.maCom).toLocaleString()} CFA*%0A• _Gestionnaire : ${courtierNom}_`; } const a = document.createElement('a'); a.href = `https://api.whatsapp.com/send?phone=${num}&text=${msg}`; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); showView('dashboard'); }
function executerSauvegardeFinanciere() { const name = document.getElementById('c-bien-select').value; const mt = parseFloat(document.getElementById('c-montant').value); const type = document.getElementById('c-type').value; const mode = document.querySelector('input[name="pay-mode"]:checked').value; if(!name || isNaN(mt)) return null; const idx = biens.findIndex(b => b.nom === name); if(idx===-1) return null; const b = biens[idx]; if(!b.historiquePaiements) b.historiquePaiements = []; b.historiquePaiements.push({ id: Date.now(), type: type==='Loyer'?'Loyer Mois':type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'short'}) }); let maCom = type==='Caution' ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com)); comTotaleGlobal += maCom; localStorage.setItem('sama_com_global', comTotaleGlobal); localStorage.setItem('sama_biens', JSON.stringify(biens)); return { bien: b, montantPaye: mt, type, mode, maCom }; }
function sauverVisite() { const nom = document.getElementById('p-name').value; const bien = document.getElementById('p-bien-select').value; const date = document.getElementById('p-date').value; if(!nom||!date||!bien) return alert("Champs invalides."); visites.push({ id: Date.now(), nom, bien, date, statut: 'En attente', qualification: '' }); localStorage.setItem('sama_visites', JSON.stringify(visites)); document.getElementById('p-name').value=''; renderVisites(); }
function demarrerVisite(id) { visites = visites.map(v => { if(v.id === id) v.statut = 'En cours'; return v; }); localStorage.setItem('sama_visites', JSON.stringify(visites)); renderVisites(); }
function qualifierVisite(id, avis) { visites = visites.map(v => { if(v.id === id) { v.statut = 'Terminé'; v.qualification = avis; } return v; }); localStorage.setItem('sama_visites', JSON.stringify(visites)); renderVisites(); }
function renderVisites() { const vis = visites.filter(v => profilRole === "SuperAdmin" || (biens.find(b => b.nom === v.bien)?.agentCreateur === courtierNom)); document.getElementById('visites-list').innerHTML = vis.map(v => `<div class="form-card" style="text-align:left;"><b>👤 ${v.nom}</b> [${v.qualification || v.statut}]<br><small>Bien : ${v.bien}</small><br><small>Date : ${v.date.replace('T',' à ')}</small>${v.statut==='En attente'?`<br><button class="btn-primary" style="padding:5px;font-size:0.75rem;margin-top:5px;background:#2ECC71;" onclick="demarrerVisite(${v.id})">Démarrer</button>`:''}${v.statut==='En cours'?`<br><button onclick="qualifierVisite(${v.id},'Chaud')">Intéressé</button> <button onclick="qualifierVisite(${v.id},'Froid')">Pas chaud</button>`:''}</div>`).reverse().join(''); }
