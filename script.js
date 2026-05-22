// ==============================================================================
// SAMA GESTION PRO V9.5 - OPTIMISATIONS ERGONOMIQUES ET VERROUILLAGE
// ==============================================================================

let profilRole = null;
let courtierNom = null; 
let courtierEmail = null;
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
            courtierEmail = user.email;
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
                    uid: user.uid, username: user.email.split('@')[0], fullname: "Direction Générale", role: "SuperAdmin", avatar: "👑", lienPaiement: "", email: user.email
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
            profilRole = null;
            courtierNom = null;
            courtierEmail = null;
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
        console.error("Mode Offline actif", error);
    }
}

async function verifierConnexion() {
    const emailSaisi = document.getElementById('login-username').value.trim().toLowerCase();
    const passSaisi = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    try {
        await chargerDonneesCloud();
        const comptePartenaire = utilisateurs.find(u => u.email && u.email.toLowerCase() === emailSaisi && u.password_clear_temp === passSaisi);

        if (comptePartenaire) {
            profilRole = comptePartenaire.role;
            courtierNom = comptePartenaire.fullname || comptePartenaire.username;
            courtierEmail = comptePartenaire.email;
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

        await window.fbSignIn(window.auth, emailSaisi, passSaisi);
        
    } catch (error) {
        errorMsg.innerText = "❌ Identifiants invalides.";
        errorMsg.style.display = 'block';
    }
}

async function deconnexion() {
    try { await window.fbSignOut(window.auth); } catch(e){}
    profilRole = null; courtierNom = null; courtierEmail = null;
    document.getElementById('login-screen').style.display = 'flex';
}

function majInterfaceProfil() {
    document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-statut-actuel').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-email-affichage').innerText = courtierEmail || "Non renseigné";
    document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '👑 Administrateur Général' : `🏢 Partenaire (${profilRole})`;
    
    if (profilRole === "SuperAdmin") {
        document.getElementById('admin-management-section').style.display = 'block';
        renderAdminAgencesList();
    } else {
        document.getElementById('admin-management-section').style.display = 'none';
    }
}

async function sauvegarderLienPaiement(val) {
    const userTrouve = utilisateurs.find(u => u.fullname === courtierNom);
    const targetUID = userTrouve ? userTrouve.uid : (window.auth.currentUser ? window.auth.currentUser.uid : "temp");
    await window.fsUpdateDoc(window.fsDoc(window.db, "profils", targetUID), { lienPaiement: val.trim() });
}

function formaterNumeroWhatsApp(num) {
    if(!num) return "";
    let propre = num.replace(/\s+/g, '').replace(/[-+]/g, ''); 
    if ((propre.startsWith('06') || propre.startsWith('07')) && propre.length === 10) propre = '33' + propre.substring(1); 
    else if (propre.length === 9 && propre.startsWith('7')) propre = '221' + propre;
    if(propre.startsWith('00')) propre = propre.substring(2);
    return propre;
}

function envoyerMessageWhatsApp(telephone, message, inclurePaiement = false) {
    const numeroPropre = formaterNumeroWhatsApp(telephone);
    if(!numeroPropre || numeroPropre.length < 8) return alert("⚠️ Numéro mal formaté ou absent.");
    let signatureFormatee = `\n\nCordiales salutations,\n*${courtierNom}* • Gestion Immobilière`;
    if(inclurePaiement && monLienPaiement) signatureFormatee += `\n\n💵 Dépôt Mobile Money : *${monLienPaiement}*`;
    window.location.href = `https://api.whatsapp.com/send?phone=${numeroPropre}&text=${encodeURIComponent(message + signatureFormatee)}`;
}

