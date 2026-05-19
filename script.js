// Sama Gestion Pro v3 - Correctif Reçu Client Secrétisé & Fix Enregistrement Mobile
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let comTotale = parseFloat(localStorage.getItem('sama_com_totale')) || 0;
let currentFilter = 'Disponible';
let selectedPhotos = [];
let courtierNom = localStorage.getItem('sama_courtier_nom') || "Votre Courtier";

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

// --- AJOUT BIENS AVEC SECURITE ANTI-BUG MOBILE (LOCALSTORAGE OVERFLOW) ---
function saveBienPro() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = document.getElementById('new-bien-loyer').value;
    if(!nom || !loyer) return alert("Veuillez remplir au moins le nom et le prix.");
    
    // Image par défaut si pas de photo ou si bug de mémoire mobile
    const imageDefaut = ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200"];

    const nouveauBien = {
        id: Date.now(),
        nom: nom,
        loyer: loyer,
        type: document.getElementById('new-bien-type').value,
        adresse: document.getElementById('new-bien-adresse').value || 'Non renseignée',
        proprio: document.getElementById('new-bien-proprio').value || 'Inconnu',
        com: document.getElementById('new-bien-com').value || "10%",
        photos: selectedPhotos.length > 0 ? [...selectedPhotos] : imageDefaut,
        statut: 'Disponible',
        reliquat: 0,
        historiquePaiements: []
    };
    
    try {
        biens.push(nouveauBien);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
    } catch (e) {
        // Mode secours mobile : Si les photos de l'appareil sont trop lourdes et font crasher le stockage, on retire les photos lourdes
        console.log("Alerte mémoire mobile saturée : Optimisation sans les images lourdes.");
        biens.pop(); // Retire le crashé
        nouveauBien.photos = imageDefaut; // Remplace par l'image légère de secours
        biens.push(nouveauBien);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        alert("Bien enregistré ! (Photos optimisées automatiquement pour le stockage de votre mobile)");
    }
    
    // Reset de l'interface
    selectedPhotos = [];
    document.getElementById('previews-container').innerHTML = '';
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
        ${b.reliquat > 0 ? `<button class="btn-outline" style="background:#FFE5E5; color:var(--red); margin-top:8px;" onclick="envoyerRelance('${b.nom}', ${b.reliquat})"><i class="fab fa-whatsapp"></i> Envoyer Relance Reste</button>` : ''}
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
        
        <div style="background:linear-gradient(135deg, #4A69FF, #324BDB); color:white; padding:15px; border-radius:18px; text-align:center; margin-bottom:15px; box-shadow:0 4px 10px rgba(74,105,255,0.2);">
            <small style="opacity:0.8; font-size:0.75rem;">Total encaissé sur ce bien</small>
            <h2 style="margin:5px 0 0 0; font-size:1.4rem;">${totalEncaisseBien.toLocaleString()} CFA</h2>
            ${b.reliquat > 0 ? `<div style="background:rgba(255,74,74,0.2); color:#FF8E8E; font-size:0.75rem; font-weight:bold; padding:4px; border-radius:8px; margin-top:8px;">⚠️ Reste dû : ${b.reliquat.toLocaleString()} CFA</div>` : ''}
        </div>

        <h4 style="text-align:left; margin:10px 0; color:var(--navy); font-size:0.9rem;"><i class="fas fa-history"></i> Historique</h4>
        <div style="max-height:180px; overflow-y:auto; margin-bottom:15px; padding-right:2px;">
            ${historiqueHTML}
        </div>

        <button class="btn-primary" onclick="voirDetailBien(${b.id})"><i class="fas fa-arrow-left"></i> Retour</button>
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

