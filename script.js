// ==============================================================================
// SAMA GESTION PRO V9.1 - CORRECTION CONNEXION NETWORK & LOGIQUE MM SIGNATURE
// ==============================================================================

let profilRole = null;
let courtierNom = null; // Nom complet ou Agence pour la signature pro
let monAvatar = "💼";
let monLienPaiement = "";

let utilisateurs = [];
let biens = [];
let visites = [];
let etatsLieux = [];
let comTotaleGlobal = 0;

let currentFilter = 'Disponible';
let selectedPhotos = [];
let selectedPhotosEDL = [];

const ROOMS_CONFIG = ["Salon", "Cuisine", "Chambre Principale", "SDE / WC", "Balcon / Terrasse"];

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailInvite = urlParams.get('email');
    if(emailInvite && document.getElementById('login-username')) {
        document.getElementById('login-username').value = emailInvite;
    }

    window.fbOnAuth(window.auth, async (user) => {
        if (user) {
            // Connexion via compte admin principal ou existant sur Firebase Auth
            const docProfil = await window.fsGetDoc(window.fsDoc(window.db, "profils", user.uid));
            if (docProfil.exists()) {
                const data = docProfil.data();
                profilRole = data.role;
                courtierNom = data.fullname || data.username;
                monLienPaiement = data.lienPaiement || "";
                monAvatar = data.avatar || "🏢";
            } else {
                profilRole = "SuperAdmin";
                courtierNom = "Direction Générale";
                monAvatar = "👑";
                await window.fsSetDoc(window.fsDoc(window.db, "profils", user.uid), {
                    uid: user.uid, username: user.email.split('@')[0], fullname: "Direction Générale", role: "SuperAdmin", avatar: "👑", lienPaiement: ""
                });
            }
            
            await chargerDonneesCloud();
            document.getElementById('login-screen').style.display = 'none';
            majInterfaceProfil();
            if(document.getElementById('user-payment-link')) {
                document.getElementById('user-payment-link').value = monLienPaiement;
            }
            showView('dashboard');
        } else {
            // Si pas de session Firebase Auth directe, on laisse l'écran de login
            profilRole = null;
            courtierNom = null;
            document.getElementById('login-screen').style.display = 'flex';
        }
    });
};

async function chargerDonneesCloud() {
    try {
        const queryUsers = await window.fsGetDocs(window.fsCollection(window.db, "profils"));
        utilisateurs = []; queryUsers.forEach(doc => utilisateurs.push(doc.data()));

        const queryBiens = await window.fsGetDocs(window.fsCollection(window.db, "biens"));
        biens = []; queryBiens.forEach(doc => biens.push(doc.data()));

        const queryVisites = await window.fsGetDocs(window.fsCollection(window.db, "visites"));
        visites = []; queryVisites.forEach(doc => visites.push(doc.data()));

        const queryEDL = await window.fsGetDocs(window.fsCollection(window.db, "etats_des_lieux"));
        etatsLieux = []; queryEDL.forEach(doc => etatsLieux.push(doc.data()));

        const docCom = await window.fsGetDoc(window.fsDoc(window.db, "config", "finance"));
        if(docCom.exists()) comTotaleGlobal = docCom.data().comTotaleGlobal || 0;
        
    } catch (error) {
        console.error("Mode Offline actif - Lecture du cache local.", error);
    }
}

// 🔓 SYSTÈME DE CONNEXION HYBRIDE (PREND EN COMPTE LES COMPTES CRÉÉS PAR L'ADMIN)
async function verifierConnexion() {
    const emailSaisi = document.getElementById('login-username').value.trim().toLowerCase();
    const passSaisi = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    try {
        // 1. On tente d'abord de charger les données locales/cloud pour voir si le compte créé par l'admin existe
        await chargerDonneesCloud();
        const comptePartenaire = utilisateurs.find(u => u.email && u.email.toLowerCase() === emailSaisi && u.password_clear_temp === passSaisi);

        if (comptePartenaire) {
            // Connexion réussie pour le partenaire
            profilRole = comptePartenaire.role;
            courtierNom = comptePartenaire.fullname || comptePartenaire.username;
            monLienPaiement = comptePartenaire.lienPaiement || "";
            monAvatar = comptePartenaire.avatar || "💼";
            
            document.getElementById('login-screen').style.display = 'none';
            majInterfaceProfil();
            if(document.getElementById('user-payment-link')) {
                document.getElementById('user-payment-link').value = monLienPaiement;
            }
            showView('dashboard');
            return;
        }

        // 2. Si non trouvé dans les partenaires, on tente la connexion Firebase Auth standard (ex: le compte Admin principal)
        await window.fbSignIn(window.auth, emailSaisi, passSaisi);
        
    } catch (error) {
        errorMsg.innerText = "❌ Identifiants invalides ou problème de réseau.";
        errorMsg.style.display = 'block';
    }
}