function calculerProrataAutomatique() {
    const loyerTotal = parseFloat(document.getElementById('new-bien-loyer').value);
    const dateEntreeStr = document.getElementById('edit-bien-date-entree').value;
    const box = document.getElementById('prorata-box');
    const result = document.getElementById('prorata-result');

    if(!loyerTotal || !dateEntreeStr) { box.style.display = 'none'; return; }
    const dateEntree = new Date(dateEntreeStr);
    const jourEntree = dateEntree.getDate();
    const joursDansLeMois = new Date(dateEntree.getFullYear(), dateEntree.getMonth() + 1, 0).getDate();

    if(jourEntree === 1) { box.style.display = 'none'; return; }
    const joursDus = (joursDansLeMois - jourEntree) + 1;
    const montantProrata = Math.round((loyerTotal / joursDansLeMois) * joursDus);
    result.innerHTML = `${joursDus} jours occupés.<br>💰 Montant : ${montantProrata.toLocaleString()} CFA`;
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
                    let width = img.width, height = img.height;
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    canvas.width = width; canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); 
                    if(target === 'bien' && selectedPhotos.length < 3) { selectedPhotos.push(compressedBase64); renderPreviews('previews-container', selectedPhotos); }
                    else if(target === 'edl' && selectedPhotosEDL.length < 3) { selectedPhotosEDL.push(compressedBase64); renderPreviews('edl-previews-container', selectedPhotosEDL); }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

function renderPreviews(containerId, arrayData) {
    document.getElementById(containerId).innerHTML = arrayData.map(p => `<img src="${p}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid var(--border);">`).join('');
}

