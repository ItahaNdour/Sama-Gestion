// ==============================================================================
// SAMA GESTION PRO V7.0 - INTÉGRAL AVEC ENCODAGE SÉCURISÉ WHATSAPP & MODULE EDL
// ==============================================================================

let profilRole = null;
let courtierNom = null;
let monAvatar = "💼";

let utilisateurs = [];
let biens = [];
let visites = [];
let etatsLieux = [];
let comTotaleGlobal = 0;

let currentFilter = 'Disponible';
let selectedPhotos = [];
let selectedPhotosEDL = [];

const ROOMS_CONFIG = ["Salon", "Cuisine", "Chambre Principale", "SDE / WC Retenue", "Balcon"];

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailInvite = urlParams.get('email');
    if(emailInvite && document.getElementById('login-username')) {
        document.getElementById('login-username').value = emailInvite;
    }

    window.fbOnAuth(window.auth, async (user) => {
        if (user) {
            const docProfil = await window.fsGetDoc(window.fsDoc(window.db, "profils", user.uid));
            if (docProfil.exists()) {
                const data = docProfil.data();
                profilRole = data.role;
                courtierNom = data.username;
                monAvatar = data.avatar || (data.role === 'SuperAdmin' ? "👑" : "🏢");
            } else {
                profilRole = "SuperAdmin";
                courtierNom = user.email.split('@')[0];
                monAvatar = "👑";
                await window.fsSetDoc(window.fsDoc(window.db, "profils", user.uid), {
                    uid: user.uid, username: courtierNom, role: "SuperAdmin", avatar: "👑"
                });
            }
            
            await chargerDonneesCloud();
            document.getElementById('login-screen').style.display = 'none';
            majInterfaceProfil();
            showView('dashboard');
        } else {
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
        console.error("Erreur de synchronisation Cloud:", error);
    }
}

async function verifierConnexion() {
    const emailSaisi = document.getElementById('login-username').value.trim();
    const passSaisi = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    try {
        await window.fbSignIn(window.auth, emailSaisi, passSaisi);
    } catch (error) {
        errorMsg.innerText = "❌ Email ou mot de passe incorrect.";
        errorMsg.style.display = 'block';
    }
}

async function deconnexion() {
    await window.fbSignOut(window.auth);
    window.location.href = window.location.pathname;
}

function majInterfaceProfil() {
    document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-statut-actuel').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '👑 Administrateur Général' : `🏢 Partenaire (${profilRole})`;
    
    if (profilRole === "SuperAdmin") {
        document.getElementById('admin-management-section').style.display = 'block';
        renderAdminAgencesList();
    }
}

// ==========================================
// NETTOYAGE ET ENCODAGE UNIVERSEL WHATSAPP 2026
// ==========================================
function formaterNumeroWhatsApp(num) {
    if(!num) return "";
    let propre = num.replace(/\D/g, ''); 
    if(propre.startsWith('00')) propre = propre.substring(2);
    if(propre.length === 9 && propre.startsWith('7')) propre = '221' + propre;
    return propre;
}

function envoyerMessageWhatsApp(telephone, message) {
    const numeroPropre = formaterNumeroWhatsApp(telephone);
    if(!numeroPropre) {
        alert("⚠️ Numéro invalide ou absent.");
        return;
    }
    // Nettoyage complet : Remplacement des retours chariots bruts par des codes web sécurisés %0A
    let messageEncode = encodeURIComponent(message);
    const url = `https://wa.me/${numeroPropre}?text=${messageEncode}`;
    
    // Ouverture forcée pour contourner les limitations mobiles
    const w = window.open(url, '_blank');
    if(!w) {
        alert("⚠️ Ouverture bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.");
    }
}

// ==========================================
// COMPRESSEUR PHOTO PRESTIGE EN TEXTE LIGHT
// ==========================================
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
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); // Format 50% ultra-léger
                    
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
// CRÉATION MEMBRES
// ==========================================
async function adminCreerCompteCourtier() {
    const emailCourtier = document.getElementById('admin-new-user-name').value.trim(); 
    const passCourtier = document.getElementById('admin-new-user-pin').value.trim();
    const roleChoisi = document.getElementById('admin-new-user-role').value;
    
    if(!emailCourtier.includes('@') || passCourtier.length < 6) return alert("Données invalides.");

    try {
        const uidPredictif = "user_" + Date.now();
        const nameNode = emailCourtier.split('@')[0];
        await window.fsSetDoc(window.fsDoc(window.db, "profils", uidPredictif), {
            uid: uidPredictif, username: nameNode, email: emailCourtier, password_clear_temp: passCourtier, role: roleChoisi, avatar: roleChoisi === 'Agence' ? "🏢" : "💼"
        });
        document.getElementById('admin-new-user-name').value = '';
        document.getElementById('admin-new-user-pin').value = '';
        await chargerDonneesCloud();
        renderAdminAgencesList();
        alert("🎉 Compte configuré avec succès !");
    } catch (e) { alert(e.message); }
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list');
    if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="background:white; padding:10px; border-radius:10px; margin-bottom:8px; border:1px solid #e2e8f0; font-size:0.85rem;">
            <div style="display:flex; justify-content:space-between;">
                <span>${u.avatar || '💼'} <b>${u.username}</b> (${u.role})</span>
                ${u.role !== 'SuperAdmin' ? `<i class="fas fa-trash-alt" style="color:#EF4444;" onclick="adminSupprimerAgence('${u.uid}')"></i>` : '⭐'}
            </div>
            ${u.role !== 'SuperAdmin' ? `<button onclick="navigator.clipboard.writeText('${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(u.email)}'); alert('Lien copié !');" style="background:var(--gold-light); color:var(--gold); border:none; padding:4px; border-radius:4px; font-size:0.7rem; margin-top:5px; cursor:pointer;">Copier le lien magique</button>` : ''}
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
// MODULE CATALOGUE ET BIENS
// ==========================================
function ouvrirFormulaireAjout() {
    selectedPhotos = [];
    document.getElementById('previews-container').innerHTML = '';
    document.getElementById('new-bien-nom').value = '';
    document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-adresse').value = '';
    document.getElementById('new-bien-proprio').value = '';
    document.getElementById('new-bien-proprio-tel').value = '';
    document.getElementById('btn-save-bien').disabled = false;
    document.getElementById('btn-save-bien').innerText = "Enregistrer sur le Cloud";
    showView('ajouter-bien');
}

async function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value.trim();
    const loyer = document.getElementById('new-bien-loyer').value.trim();
    if(!nom || !loyer) return alert("Champs obligatoires manquants.");

    const btn = document.getElementById('btn-save-bien');
    btn.disabled = true;
    btn.innerText = "⏳ Synchronisation...";

    const stringId = String(Date.now());
    const nouveauBien = {
        id: Date.now(), agentCreateur: courtierNom, nom: nom, loyer: loyer,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value || 'Non spécifiée',
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu',
        proprioTel: document.getElementById('new-bien-proprio-tel').value || '',
        locataire: 'Aucun', locataireTel: '',
        com: document.getElementById('new-bien-com').value || '10%',
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"],
        statut: 'Disponible', historiquePaiements: []
    };

    await window.fsSetDoc(window.fsDoc(window.db, "biens", stringId), nouveauBien);
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
        <p>Loyer : ${parseInt(b.loyer).toLocaleString()} CFA</p>
        <p>Propriétaire : ${b.proprio} (${b.proprioTel || 'Pas de numéro'})</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:15px;">
            <button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer le bien'}</button>
            <button class="btn-outline" style="color:var(--red);" onclick="supprimerBien(${b.id})">Supprimer</button>
        </div>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

async function toggleStatut(id) {
    const b = biens.find(x => x.id === id);
    if(b.statut === 'Disponible') {
        b.locataire = prompt("Nom du locataire :") || "Inconnu";
        b.locataireTel = prompt("Téléphone du locataire :") || "";
        b.statut = 'Occupé';
    } else {
        if(confirm("Libérer ce bien ?")) b.statut = 'Disponible';
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
    const total = (b.historiquePaiements || []).reduce((s,p) => s + p.montant, 0);
    document.getElementById('modal-body').innerHTML = `
        <h3>💼 Finances - ${b.nom}</h3>
        <div style="background:var(--dark); color:white; padding:15px; border-radius:10px; margin:10px 0;">
            <small>Total Encaissé</small><h2>${total.toLocaleString()} CFA</h2>
        </div>
        <button class="btn-primary" style="background:#2ECC71;" onclick="relancerPaiementWhatsApp(${b.id})"><i class="fab fa-whatsapp"></i> Envoyer Rappel WhatsApp</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

function relancerPaiementWhatsApp(id) {
    const b = biens.find(x => x.id === id);
    if(!b.locataireTel) return alert("Pas de numéro enregistré.");
    const msg = `*RAPPEL SAMA GESTION*\n\nBonjour ${b.locataire}, le terme de votre loyer pour le bien *${b.nom}* est échu. Merci de procéder au règlement.`;
    envoyerMessageWhatsApp(b.locataireTel, msg);
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }

// ==========================================
// MODULE NOUVEAU : ÉTAT DES LIEUX (EDL)
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
    btn.disabled = true; btn.innerText = "⏳ Certification Cloud...";

    const piecesData = [];
    document.querySelectorAll('.edl-room-select').forEach(s => {
        piecesData.push({ piece: s.getAttribute('data-room'), etat: s.value });
    });

    const structureEDL = {
        id: Date.now(),
        date: new Date().toLocaleDateString('fr-FR'),
        agent: courtierNom, bien: bienNom, type: type, pieces: piecesData,
        eau: document.getElementById('edl-eau').value || "Non spécifié",
        elec: document.getElementById('edl-elec').value || "Non spécifié",
        cles: document.getElementById('edl-cles').value || "0",
        notes: document.getElementById('edl-notes').value || "RAS",
        photos: selectedPhotosEDL
    };

    await window.fsSetDoc(window.fsDoc(window.db, "etats_des_lieux", String(structureEDL.id)), structureEDL);
    await chargerDonneesCloud();

    // Construction du document texte propre pour WhatsApp
    let checkSummary = piecesData.map(p => `• ${p.piece} : ${p.etat}`).join('\n');
    let constructionTexte = `*CERTIFICAT ÉTAT DES LIEUX DE ${type.toUpperCase()}*\n\n` +
                            `*Immeuble / Bien :* ${bienNom}\n` +
                            `*Date de signature :* ${structureEDL.date}\n` +
                            `*Agent Référent :* ${courtierNom}\n\n` +
                            `*CONSTAT DES PIÈCES :*\n${checkSummary}\n\n` +
                            `*COMPTEURS ET CLÉS :*\n` +
                            `💧 Compteur Eau : ${structureEDL.eau} m3\n` +
                            `⚡ Compteur Élec : ${structureEDL.elec} kWh\n` +
                            `🔑 Trousseaux : ${structureEDL.cles} remis\n\n` +
                            `*OBSERVATIONS :*\n${structureEDL.notes}\n\n` +
                            `_Document officiel enregistré numériquement sur le Cloud._`;

    const b = biens.find(x => x.nom === bienNom);
    const destinataireTel = (b && b.locataireTel) ? b.locataireTel : (b ? b.proprioTel : "");
    
    alert("🎉 Rapport d'État des lieux signé et stocké dans le Cloud !");
    if(destinataireTel) envoyerMessageWhatsApp(destinataireTel, constructionTexte);

    showView('etat-lieux');
}

function renderEtatsLieuxList() {
    const listContainer = document.getElementById('edl-list');
    if(!listContainer) return;
    const filtered = etatsLieux.filter(e => profilRole === "SuperAdmin" || e.agent === courtierNom);

    listContainer.innerHTML = filtered.map(e => `
        <div class="form-card" style="border-left: 4px solid ${e.type==='Entrée'?'var(--green)':'var(--red)'};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${e.bien}</strong><br>
                    <small>${e.type} • ${e.date}</small>
                </div>
                <button class="btn-primary" style="width:auto; padding:6px 10px; font-size:0.75rem; background:#2ECC71;" onclick="partagerEDLExistant(${e.id})"><i class="fab fa-whatsapp"></i> Transmettre</button>
            </div>
            ${e.photos && e.photos.length > 0 ? `<div style="display:flex; gap:4px; margin-top:8px;">${e.photos.map(p=>`<img src="${p}" style="width:30px; height:30px; object-fit:cover; border-radius:4px;">`).join('')}</div>` : ''}
        </div>
    `).reverse().join('');
}

function partagerEDLExistant(id) {
    const e = etatsLieux.find(x => x.id === id);
    let checkSummary = e.pieces.map(p => `• ${p.piece} : ${p.etat}`).join('\n');
    let constructionTexte = `*RAPPEL ÉTAT DES LIEUX DE ${e.type.toUpperCase()}*\n\n*Bien :* ${e.bien}\n*Date :* ${e.date}\n\n*CONSTAT :*\n${checkSummary}\n\n*Notes :* ${e.notes}`;
    
    const b = biens.find(x => x.nom === e.bien);
    const num = b ? b.locataireTel : "";
    if(num) envoyerMessageWhatsApp(num, constructionTexte);
    else alert("Aucun téléphone associé.");
}

// ==========================================
// VENTES ET COLLECTES
// ==========================================
function updateSelects() {
    const occ = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom));
    const disp = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom));
    document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    remplirLoyer();
}

function remplirLoyer() {
    const name = document.getElementById('c-bien-select').value;
    const type = document.getElementById('c-type').value;
    const b = biens.find(x => x.nom === name);
    if(b) { document.getElementById('c-montant').value = type === 'Caution' ? parseFloat(b.loyer)*3 : b.loyer; }
}

async function validerCollecte(cible) {
    const name = document.getElementById('c-bien-select').value;
    const mt = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value;
    const mode = document.querySelector('input[name="pay-mode"]:checked').value;
    const b = biens.find(x => x.nom === name);

    if(!b.historiquePaiements) b.historiquePaiements = [];
    b.historiquePaiements.push({ id: Date.now(), type: type==='Loyer'?'Loyer Mois':type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR') });

    let maCom = type==='Caution' ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com));
    comTotaleGlobal += maCom;

    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(b.id)), b);
    await window.fsSetDoc(window.fsDoc(window.db, "config", "finance"), { comTotaleGlobal: comTotaleGlobal });
    await chargerDonneesCloud();

    let txt = `*REÇU DE PAIEMENT NUMÉRIQUE*\n\n*Bien :* ${b.nom}\n*Versement :* ${mt.toLocaleString()} CFA\n*Nature :* ${type}\n*Mode :* ${mode}\n*Date :* ${new Date().toLocaleDateString('fr-FR')}`;
    envoyerMessageWhatsApp(cible==='locataire'?b.locataireTel:b.proprioTel, txt);
    showView('dashboard');
}

// ==========================================
// VISITES & INTERFACES
// ==========================================
async function sauverVisite() {
    const nom = document.getElementById('p-name').value;
    const tel = document.getElementById('p-tel').value;
    const bien = document.getElementById('p-bien-select').value;
    const date = document.getElementById('p-date').value;
    if(!nom || !tel || !date) return alert("Remplir tout.");

    const struct = { id: Date.now(), nom, tel, bien, date, statut: 'En attente', qualification: '', notes: '' };
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(struct.id)), struct);
    await chargerDonneesCloud();
    showView('planning');
}

function renderVisites() {
    const conteneur = document.getElementById('visites-list');
    if(!conteneur) return;
    conteneur.innerHTML = visites.map(v => `
        <div class="form-card">
            <b>👤 ${v.nom}</b> - <small>${v.bien}</small><br>
            <small>📅 ${v.date.replace('T', ' à ')}</small><br>
            <span onclick="envoyerMessageWhatsApp('${v.tel}', 'Bonjour ${v.nom}, je confirme notre rendez-vous pour le bien ${v.bien}.')" style="color:#2ECC71; cursor:pointer; font-size:0.85rem; font-weight:700;"><i class="fab fa-whatsapp"></i> Contacter Client</span>
        </div>
    `).reverse().join('');
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