async function deconnexion() {
    try { await window.fbSignOut(window.auth); } catch(e){}
    profilRole = null;
    courtierNom = null;
    document.getElementById('login-screen').style.display = 'flex';
}

function majInterfaceProfil() {
    document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-statut-actuel').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '👑 Administrateur Général' : `🏢 Partenaire (${profilRole})`;
    
    if (profilRole === "SuperAdmin") {
        document.getElementById('admin-management-section').style.display = 'block';
        renderAdminAgencesList();
    } else {
        document.getElementById('admin-management-section').style.display = 'none';
    }
}

async function sauvegarderLienPaiement(val) {
    monLienPaiement = val.trim();
    // On cherche si c'est un compte partenaire pour le mettre à jour
    const userTrouve = utilisateurs.find(u => u.fullname === courtierNom);
    const targetUID = userTrouve ? userTrouve.uid : (window.auth.currentUser ? window.auth.currentUser.uid : "temp");
    
    await window.fsUpdateDoc(window.fsDoc(window.db, "profils", targetUID), {
        lienPaiement: monLienPaiement
    });
}

function formaterNumeroWhatsApp(num) {
    if(!num) return "";
    let propre = num.replace(/\s+/g, '').replace(/[-+]/g, ''); 
    if ((propre.startsWith('06') || propre.startsWith('07')) && propre.length === 10) {
        propre = '33' + propre.substring(1); 
    }
    else if (propre.length === 9 && propre.startsWith('7')) {
        propre = '221' + propre;
    }
    if(propre.startsWith('00')) propre = propre.substring(2);
    return propre;
}

// 🔔 LOGIQUE DE SIGNATURE NETTOYÉE ET CONDITIONNELLE
function envoyerMessageWhatsApp(telephone, message, inclurePaiement = false) {
    const numeroPropre = formaterNumeroWhatsApp(telephone);
    if(!numeroPropre || numeroPropre.length < 8) {
        alert("⚠️ Le numéro de téléphone est mal formaté ou absent.");
        return;
    }
    
    // Signature Pro stricte avec le NOM (Jamais l'email)
    let signatureFormatee = `\n\nCordiales salutations,\n*${courtierNom}* • Gestion Immobilière`;
    
    // Le numéro Wave/OM est injecté UNIQUEMENT si demandé explicitement (paiements à venir)
    if(inclurePaiement && monLienPaiement) {
        signatureFormatee += `\n\n💵 Pour votre dépôt Mobile Money (Wave/OM) : *${monLienPaiement}*`;
    }
    
    let messageComplet = message + signatureFormatee;
    let messageEncode = encodeURIComponent(messageComplet);
    
    window.location.href = `https://api.whatsapp.com/send?phone=${numeroPropre}&text=${messageEncode}`;
}

function calculerProrataAutomatique() {
    const loyerTotal = parseFloat(document.getElementById('new-bien-loyer').value);
    const dateEntreeStr = document.getElementById('edit-bien-date-entree').value;
    const box = document.getElementById('prorata-box');
    const result = document.getElementById('prorata-result');

    if(!loyerTotal || !dateEntreeStr) {
        box.style.display = 'none';
        return;
    }

    const dateEntree = new Date(dateEntreeStr);
    const jourEntree = dateEntree.getDate();
    const annee = dateEntree.getFullYear();
    const mois = dateEntree.getMonth();
    const joursDansLeMois = new Date(annee, mois + 1, 0).getDate();

    if(jourEntree === 1) {
        box.style.display = 'none';
        return;
    }

    const joursDus = (joursDansLeMois - jourEntree) + 1;
    const montantProrata = Math.round((loyerTotal / joursDansLeMois) * joursDus);

    result.innerHTML = `${joursDus} jours occupés ce mois-ci.<br>💰 Montant Prorata : ${montantProrata.toLocaleString()} CFA`;
    box.style.display = 'block';
}

