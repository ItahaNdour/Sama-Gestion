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
                profilRole = "SuperAdmin"; courtierNom = "Direction Générale"; monAvatar = "👑";
                await window.fsSetDoc(window.fsDoc(window.db, "profils", user.uid), {
                    uid: user.uid, username: user.email.split('@')[0], fullname: "Direction Générale", role: "SuperAdmin", avatar: "👑", lienPaiement: "", email: user.email
                });
            }
            
            await chargerDonneesCloud();
            document.getElementById('login-screen').style.display = 'none';
            majInterfaceProfil();
            showView('dashboard');
        } else {
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
        
        verifierAlertesEcheances();
    } catch (e) { console.error(e); }
}

async function verifierConnexion() {
    const emailSaisi = document.getElementById('login-username').value.trim().toLowerCase();
    const passSaisi = document.getElementById('login-password').value.trim();
    try {
        const comptePartenaire = utilisateurs.find(u => u.email && u.email.toLowerCase() === emailSaisi && u.password_clear_temp === passSaisi);
        if (comptePartenaire) {
            profilRole = comptePartenaire.role; courtierNom = comptePartenaire.fullname; courtierEmail = comptePartenaire.email;
            document.getElementById('login-screen').style.display = 'none';
            majInterfaceProfil(); showView('dashboard'); return;
        }
        await window.fbSignIn(window.auth, emailSaisi, passSaisi);
    } catch (error) { alert("Erreur d'accès, veuillez vérifier vos identifiants."); }
}

function deconnexion() { window.fbSignOut(window.auth); document.getElementById('login-screen').style.display = 'flex'; }

function majInterfaceProfil() {
    document.getElementById('header-user-badge').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-statut-actuel').innerHTML = `${monAvatar} ${courtierNom}`;
    document.getElementById('profil-email-affichage').innerText = courtierEmail || "";
    document.getElementById('profil-role-badge').innerText = profilRole;
    if(document.getElementById('user-payment-link-champ')) document.getElementById('user-payment-link-champ').value = monLienPaiement;

    if (profilRole === "SuperAdmin") {
        document.getElementById('admin-management-section').style.display = 'block';
    }
}

async function sauvegarderLienPaiement(val) {
    monLienPaiement = val;
    const userTrouve = utilisateurs.find(u => u.fullname === courtierNom);
    if(userTrouve) await window.fsUpdateDoc(window.fsDoc(window.db, "profils", userTrouve.uid), { lienPaiement: val });
}

function envoyerMessageWhatsApp(telephone, message, inclurePaiement = false) {
    if(!telephone) telephone = "";
    let propre = telephone.replace(/\s+/g, '').replace(/[-+]/g, '');
    if (propre.length === 9 && propre.startsWith('7')) propre = '221' + propre;
    let signature = `\n\nCordiales salutations,\n*${courtierNom}*`;
    if(inclurePaiement && monLienPaiement) signature += `\n\nPaiement direct : ${monLienPaiement}`;
    window.location.href = `https://api.whatsapp.com/send?phone=${propre}&text=${encodeURIComponent(message + signature)}`;
}

