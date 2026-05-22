// ==============================================================================
// SAMA GESTION PRO V9.5 - CORRIGÉ MODE LOCAL (SANS FIREBASE)
// ==============================================================================

let profilRole = "SuperAdmin";
let courtierNom = "Amadou Ndour"; 
let courtierEmail = "19amadoundour@gmail.com";
let monAvatar = "👑";
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

    // Connexion locale instantanée et synchronisation
    chargerDonneesCloud();
    
    if (document.getElementById('login-screen')) {
        document.getElementById('login-screen').style.display = 'none';
    }
    
    majInterfaceProfil();
    
    if(document.getElementById('user-payment-link-champ')) {
        document.getElementById('user-payment-link-champ').value = monLienPaiement;
    }
    
    showView('dashboard');
};

function chargerDonneesCloud() {
    try {
        // Chargement sécurisé depuis le localStorage local
        utilisateurs = JSON.parse(localStorage.getItem('sama_utilisateurs')) || [];
        biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
        visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
        etatsLieux = JSON.parse(localStorage.getItem('sama_etatsLieux')) || [];
        comTotaleGlobal = parseFloat(localStorage.getItem('sama_comTotaleGlobal')) || 0;
        
        // Mise à jour du KPI global du Dashboard
        const totalDisplay = document.getElementById('total-display');
        if (totalDisplay) {
            totalDisplay.innerText = `${comTotaleGlobal.toLocaleString()} CFA`;
        }
        
    } catch (error) {
        console.error("Erreur de chargement des données locales", error);
    }
}

function verifierConnexion() {
    // Connexion forcée validée automatiquement pour le mode hors-ligne
    if (document.getElementById('login-screen')) {
        document.getElementById('login-screen').style.display = 'none';
    }
    showView('dashboard');
}