function previewAndCompressImage(input, target) {
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 400; 
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); 
                    
                    if(target === 'bien' && selectedPhotos.length < 3) {
                        selectedPhotos.push(compressedBase64);
                        renderPreviews('previews-container', selectedPhotos);
                    } else if(target === 'edl' && selectedPhotosEDL.length < 3) {
                        selectedPhotosEDL.push(compressedBase64);
                        renderPreviews('edl-previews-container', selectedPhotosEDL);
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

function renderPreviews(containerId, arrayData) {
    document.getElementById(containerId).innerHTML = arrayData.map(p => `<img src="${p}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;border:1px solid var(--border);">`).join('');
}

// ==========================================
// CREATION DE COMPTE PARTENAIRE
// ==========================================
async function adminCreerCompteCourtier() {
    const emailCourtier = document.getElementById('admin-new-user-name').value.trim(); 
    const passCourtier = document.getElementById('admin-new-user-pin').value.trim();
    const fullnameCourtier = document.getElementById('admin-new-user-fullname').value.trim();
    const roleChoisi = document.getElementById('admin-new-user-role').value;
    
    if(!emailCourtier.includes('@') || passCourtier.length < 6 || !fullnameCourtier) {
        return alert("Veuillez remplir tous les champs (Mot de passe: 6 caractères min).");
    }

    try {
        const uidPredictif = "user_" + Date.now();
        await window.fsSetDoc(window.fsDoc(window.db, "profils", uidPredictif), {
            uid: uidPredictif, 
            username: emailCourtier.split('@')[0], 
            fullname: fullnameCourtier, 
            email: emailCourtier, 
            password_clear_temp: passCourtier, 
            role: roleChoisi, 
            avatar: roleChoisi === 'Agence' ? "🏢" : "💼", 
            lienPaiement: ""
        });
        document.getElementById('admin-new-user-name').value = '';
        document.getElementById('admin-new-user-pin').value = '';
        document.getElementById('admin-new-user-fullname').value = '';
        await chargerDonneesCloud();
        renderAdminAgencesList();
        alert("🎉 Compte Partenaire créé avec succès ! Il peut se connecter immédiatement.");
    } catch (e) { alert(e.message); }
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list');
    if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="background:white; padding:10px; border-radius:10px; margin-bottom:8px; border:1px solid #e2e8f0; font-size:0.85rem;">
            <div style="display:flex; justify-content:space-between;">
                <span>${u.avatar || '💼'} <b>${u.fullname || u.username}</b> (${u.role})</span>
                ${u.role !== 'SuperAdmin' ? `<i class="fas fa-trash-alt" style="color:#EF4444; cursor:pointer;" onclick="adminSupprimerAgence('${u.uid}')"></i>` : '⭐'}
            </div>
        </div>
    `).join('');
}

async function adminSupprimerAgence(uid) {
    if(confirm("Supprimer ce membre ?")) {
        await window.fsDeleteDoc(window.fsDoc(window.db, "profils", uid));
        await chargerDonneesCloud();
        renderAdminAgencesList();
    }
}

// ==========================================
// MODULE BIENS
// ==========================================
function ouvrirFormulaireAjout() {
    selectedPhotos = [];
    document.getElementById('edit-bien-id').value = '';
    document.getElementById('form-bien-title').innerText = "Nouveau Bien";
    document.getElementById('edit-only-fields').style.display = 'none';
    document.getElementById('prorata-box').style.display = 'none';
    document.getElementById('previews-container').innerHTML = '';
    document.getElementById('new-bien-nom').value = '';
    document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-adresse').value = '';
    document.getElementById('new-bien-proprio').value = '';
    document.getElementById('new-bien-proprio-tel').value = '';
    document.getElementById('btn-save-bien').disabled = false;
    document.getElementById('btn-save-bien').innerText = "Enregistrer";
    showView('ajouter-bien');
}

function modifierBienExistant(id) {
    const b = biens.find(x => x.id === id);
    if(!b) return;

    fermerModal();
    selectedPhotos = b.photos || [];
    document.getElementById('edit-bien-id').value = b.id;
    document.getElementById('form-bien-title').innerText = "Modifier le Bien";
    document.getElementById('new-bien-nom').value = b.nom;
    document.getElementById('new-bien-type').value = b.type;
    document.getElementById('new-bien-loyer').value = b.loyer;
    document.getElementById('new-bien-adresse').value = b.adresse;
    document.getElementById('new-bien-com').value = b.com || '10%';
    document.getElementById('new-bien-proprio').value = b.proprio;
    document.getElementById('new-bien-proprio-tel').value = b.proprioTel;
    
    document.getElementById('edit-only-fields').style.display = 'block';
    document.getElementById('edit-bien-locataire').value = b.locataire || 'Aucun';
    document.getElementById('edit-bien-locataire-tel').value = b.locataireTel || '';
    document.getElementById('edit-bien-date-entree').value = b.dateEntree || '';

    calculerProrataAutomatique();
    renderPreviews('previews-container', selectedPhotos);
    showView('ajouter-bien');
}

async function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value.trim();
    const loyer = document.getElementById('new-bien-loyer').value.trim();
    const existingId = document.getElementById('edit-bien-id').value;

    if(!nom || !loyer) return alert("Champs obligatoires manquants.");

    const btn = document.getElementById('btn-save-bien');
    btn.disabled = true;

    const currentId = existingId ? parseInt(existingId) : Date.now();
    const ancienBien = existingId ? biens.find(x => x.id === currentId) : null;

    const structureBien = {
        id: currentId,
        agentCreateur: ancienBien ? ancienBien.agentCreateur : courtierNom,
        nom: nom, loyer: loyer,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value || 'Non spécifiée',
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu',
        proprioTel: document.getElementById('new-bien-proprio-tel').value || '',
        locataire: existingId ? document.getElementById('edit-bien-locataire').value : 'Aucun',
        locataireTel: existingId ? document.getElementById('edit-bien-locataire-tel').value : '',
        dateEntree: existingId ? document.getElementById('edit-bien-date-entree').value : '',
        com: document.getElementById('new-bien-com').value || '10%',
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"],
        statut: ancienBien ? ancienBien.statut : 'Disponible',
        historiquePaiements: ancienBien ? (ancienBien.historiquePaiements || []) : []
    };

    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(currentId)), structureBien);
    await chargerDonneesCloud();
    showView('biens');
}

function renderBiens() {
    const txt = document.getElementById('search-bien-input').value.toLowerCase();
    const filtered = biens.filter(b => {
        const matchesSearch = b.nom.toLowerCase().includes(txt) || b.adresse.toLowerCase().includes(txt);
        const matchesTab = b.statut === currentFilter;
        return profilRole === "SuperAdmin" ? (matchesTab && matchesSearch) : (matchesTab && matchesSearch && b.agentCreateur === courtierNom);
    });

    document.getElementById('biens-list').innerHTML = filtered.map(b => `
        <div class="form-card" onclick="voirDetailBien(${b.id})">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}">`).join('')}</div>
            <div style="margin-top:10px; position:relative;">
                <strong>${b.nom}</strong><br>
                <small>${b.adresse}</small><br>
                <span style="color:var(--gold); font-weight:700;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                <button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position:absolute; right:0; bottom:0; background:var(--gold-light); color:var(--gold); border:none; padding:6px; border-radius:8px; font-size:0.75rem; font-weight:600;"><i class="fas fa-wallet"></i> Suivi</button>
            </div>
        </div>
    `).reverse().join('');
}

function filterBiens(s, e) {
    currentFilter = s;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

function voirDetailBien(id) {
    const b = biens.find(x => x.id === id);
    document.getElementById('modal-body').innerHTML = `
        <h3>${b.nom}</h3>
        <p style="margin-top:5px;"><b>Loyer :</b> ${parseInt(b.loyer).toLocaleString()} CFA</p>
        <p><b>Propriétaire :</b> ${b.proprio} (${b.proprioTel || 'Pas de numéro'})</p>
        <p><b>Locataire :</b> ${b.locataire || 'Aucun'} (${b.locataireTel || 'Pas de numéro'})</p>
        <p><b>Entrée :</b> ${b.dateEntree ? new Date(b.dateEntree).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:15px;">
            <button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer le bien'}</button>
            <button class="btn-outline" style="color:var(--gold); border-color:var(--gold);" onclick="modifierBienExistant(${b.id})"><i class="fas fa-edit"></i> Modifier / Prorata</button>
        </div>
        <button class="btn-outline" style="color:var(--red); border-color:var(--red); margin-top:8px; width:100%;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer le bien</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

async function toggleStatut(id) {
    const b = biens.find(x => x.id === id);
    if(b.statut === 'Disponible') {
        b.locataire = prompt("Nom du locataire :") || "Inconnu";
        b.locataireTel = prompt("Téléphone du locataire :") || "";
        b.dateEntree = prompt("Date d'entrée (AAAA-MM-JJ) :") || "";
        b.statut = 'Occupé';
    } else {
        if(confirm("Libérer ce bien ?")) { b.statut = 'Disponible'; b.locataire = 'Aucun'; b.locataireTel = ''; b.dateEntree = ''; }
    }
    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(id)), b);
    await chargerDonneesCloud();
    fermerModal();
    renderBiens();
}

