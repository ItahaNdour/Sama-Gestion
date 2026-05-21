// ================================================================
// SAMA GESTION PRO V6.2 - PROTECTION SÉCURITÉ DOUBLONS & WHATSAPP
// ================================================================

let profilRole = null;
let courtierNom = null;
let monAvatar = "💼";

let utilisateurs = [];
let biens = [];
let visites = [];
let comTotaleGlobal = 0;

let currentFilter = 'Disponible';
let selectedPhotos = [];

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
        utilisateurs = [];
        queryUsers.forEach(doc => utilisateurs.push(doc.data()));

        const queryBiens = await window.fsGetDocs(window.fsCollection(window.db, "biens"));
        biens = [];
        queryBiens.forEach(doc => biens.push(doc.data()));

        const queryVisites = await window.fsGetDocs(window.fsCollection(window.db, "visites"));
        visites = [];
        queryVisites.forEach(doc => visites.push(doc.data()));

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
    document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? '⚙️ Super Administrateur (Owner)' : `🏢 Espace Partenaire (${profilRole})`;
    
    const adminSection = document.getElementById('admin-management-section');
    if (profilRole === "SuperAdmin") {
        adminSection.style.display = 'block';
        renderAdminAgencesList();
    } else {
        adminSection.style.display = 'none';
    }
}

// FORMATTEUR STRICT WHATSAPP (Nettoie les +, les 00 et les espaces)
function formaterNumeroWhatsApp(num) {
    if(!num) return "";
    let propre = num.replace(/\D/g, ''); // Enlève tout ce qui n'est pas un chiffre
    
    // Si l'utilisateur commence par 00, on remplace par l'indicatif pur
    if(propre.startsWith('00')) propre = propre.substring(2);
    
    // Si le numéro fait 9 chiffres et commence par 7, c'est un numéro Sénégal sans indicatif, on ajoute 221
    if(propre.length === 9 && propre.startsWith('7')) propre = '221' + propre;
    
    return propre;
}

// ENVOYEUR UNIVERSEL WHATSAPP ACCÉLÉRÉ
function envoyerMessageWhatsApp(telephone, message) {
    const numeroPropre = formaterNumeroWhatsApp(telephone);
    if(!numeroPropre) {
        alert("⚠️ Aucun numéro valide configuré pour ce contact.");
        return;
    }
    const url = `https://wa.me/${numeroPropre}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// COMPRESSEUR DE PHOTOS ULTRA-RAPIDE EN BANDE PASSANTE
function previewAndCompressImage(input) {
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    // Création d'un mini-canvas pour redimensionner l'image à la volée
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const MAX_WIDTH = 400; // Format ultra-léger idéal pour mobile
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Transformation en texte compressé à 60% de sa taille d'origine
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    
                    if(selectedPhotos.length < 3) {
                        selectedPhotos.push(compressedBase64);
                        renderPreviews();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

function renderPreviews() {
    document.getElementById('previews-container').innerHTML = selectedPhotos.map(p => `<img src="${p}" style="width:40px;height:40px;border-radius:5px;object-fit:cover; border: 1px solid var(--border);">`).join('');
}

async function adminCreerCompteCourtier() {
    const emailCourtier = document.getElementById('admin-new-user-name').value.trim(); 
    const passCourtier = document.getElementById('admin-new-user-pin').value.trim();
    const roleChoisi = document.getElementById('admin-new-user-role').value;
    
    if(!emailCourtier.includes('@') || passCourtier.length < 6) {
        return alert("⚠️ Veuillez entrer un email valide et un mot de passe d'au moins 6 caractères.");
    }

    try {
        const uidPredictif = "user_" + Date.now();
        const nameNode = emailCourtier.split('@')[0];
        const avatarChoisi = roleChoisi === 'Agence' ? "🏢" : "💼";

        await window.fsSetDoc(window.fsDoc(window.db, "profils", uidPredictif), {
            uid: uidPredictif, username: nameNode, email: emailCourtier, password_clear_temp: passCourtier, role: roleChoisi, avatar: avatarChoisi
        });

        const lienMagique = `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(emailCourtier)}`;
        document.getElementById('admin-new-user-name').value = '';
        document.getElementById('admin-new-user-pin').value = '';
        
        await chargerDonneesCloud();
        renderAdminAgencesList();
        alert(`🎉 Compte [${roleChoisi}] pré-activé avec succès !\n\nLien rapide :\n${lienMagique}`);
    } catch (error) {
        alert("❌ Erreur lors de la configuration : " + error.message);
    }
}

function renderAdminAgencesList() {
    const conteneur = document.getElementById('admin-users-list');
    if(!conteneur) return;
    conteneur.innerHTML = utilisateurs.map(u => `
        <div style="display:flex; flex-direction:column; background:white; padding:12px; border-radius:10px; margin-bottom:8px; border:1px solid #e2e8f0; font-size:0.85rem; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>${u.avatar || '💼'} <b>${u.username}</b> (<small>${u.role}</small>)</span>
                ${u.role !== 'SuperAdmin' ? `<i class="fas fa-trash-alt" style="color:#EF4444; cursor:pointer;" onclick="adminSupprimerAgence('${u.uid}')"></i>` : '⭐ Principal'}
            </div>
            <div style="color: var(--text-light); font-size:0.75rem;">Email: ${u.email}</div>
            ${u.role !== 'SuperAdmin' ? `<button onclick="navigator.clipboard.writeText('${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(u.email)}'); alert('Lien copié !');" style="background:var(--gold-light); color:var(--gold); border:none; padding:4px 8px; border-radius:5px; font-size:0.7rem; font-weight:bold; cursor:pointer; width:fit-content; margin-top:4px;"><i class="fas fa-copy"></i> Copier le lien magique</button>` : ''}
        </div>
    `).join('');
}

async function adminSupprimerAgence(uid) {
    if(confirm(`Supprimer définitivement l'accès de ce membre ?`)) {
        await window.fsDeleteDoc(window.fsDoc(window.db, "profils", uid));
        await chargerDonneesCloud();
        renderAdminAgencesList();
    }
}