// ==========================================
// ÉTAPE 5 : SCAN DES ALERTES DU MATIN EN LOCAL
// ==========================================
function verifierAlertesEcheances() {
    const conteneurBox = document.getElementById('morning-alerts-box');
    const conteneurListe = document.getElementById('morning-alerts-list');
    if(!conteneurBox || !conteneurListe) return;
    
    let alertesHtml = ""; 
    const aujourdhui = new Date();

    // 1. Alertes visites imminentes
    visites.forEach(v => {
        if(v.verrouille) return;
        const diff = new Date(v.date) - aujourdhui;
        const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if(jours === 0 || jours === 1) {
            const txtJour = jours === 0 ? "aujourd'hui" : "demain";
            alertesHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:6px; border-radius:6px; font-size:0.75rem; border:1px solid #FEB2B2;">
                    <span>⏳ Visite avec <b>${v.nom}</b> ${txtJour} (${v.bien}).</span>
                    <button style="width:auto; padding:2px 6px; font-size:0.65rem; background:#2ECC71; color:white;" onclick="envoyerMessageWhatsApp('${v.tel}', 'Bonjour ${v.nom}, je vous confirme notre RDV pour la visite du bien ${v.bien}. Merci de confirmer.')">💬 Rappel</button>
                </div>`;
        }
    });

    // 2. Alertes loyers à encaisser sous 3 jours
    biens.forEach(b => {
        if(b.statut === 'Occupé' && b.dateEntree) {
            const jourFacture = new Date(b.dateEntree).getDate();
            const jourActuel = aujourdhui.getDate();
            if(jourFacture - jourActuel <= 3 && jourFacture - jourActuel >= 0) {
                alertesHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:6px; border-radius:6px; font-size:0.75rem; border:1px solid #FEB2B2;">
                        <span>📅 Échéance Loyer dû le <b>${jourFacture} du mois</b> pour ${b.nom} (${b.locataire}).</span>
                        <button style="width:auto; padding:2px 6px; font-size:0.65rem; background:var(--gold); color:white;" onclick="envoyerMessageWhatsApp('${b.locataireTel}', 'Bonjour ${b.locataire}, nous vous rappelons que le loyer du bien ${b.nom} arrive à échéance.')">💵 Relancer</button>
                    </div>`;
            }
        }
    });

    if(alertesHtml !== "") { conteneurListe.innerHTML = alertesHtml; conteneurBox.style.display = 'block'; }
    else { conteneurBox.style.display = 'none'; }
}

function calculerProrataAutomatique() {
    const loyer = parseFloat(document.getElementById('new-bien-loyer').value);
    const dateStr = document.getElementById('edit-bien-date-entree').value;
    const box = document.getElementById('prorata-box');
    if(!loyer || !dateStr) return;
    const d = new Date(dateStr); const j = d.getDate(); const totalJours = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if(j === 1) { box.style.display = 'none'; return; }
    const dus = (totalJours - j) + 1; const montant = Math.round((loyer / totalJours) * dus);
    document.getElementById('prorata-result').innerHTML = `Prorata (${dus} jours) : <b>${montant.toLocaleString()} CFA</b>`;
    box.style.display = 'block';
}

function previewAndCompressImage(input, target) {
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                if(target === 'bien') { selectedPhotos.push(e.target.result); document.getElementById('previews-container').innerHTML = selectedPhotos.map(p => `<img src="${p}">`).join(''); }
                else { selectedPhotosEDL.push(e.target.result); document.getElementById('edl-previews-container').innerHTML = selectedPhotosEDL.map(p => `<img src="${p}">`).join(''); }
            };
            reader.readAsDataURL(file);
        });
    }
}

function ouvrirFormulaireAjout() {
    selectedPhotos = []; document.getElementById('edit-bien-id').value = '';
    document.getElementById('edit-only-fields').style.display = 'none';
    document.getElementById('prorata-box').style.display = 'none';
    document.getElementById('previews-container').innerHTML = '';
    document.getElementById('new-bien-nom').value = ''; document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-superficie').value = ''; document.getElementById('new-bien-adresse').value = '';
    document.getElementById('form-bien-title').innerText = "Nouveau Bien";
    showView('ajouter-bien');
}