async function adminCreerCompteCourtier() {
    const emailCourtier = document.getElementById('admin-new-user-name').value.trim(); 
    const passCourtier = document.getElementById('admin-new-user-pin').value.trim();
    const fullnameCourtier = document.getElementById('admin-new-user-fullname').value.trim();
    const roleChoisi = document.getElementById('admin-new-user-role').value;
    if(!emailCourtier.includes('@') || passCourtier.length < 6 || !fullnameCourtier) return alert("Remplir tous les champs.");

    try {
        const uidPredictif = "user_" + Date.now();
        await window.fsSetDoc(window.fsDoc(window.db, "profils", uidPredictif), {
            uid: uidPredictif, username: emailCourtier.split('@')[0], fullname: fullnameCourtier, email: emailCourtier, password_clear_temp: passCourtier, role: roleChoisi, avatar: roleChoisi === 'Agence' ? "🏢" : "💼", lienPaiement: ""
        });
        document.getElementById('admin-new-user-name').value = ''; document.getElementById('admin-new-user-pin').value = ''; document.getElementById('admin-new-user-fullname').value = '';
        await chargerDonneesCloud(); renderAdminAgencesList(); alert("🎉 Compte Activé !");
    } catch (e) { alert(e.message); }
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list'); if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="background:white; padding:8px; border-radius:8px; margin-bottom:6px; border:1px solid #e2e8f0; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
            <span>${u.avatar || '💼'} <b>${u.fullname || u.username}</b> (${u.role})</span>
            ${u.role !== 'SuperAdmin' ? `<i class="fas fa-trash-alt" style="color:#EF4444; cursor:pointer;" onclick="adminSupprimerAgence('${u.uid}')"></i>` : '⭐'}
        </div>
    `).join('');
}

async function adminSupprimerAgence(uid) {
    if(confirm("Supprimer ce membre ?")) { await window.fsDeleteDoc(window.fsDoc(window.db, "profils", uid)); await chargerDonneesCloud(); renderAdminAgencesList(); }
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
    document.getElementById('new-bien-nom').value = ''; document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-adresse').value = ''; document.getElementById('new-bien-proprio').value = '';
    document.getElementById('new-bien-proprio-tel').value = '';
    if(document.getElementById('new-bien-superficie')) document.getElementById('new-bien-superficie').value = '';
    if(document.getElementById('new-bien-papier')) document.getElementById('new-bien-papier').value = 'Non spécifié';
    document.getElementById('btn-save-bien').disabled = false;
    showView('ajouter-bien');
}

function modifierBienExistant(id) {
    const b = biens.find(x => x.id === id); if(!b) return;
    fermerModal(); selectedPhotos = b.photos || [];
    document.getElementById('edit-bien-id').value = b.id;
    document.getElementById('form-bien-title').innerText = "Modifier le Bien";
    document.getElementById('new-bien-nom').value = b.nom; document.getElementById('new-bien-type').value = b.type;
    document.getElementById('new-bien-loyer').value = b.loyer; document.getElementById('new-bien-adresse').value = b.adresse;
    document.getElementById('new-bien-com').value = b.com || '10%'; document.getElementById('new-bien-proprio').value = b.proprio;
    document.getElementById('new-bien-proprio-tel').value = b.proprioTel;
    if(document.getElementById('new-bien-superficie')) document.getElementById('new-bien-superficie').value = b.superficie || '';
    if(document.getElementById('new-bien-papier')) document.getElementById('new-bien-papier').value = b.typePapier || 'Non spécifié';
    document.getElementById('edit-only-fields').style.display = 'block';
    document.getElementById('edit-bien-locataire').value = b.locataire || 'Aucun';
    document.getElementById('edit-bien-locataire-tel').value = b.locataireTel || '';
    document.getElementById('edit-bien-date-entree').value = b.dateEntree || '';
    calculerProrataAutomatique(); renderPreviews('previews-container', selectedPhotos);
    showView('ajouter-bien');
}

async function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value.trim();
    const loyer = document.getElementById('new-bien-loyer').value.trim();
    if(!nom || !loyer) return alert("Champs obligatoires manquants.");

    const btn = document.getElementById('btn-save-bien'); btn.disabled = true;
    const existingId = document.getElementById('edit-bien-id').value;
    const currentId = existingId ? parseInt(existingId) : Date.now();
    const ancienBien = existingId ? biens.find(x => x.id === currentId) : null;

    const structureBien = {
        id: currentId, agentCreateur: ancienBien ? ancienBien.agentCreateur : courtierNom, nom: nom, loyer: loyer,
        type: document.getElementById('new-bien-type').value, adresse: document.getElementById('new-bien-adresse').value || 'Non spécifiée',
        superficie: document.getElementById('new-bien-superficie').value.trim(), typePapier: document.getElementById('new-bien-papier').value,
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu', proprioTel: document.getElementById('new-bien-proprio-tel').value || '',
        locataire: existingId ? document.getElementById('edit-bien-locataire').value : 'Aucun', locataireTel: existingId ? document.getElementById('edit-bien-locataire-tel').value : '',
        dateEntree: existingId ? document.getElementById('edit-bien-date-entree').value : '', com: document.getElementById('new-bien-com').value || '10%',
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"],
        statut: ancienBien ? ancienBien.statut : 'Disponible', historiquePaiements: ancienBien ? (ancienBien.historiquePaiements || []) : []
    };

    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(currentId)), structureBien);
    await chargerDonneesCloud(); showView('biens');
}

function renderBiens() {
    const txt = document.getElementById('search-bien-input').value.toLowerCase();
    const filtered = biens.filter(b => {
        const matchesSearch = b.nom.toLowerCase().includes(txt) || b.adresse.toLowerCase().includes(txt);
        const matchesTab = b.statut === currentFilter;
        return profilRole === "SuperAdmin" ? (matchesTab && matchesSearch) : (matchesTab && matchesSearch && b.agentCreateur === courtierNom);
    });

    document.getElementById('biens-list').innerHTML = filtered.map(b => `
        <div class="form-card" onclick="voirDetailBien(${b.id})" style="padding:10px; margin-bottom:10px;">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}" style="width:50px; height:40px;">`).join('')}</div>
            <div style="margin-top:6px; position:relative;">
                <strong style="font-size:0.85rem;">${b.nom}</strong> ${b.superficie ? `<small style="background:#E2E8F0; padding:1px 4px; border-radius:4px; font-size:0.65rem;">📐 ${b.superficie}</small>` : ''}<br>
                <small style="font-size:0.75rem; color:var(--text-light);">${b.adresse}</small><br>
                <span style="color:var(--gold); font-weight:700; font-size:0.85rem;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                <button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position:absolute; right:0; bottom:0; width:auto; background:var(--gold-light); color:var(--gold); border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700;"><i class="fas fa-wallet"></i> Flux</button>
            </div>
        </div>
    `).reverse().join('');
}

function filterBiens(s, e) {
    currentFilter = s; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); renderBiens();
}

function voirDetailBien(id) {
    const b = biens.find(x => x.id === id);
    const blocFoncier = (b.superficie || (b.typePapier && b.typePapier !== 'Non spécifié')) ? `
        <div style="background:#F8FAFC; padding:6px; border-radius:6px; margin:6px 0; font-size:0.8rem; border:1px dashed #CBD5E1;">
            ${b.superficie ? `📌 <b>Superficie :</b> ${b.superficie}<br>` : ''}
            ${b.typePapier && b.typePapier !== 'Non spécifié' ? `📄 <b>Document :</b> ${b.typePapier}` : ''}
        </div>
    ` : '';

    document.getElementById('modal-body').innerHTML = `
        <h3 style="font-size:1rem;">${b.nom}</h3> ${blocFoncier}
        <p style="font-size:0.8rem;"><b>Prix :</b> ${parseInt(b.loyer).toLocaleString()} CFA</p>
        <p style="font-size:0.8rem;"><b>Proprio :</b> ${b.proprio} (${b.proprioTel || 'N/A'})</p>
        <p style="font-size:0.8rem;"><b>Locataire :</b> ${b.locataire || 'Aucun'} (${b.locataireTel || 'N/A'})</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px;">
            <button class="btn-primary" style="padding:10px; font-size:0.8rem;" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer bien'}</button>
            <button class="btn-outline" style="padding:10px; font-size:0.8rem; color:var(--gold); border-color:var(--gold);" onclick="modifierBienExistant(${b.id})"><i class="fas fa-edit"></i> Modifier</button>
        </div>
        <button class="btn-outline" style="padding:8px; font-size:0.8rem; color:var(--red); border-color:var(--red); margin-top:6px;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