function deconnexion() {
    if (document.getElementById('login-screen')) {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

function majInterfaceProfil() {
    if (document.getElementById('header-user-badge')) {
        document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    }
    if (document.getElementById('profil-statut-actuel')) {
        document.getElementById('profil-statut-actuel').innerHTML = `${monAvatar} ${courtierNom}`;
    }
    if (document.getElementById('profil-email-affichage')) {
        document.getElementById('profil-email-affichage').innerText = courtierEmail || "Non renseigné";
    }
    if (document.getElementById('profil-role-badge')) {
        document.getElementById('profil-role-badge').innerText = '👑 Administrateur Général';
    }
    
    if (document.getElementById('admin-management-section')) {
        document.getElementById('admin-management-section').style.display = 'block';
        renderAdminAgencesList();
    }
}

function sauvegarderLienPaiement(val) {
    monLienPaiement = val.trim();
    localStorage.setItem('sama_monLienPaiement', monLienPaiement);
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

    if(!loyerTotal || !dateEntreeStr) { if(box) box.style.display = 'none'; return; }
    const dateEntree = new Date(dateEntreeStr);
    const jourEntree = dateEntree.getDate();
    const joursDansLeMois = new Date(dateEntree.getFullYear(), dateEntree.getMonth() + 1, 0).getDate();

    if(jourEntree === 1) { if(box) box.style.display = 'none'; return; }
    const joursDus = (joursDansLeMois - jourEntree) + 1;
    const montantProrata = Math.round((loyerTotal / joursDansLeMois) * joursDus);
    if(result) result.innerHTML = `${joursDus} jours occupés.<br>💰 Montant : ${montantProrata.toLocaleString()} CFA`;
    if(box) box.style.display = 'block';
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
    const container = document.getElementById(containerId);
    if(container) {
        container.innerHTML = arrayData.map(p => `<img src="${p}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid #CBD5E1;">`).join('');
    }
}

function adminCreerCompteCourtier() {
    alert("Fonctionnalité réseau simulée avec succès en local.");
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list'); if(!conteneur) return;
    conteneur.innerHTML = `
        <div style="background:white; padding:8px; border-radius:8px; margin-bottom:6px; border:1px solid #e2e8f0; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
            <span>👑 <b>${courtierNom}</b> (SuperAdmin)</span>
            <span>⭐</span>
        </div>
    `;
}

// ==========================================
// MODULE BIENS
// ==========================================
function ouvrirFormulaireAjout() {
    selectedPhotos = [];
    document.getElementById('edit-bien-id').value = '';
    document.getElementById('form-bien-title').innerText = "Nouveau Bien";
    document.getElementById('edit-only-fields').style.display = 'none';
    if(document.getElementById('prorata-box')) document.getElementById('prorata-box').style.display = 'none';
    document.getElementById('previews-container').innerHTML = '';
    document.getElementById('new-bien-nom').value = ''; document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-adresse').value = ''; document.getElementById('new-bien-proprio').value = '';
    document.getElementById('new-bien-proprio-tel').value = '';
    if(document.getElementById('new-bien-superficie')) document.getElementById('new-bien-superficie').value = '';
    if(document.getElementById('new-bien-papier')) document.getElementById('new-bien-papier').value = 'Non spécifié';
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

    const existingId = document.getElementById('edit-bien-id').value;
    const currentId = existingId ? parseInt(existingId) : Date.now();
    const ancienBien = existingId ? biens.find(x => x.id === currentId) : null;

    const structureBien = {
        id: currentId, agentCreateur: courtierNom, nom: nom, loyer: loyer,
        type: document.getElementById('new-bien-type').value, adresse: document.getElementById('new-bien-adresse').value || 'Non spécifiée',
        superficie: document.getElementById('new-bien-superficie') ? document.getElementById('new-bien-superficie').value.trim() : '', 
        typePapier: document.getElementById('new-bien-papier') ? document.getElementById('new-bien-papier').value : 'Non spécifié',
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu', proprioTel: document.getElementById('new-bien-proprio-tel').value || '',
        locataire: existingId ? document.getElementById('edit-bien-locataire').value : 'Aucun', locataireTel: existingId ? document.getElementById('edit-bien-locataire-tel').value : '',
        dateEntree: existingId ? document.getElementById('edit-bien-date-entree').value : '', com: document.getElementById('new-bien-com').value || '10%',
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"],
        statut: ancienBien ? ancienBien.statut : 'Disponible', historiquePaiements: ancienBien ? (ancienBien.historiquePaiements || []) : []
    };

    if (existingId) {
        biens = biens.map(x => x.id === currentId ? structureBien : x);
    } else {
        biens.push(structureBien);
    }

    localStorage.setItem('sama_biens', JSON.stringify(biens));
    chargerDonneesCloud();
    showView('biens');
}

function renderBiens() {
    const searchInput = document.getElementById('search-bien-input');
    const txt = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = biens.filter(b => {
        const matchesSearch = b.nom.toLowerCase().includes(txt) || b.adresse.toLowerCase().includes(txt);
        const matchesTab = b.statut === currentFilter;
        return matchesTab && matchesSearch;
    });

    const listElement = document.getElementById('biens-list');
    if (!listElement) return;

    listElement.innerHTML = filtered.map(b => `
        <div class="form-card" onclick="voirDetailBien(${b.id})" style="padding:10px; margin-bottom:10px; cursor:pointer;">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}" style="width:50px; height:40px; object-fit:cover; margin-right:4px; border-radius:4px;">`).join('')}</div>
            <div style="margin-top:6px; position:relative;">
                <strong style="font-size:0.85rem;">${b.nom}</strong> ${b.superficie ? `<small style="background:#E2E8F0; padding:1px 4px; border-radius:4px; font-size:0.65rem;">📐 ${b.superficie}</small>` : ''}<br>
                <small style="font-size:0.75rem; color:#718096;">${b.adresse}</small><br>
                <span style="color:#F1C40F; font-weight:700; font-size:0.85rem;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                <button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position:absolute; right:0; bottom:0; width:auto; background:rgba(241,196,15,0.1); color:#F1C40F; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer;"><i class="fas fa-wallet"></i> Flux</button>
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
    const b = biens.find(x => x.id === id); if(!b) return;
    const blocFoncier = (b.superficie || (b.typePapier && b.typePapier !== 'Non spécifié')) ? `
        <div style="background:#F8FAFC; padding:6px; border-radius:6px; margin:6px 0; font-size:0.8rem; border:1px dashed #CBD5E1;">
            ${b.superficie ? `📌 <b>Superficie :</b> ${b.superficie}<br>` : ''}
            ${b.typePapier && b.typePapier !== 'Non spécifié' ? `📄 <b>Document :</b> ${b.typePapier}` : ''}
        </div>
    ` : '';

    document.getElementById('modal-body').innerHTML = `
        <h3 style="font-size:1rem; margin-bottom:8px;">${b.nom}</h3> ${blocFoncier}
        <p style="font-size:0.8rem; margin:4px 0;"><b>Prix :</b> ${parseInt(b.loyer).toLocaleString()} CFA</p>
        <p style="font-size:0.8rem; margin:4px 0;"><b>Proprio :</b> ${b.proprio} (${b.proprioTel || 'N/A'})</p>
        <p style="font-size:0.8rem; margin:4px 0;"><b>Locataire :</b> ${b.locataire || 'Aucun'} (${b.locataireTel || 'N/A'})</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px;">
            <button class="btn-primary" style="padding:10px; font-size:0.8rem;" onclick="toggleStatut(${b.id})">${b.statut==='Disponible'?'Marquer Loué':'Libérer bien'}</button>
            <button class="btn-outline" style="padding:10px; font-size:0.8rem; color:#F1C40F; border-color:#F1C40F;" onclick="modifierBienExistant(${b.id})"><i class="fas fa-edit"></i> Modifier</button>
        </div>
        <button class="btn-outline" style="padding:8px; font-size:0.8rem; color:#E53E3E; border-color:#E53E3E; margin-top:6px;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

async function toggleStatut(id) {
    const b = biens.find(x => x.id === id); if(!b) return;
    if(b.statut === 'Disponible') {
        b.locataire = prompt("Nom du locataire :") || "Inconnu"; b.locataireTel = prompt("Téléphone :") || ""; b.dateEntree = prompt("Date (AAAA-MM-JJ) :") || ""; b.statut = 'Occupé';
    } else {
        if(confirm("Libérer ce bien ?")) { b.statut = 'Disponible'; b.locataire = 'Aucun'; b.locataireTel = ''; b.dateEntree = ''; }
    }
    
    biens = biens.map(x => x.id === id ? b : x);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    chargerDonneesCloud(); fermerModal(); renderBiens();
}

async function supprimerBien(id) {
    if(confirm("Supprimer ce bien ?")) { 
        biens = biens.filter(x => x.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        chargerDonneesCloud(); fermerModal(); renderBiens(); 
    }
}

function ouvrirPortefeuille(id) {
    const b = biens.find(x => x.id === id); if(!b) return;
    const paiements = b.historiquePaiements || []; const total = paiements.reduce((s,p) => s + p.montant, 0);
    let lignesTableau = paiements.map(p => `<tr><td><b>${p.date}</b></td><td>${p.type}</td><td style="color:#2ECC71; font-weight:600;">${p.montant.toLocaleString()}</td><td><small class="user-badge" style="padding:1px 4px; font-size:0.65rem;">${p.mode}</small></td></tr>`).reverse().join('');
    if(paiements.length === 0) lignesTableau = `<tr><td colspan="4" style="text-align:center; color:#718096;">Aucune transaction</td></tr>`;

    document.getElementById('modal-body').innerHTML = `
        <h3 style="font-size:1rem; margin-bottom:6px;">📊 Comptabilité</h3>
        <div style="background:#1A1A2E; color:white; padding:10px; border-radius:8px; margin-bottom:10px; text-align:center;">
            <h2 style="color:#FFF; font-size:1.2rem; margin:0;">${total.toLocaleString()} CFA</h2>
        </div>
        <div style="max-height:150px; overflow-y:auto; border:1px solid #CBD5E1; border-radius:6px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem;"><thead style="background:#F4F6F9;"><tr><th style="padding:4px;">Date</th><th style="padding:4px;">Type</th><th style="padding:4px;">Montant</th><th style="padding:4px;">Mode</th></tr></thead><tbody>${lignesTableau}</tbody></table>
        </div>
        <button class="btn-primary" style="background:#2ECC71; margin-top:10px; padding:10px; font-size:0.8rem;" onclick="relancerPaiementWhatsApp(${b.id})"><i class="fab fa-whatsapp"></i> Rappel doux</button>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

function relancerPaiementWhatsApp(id) {
    const b = biens.find(x => x.id === id); if(!b || !b.locataireTel) return alert("Pas de numéro.");
    const nomLocataire = b.locataire && b.locataire !== "Aucun" ? b.locataire : "Cher Locataire";
    envoyerMessageWhatsApp(b.locataireTel, `Bonjour ${nomLocataire},\n\nLe règlement du loyer pour votre logement (*${b.nom}*) n'a pas encore été validé pour ce terme. Merci de régulariser.`, true);
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }

// ==========================================
// MODULE EDL
// ==========================================
function ouvrirFormulaireEDL() {
    selectedPhotosEDL = []; 
    if(document.getElementById('edl-previews-container')) document.getElementById('edl-previews-container').innerHTML = '';
    document.getElementById('edl-eau').value = ''; document.getElementById('edl-elec').value = '';
    if(document.getElementById('edl-cles')) document.getElementById('edl-cles').value = ''; 
    document.getElementById('edl-notes').value = '';
    
    document.getElementById('edl-bien-select').innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
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
    const piecesData = []; document.querySelectorAll('.edl-room-select').forEach(s => { piecesData.push({ piece: s.getAttribute('data-room'), etat: s.value }); });

    const structureEDL = {
        id: Date.now(), date: new Date().toLocaleDateString('fr-FR'), agent: courtierNom, bien: bienNom, type: type, pieces: piecesData,
        eau: document.getElementById('edl-eau').value || "N/A", elec: document.getElementById('edl-elec').value || "N/A", cles: document.getElementById('edl-cles') ? document.getElementById('edl-cles').value : "0", notes: document.getElementById('edl-notes').value || "RAS", photos: selectedPhotosEDL
    };

    etatsLieux.push(structureEDL);
    localStorage.setItem('sama_etatsLieux', JSON.stringify(etatsLieux));
    
    await chargerDonneesCloud();
    alert("🎉 Rapport validé !"); 
    showView('etat-lieux');
}

function renderEtatsLieuxList() {
    const listContainer = document.getElementById('edl-list'); if(!listContainer) return;
    listContainer.innerHTML = etatsLieux.map(e => `
        <div class="form-card" style="border-left: 4px solid ${e.type.includes('Entrée') ? '#2ECC71' : '#E53E3E'}; padding:10px; position:relative; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-right:25px;">
                <div><strong>${e.bien}</strong><br><small>${e.type} • ${e.date}</small></div>
                <button class="btn-primary" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#2ECC71; cursor:pointer;" onclick="partagerEDLExistant(${e.id})"><i class="fab fa-whatsapp"></i> Envoyer</button>
            </div>
            <i class="fas fa-trash-alt" style="position:absolute; right:10px; top:12px; color:#E53E3E; font-size:0.8rem; cursor:pointer;" onclick="supprimerEDLExistant(${e.id})"></i>
        </div>
    `).reverse().join('');
}

async function supprimerEDLExistant(id) {
    if(confirm("Supprimer ce constat ?")) { 
        etatsLieux = etatsLieux.filter(x => x.id !== id);
        localStorage.setItem('sama_etatsLieux', JSON.stringify(etatsLieux));
        chargerDonneesCloud(); renderEtatsLieuxList(); 
    }
}

function partagerEDLExistant(id) {
    const e = etatsLieux.find(x => x.id === id); if(!e) return;
    const b = biens.find(x => x.nom === e.bien);
    let checkSummary = e.pieces.map(p => `• ${p.piece} : ${p.etat}`).join('\n');
    envoyerMessageWhatsApp(b ? b.locataireTel : "", `*ETAT DES LIEUX - ${e.type.toUpperCase()}*\n\n*Bien :* ${e.bien}\n\n*CONSTAT :*\n${checkSummary}`, false);
}

// ==========================================
// VENTES / COLLECTES
// ==========================================
function analyserReliquatComptable() {
    const name = document.getElementById('c-bien-select').value; const type = document.getElementById('c-type').value;
    const liveBox = document.getElementById('c-live-status'); const inputMontant = document.getElementById('c-montant');
    if(!name) { if(liveBox) liveBox.style.display = 'none'; return; }

    const b = biens.find(x => x.nom === name); if(!b) return;
    const paiements = b.historiquePaiements || [];
    const filtreMois = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

    let totalDu = 0, dejaPayeCeMois = 0;
    if (type.includes('Loyer') || type.includes('Avance')) {
        totalDu = parseFloat(b.loyer);
        dejaPayeCeMois = paiements.filter(p => p.date.endsWith(filtreMois) && (p.type.includes('Loyer') || p.type.includes('Avance'))).reduce((sum, p) => sum + p.montant, 0);
    } else if (type.includes('Caution')) {
        totalDu = parseFloat(b.loyer) * 3; dejaPayeCeMois = paiements.filter(p => p.type.includes('Caution')).reduce((sum, p) => sum + p.montant, 0);
    }

    let reliquat = Math.max(0, totalDu - dejaPayeCeMois); 
    if(liveBox) {
        liveBox.style.display = 'block';
        if (reliquat === 0) {
            liveBox.style.background = '#FEE2E2'; liveBox.innerHTML = `⚠️ Terme déjà soldé pour ce bien.`; inputMontant.value = 0;
        } else {
            liveBox.style.background = 'rgba(241,196,15,0.1)'; liveBox.innerHTML = `🎯 <b>Reste à percevoir : ${reliquat.toLocaleString()} CFA</b>`; inputMontant.value = reliquat;
        }
    } else {
        inputMontant.value = reliquat || b.loyer;
    }
}

function updateSelects() {
    const occ = biens.filter(b => b.statut === 'Occupé');
    const disp = biens.filter(b => b.statut === 'Disponible');
    
    if(document.getElementById('c-bien-select')) {
        document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    }
    if(document.getElementById('p-bien-select')) {
        document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    }
    analyserReliquatComptable();
}

async function validerCollecte() {
    const name = document.getElementById('c-bien-select').value; 
    const mt = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value; 
    
    const radioChecked = document.querySelector('input[name="pay-mode"]:checked');
    const mode = radioChecked ? radioChecked.value : "Espèces";
    
    const b = biens.find(x => x.nom === name); if (!b || mt <= 0 || isNaN(mt)) return;

    if(!b.historiquePaiements) b.historiquePaiements = [];
    b.historiquePaiements.push({ id: Date.now(), type: type, montant: mt, mode: mode, date: new Date().toLocaleDateString('fr-FR') });

    let maCom = type.includes('Caution') ? parseFloat(b.loyer) : (b.com.includes('%') ? (parseFloat(b.com)/100)*mt : parseFloat(b.com));
    comTotaleGlobal += maCom;

    biens = biens.map(x => x.id === b.id ? b : x);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    localStorage.setItem('sama_comTotaleGlobal', comTotaleGlobal);
    
    await chargerDonneesCloud();
    alert("💸 Encaissement enregistré !"); 
    showView('dashboard');
}

// ==========================================
// MODULE VISITES
// ==========================================
async function sauverVisite() {
    const nom = document.getElementById('p-name').value; const tel = document.getElementById('p-tel').value;
    const bien = document.getElementById('p-bien-select').value; const date = document.getElementById('p-date').value;
    if(!nom || !tel || !date) return alert("Remplir tous les champs.");

    const struct = { id: Date.now(), nom, tel, bien, date, statutChecking: "Planifié", qualification: "Non qualifié", verrouille: false };
    visites.push(struct);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    await chargerDonneesCloud();
    document.getElementById('p-name').value = ''; document.getElementById('p-tel').value = '';
    renderVisites();
}

function renderVisites() {
    const conteneur = document.getElementById('visites-list'); if(!conteneur) return;
    conteneur.innerHTML = visites.map(v => {
        let badgeColor = v.statutChecking === "Honoré" ? "#10B981" : (v.statutChecking === "Absent" ? "#EF4444" : "#3B82F6");
        return `
            <div class="form-card" style="padding:10px; margin-bottom:10px; border-left: 4px solid ${badgeColor};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <b style="font-size:0.85rem;">👤 ${v.nom}</b> <small>(${v.bien})</small><br>
                        <small style="color:#718096;">📅 ${new Date(v.date).toLocaleString('fr-FR')}</small>
                    </div>
                    <span style="font-size:0.75rem; font-weight:bold; color:${badgeColor};">${v.statutChecking}</span>
                </div>
            </div>
        `;
    }).reverse().join('');
}

// ==========================================
// ROUTAGE INTERNE DES VUES RE-DÉVELOPPÉ SÉCURISÉ
// ==========================================
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const activeView = document.getElementById(`view-${viewId}`);
    if(activeView) activeView.style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') { updateSelects(); renderVisites(); }
    if(viewId === 'collecte') updateSelects();
    if(viewId === 'etat-lieux') renderEtatsLieuxList();
}

function resetNavStyles(element) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(element) element.classList.add('active');
}