async function saveBienPro() {
    const idExist = document.getElementById('edit-bien-id').value;
    const currentId = idExist ? parseInt(idExist) : Date.now();
    const snap = idExist ? biens.find(x => x.id === currentId) : null;

    const obj = {
        id: currentId, agentCreateur: snap ? snap.agentCreateur : courtierNom,
        nom: document.getElementById('new-bien-nom').value, loyer: document.getElementById('new-bien-loyer').value,
        type: document.getElementById('new-bien-type').value, superficie: document.getElementById('new-bien-superficie').value,
        typePapier: document.getElementById('new-bien-papier').value, adresse: document.getElementById('new-bien-adresse').value,
        proprio: document.getElementById('new-bien-proprio').value, proprioTel: document.getElementById('new-bien-proprio-tel').value,
        locataire: idExist ? document.getElementById('edit-bien-locataire').value : 'Aucun',
        locataireTel: idExist ? document.getElementById('edit-bien-locataire-tel').value : '',
        dateEntree: idExist ? document.getElementById('edit-bien-date-entree').value : '',
        com: document.getElementById('new-bien-com').value,
        statut: snap ? snap.statut : 'Disponible', photos: selectedPhotos.length > 0 ? selectedPhotos : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"],
        historiquePaiements: snap ? (snap.historiquePaiements || []) : []
    };
    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(currentId)), obj);
    await chargerDonneesCloud(); showView('biens');
}

function renderBiens() {
    const txt = document.getElementById('search-bien-input').value.toLowerCase();
    const target = biens.filter(b => b.statut === currentFilter && b.nom.toLowerCase().includes(txt));
    
    document.getElementById('biens-list').innerHTML = target.map(b => `
        <div class="form-card" onclick="voirDetailBien(${b.id})">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}">`).join('')}</div>
            <div style="position:relative; margin-top:4px;">
                <b>${b.nom}</b> ${b.superficie ? `[📐 ${b.superficie}]` : ''}<br>
                <span style="color:var(--gold); font-weight:700;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                <button onclick="event.stopPropagation(); partagerBienWhatsApp(${b.id})" style="position:absolute; right:0; bottom:0; width:auto; background:#2ECC71; color:white; padding:4px 8px; font-size:0.7rem; border-radius:4px;"><i class="fab fa-whatsapp"></i> Partager</button>
            </div>
        </div>
    `).reverse().join('');
}

function partagerBienWhatsApp(id) {
    const b = biens.find(x => x.id === id);
    const texte = `🔥 *BIEN DISPONIBLE* : ${b.nom}\n📍 *Quartier* : ${b.adresse}\n📐 *Superficie* : ${b.superficie || 'N/A'}\n📄 *Papier* : ${b.typePapier}\n💰 *Loyer/Prix* : ${parseInt(b.loyer).toLocaleString()} CFA\n\nContactez-moi pour visiter !`;
    envoyerMessageWhatsApp("", texte);
}

function filterBiens(s, e) { currentFilter = s; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); renderBiens(); }

function voirDetailBien(id) {
    const b = biens.find(x => x.id === id);
    document.getElementById('modal-body').innerHTML = `
        <h3>${b.nom}</h3>
        <p><b>Proprio:</b> ${b.proprio} (${b.proprioTel})</p>
        <p><b>Locataire:</b> ${b.locataire} (${b.locataireTel})</p>
        <div style="display:flex; gap:6px; margin-top:10px;">
            <button class="btn-primary" onclick="toggleStatut(${b.id})">Changer Statut</button>
            <button class="btn-outline" onclick="ouvrirModifierBien(${b.id})">Modifier</button>
        </div>
    `;
    document.getElementById('modal-bien').style.display = 'flex';
}

function ouvrirModifierBien(id) {
    const b = biens.find(x => x.id === id); fermerModal();
    document.getElementById('edit-bien-id').value = b.id;
    document.getElementById('new-bien-nom').value = b.nom; document.getElementById('new-bien-loyer').value = b.loyer;
    document.getElementById('new-bien-superficie').value = b.superficie || ''; document.getElementById('new-bien-papier').value = b.typePapier || 'Non spécifié';
    document.getElementById('new-bien-adresse').value = b.adresse; document.getElementById('new-bien-proprio').value = b.proprio; document.getElementById('new-bien-proprio-tel').value = b.proprioTel;
    document.getElementById('edit-only-fields').style.display = 'block';
    document.getElementById('edit-bien-locataire').value = b.locataire; document.getElementById('edit-bien-locataire-tel').value = b.locataireTel; document.getElementById('edit-bien-date-entree').value = b.dateEntree;
    document.getElementById('form-bien-title').innerText = "Modifier le Bien";
    showView('ajouter-bien');
}

async function toggleStatut(id) {
    const b = biens.find(x => x.id === id);
    b.statut = b.statut === 'Disponible' ? 'Occupé' : 'Disponible';
    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(id)), b); fermerModal(); await chargerDonneesCloud(); renderBiens();
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }

// ETATS DES LIEUX MODULE (ETL)
function ouvrirFormulaireEDL() {
    document.getElementById('edl-bien-select').innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('edl-rooms-container').innerHTML = ROOMS_CONFIG.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span>${r}</span><select class="room-state" data-r="${r}" style="width:auto; margin:0;"><option>✨ Neuf</option><option>✅ Bon</option><option>❌ Mauvais</option></select>
        </div>`).join('');
    showView('nouveau-edl');
}

