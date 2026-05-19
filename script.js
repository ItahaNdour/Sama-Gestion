// Sama Gestion Pro v3 - Core Engine avec Authentification par PIN & Cloisonnement
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let comTotaleGlobal = parseFloat(localStorage.getItem('sama_com_global')) || 0; 

// Variables d'état de session (récupérées uniquement si déjà loggé)
let profilRole = localStorage.getItem('sama_profil-role') || null; 
let courtierNom = localStorage.getItem('sama_courtier_nom') || null;
let currentFilter = 'Disponible';
let selectedPhotos = [];

// --- LOGIQUE D'AUTHENTIFICATION PROFESSIONNELLE ---
window.onload = () => {
    verifierSessionActive();
};

function verifierSessionActive() {
    const loginScreen = document.getElementById('login-screen');
    if (profilRole && courtierNom) {
        // Session existante trouvée dans le téléphone
        loginScreen.style.display = 'none';
        majInterfaceBadge();
        showView('dashboard');
    } else {
        // Pas de session, on force l'affichage du login
        loginScreen.style.display = 'flex';
    }
}

function verifierConnexion() {
    const nomInput = document.getElementById('login-username').value.trim();
    const pinInput = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    errorMsg.style.display = 'none';

    if (!nomInput) {
        errorMsg.innerText = "⚠️ Veuillez entrer votre nom.";
        errorMsg.style.display = 'block';
        return;
    }

    // BASE DE SÉCURITÉ : CONFIGURATION DES CODES PIN
    if (pinInput === "0000") {
        // Code Super Admin (Le Boss)
        profilRole = "SuperAdmin";
        courtierNom = nomInput;
    } else if (pinInput === "1111") {
        // Code Équipe / Agents (Courtier)
        profilRole = "Courtier";
        courtierNom = nomInput;
    } else {
        errorMsg.innerText = "❌ Code PIN incorrect !";
        errorMsg.style.display = 'block';
        return;
    }

    // Sauvegarde de la session dans le LocalStorage du téléphone
    localStorage.setItem('sama_profil-role', profilRole);
    localStorage.setItem('sama_courtier_nom', courtierNom);

    // Effacer les inputs de connexion pour la sécurité
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';

    // Cacher l'écran de login et démarrer l'appli
    document.getElementById('login-screen').style.display = 'none';
    majInterfaceBadge();
    showView('dashboard');
}

function deconnexion() {
    localStorage.removeItem('sama_profil-role');
    localStorage.removeItem('sama_courtier_nom');
    profilRole = null;
    courtierNom = null;
    
    // Réinitialisation visuelle et retour au Login
    document.getElementById('login-screen').style.display = 'flex';
}

function majInterfaceBadge() {
    if (document.getElementById('header-user-badge')) {
        document.getElementById('header-user-badge').innerHTML = `<i class="fas fa-user-circle"></i> ${courtierNom} (${profilRole === 'SuperAdmin' ? 'Admin' : 'Agent'})`;
    }
    if (document.getElementById('profil-statut-actuel')) {
        document.getElementById('profil-statut-actuel').innerText = courtierNom;
        document.getElementById('profil-role-badge').innerText = profilRole === 'SuperAdmin' ? 'Super Admin (Accès Total Agency)' : 'Courtier (Accès Restreint Perso)';
    }
}

function showView(id) {
    // Sécurité de routage : Si pas de session, retour au login direct
    if (!profilRole || !courtierNom) return verifierSessionActive();

    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + id).style.display = 'block';
    
    rafraichirCompteurCommission();
    
    if(id === 'biens') { document.getElementById('search-bien-input').value = ''; renderBiens(); }
    if(id === 'collecte') updateSelects();
    if(id === 'planning') { updateSelects(); renderVisites(); }
}

// --- COMPTEURS FINANCIERS CLOISONNÉS ---
function rafraichirCompteurCommission() {
    if (!profilRole) return;
    
    if (profilRole === "SuperAdmin") {
        document.getElementById('total-display').innerText = comTotaleGlobal.toLocaleString() + " CFA";
        document.querySelector('.revenue-card p').innerText = "Commission Totale Agence";
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
        document.querySelector('.revenue-card p').innerText = `Ma Commission Encaissée`;
    }
}