async function supprimerBien(id) {
    if(confirm("Supprimer ce bien définitivement ?")) {
        await window.fsDeleteDoc(window.fsDoc(window.db, "biens", String(id)));
        await chargerDonneesCloud();
        fermerModal();
        renderBiens();
    }
}

function ouvrirPortefeuille(id) {
    const b = biens.find(x => x.id === id);
    const paiements = b.historiquePaiements || [];
    const total = paiements.reduce((s,p) => s + p.montant, 0);
    
    let lignesTableau = paiements.map(p => `
        <tr>
            <td><b>${p.date}</b></td>
            <td>${p.type}</td>
            <td style="color:var(--green); font-weight:600;">${p.montant.toLocaleString()}</td>
            <td><small class="user-badge" style="padding:2px 6px;">${p.mode}</small></td>
        </tr>
    `).reverse().join('');

    if(paiements.length === 0) {
        lignesTableau = `<tr><td colspan="4" style="text-align:center; color:var(--text-light);">Aucune transaction</td></tr>`;
    }

    document.getElementById('modal-body').innerHTML = `
        <h3>📊 Historique Comptable</h3>
        <p style="font-size:0.9rem; margin-bottom:10px;">Bien : <b>${b.nom}</b></p>
        
        <div style="background:var(--dark); color:white; padding:12px; border-radius:10px; margin-bottom:15px; text-align:center;">
            <small style="opacity:0.8;">Flux Total Encaissé</small>
            <h2 style="color:#FFFFFF; font-size:1.6rem;">${total.toLocaleString()} CFA</h2>
        </div>

        <div style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:8px;">
            <table class="table-suivi">
                <thead>
                    <tr><th>Date</th><th>Nature</th><th>Montant</th><th>Mode</th></tr>
                </thead>
                <tbody>${lignesTableau}</tbody>
            </table>
        </div>

        <button class="btn-primary" style="background:#2ECC71; margin-top:15px;" onclick="relancerPaiementWhatsApp(${b.id})"><i class="fab fa-whatsapp"></i> Rappel de paiement doux</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

// 💵 LE RAPPEL À VENIR UTILISE LE NUMÉRO DE PAIEMENT
function relancerPaiementWhatsApp(id) {
    const b = biens.find(x => x.id === id);
    if(!b.locataireTel) return alert("Pas de numéro enregistré.");
    const msg = `Chère/Cher ${b.locataire},\n\nSauf erreur de notre part, le règlement du loyer pour votre logement (*${b.nom}*) n'a pas encore été validé pour ce terme.\n\nNous vous invitons à effectuer le versement à votre convenance.`;
    envoyerMessageWhatsApp(b.locataireTel, msg, true); // <--- True : On met les infos de paiement
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }

// ==========================================
// MODULE EDL
// ==========================================
function ouvrirFormulaireEDL() {
    selectedPhotosEDL = [];
    document.getElementById('edl-previews-container').innerHTML = '';
    document.getElementById('edl-eau').value = '';
    document.getElementById('edl-elec').value = '';
    document.getElementById('edl-cles').value = '';
    document.getElementById('edl-notes').value = '';
    
    const contextBiens = profilRole === "SuperAdmin" ? biens : biens.filter(b => b.agentCreateur === courtierNom);
    document.getElementById('edl-bien-select').innerHTML = contextBiens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    
    document.getElementById('edl-rooms-container').innerHTML = ROOMS_CONFIG.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#F1F5F9; padding:10px; border-radius:8px; margin-bottom:8px;">
            <span style="font-weight:600; font-size:0.85rem;">${r}</span>
            <select class="edl-room-select" data-room="${r}" style="width:auto; margin:0; padding:5px;">
                <option value="✨ Neuf">✨ Neuf</option>
                <option value="✅ Bon">✅ Bon</option>
                <option value="⚠️ Moyen">⚠️ Moyen</option>
                <option value="❌ Mauvais">❌ Mauvais</option>
            </select>
        </div>
    `).join('');
    showView('nouveau-edl');
}

async function saveEDLCloud() {
    const bienNom = document.getElementById('edl-bien-select').value;
    const type = document.getElementById('edl-type').value;
    if(!bienNom) return alert("Aucun bien sélectionné.");

    const btn = document.getElementById('btn-save-edl');
    btn.disabled = true;

    const piecesData = [];
    document.querySelectorAll('.edl-room-select').forEach(s => {
        piecesData.push({ piece: s.getAttribute('data-room'), etat: s.value });
    });

    const structureEDL = {
        id: Date.now(), date: new Date().toLocaleDateString('fr-FR'),
        agent: courtierNom, bien: bienNom, type: type, pieces: piecesData,
        eau: document.getElementById('edl-eau').value || "Non spécifié",
        elec: document.getElementById('edl-elec').value || "Non spécifié",
        cles: document.getElementById('edl-cles').value || "0",
        notes: document.getElementById('edl-notes').value || "RAS",
        photos: selectedPhotosEDL
    };

    await window.fsSetDoc(window.fsDoc(window.db, "etats_des_lieux", String(structureEDL.id)), structureEDL);
    await chargerDonneesCloud();

    let checkSummary = piecesData.map(p => `• ${p.piece} : ${p.etat}`).join('\n');
    let constructionTexte = `*CONSTAT D'ÉTAT DES LIEUX DE ${type.toUpperCase()}*\n\n` +
                            `*Logement concerné :* ${bienNom}\n` +
                            `*Date de validation :* ${structureEDL.date}\n\n` +
                            `*RELEVÉS PAR PIÈCES :*\n${checkSummary}\n\n` +
                            `*INFORMATIONS COMPTEURS :*\n` +
                            `💧 Index Eau : ${structureEDL.eau} m3\n` +
                            `⚡ Index Électricité : ${structureEDL.elec} kWh\n` +
                            `🔑 Trousseaux de clés : ${structureEDL.cles}\n\n` +
                            `*Remarques constatées :* ${structureEDL.notes}`;

    const b = biens.find(x => x.nom === bienNom);
    const destinataireTel = (b && b.locataireTel) ? b.locataireTel : (b ? b.proprioTel : "");
    
    alert("🎉 Rapport validé !");
    if(destinataireTel) envoyerMessageWhatsApp(destinataireTel, constructionTexte, false); // <--- False : Pas de numéro de paiement sur un EDL
    showView('etat-lieux');
}