async function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const viewTarget = document.getElementById('view-' + id);
    if(viewTarget) viewTarget.style.display = 'block';
    
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

function ouvrirFormulaireAjout() { 
    document.getElementById('form-bien-title').innerText = "Nouveau Bien"; 
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
                <span style="color:var(--gold); font-weight:bold;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                <button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position: absolute; right: 0; bottom: 0; background: var(--gold-light); color: var(--gold); border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: pointer;"><i class="fas fa-wallet"></i> Suivi</button>
            </div>
        </div>`).reverse().join(''); 
}

function voirDetailBien(id) { 
    const b = biens.find(x => x.id === id); 
    const modal = document.getElementById('modal-bien'); 
    let cp = b.proprioTel ? `<div style="background:#f1f5f9; padding:8px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><div><small style="color:#64748b;">Propriétaire :</small><br><strong>${b.proprio}</strong></div><div><a href="tel:${b.proprioTel}" style="background:var(--gold); color:white; padding:5px 10px; border-radius:5px; text-decoration:none;"><i class="fas fa-phone"></i></a></div></div>` : ''; 
    document.getElementById('modal-body').innerHTML = `
        <h3 style="color:var(--dark); margin:0 0 5px 0;">${b.nom}</h3>
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
        <div style="background:var(--dark); color:white; padding:12px; border-radius:12px; text-align:center; margin-bottom:15px; border-bottom: 3px solid var(--gold);">
            <small style="color:var(--gold-light);">Cumul Encaissé</small>
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
    if(!b || !b.locataireTel) return alert("Pas de numéro de téléphone enregistré pour ce locataire.");
    const message = `*RAPPEL DE PAIEMENT SAMA GESTION*\n\nBonjour ${b.locataire}, nous vous rappelons amicalement que le terme de votre loyer pour le bien *${b.nom}* (${parseInt(b.loyer).toLocaleString()} CFA) est échu. Merci de régulariser dans les meilleurs délais.`;
    envoyerMessageWhatsApp(b.locataireTel, message);
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }
function filterBiens(s, e) { currentFilter = s; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); renderBiens(); }

async function saveBienPro() { 
    const nom = document.getElementById('new-bien-nom').value.trim(); 
    const loyer = document.getElementById('new-bien-loyer').value.trim(); 
    if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix."); 
    
    // Blocage préventif du bouton pour éviter la création en doublon
    const btn = document.getElementById('btn-save-bien');
    btn.disabled = true;
    btn.innerText = "⏳ Enregistrement Cloud...";

    const imageDefaut = ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"]; 
    const stringId = String(Date.now());

    const nouveauBien = { 
        id: Date.now(), agentCreateur: courtierNom, nom: nom, loyer: loyer, 
        type: document.getElementById('new-bien-type').value, 
        adresse: document.getElementById('new-bien-adresse').value || 'Non renseignée', 
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu', 
        proprioTel: document.getElementById('new-bien-proprio-tel').value || '', 
        locataire: 'Aucun', locataireTel: '', 
        com: document.getElementById('new-bien-com').value || "10%", 
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut, 
        statut: 'Disponible', historiquePaiements: [] 
    }; 
    
    await window.fsSetDoc(window.fsDoc(window.db, "biens", stringId), nouveauBien);
    await chargerDonneesCloud(); // Rafraîchissement propre du cache global
    await showView('biens'); 
}

async function toggleStatut(id) { 
    const b = biens.find(x => x.id === id);
    if(!b) return;

    if(b.statut === 'Disponible') { 
        b.locataire = prompt("Nom locataire:") || "Inconnu"; 
        b.locataireTel = prompt("Téléphone locataire (Ex: 771234567) :") || ""; 
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
    if(confirm("Supprimer ce bien définitivement du Cloud ?")) { 
        await window.fsDeleteDoc(window.fsDoc(window.db, "biens", String(id)));
        await chargerDonneesCloud();
        fermerModal(); 
        renderBiens(); 
    } 
}

function updateSelects() { const occ = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); const disp = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom)); document.getElementById('c-bien-select').innerHTML = occ.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); document.getElementById('p-bien-select').innerHTML = disp.map(b => `<option value="${b.nom}">${b.nom}</option>`).join(''); remplirLoyer(); }
function remplirLoyer() { const name = document.getElementById('c-bien-select').value; const type = document.getElementById('c-type').value; const b = biens.find(x => x.nom === name); if(b) { document.getElementById('c-montant').value = type === 'Caution' ? parseFloat(b.loyer)*3 : b.loyer; } }

async function validerCollecte(cible) { 
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
    
    await window.fsSetDoc(window.fsDoc(window.db, "biens", String(b.id)), b);
    await window.fsSetDoc(window.fsDoc(window.db, "config", "finance"), { comTotaleGlobal: comTotaleGlobal });
    await chargerDonneesCloud();
    
    let num = cible === 'locataire' ? b.locataireTel : b.proprioTel;
    let txt = `*REÇU DE PAIEMENT NUMÉRIQUE - SAMA GESTION*\n\nBien : ${b.nom}\nMontant versé : ${mt.toLocaleString()} CFA\nType de versement : ${type}\nMode de règlement : ${mode}\nDate : ${new Date().toLocaleDateString('fr-FR')}\n\nMerci pour votre confiance.`;
    
    envoyerMessageWhatsApp(num, txt);
    showView('dashboard'); 
}

async function sauverVisite() { 
    const nom = document.getElementById('p-name').value; 
    const tel = document.getElementById('p-tel').value; 
    const bien = document.getElementById('p-bien-select').value; 
    const date = document.getElementById('p-date').value; 
    if(!nom || !tel || !date || !bien) return alert("Remplissez tous les champs."); 
    
    const stringId = String(Date.now());
    const nouvelleVisite = { id: Date.now(), nom, tel, bien, date, statut: 'En attente', qualification: '', notes: '' };
    
    await window.fsSetDoc(window.fsDoc(window.db, "visites", stringId), nouvelleVisite);
    await chargerDonneesCloud();
    
    document.getElementById('p-name').value=''; 
    document.getElementById('p-tel').value=''; 
    await showView('planning'); 
}

async function demarrerVisite(id) { 
    const v = visites.find(x => x.id === id);
    if(!v) return;
    v.statut = 'En cours';
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(id)), v);
    await chargerDonneesCloud();
    renderVisites(); 
}

async function qualifierVisite(id, avis) { 
    const n = prompt("Notes de visite :"); 
    const v = visites.find(x => x.id === id);
    if(!v) return;
    v.statut = 'Terminé';
    v.qualification = avis;
    v.notes = n || '';
    
    await window.fsSetDoc(window.fsDoc(window.db, "visites", String(id)), v);
    await chargerDonneesCloud();
    renderVisites(); 
}

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
            
            <div style="margin-top:10px; display:flex; gap:15px; align-items:center;">
                <a href="tel:${v.tel}" style="color:#3498DB; font-size:0.9rem; text-decoration:none; font-weight:600;"><i class="fas fa-phone-alt"></i> Appeler</a>
                <span onclick="envoyerMessageWhatsApp('${v.tel}', 'Bonjour ${v.nom}, je reviens vers vous suite à notre rendez-vous programmé pour la visite du bien ${v.bien}.')" style="color:#2ECC71; font-size:0.9rem; cursor:pointer; font-weight:600;"><i class="fab fa-whatsapp"></i> Relancer</span>
            </div>

            ${v.notes ? `<div style="background:#f1f5f9; padding:5px; border-radius:5px; margin-top:5px; font-size:0.8rem;">📝 <i>${v.notes}</i></div>` : ''}
            
            <div style="margin-top:10px;">
                ${v.statut==='En attente' ? `<button class="btn-primary" style="padding:4px 8px; font-size:0.75rem; background:#2ECC71; width:auto;" onclick="demarrerVisite(${v.id})">Démarrer</button>` : ''}
                ${v.statut==='En cours' ? `<button style="background:#2ECC71; color:white; padding:4px 8px; font-size:0.75rem; border:none; border-radius:4px;" onclick="qualifierVisite(${v.id},'Chaud 🔥')">Intéressé</button> <button style="background:#E74C3C; color:white; padding:4px 8px; font-size:0.75rem; border:none; border-radius:4px;" onclick="qualifierVisite(${v.id},'Froid ❄️')">Pas chaud</button>` : ''}
            </div>
        </div>`;
    }).reverse().join(''); 
}