async function saveEDLCloud() {
    const pieces = []; document.querySelectorAll('.room-state').forEach(s => pieces.push(`${s.getAttribute('data-r')}: ${s.value}`));
    const docEtl = {
        id: Date.now(), date: new Date().toLocaleDateString('fr-FR'), agent: courtierNom,
        bien: document.getElementById('edl-bien-select').value, type: document.getElementById('edl-type').value,
        details: pieces.join(' | '), eau: document.getElementById('edl-eau').value, elec: document.getElementById('edl-elec').value, notes: document.getElementById('edl-notes').value
    };
    await window.fsSetDoc(window.fsDoc(window.db, "etats_des_lieux", String(docEtl.id)), docEtl);
    await chargerDonneesCloud();
    envoyerMessageWhatsApp("", `*CONSTAT ETL (${docEtl.type})*\nBien: ${docEtl.bien}\nEau: ${docEtl.eau} | Elec: ${docEtl.elec}\nEtat: ${docEtl.details}`);
    showView('etat-lieux');
}

function renderEtatsLieuxList() {
    document.getElementById('edl-list').innerHTML = etatsLieux.map(e => `
        <div class="form-card">
            <b>${e.bien} (${e.type})</b> - ${e.date}<br>
            <small>${e.details}</small><br>
            <button style="width:auto; margin-top:6px; padding:4px 8px; background:#2ECC71; color:white; font-size:0.7rem;" onclick="envoyerMessageWhatsApp('', 'ETL ${e.bien}: ${e.details}')"><i class="fab fa-whatsapp"></i> Renvoyer</button>
        </div>
    `).reverse().join('');
}

// CAISSE / FLUX
function analyserReliquatComptable() {
    const n = document.getElementById('c-bien-select').value; const b = biens.find(x => x.nom === n);
    if(!b) return; document.getElementById('c-montant').value = b.loyer;
}

function updateSelects() {
    document.getElementById('c-bien-select').innerHTML = biens.filter(x => x.statut==='Occupé').map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('p-bien-select').innerHTML = biens.filter(x => x.statut==='Disponible').map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    analyserReliquatComptable();
}

async function validerCollecte() {
    const n = document.getElementById('c-bien-select').value; const b = biens.find(x => x.nom === n); const mt = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value;
    b.historiquePaiements.push({ montant: mt, type: type, date: new Date().toLocaleDateString('fr-FR') });
    
    if(type === 'Caution') comTotaleGlobal += parseFloat(b.loyer);
    else comTotaleGlobal += (parseFloat(b.loyer) * 0.1);

    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(b.id)), b);
    await window.fsSetDoc(window.fsDoc(window.db, "config", "finance"), { comTotaleGlobal: comTotaleGlobal });
    await chargerDonneesCloud();
    envoyerMessageWhatsApp(b.locataireTel, `Reçu de paiement : ${mt} CFA encaissé pour le ${type} du bien ${b.nom}. Merci !`, true);
    showView('dashboard');
}