function renderEtatsLieuxList() {
    const listContainer = document.getElementById('edl-list');
    if(!listContainer) return;
    const filtered = etatsLieux.filter(e => profilRole === "SuperAdmin" || e.agent === courtierNom);

    listContainer.innerHTML = filtered.map(e => `
        <div class="form-card" style="border-left: 4px solid ${e.type==='Entrée'?'var(--green)':'var(--red)'}; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-right:30px;">
                <div>
                    <strong>${e.bien}</strong><br>
                    <small>${e.type} • ${e.date}</small><br>
                    <small style="color:var(--text-light);">Par : ${e.agent}</small>
                </div>
                <button class="btn-primary" style="width:auto; padding:6px 10px; font-size:0.75rem; background:#2ECC71;" onclick="partagerEDLExistant(${e.id})"><i class="fab fa-whatsapp"></i> Envoyer</button>
            </div>
            <i class="fas fa-trash-alt" style="position:absolute; right:15px; top:15px; color:var(--red); cursor:pointer;" onclick="supprimerEDLExistant(${e.id})"></i>
        </div>
    `).reverse().join('');
}

async function supprimerEDLExistant(id) {
    if(confirm("⚠️ Supprimer définitivement ce certificat d'état des lieux ?")) {
        await window.fsDeleteDoc(window.fsDoc(window.db, "etats_des_lieux", String(id)));
        await chargerDonneesCloud();
        renderEtatsLieuxList();
    }
}

function partagerEDLExistant(id) {
    const e = etatsLieux.find(x => x.id === id);
    let checkSummary = e.pieces.map(p => `• ${p.piece} : ${p.etat}`).join('\n');
    let constructionTexte = `*RAPPEL ÉTAT DES LIEUX - ${e.type.toUpperCase()}*\n\n*Bien :* ${e.bien}\n*Date :* ${e.date}\n\n*CONSTAT :*\n${checkSummary}\n\n*Notes :* ${e.notes}`;
    const b = biens.find(x => x.nom === e.bien);
    const num = b ? b.locataireTel : "";
    if(num) envoyerMessageWhatsApp(num, constructionTexte, false);
}