// --- COLLECTE & GENERATION DE REÇU LOCATAIRE PRO ---
function updateSelects() {
    const occupes = biens.filter(b => b.statut === 'Occupé');
    const disponibles = biens.filter(b => b.statut === 'Disponible');
    
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

    // Calcul de la Commission en Interne (Reste masqué pour le locataire !)
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

    // CORRECTION : Reçu 100% PROPRE ET SÉCURISÉ pour le Locataire (Pas de mention Net Proprio ni de Commission)
    let msg = `*REÇU DE PAIEMENT OFFICIEL*%0A` +
              `*SAMA GESTION IMMOBILIÈRE*%0A` +
              `-------------------------------------%0A` +
              `🏠 *Bien concerné:* ${bien.nom}%0A` +
              `💰 *Montant encaissé:* ${montantPaye.toLocaleString()} CFA%0A` +
              `📝 *Nature du paiement:* ${type}%0A` +
              `💳 *Mode de règlement:* ${mode}%0A`;
    
    if(reliquat > 0) msg += `⚠️ *RESTE À PAYER SUR LE MOIS:* ${reliquat.toLocaleString()} CFA%0A`;
    
    msg += `📅 *Date de valeur:* ${new Date().toLocaleDateString()}%0A` +
           `-------------------------------------%0A` +
           `Reçu certifié et délivré par l'agence.%0A` +
           `• *Agent émetteur :* _${courtierNom}_%0A` +
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

function envoyerRelance(bienNom, reste) {
    const msg = `*RAPPEL DE PAIEMENT - SAMA GESTION*%0A` +
                `------------------------------%0A` +
                `Bonjour,%0A` +
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
    
    if(!nom || !date || !bien) return alert("Veuillez choisir un prospect, une date et un bien disponible.");

    visites.push({ 
        id: Date.now(), 
        nom, 
        bien, 
        date,
        statut: 'En attente',
        qualification: ''
    });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    document.getElementById('p-name').value = '';
    document.getElementById('p-date').value = '';
    renderVisites();
}

function demarrerVisite(id) {
    visites = visites.map(v => {
        if(v.id === id) v.statut = 'En cours';
        return v;
    });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function qualifierVisite(id, avis) {
    visites = visites.map(v => {
        if(v.id === id) {
            v.statut = 'Terminé';
            v.qualification = avis;
        }
        return v;
    });
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const maintenant = new Date();
    
    document.getElementById('visites-list').innerHTML = visites.map(v => {
        const dateVisite = new Date(v.date);
        const dateFormatee = v.date.replace('T', ' à ');
        
        const estFutur = dateVisite > maintenant && v.statut === 'En attente';
        const opaciteStyle = estFutur ? 'opacity: 0.65; border-left: 4px solid #cbd5e1;' : 'border-left: 4px solid var(--blue);';
        
        let badgeQualif = '';
        if(v.qualification === 'Chaud') badgeQualif = `<span style="background:#FFEBEB; color:#E74C3C; font-size:0.75rem; font-weight:bold; padding:4px 8px; border-radius:10px; margin-left:10px;"><i class="fas fa-fire"></i> Chaud</span>`;
        if(v.qualification === 'Froid') badgeQualif = `<span style="background:#EBF3FF; color:#3498DB; font-size:0.75rem; font-weight:bold; padding:4px 8px; border-radius:10px; margin-left:10px;"><i class="fas fa-snowflake"></i> Froid</span>`;

        let boutonsAction = '';
        if(v.statut === 'En attente') {
            boutonsAction = `
                <button class="btn-primary" style="padding: 8px; font-size: 0.8rem; margin-top:10px; background:#2ECC71;" onclick="demarrerVisite(${v.id})"><i class="fas fa-play"></i> Démarrer la visite</button>
                <button class="btn-outline" style="padding: 8px; font-size: 0.8rem; margin-top:5px; background:white; color:var(--blue); border:1px solid var(--blue);" onclick="window.open('https://wa.me/?text=Bonjour ${v.nom}, je vous rappelle notre rendez-vous pour la visite du bien ${v.bien} le ${dateFormatee}. Signature : ${courtierNom}','_blank')"><i class="fab fa-whatsapp"></i> Rappel RDV</button>
            `;
        } else if(v.statut === 'En cours') {
            boutonsAction = `
                <div style="margin-top:10px;">
                    <p style="margin:5px 0; font-size:0.8rem; font-weight:bold; color:var(--navy);">Qualifier le visiteur :</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-primary" style="background:#E74C3C; padding:8px; flex:1; font-size:0.8rem;" onclick="qualifierVisite(${v.id}, 'Chaud')"><i class="fas fa-fire"></i> Intéressé</button>
                        <button class="btn-primary" style="background:#3498DB; padding:8px; flex:1; font-size:0.8rem;" onclick="qualifierVisite(${v.id}, 'Froid')"><i class="fas fa-snowflake"></i> Pas chaud</button>
                    </div>
                </div>
            `;
        } else {
            boutonsAction = `<p style="color:#2ECC71; font-size:0.8rem; font-weight:bold; margin:8px 0 0 0;"><i class="fas fa-check-circle"></i> Visite clôturée</p>`;
        }

        return `
            <div class="form-card" style="${opaciteStyle}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong><i class="fas fa-user"></i> ${v.nom}</strong>
                    ${badgeQualif}
                </div>
                <small><i class="fas fa-building"></i> Bien : <strong>${v.bien}</strong></small><br>
                <small><i class="fas fa-clock"></i> Rendez-vous : ${dateFormatee}</small>
                ${boutonsAction}
            </div>
        `;
    }).reverse().join('');
}

window.onload = () => showView('dashboard');