// ==========================================
// CONFIGURATION COMPLÈTE MODULE : VISITES
// ==========================================
async function sauverVisite() {
    const struct = {
        id: Date.now(), 
        nom: document.getElementById('p-name').value, 
        tel: document.getElementById('p-tel').value,
        bien: document.getElementById('p-bien-select').value, 
        date: document.getElementById('p-date').value,
        notesPerso: document.getElementById('p-notes-libre') ? document.getElementById('p-notes-libre').value : "",
        statutChecking: "Planifié", 
        qualification: "Non qualifié", 
        verrouille: false
    };
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(struct.id)), struct);
    
    document.getElementById('p-name').value = "";
    document.getElementById('p-tel').value = "";
    if(document.getElementById('p-notes-libre')) document.getElementById('p-notes-libre').value = "";
    
    await chargerDonneesCloud(); 
    renderVisites();
}

function renderVisites() {
    document.getElementById('visites-list').innerHTML = visites.map(v => {
        const estVerrouille = v.verrouille === true;
        return `
        <div class="form-card" style="position:relative;">
            <button onclick="supprimerVisiteCloud(${v.id})" style="position:absolute; right:10px; top:10px; width:auto; background:transparent; color:var(--red); padding:0; font-size:0.9rem;">
                <i class="fas fa-trash-alt"></i>
            </button>

            <b>${v.nom}</b> - ${v.bien}<br>
            <small>📅 ${new Date(v.date).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'})}</small>
            
            ${v.notesPerso ? `<div style="background:var(--bg); padding:4px; border-radius:4px; font-size:0.7rem; margin:4px 0; color:var(--text-light);">📝 <i>${v.notesPerso}</i></div>` : ''}

            <div style="margin-top:6px; display:flex; gap:4px; align-items:center;">
                <select id="chk-${v.id}" ${estVerrouille ? 'disabled' : ''} style="margin:0; padding:4px; font-size:0.7rem; width:auto;">
                    <option ${v.statutChecking==='Planifié'?'selected':''}>Planifié</option>
                    <option ${v.statutChecking==='Honoré'?'selected':''}>Honoré</option>
                    <option ${v.statutChecking==='Absent'?'selected':''}>Absent</option>
                </select>
                <select id="qalf-${v.id}" ${estVerrouille ? 'disabled' : ''} style="margin:0; padding:4px; font-size:0.7rem; width:auto;">
                    <option ${v.qualification==='Non qualifié'?'selected':''}>Non qualifié</option>
                    <option ${v.qualification==='Client Sérieux'?'selected':''}>Client Sérieux</option>
                </select>
                ${estVerrouille ? '🔒' : `<button style="width:auto; padding:4px 8px; background:var(--dark); color:white; font-size:0.7rem;" onclick="validerPointageVisite(${v.id})">OK</button>`}
            </div>
        </div>`;
    }).reverse().join('');
}

async function supprimerVisiteCloud(id) {
    if(confirm("Supprimer définitivement ce rendez-vous ?")) {
        await window.fsDeleteDoc(window.fsDoc(window.db, "visites", String(id)));
        await chargerDonneesCloud();
        renderVisites();
    }
}

async function validerPointageVisite(id) {
    const v = visites.find(x => x.id === id);
    v.statutChecking = document.getElementById(`chk-${id}`).value;
    v.qualification = document.getElementById(`qalf-${id}`).value;
    v.verrouille = true;
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(id)), v); await chargerDonneesCloud(); renderVisites();
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + id).style.display = 'block';
    if(id === 'dashboard') document.getElementById('total-display').innerText = comTotaleGlobal.toLocaleString() + " CFA";
    if(id === 'biens') renderBiens();
    if(id === 'etat-lieux') renderEtatsLieuxList();
    if(id === 'collecte') updateSelects();
    if(id === 'planning') { updateSelects(); renderVisites(); }
}

function resetNavStyles(el) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }
function adminCreerCompteCourtier() {}