// ==========================================
// COLLECTE / ENCAISSEMENT
// ==========================================
function analyserReliquatComptable() {
    const name = document.getElementById('c-bien-select').value;
    const type = document.getElementById('c-type').value;
    const liveBox = document.getElementById('c-live-status');
    const inputMontant = document.getElementById('c-montant');
    
    const btnLocataire = document.getElementById('btn-collecte-locataire');
    const btnProprio = document.getElementById('btn-collecte-proprio');

    if(!name) {
        liveBox.style.display = 'none';
        return;
    }

    const b = biens.find(x => x.nom === name);
    const paiements = b.historiquePaiements || [];
    
    const dateAujourdhui = new Date();
    const moisCourant = String(dateAujourdhui.getMonth() + 1).padStart(2, '0');
    const anneeCourante = dateAujourdhui.getFullYear();
    const filtreMois = `${moisCourant}/${anneeCourante}`;

    let totalDu = 0;
    let dejaPayeCeMois = 0;

    if (type === 'Loyer' || type === 'Avance') {
        totalDu = parseFloat(b.loyer);
        dejaPayeCeMois = paiements
            .filter(p => p.date.endsWith(filtreMois) && (p.type === 'Loyer' || p.type === 'Avance'))
            .reduce((sum, p) => sum + p.montant, 0);
    } 
    else if (type === 'Prorata') {
        const dateEntree = b.dateEntree ? new Date(b.dateEntree) : new Date();
        const joursDansLeMois = new Date(dateEntree.getFullYear(), dateEntree.getMonth() + 1, 0).getDate();
        const joursDus = (joursDansLeMois - dateEntree.getDate()) + 1;
        totalDu = Math.round((parseFloat(b.loyer) / joursDansLeMois) * joursDus);
        
        dejaPayeCeMois = paiements
            .filter(p => p.date.endsWith(filtreMois) && p.type === 'Prorata')
            .reduce((sum, p) => sum + p.montant, 0);
    } 
    else if (type === 'Caution') {
        totalDu = parseFloat(b.loyer) * 3; 
        dejaPayeCeMois = paiements
            .filter(p => p.type === 'Caution')
            .reduce((sum, p) => sum + p.montant, 0);
    }

    let reliquat = totalDu - dejaPayeCeMois;
    if (reliquat < 0) reliquat = 0;

    liveBox.style.display = 'block';
    
    if (reliquat === 0) {
        liveBox.style.background = '#FEE2E2';
        liveBox.style.borderColor = 'var(--red)';
        liveBox.style.color = '#991B1B';
        liveBox.innerHTML = `⚠️ <b>Opération Bloquée :</b> Ce terme (<b>${type}</b>) a déjà été entièrement soldé pour ce bien.`;
        
        inputMontant.value = 0;
        btnLocataire.disabled = true;
        btnProprio.disabled = true;
    } else {
        liveBox.style.background = 'var(--gold-light)';
        liveBox.style.borderColor = 'var(--gold)';
        liveBox.style.color = '#9A3412';
        liveBox.innerHTML = `📊 <b>Statut :</b> Total Attendu : ${totalDu.toLocaleString()} CFA | Déjà perçu : ${dejaPayeCeMois.toLocaleString()} CFA<br>🎯 <b>Reste à percevoir : ${reliquat.toLocaleString()} CFA</b>`;
        
        inputMontant.value = reliquat;
        btnLocataire.disabled = false;
        btnProprio.disabled = false;
    }
}

function updateSelects() {
    const occ = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom));
    const disp = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom));
    document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    analyserReliquatComptable();
}