// --- GESTION DES IMAGES ---
function previewImage(input) {
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => { 
                if(selectedPhotos.length < 3) {
                    selectedPhotos.push(e.target.result); 
                    renderPreviews(); 
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

function renderPreviews() {
    document.getElementById('previews-container').innerHTML = selectedPhotos.map(p => 
        `<img src="${p}" style="width:40px;height:40px;border-radius:5px;object-fit:cover;">`
    ).join('');
}

// --- ACTIONS DU CATALOGUE BIENS ---
function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix.");
    
    const imageDefaut = ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"];
    const nomLocataire = document.getElementById('new-bien-locataire').value;
    const statutInitial = nomLocataire.trim() !== "" ? "Occupé" : "Disponible";

    const nouveauBien = {
        id: Date.now(),
        agentCreateur: courtierNom, 
        nom: nom,
        loyer: loyer,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value || 'Non renseignée',
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu',
        proprioTel: document.getElementById('new-bien-proprio-tel').value || '',
        locataire: nomLocataire || 'Aucun',
        locataireTel: document.getElementById('new-bien-locataire-tel').value || '',
        com: document.getElementById('new-bien-com').value || "10%",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut,
        statut: statutInitial,
        reliquat: 0,
        historiquePaiements: []
    };
    
    try {
        biens.push(nouveauBien);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
    } catch (e) {
        biens.pop();
        nouveauBien.photos = imageDefaut;
        biens.push(nouveauBien);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        alert("Bien enregistré ! (Photos optimisées)");
    }
    
    selectedPhotos = [];
    document.getElementById('previews-container').innerHTML = '';
    document.getElementById('new-bien-nom').value = '';
    document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-adresse').value = '';
    document.getElementById('new-bien-proprio').value = '';
    document.getElementById('new-bien-proprio-tel').value = '';
    document.getElementById('new-bien-locataire').value = '';
    document.getElementById('new-bien-locataire-tel').value = '';
    
    showView('biens');
}

function renderBiens() {
    const searchText = document.getElementById('search-bien-input').value.toLowerCase();
    
    const filtered = biens.filter(b => {
        const correspondAuFiltreTextuel = 
            b.nom.toLowerCase().includes(searchText) || 
            b.adresse.toLowerCase().includes(searchText) || 
            b.type.toLowerCase().includes(searchText) ||
            b.proprio.toLowerCase().includes(searchText);
            
        const correspondAuStatutOnglet = b.statut === currentFilter;

        if (profilRole === "SuperAdmin") {
            return correspondAuStatutOnglet && correspondAuFiltreTextuel;
        } else {
            return correspondAuStatutOnglet && correspondAuFiltreTextuel && (b.agentCreateur === courtierNom);
        }
    });

    document.getElementById('biens-list').innerHTML = filtered.map(b => `
        <div class="form-card" onclick="voirDetailBien(${b.id})">
            <div class="bien-gallery">${b.photos.map(p => `<img src="${p}">`).join('')}</div>
            <div style="margin-top:10px; position: relative;">
                <strong>${b.nom}</strong><br><small><i class="fas fa-map-marker-alt"></i> ${b.adresse}</small><br>
                <span style="color:var(--blue); font-weight:bold;">${parseInt(b.loyer).toLocaleString()} CFA</span>
                ${b.reliquat > 0 ? `<br><span style="color:var(--red); font-size:0.8rem; font-weight:bold;">⚠️ Reste : ${b.reliquat.toLocaleString()} CFA</span>` : ''}
                
                <button onclick="event.stopPropagation(); ouvrirPortefeuille(${b.id})" style="position: absolute; right: 0; bottom: 0; background: #E0E7FF; color: var(--blue); border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
                    <i class="fas fa-wallet"></i> Suivi
                </button>
            </div>
        </div>
    `).reverse().join('');
}

function voirDetailBien(id) {
    const b = biens.find(x => x.id === id);
    const modal = document.getElementById('modal-bien');
    
    let contactProprioHTML = `<p><strong>Propriétaire:</strong> ${b.proprio}</p>`;
    if(b.proprioTel) {
        contactProprioHTML = `
            <div style="background:#f1f5f9; padding:8px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <div><small style="color:#64748b;">Propriétaire :</small><br><strong>${b.proprio}</strong></div>
                <div style="display:flex; gap:6px;">
                    <a href="tel:${b.proprioTel}" style="background:#3498DB; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${b.proprioTel.replace(/\s+/g, '')}" target="_blank" style="background:#2ECC71; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
        `;
    }

    let contactLocataireHTML = '';
    if(b.statut === 'Occupé') {
        contactLocataireHTML = `
            <div style="background:#e0f2fe; padding:8px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <div><small style="color:#0369a1;">Locataire actuel :</small><br><strong>${b.locataire || 'Inconnu'}</strong></div>
                ${b.locataireTel ? `
                <div style="display:flex; gap:6px;">
                    <a href="tel:${b.locataireTel}" style="background:#3498DB; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fas fa-phone"></i></a>
                    <a href="https://wa.me/${b.locataireTel.replace(/\s+/g, '')}" target="_blank" style="background:#2ECC71; color:white; width:32px; height:32px; border-radius:5px; display:flex; align-items:center; justify-content:center; text-decoration:none;"><i class="fab fa-whatsapp"></i></a>
                </div>` : '<span style="font-size:0.75rem; color:#0369a1;">Pas de numéro</span>'}
            </div>
        `;
    }

    document.getElementById('modal-body').innerHTML = `
        <h3 style="color:var(--blue); margin-top:0; margin-bottom:5px;">${b.nom}</h3>
        <p style="margin:0 0 10px 0; font-size:0.85rem; color:#64748b;"><i class="fas fa-map-marker-alt"></i> ${b.adresse} (${b.type})</p>
        <p style="margin:5px 0;"><strong>Loyer:</strong> ${parseInt(b.loyer).toLocaleString()} CFA / mois</p>
        <p style="margin:5px 0;"><strong>Ma Commission:</strong> ${b.com}</p>
        <p style="margin:5px 0;"><strong>Statut actuel:</strong> <span style="font-weight:bold; color:${b.statut === 'Disponible' ? '#2ECC71':'#E74C3C'}">${b.statut}</span></p>
        <small style="color:#64748b;">Enregistré par : ${b.agentCreateur || 'Inconnu'}</small>
        ${b.reliquat > 0 ? `<p style="color:var(--red); margin:5px 0;"><strong>Reste dû :</strong> ${b.reliquat.toLocaleString()} CFA</p>` : ''}
        
        <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
        ${contactProprioHTML}
        ${contactLocataireHTML}
        <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
        
        <button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut === 'Disponible' ? 'Marquer comme Loué' : 'Libérer le bien'}</button>
        <button class="btn-outline" style="background:#F0F4FF; color:var(--blue); margin-top:8px;" onclick="ouvrirPortefeuille(${b.id})"><i class="fas fa-wallet"></i> Portefeuille Financier</button>
        ${b.reliquat > 0 ? `<button class="btn-outline" style="background:#FFE5E5; color:var(--red); margin-top:8px;" onclick="envoyerRelance('${b.nom}', ${b.reliquat})"><i class="fab fa-whatsapp"></i> Relancer Reste à Payer</button>` : ''}
        <button class="btn-outline" style="color:var(--red); margin-top:8px;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer le bien</button>
        <button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>
    `;
    modal.style.display = 'flex';
}

function ouvrirPortefeuille(id) {
    const b = biens.find(x => x.id === id);
    if (!b.historiquePaiements) b.historiquePaiements = [];
    const totalEncaisseBien = b.historiquePaiements.reduce((sum, p) => sum + p.montant, 0);
    const modal = document.getElementById('modal-bien');
    
    let historiqueHTML = `<p style="color:#64748b; font-size:0.9rem; text-align:center;">Aucun versement enregistré.</p>`;
    if (b.historiquePaiements.length > 0) {
        historiqueHTML = b.historiquePaiements.map(p => `
            <div style="display:flex; justify-content:between; align-items:center; background:#f8fafc; padding:10px; border-radius:10px; margin-bottom:8px; border-left:4px solid var(--green);">
                <div style="flex:1; text-align:left;">
                    <strong style="font-size:0.85rem;">${p.type}</strong><br>
                    <small style="color:#64748b;">${p.date} (${p.mode})</small>
                </div>
                <div style="text-align:right; font-weight:bold; color:var(--navy); font-size:0.9rem;">
                    + ${p.montant.toLocaleString()} CFA
                </div>
            </div>
        `).reverse().join('');
    }

    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--navy); margin:0;"><i class="fas fa-wallet" style="color:var(--blue);"></i> Portefeuille</h3>
            <span style="font-size:0.8rem; background:#E0E7FF; color:var(--blue); padding:4px 8px; border-radius:20px; font-weight:bold;">${b.nom}</span>
        </div>
        <div style="background:linear-gradient(135deg, #4A69FF, #324BDB); color:white; padding:15px; border-radius:18px; text-align:center; margin-bottom:15px;">
            <small style="opacity:0.8; font-size:0.75rem;">Total encaissé sur ce bien</small>
            <h2 style="margin:5px 0 0 0; font-size:1.4rem;">${totalEncaisseBien.toLocaleString()} CFA</h2>
            ${b.reliquat > 0 ? `<div style="background:rgba(255,74,74,0.2); color:#FF8E8E; font-size:0.75rem; font-weight:bold; padding:4px; border-radius:8px; margin-top:8px;">⚠️ Reste dû : ${b.reliquat.toLocaleString()} CFA</div>` : ''}
        </div>
        <h4 style="text-align:left; margin:10px 0; color:var(--navy); font-size:0.9rem;"><i class="fas fa-history"></i> Historique</h4>
        <div style="max-height:180px; overflow-y:auto; margin-bottom:15px;">
            ${historiqueHTML}
        </div>
        <button class="btn-primary" onclick="voirDetailBien(${b.id})"><i class="fas fa-arrow-left"></i> Retour</button>
        <button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>
    `;
    modal.style.display = 'flex';
}

function fermerModal() { document.getElementById('modal-bien').style.display = 'none'; }
function filterBiens(s, e) {
    currentFilter = s;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

function toggleStatut(id) {
    biens = biens.map(b => { 
        if(b.id === id) {
            if(b.statut === 'Disponible') {
                const loc = prompt("Nom du locataire entrant :", b.locataire !== 'Aucun' ? b.locataire : "");
                const tel = prompt("Numéro de téléphone du locataire :", b.locataireTel || "");
                b.locataire = loc || "Inconnu";
                b.locataireTel = tel || "";
                b.statut = 'Occupé';
            } else {
                if(confirm("Confirmer la libération de ce bien ?")) b.statut = 'Disponible';
            }
        }
        return b; 
    });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    fermerModal(); 
    renderBiens();
}

function supprimerBien(id) {
    if(confirm("Supprimer définitivement ce bien ?")) {
        biens = biens.filter(x => x.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        fermerModal(); 
        renderBiens();
    }
}

// --- LOGIQUE DES FLUX DE COLLECTE ---
function updateSelects() {
    const occupes = biens.filter(b => b.statut === 'Occupé' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom));
    const disponibles = biens.filter(b => b.statut === 'Disponible' && (profilRole === "SuperAdmin" || b.agentCreateur === courtierNom));
    
    document.getElementById('c-bien-select').innerHTML = occupes.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('p-bien-select').innerHTML = disponibles.length > 0 
        ? disponibles.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('')
        : `<option value="">Aucun bien disponible</option>`;
        
    remplirLoyer();
}

function remplirLoyer() {
    const bienNom = document.getElementById('c-bien-select').value;
    const typeSelect = document.getElementById('c-type').value;
    const b = biens.find(x => x.nom === bienNom);
    const alerteDette = document.getElementById('alerte-dette-collecte');
    if(alerteDette) alerteDette.innerHTML = '';

    if(b) {
        if(b.reliquat > 0 && alerteDette) {
            alerteDette.innerHTML = `<div style="background:#FFE5E5; color:var(--red); padding:10px; border-radius:12px; margin-bottom:10px; font-size:0.8rem; font-weight:bold; text-align:center;"><i class="fas fa-exclamation-triangle"></i> Attention : Reste dû précédent de ${b.reliquat.toLocaleString()} CFA non réglé !</div>`;
        }
        if(typeSelect === 'Caution') document.getElementById('c-montant').value = parseFloat(b.loyer) * 3;
        else if(typeSelect === 'Frais') document.getElementById('c-montant').value = ''; 
        else document.getElementById('c-montant').value = b.loyer;
    }
}

function executerSauvegardeFinanciere() {
    const bienNom = document.getElementById('c-bien-select').value;
    const montantPaye = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value;
    const mode = document.querySelector('input[name="pay-mode"]:checked').value;
    
    if(!bienNom || isNaN(montantPaye)) { alert("Sélectionnez un bien et un montant valide."); return null; }

    const bienIndex = biens.findIndex(b => b.nom === bienNom);
    if(bienIndex === -1) return null;
    const bien = biens[bienIndex];

    let loyerTheorique = parseFloat(bien.loyer);
    let attendu = (type === 'Caution') ? loyerTheorique * 3 : loyerTheorique;
    let reliquat = 0;

    if(type !== 'Frais' && montantPaye < attendu) {
        reliquat = attendu - montantPaye;
        biens[bienIndex].reliquat = reliquat;
    } else if (type !== 'Frais') {
        biens[bienIndex].reliquat = 0;
    }

    if (!biens[bienIndex].historiquePaiements) biens[bienIndex].historiquePaiements = [];
    
    const dateAujourdhui = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    biens[bienIndex].historiquePaiements.push({
        id: Date.now(),
        type: type === 'Loyer' ? `Loyer Mois` : type,
        montant: montantPaye,
        mode: mode,
        date: dateAujourdhui
    });

    localStorage.setItem('sama_biens', JSON.stringify(biens));

    let maCom = 0;
    if(type === 'Caution') maCom = loyerTheorique; 
    else if(type === 'Loyer') maCom = bien.com.includes('%') ? (parseFloat(bien.com)/100) * montantPaye : parseFloat(bien.com);
    else maCom = montantPaye;

    comTotaleGlobal += maCom;
    localStorage.setItem('sama_com_global', comTotaleGlobal);
    rafraichirCompteurCommission();

    return { bien, montantPaye, type, mode, reliquat, maCom };
}

function validerCollecte() {
    const data = executerSauvegardeFinanciere();
    if(!data) return;

    let msg = `*REÇU DE PAIEMENT OFFICIEL*%0A*SAMA GESTION IMMOBILIÈRE*%0A-------------------------------------%0A🏠 *Bien concerné:* ${data.bien.nom}%0A💰 *Montant encaissé:* ${data.montantPaye.toLocaleString()} CFA%0A📝 *Nature du paiement:* ${data.type}%0A💳 *Mode de règlement:* ${data.mode}%0A`;
    if(data.reliquat > 0) msg += `⚠️ *RESTE À PAYER SUR LE MOIS:* ${data.reliquat.toLocaleString()} CFA%0A`;
    msg += `📅 *Date de valeur:* ${new Date().toLocaleDateString()}%0A-------------------------------------%0A• *Agent émetteur :* _${courtierNom}_%0A_Merci pour votre confiance._`;

    window.open(`https://wa.me/${data.bien.locataireTel ? data.bien.locataireTel.replace(/\s+/g, '') : ''}?text=${msg}`, '_blank');
    showView('dashboard');
}

function validerReçuProprio() {
    const data = executerSauvegardeFinanciere();
    if(!data) return;

    let netProprio = data.montantPaye - data.maCom;
    let msg = `*COMPTE-RENDU D'ENCAISSEMENT PROPRIO*%0A*SAMA GESTION IMMOBILIÈRE*%0A-------------------------------------%0A🏠 *Bien :* ${data.bien.nom}%0A👤 *Locataire :* ${data.bien.locataire}%0A💰 *Loyer Perçu :* ${data.montantPaye.toLocaleString()} CFA%0A📝 *Type :* ${data.type}%0A💳 *Mode :* ${data.mode}%0A`;
    if(data.reliquat > 0) msg += `⚠️ *Reste dû locataire :* ${data.reliquat.toLocaleString()} CFA%0A`;
    msg += `-------------------------------------%0A📊 *Frais de gestion / Com (${data.bien.com}) :* - ${data.maCom.toLocaleString()} CFA%0A💵 *NET À VOUS REVERSER :* *${netProprio.toLocaleString()} CFA*%0A-------------------------------------%0A📅 *Date d'opération :* ${new Date().toLocaleDateString()}%0A• *Gestionnaire :* _${courtierNom}_`;

    window.open(`https://wa.me/${data.bien.proprioTel ? data.bien.proprioTel.replace(/\s+/g, '') : ''}?text=${msg}`, '_blank');
    showView('dashboard');
}

function partagerLienPaiement() {
    const bienNom = document.getElementById('c-bien-select').value;
    const montant = document.getElementById('c-montant').value;
    if(!bienNom || !montant) return alert("Sélectionnez un bien et un montant d'abord.");
    
    const msg = `*SAMA GESTION - DEMANDE DE PAIEMENT*%0A--------------------------------------%0APour le règlement du bien *${bienNom}*%0A💰 *Montant attendu :* ${parseInt(montant).toLocaleString()} CFA%0A%0AMerci de faire le dépôt via nos canaux sécurisés :%0A📲 *WAVE / OM :* 77 XXX XX XX%0A--------------------------------------%0A_Veuillez envoyer la capture d'écran après transfert._%0A• _Cordialement, ${courtierNom}_`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function envoyerRelance(bienNom, reste) {
    const bien = biens.find(x => x.nom === bienNom);
    const msg = `*RAPPEL DE PAIEMENT - SAMA GESTION*%0A------------------------------%0ABonjour,%0ASauf erreur de notre part, le paiement pour le bien *${bienNom}* est incomplet.%0A*Reste à régler : ${parseInt(reste).toLocaleString()} CFA*%0A%0AMerci de régulariser dès que possible.%0A------------------------------%0A• _${courtierNom}_`;
    window.open(`https://wa.me/${(bien && bien.locataireTel) ? bien.locataireTel.replace(/\s+/g, '') : ''}?text=${msg}`, '_blank');
}

// --- LOGIQUE SÉCURISÉE DES VISITES ---
function sauverVisite() {
    const nom = document.getElementById('p-name').value;
    const bien = document.getElementById('p-bien-select').value;
    const date = document.getElementById('p-date').value;
    
    if(!nom || !date || !bien) return alert("Veuillez choisir un prospect, une date et un bien disponible.");

    visites.push({ id: Date.now(), nom, bien, date, statut: 'En attente', qualification: '' });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('p-name').value = '';
    document.getElementById('p-date').value = '';
    renderVisites();
}

function demarrerVisite(id) {
    visites = visites.map(v => { if(v.id === id) v.statut = 'En cours'; return v; });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function qualifierVisite(id, avis) {
    visites = visites.map(v => { if(v.id === id) { v.statut = 'Terminé'; v.qualification = avis; } return v; });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const maintenant = new Date();
    const visitesFiltrees = visites.filter(v => {
        if (profilRole === "SuperAdmin") return true;
        const leBien = biens.find(b => b.nom === v.bien);
        return leBien && leBien.agentCreateur === courtierNom;
    });
    
    document.getElementById('visites-list').innerHTML = visitesFiltrees.map(v => {
        const dateVisite = new Date(v.date);
        const dateFormatee = v.date.replace('T', ' à ');
        const aujourdhuiMinuit = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
        const visiteMinuit = new Date(dateVisite.getFullYear(), dateVisite.getMonth(), dateVisite.getDate());
        
        const estFutur = visiteMinuit > aujourdhuiMinuit;
        const opaciteStyle = estFutur ? 'opacity: 0.6; border-left: 4px solid #cbd5e1; background: #f8fafc;' : 'border-left: 4px solid var(--blue);';
        
        let badgeQualif = '';
        if(v.qualification === 'Chaud') badgeQualif = `<span style="background:#FFEBEB; color:#E74C3C; font-size:0.75rem; font-weight:bold; padding:4px 8px; border-radius:10px; margin-left:10px;"><i class="fas fa-fire"></i> Chaud</span>`;
        if(v.qualification === 'Froid') badgeQualif = `<span style="background:#EBF3FF; color:#3498DB; font-size:0.75rem; font-weight:bold; padding:4px 8px; border-radius:10px; margin-left:10px;"><i class="fas fa-snowflake"></i> Froid</span>`;

        let boutonsAction = '';
        if(v.statut === 'En attente') {
            if (estFutur) {
                boutonsAction = `<button class="btn-primary" style="padding: 8px; font-size: 0.8rem; margin-top:10px; background:#94a3b8; cursor:not-allowed;" disabled><i class="fas fa-lock"></i> Bloqué (Prévu le ${dateVisite.toLocaleDateString()})</button>
                <button class="btn-outline" style="padding: 8px; font-size: 0.8rem; margin-top:5px; background:white; color:var(--blue); border:1px solid var(--blue);" onclick="window.open('https://wa.me/?text=Bonjour ${v.nom}, je vous rappelle notre rendez-vous pour la visite du bien ${v.bien} le ${dateFormatee}.','_blank')"><i class="fab fa-whatsapp"></i> Rappel RDV</button>`;
            } else {
                boutonsAction = `<button class="btn-primary" style="padding: 8px; font-size: 0.8rem; margin-top:10px; background:#2ECC71;" onclick="demarrerVisite(${v.id})"><i class="fas fa-play"></i> Démarrer la visite</button>
                <button class="btn-outline" style="padding: 8px; font-size: 0.8rem; margin-top:5px; background:white; color:var(--blue); border:1px solid var(--blue);" onclick="window.open('https://wa.me/?text=Bonjour ${v.nom}, je vous rappelle notre rendez-vous pour la visite du bien ${v.bien} le ${dateFormatee}.','_blank')"><i class="fab fa-whatsapp"></i> Rappel RDV</button>`;
            }
        } else if(v.statut === 'En cours') {
            boutonsAction = `<div style="margin-top:10px;"><p style="margin:5px 0; font-size:0.8rem; font-weight:bold; color:var(--navy);">Qualifier :</p>
            <div style="display:flex; gap:10px;"><button class="btn-primary" style="background:#E74C3C; padding:8px; flex:1; font-size:0.8rem;" onclick="qualifierVisite(${v.id}, 'Chaud')"><i class="fas fa-fire"></i> Intéressé</button>
            <button class="btn-primary" style="background:#3498DB; padding:8px; flex:1; font-size:0.8rem;" onclick="qualifierVisite(${v.id}, 'Froid')"><i class="fas fa-snowflake"></i> Pas chaud</button></div></div>`;
        } else {
            boutonsAction = `<p style="color:#2ECC71; font-size:0.8rem; font-weight:bold; margin:8px 0 0 0;"><i class="fas fa-check-circle"></i> Visite clôturée</p>`;
        }

        return `<div class="form-card" style="${opaciteStyle}"><div style="display:flex; justify-content:space-between; align-items:center;"><strong><i class="fas fa-user"></i> ${v.nom}</strong>${badgeQualif}</div><small>Bien : <strong>${v.bien}</strong></small><br>Rendez-vous : ${dateFormatee}${boutonsAction}</div>`;
    }).reverse().join('');
}
