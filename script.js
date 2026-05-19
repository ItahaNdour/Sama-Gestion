// Sama Gestion Pro v3 - Portefeuille & Historique financier intégrés
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let comTotale = parseFloat(localStorage.getItem('sama_com_totale')) || 0;
let currentFilter = 'Disponible';
let selectedPhotos = [];
let courtierNom = localStorage.getItem('sama_courtier_nom') || "Votre Courtier";

// Chargement initial du compteur global
document.getElementById('total-display').innerText = comTotale.toLocaleString() + " CFA";

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + id).style.display = 'block';
    
    if(id === 'biens') renderBiens();
    if(id === 'collecte') updateSelects();
    if(id === 'planning') { updateSelects(); renderVisites(); }
}

// --- GESTION DES PHOTOS ---
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

// --- AJOUT ET AFFICHAGE BIENS ---
function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix.");
    
    biens.push({
        id: Date.now(),
        nom: nom,
        loyer: loyer,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value || 'Non renseignée',
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu',
        com: document.getElementById('new-bien-com').value || "10%",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"],
        statut: 'Disponible',
        reliquat: 0,
        historiquePaiements: [] // Structure pour le portefeuille financier du bien
    });
    
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    selectedPhotos = [];
    document.getElementById('previews-container').innerHTML = '';
    
    // Reset champs
    document.getElementById('new-bien-nom').value = '';
    document.getElementById('new-bien-loyer').value = '';
    document.getElementById('new-bien-adresse').value = '';
    document.getElementById('new-bien-proprio').value = '';
    
    showView('biens');
}