async function validerCollecte(cible) {
    const name = document.getElementById('c-bien-select').value;
    const mt = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value;
    const mode = document.querySelector('input[name="pay-mode"]:checked').value;
    const b = biens.find(x => x.nom === name);

    if (mt <= 0 || isNaN(mt)) return alert("⚠️ Veuillez saisir un montant valide.");

    if(!b.historiquePaiements) b.historiquePaiements = [];
    b.historiquePaiements.push({ id: Date.now(), type: type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR') });

    let maCom = type==='Caution' ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com));
    comTotaleGlobal += maCom;

    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(b.id)), b);
    await window.fsSetDoc(window.fsDoc(window.db, "config", "finance"), { comTotaleGlobal: comTotaleGlobal });
    await chargerDonneesCloud();

    let totalExige = (type === 'Caution') ? (parseFloat(b.loyer)*3) : parseFloat(b.loyer);
    let totalPercuApres = b.historiquePaiements.filter(p => p.type === type).reduce((s,p) => s + p.montant, 0);
    let resteAPayerApres = totalExige - totalPercuApres;
    if(resteAPayerApres < 0) resteAPayerApres = 0;

    let chaineReliquat = resteAPayerApres > 0 ? `\n*Reste à payer (Reliquat) :* ${resteAPayerApres.toLocaleString()} CFA` : `\n*Statut :* Terme entièrement soldé ! 🎉`;

    let txt = "";
    if (cible === 'locataire') {
        txt = `*REÇU DE VERSEMENT OFFICIEL*\n\nNous confirmons la bonne réception de votre paiement.\n\n*Désignation :* ${b.nom}\n*Versement perçu :* ${mt.toLocaleString()} CFA\n*Nature du versement :* ${type}\n*Mode de paiement :* ${mode}\n*Date :* ${new Date().toLocaleDateString('fr-FR')}${chaineReliquat}\n\nMerci pour votre confiance.`;
        envoyerMessageWhatsApp(b.locataireTel, txt, false); // <--- False : C'est un reçu, on ne remet pas les infos de paiement
    } else {
        let netAReverser = mt - maCom;
        txt = `*NOTIFICATION DE TRANSFERT FONDS PROPRIÉTAIRE*\n\nBonjour Cher Propriétaire,\n\nNous vous informons qu'un versement a été encaissé pour votre bien et que les fonds ont été transférés sur votre compte.\n\n*Bien immobilier :* ${b.nom}\n*Montant Brut collecté :* ${mt.toLocaleString()} CFA\n*Frais de gestion (${b.com}) :* - ${maCom.toLocaleString()} CFA\n*Net transféré :* *${netAReverser.toLocaleString()} CFA*\n*Canal d'envoi :* ${mode}\n*Date de l'opération :* ${new Date().toLocaleDateString('fr-FR')}${chaineReliquat}`;
        envoyerMessageWhatsApp(b.proprioTel, txt, false); // <--- False : Notification propriétaire, pas d'infos de paiement
    }
    showView('dashboard');
}

// ==========================================
// VISITES & PLANNING
// ==========================================
async function sauverVisite() {
    const nom = document.getElementById('p-name').value;
    const tel = document.getElementById('p-tel').value;
    const bien = document.getElementById('p-bien-select').value;
    const date = document.getElementById('p-date').value;
    if(!nom || !tel || !date) return alert("Remplir tous les champs.");

    const struct = { id: Date.now(), nom, tel, bien, date };
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(struct.id)), struct);
    await chargerDonneesCloud();
    
    document.getElementById('p-name').value = '';
    document.getElementById('p-tel').value = '';
    showView('planning');
}

function renderVisites() {
    const conteneur = document.getElementById('visites-list');
    if(!conteneur) return;
    
    const filtered = visites.filter(v => profilRole === "SuperAdmin" || biens.some(b => b.nom === v.bien && b.agentCreateur === courtierNom));

    conteneur.innerHTML = filtered.map(v => `
        <div class="form-card" style="position:relative;">
            <b>👤 ${v.nom}</b> - <small>${v.bien}</small><br>
            <small>📅 ${v.date.replace('T', ' à ')}</small><br>
            <div style="margin-top:8px; display:flex; gap:10px;">
                <span onclick="envoyerMessageWhatsApp('${v.tel}', 'Bonjour ${v.nom}, je vous confirme notre rendez-vous fixé le ${new Date(v.date).toLocaleString('fr-FR')} pour la visite du bien : ${v.bien}.', true)" style="color:#2ECC71; cursor:pointer; font-size:0.85rem; font-weight:700;"><i class="fab fa-whatsapp"></i> Confirmer (Avec Infos MM)</span>
                <span onclick="supprimerRendezVous(${v.id})" style="color:var(--red); cursor:pointer; font-size:0.85rem; font-weight:600;"><i class="fas fa-trash-alt"></i> Annuler</span>
            </div>
        </div>
    `).reverse().join('');
}

async function supprimerRendezVous(id) {
    if(confirm("Voulez-vous supprimer ce rendez-vous du planning ?")) {
        await window.fsDeleteDoc(window.fsDoc(window.db, "visites", String(id)));
        await chargerDonneesCloud();
        renderVisites();
    }
}

async function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const t = document.getElementById('view-' + id);
    if(t) t.style.display = 'block';

    rafraichirCompteurCommission();
    if(id === 'biens') { renderBiens(); }
    if(id === 'etat-lieux') { renderEtatsLieuxList(); }
    if(id === 'collecte') { updateSelects(); }
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
                    else comCourtier += b.com.includes('%') ? (parseFloat(b.com)/100)*p.montant : parseFloat(b.com);
                });
            }
        });
        document.getElementById('total-display').innerText = comCourtier.toLocaleString() + " CFA";
    }
}

function resetNavStyles(el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}