async function toggleStatut(id) {
    const b = biens.find(x => x.id === id);
    if(b.statut === 'Disponible') {
        b.locataire = prompt("Nom du locataire :") || "Inconnu"; b.locataireTel = prompt("Téléphone :") || ""; b.dateEntree = prompt("Date (AAAA-MM-JJ) :") || ""; b.statut = 'Occupé';
    } else {
        if(confirm("Libérer ce bien ?")) { b.statut = 'Disponible'; b.locataire = 'Aucun'; b.locataireTel = ''; b.dateEntree = ''; }
    }
    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(id)), b); await chargerDonneesCloud(); fermerModal(); renderBiens();
}

async function supprimerBien(id) {
    if(confirm("Supprimer ce bien ?")) { await window.fsDeleteDoc(window.fsDoc(window.db, "biens", String(id))); await chargerDonneesCloud(); fermerModal(); renderBiens(); }
}

function ouvrirPortefeuille(id) {
    const b = biens.find(x => x.id === id); const paiements = b.historiquePaiements || []; const total = paiements.reduce((s,p) => s + p.montant, 0);
    let lignesTableau = paiements.map(p => `<tr><td><b>${p.date}</b></td><td>${p.type}</td><td style="color:var(--green); font-weight:600;">${p.montant.toLocaleString()}</td><td><small class="user-badge" style="padding:1px 4px; font-size:0.65rem;">${p.mode}</small></td></tr>`).reverse().join('');
    if(paiements.length === 0) lignesTableau = `<tr><td colspan="4" style="text-align:center; color:var(--text-light);">Aucune transaction</td></tr>`;

    document.getElementById('modal-body').innerHTML = `
        <h3 style="font-size:1rem;">📊 Comptabilité</h3>
        <div style="background:var(--dark); color:white; padding:10px; border-radius:8px; margin-bottom:10px; text-align:center;">
            <h2 style="color:#FFF; font-size:1.2rem; margin:0;">${total.toLocaleString()} CFA</h2>
        </div>
        <div style="max-height:150px; overflow-y:auto; border:1px solid var(--border); border-radius:6px;">
            <table class="table-suivi"><thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Mode</th></tr></thead><tbody>${lignesTableau}</tbody></table>
        </div>
        <button class="btn-primary" style="background:#2ECC71; margin-top:10px; padding:10px; font-size:0.8rem;" onclick="relancerPaiementWhatsApp(${b.id})"><i class="fab fa-whatsapp"></i> Rappel doux</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

function relancerPaiementWhatsApp(id) {
    const b = biens.find(x => x.id === id); if(!b.locataireTel) return alert("Pas de numéro.");
    const nomLocataire = b.locataire && b.locataire !== "Aucun" ? b.locataire : "Cher Locataire";
    envoyerMessageWhatsApp(b.locataireTel, `Bonjour ${nomLocataire},\n\nLe règlement du loyer pour votre logement (*${b.nom}*) n'a pas encore été validé pour ce terme. Merci de régulariser.`, true);
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }

// ==========================================
// MODULE EDL
// ==========================================
function ouvrirFormulaireEDL() {
    selectedPhotosEDL = []; document.getElementById('edl-previews-container').innerHTML = '';
    document.getElementById('edl-eau').value = ''; document.getElementById('edl-elec').value = '';
    document.getElementById('edl-cles').value = ''; document.getElementById('edl-notes').value = '';
    const contextBiens = profilRole === "SuperAdmin" ? biens : biens.filter(b => b.agentCreateur === courtierNom);
    document.getElementById('edl-bien-select').innerHTML = contextBiens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('edl-rooms-container').innerHTML = ROOMS_CONFIG.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#F1F5F9; padding:6px; border-radius:6px; margin-bottom:4px;">
            <span style="font-weight:600; font-size:0.75rem;">${r}</span>
            <select class="edl-room-select" data-room="${r}" style="width:auto; margin:0; padding:2px; font-size:0.75rem;">
                <option value="✨ Neuf">✨ Neuf</option><option value="✅ Bon">✅ Bon</option><option value="⚠️ Moyen">⚠️ Moyen</option><option value="❌ Mauvais">❌ Mauvais</option>
            </select>
        </div>
    `).join('');
    showView('nouveau-edl');
}

async function saveEDLCloud() {
    const bienNom = document.getElementById('edl-bien-select').value; const type = document.getElementById('edl-type').value; if(!bienNom) return;
    const btn = document.getElementById('btn-save-edl'); btn.disabled = true;
    const piecesData = []; document.querySelectorAll('.edl-room-select').forEach(s => { piecesData.push({ piece: s.getAttribute('data-room'), etat: s.value }); });

    const structureEDL = {
        id: Date.now(), date: new Date().toLocaleDateString('fr-FR'), agent: courtierNom, bien: bienNom, type: type, pieces: piecesData,
        eau: document.getElementById('edl-eau').value || "N/A", elec: document.getElementById('edl-elec').value || "N/A", cles: document.getElementById('edl-cles').value || "0", notes: document.getElementById('edl-notes').value || "RAS", photos: selectedPhotosEDL
    };

    await window.fsSetDoc(window.fsDoc(window.db, "etats_des_lieux", String(structureEDL.id)), structureEDL);
    await chargerDonneesCloud();
    const b = biens.find(x => x.nom === bienNom); const destinataireTel = b ? b.locataireTel || b.proprioTel : "";
    alert("🎉 Rapport validé !"); showView('etat-lieux');
}

function renderEtatsLieuxList() {
    const listContainer = document.getElementById('edl-list'); if(!listContainer) return;
    const filtered = etatsLieux.filter(e => profilRole === "SuperAdmin" || e.agent === courtierNom);
    listContainer.innerHTML = filtered.map(e => `
        <div class="form-card" style="border-left: 4px solid ${e.type==='Entrée'?'var(--green)':'var(--red)'}; padding:10px; position:relative; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-right:25px;">
                <div><strong>${e.bien}</strong><br><small>${e.type} • ${e.date}</small></div>
                <button class="btn-primary" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#2ECC71;" onclick="partagerEDLExistant(${e.id})"><i class="fab fa-whatsapp"></i> Envoyer</button>
            </div>
            <i class="fas fa-trash-alt" style="position:absolute; right:10px; top:12px; color:var(--red); font-size:0.8rem; cursor:pointer;" onclick="supprimerEDLExistant(${e.id})"></i>
        </div>
    `).reverse().join('');
}

async function supprimerEDLExistant(id) {
    if(confirm("Supprimer ce constat ?")) { await window.fsDeleteDoc(window.fsDoc(window.db, "etats_des_lieux", String(id))); await chargerDonneesCloud(); renderEtatsLieuxList(); }
}

function partagerEDLExistant(id) {
    const e = etatsLieux.find(x => x.id === id); const b = biens.find(x => x.nom === e.bien);
    let checkSummary = e.pieces.map(p => `• ${p.piece} : ${p.etat}`).join('\n');
    envoyerMessageWhatsApp(b ? b.locataireTel : "", `*ETAT DES LIEUX - ${e.type.toUpperCase()}*\n\n*Bien :* ${e.bien}\n\n*CONSTAT :*\n${checkSummary}`, false);
}

// ==========================================
// VENTES / COLLECTES
// ==========================================
function analyserReliquatComptable() {
    const name = document.getElementById('c-bien-select').value; const type = document.getElementById('c-type').value;
    const liveBox = document.getElementById('c-live-status'); const inputMontant = document.getElementById('c-montant');
    if(!name) { liveBox.style.display = 'none'; return; }

    const b = biens.find(x => x.nom === name); const paiements = b.historiquePaiements || [];
    const filtreMois = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

    let totalDu = 0, dejaPayeCeMois = 0;
    if (type === 'Loyer' || type === 'Avance') {
        totalDu = parseFloat(b.loyer);
        dejaPayeCeMois = paiements.filter(p => p.date.endsWith(filtreMois) && (p.type === 'Loyer' || p.type === 'Avance')).reduce((sum, p) => sum + p.montant, 0);
    } else if (type === 'Caution') {
        totalDu = parseFloat(b.loyer) * 3; dejaPayeCeMois = paiements.filter(p => p.type === 'Caution').reduce((sum, p) => sum + p.montant, 0);
    }

    let reliquat = Math.max(0, totalDu - dejaPayeCeMois); liveBox.style.display = 'block';
    if (reliquat === 0) {
        liveBox.style.background = '#FEE2E2'; liveBox.innerHTML = `⚠️ Terme déjà soldé pour ce bien.`; inputMontant.value = 0;
    } else {
        liveBox.style.background = 'var(--gold-light)'; liveBox.innerHTML = `🎯 <b>Reste à percevoir : ${reliquat.toLocaleString()} CFA</b>`; inputMontant.value = reliquat;
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
    const name = document.getElementById('c-bien-select').value; const mt = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value; const mode = document.querySelector('input[name="pay-mode"]:checked').value;
    const b = biens.find(x => x.nom === name); if (mt <= 0 || isNaN(mt)) return;

    if(!b.historiquePaiements) b.historiquePaiements = [];
    b.historiquePaiements.push({ id: Date.now(), type: type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR') });

    let maCom = type=='Caution' ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com));
    comTotaleGlobal += maCom;

    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(b.id)), b);
    await window.fsSetDoc(window.fsDoc(window.db, "config", "finance"), { comTotaleGlobal: comTotaleGlobal });
    await chargerDonneesCloud();
    alert("💸 Encaissement enregistré !"); showView('dashboard');
}

// ==========================================
// VISITES (AVEC BOUTON DE VALIDATION / BLOCAGE)
// ==========================================
async function sauverVisite() {
    const nom = document.getElementById('p-name').value; const tel = document.getElementById('p-tel').value;
    const bien = document.getElementById('p-bien-select').value; const date = document.getElementById('p-date').value;
    if(!nom || !tel || !date) return alert("Remplir tous les champs.");

    const struct = { id: Date.now(), nom, tel, bien, date, statutChecking: "Planifié", qualification: "Non qualifié", verrouille: false };
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(struct.id)), struct);
    await chargerDonneesCloud();
    document.getElementById('p-name').value = ''; document.getElementById('p-tel').value = '';
    renderVisites();
}

function renderVisites() {
    const conteneur = document.getElementById('visites-list'); if(!conteneur) return;
    const filtered = visites.filter(v => profilRole === "SuperAdmin" || biens.some(b => b.nom === v.bien && b.agentCreateur === courtierNom));
    const maintenant = new Date();

    conteneur.innerHTML = filtered.map(v => {
        const dateVisite = new Date(v.date);
        const estVerrouille = v.verrouille === true;

        let badgeColor = v.statutChecking === "Honoré" ? "#10B981" : (v.statutChecking === "Absent" ? "#EF4444" : "#3B82F6");

        return `
            <div class="form-card" style="padding:10px; margin-bottom:10px; border-left: 4px solid ${badgeColor};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <b style="font-size:0.85rem;">👤 ${v.nom}</b> <small>(${v.bien})</small><br>
                        <small style="font-size:0.75rem; color:var(--text-light);">📅 ${dateVisite.toLocaleString('fr-FR')}</small>
                    </div>
                    <span style="background:${badgeColor}; color:white; padding:2px 6px; border-radius:8px; font-size:0.65rem; font-weight:700;">
                        ${v.statutChecking || 'Planifié'}
                    </span>
                </div>

                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:6px; margin:6px 0; display:flex; gap:6px; justify-content:space-between; align-items:center;">
                    <div>
                        <small style="display:block; font-size:0.6rem; color:var(--text-light); font-weight:700;">STATUT :</small>
                        <select id="chk-${v.id}" ${estVerrouille ? 'disabled' : ''} style="width:auto; margin:0; padding:2px; font-size:0.75rem;">
                            <option value="Planifié" ${v.statutChecking === 'Planifié' ? 'selected' : ''}>⏳ Planifié</option>
                            <option value="Honoré" ${v.statutChecking === 'Honoré' ? 'selected' : ''}>✅ Honoré</option>
                            <option value="Absent" ${v.statutChecking === 'Absent' ? 'selected' : ''}>❌ Absent</option>
                        </select>
                    </div>
                    <div>
                        <small style="display:block; font-size:0.6rem; color:var(--text-light); font-weight:700;">QUALIFICATION :</small>
                        <select id="qalf-${v.id}" ${estVerrouille ? 'disabled' : ''} style="width:auto; margin:0; padding:2px; font-size:0.75rem;">
                            <option value="Non qualifié" ${v.qualification === 'Non qualifié' ? 'selected' : ''}>❓ En attente</option>
                            <option value="Client Sérieux" ${v.qualification === 'Client Sérieux' ? 'selected' : ''}>🔥 Très Sérieux</option>
                            <option value="Curieux / Pas de budget" ${v.qualification === 'Curieux / Pas de budget' ? 'selected' : ''}>🥶 Curieux</option>
                            <option value="Dossier en cours" ${v.qualification === 'Dossier en cours' ? 'selected' : ''}>📝 Dossier déposé</option>
                        </select>
                    </div>
                    
                    ${estVerrouille ? 
                        `<span style="color:var(--green); font-size:0.75rem; font-weight:700; padding:4px;"><i class="fas fa-lock"></i> Validé</span>` :
                        `<button class="btn-primary" style="width:auto; padding:4px 8px; font-size:0.7rem; background:var(--dark);" onclick="validerPointageVisite(${v.id})">Valider</button>`
                    }
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                    <span onclick="envoyerMessageWhatsApp('${v.tel}', 'Rendez-vous confirmé le ${dateVisite.toLocaleString('fr-FR')} pour le bien : ${v.bien}.', true)" style="color:#2ECC71; cursor:pointer; font-weight:700;"><i class="fab fa-whatsapp"></i> Rappel</span>
                    ${!estVerrouille ? `<span onclick="supprimerRendezVous(${v.id})" style="color:var(--red); cursor:pointer;"><i class="fas fa-trash-alt"></i> Annuler</span>` : ''}
                </div>
            </div>
        `;
    }).reverse().join('');
}

async function validerPointageVisite(id) {
    const v = visites.find(x => x.id === id); if(!v) return;
    const nouveauStatut = document.getElementById(`chk-${id}`).value;
    const nouvelleQualif = document.getElementById(`qalf-${id}`).value;

    if(confirm("🔒 Confirmer ce pointage ? Les choix de qualification et présence seront définitivement gelés.")) {
        v.statutChecking = nouveauStatut;
        v.qualification = nouvelleQualif;
        v.verrouille = true; // Verrouillage définitif
        await window.fsSetDoc(window.fsDoc(window.db, "visites", String(id)), v);
        await chargerDonneesCloud(); renderVisites();
    }
}

async function supprimerRendezVous(id) {
    if(confirm("Supprimer ce RDV ?")) { await window.fsDeleteDoc(window.fsDoc(window.db, "visites", String(id))); await chargerDonneesCloud(); renderVisites(); }
}

async function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const t = document.getElementById('view-' + id); if(t) t.style.display = 'block';

    rafraichirCompteurCommission();
    if(id === 'biens') renderBiens();
    if(id === 'etat-lieux') renderEtatsLieuxList();
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
                    else comCourtier += b.com.includes('%') ? (parseFloat(b.com)/100)*p.montant : parseFloat(b.com);
                });
            }
        });
        document.getElementById('total-display').innerText = comCourtier.toLocaleString() + " CFA";
    }
}

function resetNavStyles(el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active');
}