function renderBiens() {
    const filtered = biens.filter(b => b.statut === currentFilter);
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

// --- FICHE DÉTAIL DU BIEN (MODAL STANDARD) ---
function voirDetailBien(id) {
    const b = biens.find(x => x.id === id);
    const modal = document.getElementById('modal-bien');
    document.getElementById('modal-body').innerHTML = `
        <h3 style="color:var(--blue); margin-top:0;">${b.nom}</h3>
        <p><strong>Type:</strong> ${b.type}</p>
        <p><strong>Adresse:</strong> ${b.adresse}</p>
        <p><strong>Prix/Loyer:</strong> ${parseInt(b.loyer).toLocaleString()} CFA</p>
        <p><strong>Propriétaire:</strong> ${b.proprio}</p>
        <p><strong>Ma Commission prévue:</strong> ${b.com}</p>
        <p><strong>Statut:</strong> ${b.statut}</p>
        ${b.reliquat > 0 ? `<p style="color:var(--red);"><strong>Reste dû :</strong> ${b.reliquat.toLocaleString()} CFA</p>` : ''}
        <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
        
        <button class="btn-primary" onclick="toggleStatut(${b.id})">${b.statut === 'Disponible' ? 'Marquer comme Loué' : 'Libérer le bien'}</button>
        <button class="btn-outline" style="background:#F0F4FF; color:var(--blue); margin-top:8px;" onclick="ouvrirPortefeuille(${b.id})"><i class="fas fa-wallet"></i> Voir le Portefeuille Financier</button>
        ${b.reliquat > 0 ? `<button class="btn-outline" style="background:#FFE5E5; color:var(--red); margin-top:8px;" onclick="envoyerRelance('${b.proprio}', '${b.nom}', ${b.reliquat})"><i class="fab fa-whatsapp"></i> Envoyer Relance Reste</button>` : ''}
        <button class="btn-outline" style="color:var(--red); margin-top:8px;" onclick="supprimerBien(${b.id})"><i class="fas fa-trash"></i> Supprimer le bien</button>
        <button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>
    `;
    modal.style.display = 'flex';
}

// --- NOUVEAU MODÈLE : PORTEFEUILLE FINANCIER DU BIEN ---
function ouvrirPortefeuille(id) {
    const b = biens.find(x => x.id === id);
    if (!b.historiquePaiements) b.historiquePaiements = [];
    
    // Calculer le total encaissé sur ce bien précis
    const totalEncaisseBien = b.historiquePaiements.reduce((sum, p) => sum + p.montant, 0);

    const modal = document.getElementById('modal-bien');
    
    // Génération de la liste de l'historique
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
        
        <div style="background:linear-gradient(135deg, #4A69FF, #324BDB); color:white; padding:15px; border-radius:18px; text-align:center; margin-bottom:15px; box-shadow:0 4px 10px rgba(74,105,255,0.2);">
            <small style="opacity:0.8; font-size:0.75rem;">Total encaissé sur ce bien</small>
            <h2 style="margin:5px 0 0 0; font-size:1.4rem;">${totalEncaisseBien.toLocaleString()} CFA</h2>
            ${b.reliquat > 0 ? `<div style="background:rgba(255,74,74,0.2); color:#FF8E8E; font-size:0.75rem; font-weight:bold; padding:4px; border-radius:8px; margin-top:8px;">⚠️ Reste dû : ${b.reliquat.toLocaleString()} CFA</div>` : ''}
        </div>

        <h4 style="text-align:left; margin:10px 0; color:var(--navy); font-size:0.9rem;"><i class="fas fa-history"></i> Historique des Versements</h4>
        <div style="max-height:180px; overflow-y:auto; margin-bottom:15px; padding-right:2px;">
            ${historiqueHTML}
        </div>

        <button class="btn-primary" onclick="voirDetailBien(${b.id})"><i class="fas fa-arrow-left"></i> Retour aux détails</button>
        <button class="btn-outline" style="margin-top:8px;" onclick="fermerModal()">Fermer</button>
    `;
    modal.style.display = 'flex';
}

function fermerModal() { 
    document.getElementById('modal-bien').style.display = 'none'; 
}

function filterBiens(s, e) {
    currentFilter = s;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderBiens();
}

function toggleStatut(id) {
    biens = biens.map(b => { 
        if(b.id === id) b.statut = (b.statut === 'Disponible' ? 'Occupé' : 'Disponible'); 
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

// --- COLLECTE & HISTORISATION ---
function updateSelects() {
    const occupes = biens.filter(b => b.statut === 'Occupé');
    document.getElementById('c-bien-select').innerHTML = occupes.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    document.getElementById('p-bien-select').innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
    remplirLoyer();
}

function remplirLoyer() {
    const bienNom = document.getElementById('c-bien-select').value;
    const typeSelect = document.getElementById('c-type').value;
    const b = biens.find(x => x.nom === bienNom);
    
    // Zone d'avertissement de dette dynamique
    const alerteDette = document.getElementById('alerte-dette-collecte');
    if(alerteDette) alerteDette.innerHTML = '';

    if(b) {
        // Alerte visuelle si le bien sélectionné traîne un reliquat
        if(b.reliquat > 0 && alerteDette) {
            alerteDette.innerHTML = `<div style="background:#FFE5E5; color:var(--red); padding:10px; border-radius:12px; margin-bottom:10px; font-size:0.8rem; font-weight:bold; text-align:center;"><i class="fas fa-exclamation-triangle"></i> Attention : Reste dû précédent de ${b.reliquat.toLocaleString()} CFA non réglé !</div>`;
        }

        if(typeSelect === 'Caution') {
            document.getElementById('c-montant').value = parseFloat(b.loyer) * 3;
        } else if(typeSelect === 'Frais') {
            document.getElementById('c-montant').value = ''; 
        } else {
            document.getElementById('c-montant').value = b.loyer;
        }
    }
}

function validerCollecte() {
    const bienNom = document.getElementById('c-bien-select').value;
    const montantPaye = parseFloat(document.getElementById('c-montant').value);
    const type = document.getElementById('c-type').value;
    const mode = document.querySelector('input[name="pay-mode"]:checked').value;
    
    if(!bienNom || isNaN(montantPaye)) return alert("Sélectionnez un bien et indiquez le montant.");

    const bienIndex = biens.findIndex(b => b.nom === bienNom);
    if(bienIndex === -1) return alert("Sélectionnez un bien valide");
    const bien = biens[bienIndex];

    let loyerTheorique = parseFloat(bien.loyer);
    let attendu = (type === 'Caution') ? loyerTheorique * 3 : loyerTheorique;
    let reliquat = 0;

    if(type !== 'Frais' && montantPaye < attendu) {
        reliquat = attendu - montantPaye;
        biens[bienIndex].reliquat = reliquat;
    } else if (type !== 'Frais') {
        biens[bienIndex].reliquat = 0; // Remise à zéro s'il paie tout ou plus
    }

    // Sauvegarde dans l'historique financier du Portefeuille du bien
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

    // Calcul Courtier Commission
    let maCom = 0;
    if(type === 'Caution') {
        maCom = loyerTheorique; 
    } else if(type === 'Loyer') {
        maCom = bien.com.includes('%') ? (parseFloat(bien.com)/100) * montantPaye : parseFloat(bien.com);
    } else {
        maCom = montantPaye;
    }

    comTotale += maCom;
    localStorage.setItem('sama_com_totale', comTotale);
    document.getElementById('total-display').innerText = comTotale.toLocaleString() + " CFA";

    // Reçu WhatsApp avec signature dynamique du Courtier en bas
    let msg = `*REÇU SAMA GESTION*%0A` +
              `------------------------------%0A` +
              `🏠 *Bien:* ${bien.nom}%0A` +
              `💰 *Montant versé:* ${montantPaye.toLocaleString()} CFA%0A` +
              `📝 *Type:* ${type}%0A` +
              `💳 *Mode:* ${mode}%0A`;
    
    if(reliquat > 0) msg += `⚠️ *RESTE À PAYER:* ${reliquat.toLocaleString()} CFA%0A`;
    
    msg += `📅 *Date:* ${new Date().toLocaleDateString()}%0A` +
           `------------------%0A` +
           `*Net Proprio:* ${(montantPaye - (type === 'Caution' ? 0 : maCom)).toLocaleString()} CFA%0A%0A` +
           `• *Émis par :* _${courtierNom}_%0A` +
           `_Merci pour votre confiance._`;

    window.open(`https://wa.me/?text=${msg}`, '_blank');
    showView('dashboard');
}

function partagerLienPaiement() {
    const bienNom = document.getElementById('c-bien-select').value;
    const montant = document.getElementById('c-montant').value;
    if(!bienNom || !montant) return alert("Sélectionnez un bien et un montant d'abord.");
    
    const msg = `*SAMA GESTION - DEMANDE DE PAIEMENT*%0A` +
                `--------------------------------------%0A` +
                `Pour le règlement du bien *${bienNom}*%0A` +
                `💰 *Montant attendu :* ${parseInt(montant).toLocaleString()} CFA%0A%0A` +
                `Merci de faire le dépôt via nos canaux sécurisés :%0A` +
                `📲 *WAVE / OM :* 77 XXX XX XX%0A` +
                `--------------------------------------%0A` +
                `_Veuillez envoyer la capture d'écran après transfert._%0A` +
                `• _Cordialement, ${courtierNom}_`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// --- FONCTIONS DE RELANCE & RAPPELS ---
function envoyerRelance(nomLocataire, bienNom, reste) {
    const msg = `*RAPPEL DE PAIEMENT - SAMA GESTION*%0A` +
                `------------------------------%0A` +
                `Bonjour %0A` +
                `Sauf erreur de notre part, le paiement pour le bien *${bienNom}* est incomplet.%0A` +
                `*Reste à régler : ${parseInt(reste).toLocaleString()} CFA*%0A%0A` +
                `Merci de régulariser dès que possible.%0A` +
                `------------------------------%0A` +
                `• _${courtierNom}_`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// --- VISITES ---
function sauverVisite() {
    const nom = document.getElementById('p-name').value;
    const bien = document.getElementById('p-bien-select').value;
    const date = document.getElementById('p-date').value;
    
    if(!nom || !date) return alert("Remplissez le nom et la date");

    visites.push({ id: Date.now(), nom, bien, date });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    document.getElementById('p-name').value = '';
    document.getElementById('p-date').value = '';
    renderVisites();
}

function renderVisites() {
    document.getElementById('visites-list').innerHTML = visites.map(v => {
        const dateFormatee = v.date.replace('T', ' à ');
        return `
            <div class="form-card">
                <strong><i class="fas fa-user"></i> ${v.nom}</strong><br>
                <small><i class="fas fa-building"></i> Bien : ${v.bien}</small><br>
                <small><i class="fas fa-clock"></i> Rendez-vous : ${dateFormatee}</small>
                <div style="margin-top: 10px;">
                    <button class="btn-primary" style="padding: 8px; font-size: 0.8rem;" onclick="window.open('https://wa.me/?text=Bonjour ${v.nom}, je vous rappelle notre rendez-vous pour la visite du bien ${v.bien} le ${dateFormatee}. Signature : ${courtierNom}','_blank')"><i class="fab fa-whatsapp"></i> Rappel RDV</button>
                </div>
            </div>
        `;
    }).reverse().join('');
}

window.onload = () => showView('dashboard');
