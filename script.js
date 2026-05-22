// ==========================================
// CONFIGURATION & VARIABLES GLOBALES
// ==========================================
let currentUserData = null;
let localBiens = [];
let currentFilterStatus = "Disponible";

// Liste des pièces par défaut pour l'État des Lieux (EDL)
const ROOMS_LIST = ["Salon / Séjour", "Chambre Principale", "Cuisine", "Salle de Bain / WC", "Balcon / Extérieur"];

// ==========================================
// DEBARQUEMENT & ROUTING
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Écouteur de l'état de connexion Firebase
    window.fbOnAuth(window.auth, async (user) => {
        if (user) {
            try {
                // Récupération du profil utilisateur dans Firestore
                const userDoc = await window.fsGetDoc(window.fsDoc(window.db, "users", user.uid));
                if (userDoc.exists()) {
                    currentUserData = { id: user.uid, ...userDoc.data() };
                    initialiserApplication();
                } else {
                    // Cas d'un utilisateur sans document Firestore (sécurité)
                    document.getElementById("login-error").innerText = "Profil utilisateur introuvable.";
                    document.getElementById("login-error").style.display = "block";
                    window.fbSignOut(window.auth);
                }
            } catch (error) {
                console.error("Erreur de récupération du profil:", error);
                deconnexion();
            }
        } else {
            // Non connecté -> Afficher l'écran de connexion
            document.getElementById("login-screen").style.display = "flex";
            document.getElementById("header-user-badge").innerText = "...";
        }
    });
});

// Initialisation globale après auth réussie
async function initialiserApplication() {
    document.getElementById("login-screen").style.display = "none";
    
    // UI Profil & Badges Header
    document.getElementById("header-user-badge").innerHTML = `<i class="fas fa-user-circle"></i> ${currentUserData.fullname.split(' ')[0]}`;
    
    // Gestion de la section d'administration réseau
    if (currentUserData.role === "SuperAdmin") {
        document.getElementById("admin-management-section").style.display = "block";
    } else {
        document.getElementById("admin-management-section").style.display = "none";
    }

    // Chargement des données métier
    await chargerBiensCloud();
    chargerVisitesCloud();
    chargerEDLCloudList();
    
    // Aller sur le Dashboard par défaut
    showView("dashboard");
}

// Navigation entre les vues
window.showView = function(viewId) {
    // Cacher toutes les vues
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
    
    // Afficher la vue ciblée
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.style.display = "block";
};

window.resetNavStyles = function(buttonElement) {
    document.querySelectorAll("nav .nav-item").forEach(item => item.classList.remove("active"));
    buttonElement.classList.add("active");
};

// ==========================================
// AUTHENTIFICATION
// ==========================================
window.verifierConnexion = async function() {
    const email = document.getElementById("login-username").value.trim();
    const pin = document.getElementById("login-password").value.trim();
    const errorEl = document.getElementById("login-error");

    if (!email || !pin) {
        errorEl.innerText = "Veuillez remplir tous les champs.";
        errorEl.style.display = "block";
        return;
    }

    try {
        errorEl.style.display = "none";
        await window.fbSignIn(window.auth, email, pin);
    } catch (error) {
        console.error(error);
        errorEl.innerText = "Identifiants ou Code PIN incorrects.";
        errorEl.style.display = "block";
    }
};

window.deconnexion = function() {
    window.fbSignOut(window.auth).then(() => {
        location.reload();
    });
};

// ==========================================
// GESTION DU CATALOGUE DE BIENS
// ==========================================
async function chargerBiensCloud() {
    try {
        const querySnapshot = await window.fsGetDocs(window.fsCollection(window.db, "biens"));
        localBiens = [];
        querySnapshot.forEach(doc => {
            localBiens.push({ id: doc.id, ...doc.data() });
        });
        
        calculerKpiCommissions();
        renderBiens();
        remplirSelectsBiens();
    } catch (error) {
        console.error("Erreur de chargement des biens:", error);
    }
}

function calcularKpiCommissions() {
    let cumul = 0;
    localBiens.forEach(bien => {
        if (bien.statut === "Occupé" && bien.loyer) {
            let loyerNum = parseFloat(bien.loyer) || 0;
            if (bien.commission && bien.commission.includes("%")) {
                let pct = parseFloat(bien.commission.replace("%", "")) || 0;
                cumul += (loyerNum * pct) / 100;
            } else {
                cumul += parseFloat(bien.commission) || 0;
            }
        }
    });
    document.getElementById("total-display").innerText = new Intl.NumberFormat('fr-FR').format(cumul) + " CFA";
}

window.filterBiens = function(status, event) {
    currentFilterStatus = status;
    document.querySelectorAll(".tabs .tab-btn").forEach(btn => btn.classList.remove("active"));
    if (event) event.target.classList.add("active");
    renderBiens();
};

window.renderBiens = function() {
    const listEl = document.getElementById("biens-list");
    const searchVal = document.getElementById("search-bien-input").value.toLowerCase();
    listEl.innerHTML = "";

    const filtrés = localBiens.filter(b => {
        const matchStatus = b.statut === currentFilterStatus;
        const matchSearch = b.nom.toLowerCase().includes(searchVal) || 
                            (b.adresse && b.adresse.toLowerCase().includes(searchVal)) ||
                            (b.proprioNom && b.proprioNom.toLowerCase().includes(searchVal));
        return matchStatus && matchSearch;
    });

    if (filtrés.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; color:var(--text-light); padding:20px;">Aucun bien trouvé.</p>`;
        return;
    }

    filtrés.forEach(b => {
        const card = document.createElement("div");
        card.className = "form-card";
        card.style.cursor = "pointer";
        card.onclick = () => ouvrirModalBien(b);

        let imageHTML = "";
        if (b.photos && b.photos.length > 0) {
            imageHTML = `<div class="bien-gallery">`;
            b.photos.forEach(img => { imageHTML += `<img src="${img}" alt="bien">`; });
            imageHTML += `</div>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <div>
                    <h3 style="margin-bottom:2px; color:var(--dark);">${b.nom}</h3>
                    <small style="color:var(--text-light);"><i class="fas fa-map-marker-alt"></i> ${b.adresse || 'N/A'}</small>
                </div>
                <span class="user-badge" style="background:${b.statut === 'Disponible' ? '#D1FAE5' : '#FEE2E2'}; color:${b.statut === 'Disponible' ? '#065F46' : '#991B1B'}; border:none;">
                    ${b.statut}
                </span>
            </div>
            ${imageHTML}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid var(--border); padding-top:8px;">
                <b style="color:var(--gold); font-size:1rem;">${new Intl.NumberFormat('fr-FR').format(b.loyer)} CFA <small style="font-size:0.7rem; color:var(--text-light); font-weight:500;">/mois</small></b>
                <span style="font-size:0.75rem; font-weight:600; background:var(--bg); padding:4px 8px; border-radius:6px;">📄 ${b.papier || 'Non spécifié'}</span>
            </div>
        `;
        listEl.appendChild(card);
    });
};

function remplirSelectsBiens() {
    const selects = ["c-bien-select", "edl-bien-select", "p-bien-select"];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = "";
        
        let listeACocher = (id === "c-bien-select") ? localBiens.filter(b => b.statut === "Occupé") : localBiens;
        
        if (listeACocher.length === 0) {
            el.innerHTML = `<option value="">-- Aucun bien disponible --</option>`;
        } else {
            listeACocher.forEach(b => {
                el.innerHTML += `<option value="${b.id}">${b.nom} (${b.statut})</option>`;
            });
        }
    });
}

// ==========================================
// FORMULAIRE AJOUT / EDITION DE BIEN (CORRIGÉ)
// ==========================================
let currentBienUploadedPhotos = [];

window.ouvrirFormulaireAjout = function() {
    document.getElementById("form-bien-title").innerText = "Nouveau Bien";
    document.getElementById("edit-bien-id").value = "";
    document.getElementById("new-bien-nom").value = "";
    document.getElementById("new-bien-type").value = "Appartement";
    document.getElementById("new-bien-superficie").value = "";
    document.getElementById("new-bien-papier").value = "Non spécifié";
    document.getElementById("new-bien-loyer").value = "";
    document.getElementById("new-bien-adresse").value = "";
    document.getElementById("new-bien-com").value = "";
    document.getElementById("new-bien-proprio").value = "";
    document.getElementById("new-bien-proprio-tel").value = "";
    document.getElementById("edit-only-fields").style.display = "none";
    document.getElementById("previews-container").innerHTML = "";
    currentBienUploadedPhotos = [];
    
    showView("ajouter-bien");
};

// LA FONCTION A BIEN ÉTÉ RENOMMÉE ICI POUR MATCH AVEC L'HTML
window.saveBien = async function() {
    const btn = document.getElementById("btn-save-bien");
    const id = document.getElementById("edit-bien-id").value;
    const nom = document.getElementById("new-bien-nom").value.trim();
    const loyer = parseFloat(document.getElementById("new-bien-loyer").value) || 0;

    if (!nom || !loyer) {
        alert("Le nom et le prix/loyer sont obligatoires.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Enregistrement...";

    const payload = {
        nom: nom,
        type: document.getElementById("new-bien-type").value,
        superficie: document.getElementById("new-bien-superficie").value.trim(),
        papier: document.getElementById("new-bien-papier").value,
        loyer: loyer,
        adresse: document.getElementById("new-bien-adresse").value.trim(),
        commission: document.getElementById("new-bien-com").value.trim() || "10%",
        proprioNom: document.getElementById("new-bien-proprio").value.trim(),
        proprioTel: document.getElementById("new-bien-proprio-tel").value.trim(),
        photos: currentBienUploadedPhotos,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserData ? currentUserData.fullname : "Admin System"
    };

    try {
        if (id) {
            // Mode Édition (Sauvegarde des champs d'occupation)
            payload.locataireNom = document.getElementById("edit-bien-locataire").value.trim();
            payload.locataireTel = document.getElementById("edit-bien-locataire-tel").value.trim();
            payload.dateEntree = document.getElementById("edit-bien-date-entree").value;
            payload.statut = (payload.locataireNom) ? "Occupé" : "Disponible";
            
            await window.fsUpdateDoc(window.fsDoc(window.db, "biens", id), payload);
        } else {
            // Mode Création
            payload.statut = "Disponible";
            payload.createdAt = new Date().toISOString();
            const newDocRef = window.fsDoc(window.fsCollection(window.db, "biens"));
            await window.fsSetDoc(newDocRef, payload);
        }

        await chargerBiensCloud();
        showView("biens");
    } catch (e) {
        console.error(e);
        alert("Erreur lors de la sauvegarde du bien.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Enregistrer";
    }
};

// Placeholder pour compression d'images si non définie ailleurs
window.previewAndCompressImage = function(input, type) {
    const files = input.files;
    const container = type === 'bien' ? document.getElementById("previews-container") : document.getElementById("edl-previews-container");
    container.innerHTML = "";
    
    // Simulation / Traitement basique en Base64 pour l'exemple
    for (let i = 0; i < Math.min(files.length, 3); i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            container.appendChild(img);
            if (type === 'bien') currentBienUploadedPhotos.push(e.target.result);
            else currentEDLUploadedPhotos.push(e.target.result);
        }
        reader.readAsDataURL(files[i]);
    }
};

// ==========================================
// MODAL DÉTAILS ET ACTIONS MULTIPLES
// ==========================================
window.ouvrirModalBien = function(bien) {
    const body = document.getElementById("modal-body");
    
    let photoGrid = "";
    if (bien.photos && bien.photos.length > 0) {
        photoGrid = `<div class="bien-gallery" style="margin-bottom:15px;">`;
        bien.photos.forEach(p => { photoGrid += `<img src="${p}" style="width:80px; height:65px; border-radius:8px;">`; });
        photoGrid += `</div>`;
    }

    body.innerHTML = `
        <h3 style="color:var(--dark); font-size:1.3rem; margin-bottom:2px;">${bien.nom}</h3>
        <p style="font-size:0.85rem; color:var(--text-light); margin-bottom:12px;"><i class="fas fa-map-marker-alt"></i> ${bien.adresse || 'Pas d\'adresse'}</p>
        
        ${photoGrid}

        <table class="table-suivi" style="margin-bottom:15px;">
            <tr><th>Type</th><td><b>${bien.type}</b></td></tr>
            <tr><th>Loyer / Prix</th><td><b style="color:var(--gold);">${new Intl.NumberFormat('fr-FR').format(bien.loyer)} CFA</b></td></tr>
            <tr><th>Superficie</th><td>${bien.superficie || 'Inconnue'}</td></tr>
            <tr><th>Documents</th><td><span style="font-size:0.75rem;" class="user-badge">${bien.papier}</span></td></tr>
            <tr><th>Propriétaire</th><td>${bien.proprioNom || 'N/A'} (${bien.proprioTel || 'N/A'})</td></tr>
            <tr><th>Statut</th><td><b>${bien.statut}</b></td></tr>
            ${bien.statut === 'Occupé' ? `
                <tr style="background:#F0FDF4;"><th style="color:var(--green);">Locataire</th><td><b>${bien.locataireNom}</b></td></tr>
                <tr style="background:#F0FDF4;"><th style="color:var(--green);">Téléphone</th><td>${bien.locataireTel}</td></tr>
                <tr style="background:#F0FDF4;"><th style="color:var(--green);">Entrée</th><td>${bien.dateEntree || 'Non définie'}</td></tr>
            ` : ''}
        </table>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn-outline" style="font-size:0.85rem;" onclick="preparerEditionBien('${bien.id}')"><i class="fas fa-edit"></i> Modifier / Louer</button>
            <button class="btn-primary" style="font-size:0.85rem; background:var(--dark);" onclick="partagerFicheWhatsApp('${bien.id}')"><i class="fab fa-whatsapp"></i> Fiche vitrine</button>
            ${currentUserData && currentUserData.role === 'SuperAdmin' ? `
                <button class="btn-outline" style="grid-column: span 2; border-color:var(--red); color:var(--red); font-size:0.8rem; padding:8px;" onclick="supprimerBien('${bien.id}')">
                    <i class="fas fa-trash"></i> Supprimer définitivement du catalogue
                </button>
            ` : ''}
        </div>
    `;
    document.getElementById("modal-bien").style.display = "flex";
};

window.fermerModal = function() {
    document.getElementById("modal-bien").style.display = "none";
};

window.preparerEditionBien = function(bienId) {
    fermerModal();
    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    document.getElementById("form-bien-title").innerText = "Éditer / Gérer Occupation";
    document.getElementById("edit-bien-id").value = b.id;
    document.getElementById("new-bien-nom").value = b.nom;
    document.getElementById("new-bien-type").value = b.type;
    document.getElementById("new-bien-superficie").value = b.superficie || "";
    document.getElementById("new-bien-papier").value = b.papier || "Non spécifié";
    document.getElementById("new-bien-loyer").value = b.loyer;
    document.getElementById("new-bien-adresse").value = b.adresse || "";
    document.getElementById("new-bien-com").value = b.commission || "";
    document.getElementById("new-bien-proprio").value = b.proprioNom || "";
    document.getElementById("new-bien-proprio-tel").value = b.proprioTel || "";
    
    document.getElementById("edit-only-fields").style.display = "block";
    document.getElementById("edit-bien-locataire").value = b.locataireNom || "";
    document.getElementById("edit-bien-locataire-tel").value = b.locataireTel || "";
    document.getElementById("edit-bien-date-entree").value = b.dateEntree || "";
    
    currentBienUploadedPhotos = b.photos || [];
    const prevContainer = document.getElementById("previews-container");
    prevContainer.innerHTML = "";
    currentBienUploadedPhotos.forEach(p => {
        prevContainer.innerHTML += `<img src="${p}" alt="preview">`;
    });

    calculerProrataAutomatique();
    showView("ajouter-bien");
};

window.partagerFicheWhatsApp = function(bienId) {
    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    let texte = `✨ *SAMA GESTION PRO - OFFRE IMMOBILIÈRE* ✨\n\n`;
    texte += `🏢 *Bien :* ${b.nom}\n`;
    texte += `📍 *Quartier/Adresse :* ${b.adresse || 'Sénégal'}\n`;
    texte += `📐 *Superficie :* ${b.superficie || 'N/A'}\n`;
    texte += `📄 *Statut Juridique :* ${b.papier}\n`;
    texte += `💰 *Prix / Loyer :* ${new Intl.NumberFormat('fr-FR').format(b.loyer)} CFA / mois\n\n`;
    texte += `📱 _Contactez notre réseau de partenaires certifiés pour planifier une visite immédiate._`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texte)}`, '_blank');
};

window.supprimerBien = async function(bienId) {
    if (!confirm("Voulez-vous vraiment supprimer définitivement ce bien ? Cette action est irréversible.")) return;
    try {
        await window.fsDeleteDoc(window.fsDoc(window.db, "biens", bienId));
        fermerModal();
        await chargerBiensCloud();
    } catch (e) {
        alert("Erreur de suppression");
    }
};

// ==========================================
// CALCULATEUR DE PRORATA AUTOMATIQUE
// ==========================================
window.calculerProrataAutomatique = function() {
    const loyer = parseFloat(document.getElementById("new-bien-loyer").value) || 0;
    const dateStr = document.getElementById("edit-bien-date-entree").value;
    const box = document.getElementById("prorata-box");
    const res = document.getElementById("prorata-result");

    if (!loyer || !dateStr) {
        box.style.display = "none";
        return;
    }

    const dateEntree = new Date(dateStr);
    const jour = dateEntree.getDate();
    
    const annee = dateEntree.getFullYear();
    const mois = dateEntree.getMonth();
    const totalJoursMois = new Date(annee, mois + 1, 0).getDate();

    if (jour === 1) {
        box.style.display = "block";
        res.innerText = "Entrée le 1er du mois. Pas de prorata applicable (Loyer complet).";
        return;
    }

    const joursDus = totalJoursMois - jour + 1;
    const prorataCalculé = Math.round((loyer / totalJoursMois) * joursDus);

    box.style.display = "block";
    res.innerText = `${joursDus} jours d'occupation dus sur ${totalJoursMois} jours au total.\nMontant à percevoir : ${new Intl.NumberFormat('fr-FR').format(prorataCalculé)} CFA.`;
};

// ==========================================
// COMPTABILITÉ & ENCAISSEMENT
// ==========================================
window.analyserReliquatComptable = function() {
    const bienId = document.getElementById("c-bien-select").value;
    const typeFlux = document.getElementById("c-type").value;
    const statusBox = document.getElementById("c-live-status");
    
    if (!bienId) {
        statusBox.style.display = "none";
        return;
    }

    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    statusBox.style.display = "block";
    statusBox.style.background = "var(--gold-light)";
    statusBox.style.color = "#9A3412";
    
    if (typeFlux === "Loyer") {
        statusBox.innerHTML = `👤 <b>Locataire :</b> ${b.locataireNom}<br>💰 <b>Loyer Standard :</b> ${new Intl.NumberFormat('fr-FR').format(b.loyer)} CFA`;
        document.getElementById("c-montant").value = b.loyer;
    } else if (typeFlux === "Caution") {
        statusBox.innerHTML = `👤 <b>Locataire :</b> ${b.locataireNom}<br>🔑 <b>Montant Caution conseillé (2 mois) :</b> ${new Intl.NumberFormat('fr-FR').format(b.loyer * 2)} CFA`;
        document.getElementById("c-montant").value = b.loyer * 2;
    } else {
        statusBox.innerHTML = `👤 <b>Locataire :</b> ${b.locataireNom}<br>⚙️ Saisissez le montant spécifique convenu pour le type : <b>${typeFlux}</b>.`;
        document.getElementById("c-montant").value = "";
    }
};

window.validerCollecte = async function(cibleNotification) {
    const bienId = document.getElementById("c-bien-select").value;
    const typeFlux = document.getElementById("c-type").value;
    const montant = document.getElementById("c-montant").value;

    if (!bienId || !montant) {
        alert("Sélectionnez un bien et saisissez un montant.");
        return;
    }

    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    try {
        const transRef = window.fsDoc(window.fsCollection(window.db, "transactions"));
        await window.fsSetDoc(transRef, {
            bienId: bienId,
            bienNom: b.nom,
            locataireNom: b.locataireNom,
            montant: parseFloat(montant),
            nature: typeFlux,
            dateEnregistrement: new Date().toISOString(),
            percuPar: currentUserData ? currentUserData.fullname : "Admin System"
        });
    } catch(e) {
        console.error("Erreur log comptable:", e);
    }

    let recu = `🧾 *REÇU NUMÉRIQUE - SAMA GESTION PRO*\n`;
    recu += `-------------------------------------------\n`;
    recu += `🏠 *Bien immobilier :* ${b.nom}\n`;
    recu += `👤 *Locataire :* ${b.locataireNom}\n`;
    recu += `💵 *Montant Perçu :* ${new Intl.NumberFormat('fr-FR').format(montant)} CFA\n`;
    recu += `🎯 *Nature de l'encaissement :* ${typeFlux}\n`;
    recu += `📅 *Date :* ${new Date().toLocaleDateString('fr-FR')}\n`;
    recu += `✍️ *Gestionnaire :* ${currentUserData ? currentUserData.fullname : "Admin System"}\n`;
    recu += `-------------------------------------------\n`;
    recu += `✅ _Paiement validé avec succès. Merci pour votre confiance._`;

    let numeroTel = (cibleNotification === "locataire") ? b.locataireTel : b.proprioTel;
    
    if (numeroTel) {
        numeroTel = numeroTel.replace(/\s+/g, '');
        if (!numeroTel.startsWith("+") && numeroTel.length === 9) {
            numeroTel = "221" + numeroTel;
        }
        window.open(`https://wa.me/${numeroTel}?text=${encodeURIComponent(recu)}`, '_blank');
    } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(recu)}`, '_blank');
    }
    
    showView("dashboard");
};

// ==========================================
// ÉTATS DES LIEUX (EDL) & CONSTATS
// ==========================================
let currentEDLUploadedPhotos = [];

window.ouvrirFormulaireEDL = function() {
    remplirSelectsBiens();
    const container = document.getElementById("edl-rooms-container");
    container.innerHTML = "";

    ROOMS_LIST.forEach((piece) => {
        const div = document.createElement("div");
        div.style.marginBottom = "10px";
        div.style.background = "var(--bg)";
        div.style.padding = "10px";
        div.style.borderRadius = "8px";
        div.innerHTML = `
            <span style="font-weight:700; font-size:0.85rem; display:block; margin-bottom:4px;">${piece}</span>
            <select class="edl-state-select" data-room="${piece}">
                <option value="Neuf / Excellent état">✨ Neuf / Excellent</option>
                <option value="Bon état général">👍 Bon état</option>
                <option value="État d'usage / Moyen">⚠️ État moyen</option>
                <option value="Mauvais état / Dégradé">🚨 Mauvais état</option>
            </select>
        `;
        container.appendChild(div);
    });

    document.getElementById("edl-eau").value = "";
    document.getElementById("edl-elec").value = "";
    document.getElementById("edl-cles").value = "";
    document.getElementById("edl-notes").value = "";
    document.getElementById("edl-previews-container").innerHTML = "";
    currentEDLUploadedPhotos = [];

    showView("nouveau-edl");
};

window.saveEDLCloud = async function() {
    const btn = document.getElementById("btn-save-edl");
    const bienId = document.getElementById("edl-bien-select").value;
    const typeConstat = document.getElementById("edl-type").value;
    
    if (!bienId) {
        alert("Veuillez assigner un bien.");
        return;
    }

    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    btn.disabled = true;
    btn.innerText = "Signature cloud...";

    let piecesEtats = {};
    document.querySelectorAll(".edl-state-select").forEach(sel => {
        piecesEtats[sel.getAttribute("data-room")] = sel.value;
    });

    const edlData = {
        bienId: bienId,
        bienNom: b.nom,
        type: typeConstat,
        etats: piecesEtats,
        compteurEau: document.getElementById("edl-eau").value.trim(),
        compteurElec: document.getElementById("edl-elec").value.trim(),
        nombreCles: document.getElementById("edl-cles").value.trim(),
        notes: document.getElementById("edl-notes").value.trim(),
        photos: currentEDLUploadedPhotos,
        dateCertificat: new Date().toISOString(),
        signataire: currentUserData ? currentUserData.fullname : "Admin System"
    };

    try {
        const docRef = window.fsDoc(window.fsCollection(window.db, "etats_lieux"));
        await window.fsSetDoc(docRef, edlData);
        
        let msg = `📝 *CERTIFICAT DE CONSTAT D'ÉTAT DES LIEUX*\n`;
        msg += `-------------------------------------------\n`;
        msg += `🏠 *Bien :* ${b.nom}\n`;
        msg += `🎯 *Type :* Constat d'${typeConstat}\n`;
        msg += `🔑 *Clés remises :* ${edlData.nombreCles} jeu(x)\n`;
        msg += `💧 *Index Eau :* ${edlData.compteurEau || 'Non relevé'} m3\n`;
        msg += `⚡ *Index Élec/Woyofal :* ${edlData.compteurElec || 'Non relevé'}\n`;
        msg += `✍️ *Signé numériquement par :* ${currentUserData ? currentUserData.fullname : "Admin System"}\n`;
        msg += `-------------------------------------------\n`;
        msg += `✅ _L'historique complet ainsi que les photos de preuve associées ont été synchronisés sur le réseau SAMA GESTION._`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');

        chargerEDLCloudList();
        showView("etat-lieux");
    } catch (e) {
        console.error(e);
        alert("Erreur réseau lors de la sauvegarde de l'état des lieux.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Signer & Envoyer WhatsApp";
    }
};

async function chargerEDLCloudList() {
    const listEl = document.getElementById("edl-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    try {
        const snap = await window.fsGetDocs(window.fsCollection(window.db, "etats_lieux"));
        if (snap.empty) {
            listEl.innerHTML = `<p style="text-align:center; color:var(--text-light); padding:20px;">Aucun procès-verbal signé.</p>`;
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement("div");
            div.className = "form-card";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:var(--dark);">${data.bienNom}</b>
                    <span class="user-badge" style="background:var(--gold-light); color:var(--gold); font-size:0.75rem; border:none;">${data.type}</span>
                </div>
                <p style="font-size:0.8rem; color:var(--text-light); margin-top:5px;">
                    📅 ${new Date(data.dateCertificat).toLocaleDateString('fr-FR')} • Signé par: ${data.signataire}
                </p>
            `;
            listEl.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// AGENDA DES VISITES & PROSPECTS (FIN RECONSTRUITE STRUCTURÉE)
// ==========================================
window.sauverVisite = async function() {
    const nom = document.getElementById("p-name").value.trim();
    const tel = document.getElementById("p-tel").value.trim();
    const bienId = document.getElementById("p-bien-select").value;
    const dateVisite = document.getElementById("p-date").value;

    if (!nom || !bienId || !dateVisite) {
        alert("Nom du visiteur, bien et date requis.");
        return;
    }

    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    const visitePayload = {
        prospectNom: nom,
        prospectTel: tel,
        bienId: bienId,
        bienNom: b.nom,
        dateRendezVous: dateVisite,
        agentAssigné: currentUserData ? currentUserData.fullname : "Admin System",
        createdAt: new Date().toISOString()
    };

    try {
        const docRef = window.fsDoc(window.fsCollection(window.db, "visites"));
        await window.fsSetDoc(docRef, visitePayload);

        if (tel) {
            let msgVisite = `Bonjour ${nom}, votre visite pour le bien immobilier *${b.nom}* est bien confirmée pour le 📅 *${new Date(dateVisite).toLocaleString('fr-FR')}*.\n\n📍 *Lieu de RDV :* ${b.adresse || 'Sur place'}\n🤝 *Agent en charge :* ${currentUserData ? currentUserData.fullname : "Admin System"}.\n\nMerci de nous notifier en cas de retard ou d'empêchement.`;
            let telClean = tel.replace(/\s+/g, '');
            if (!telClean.startsWith("+") && telClean.length === 9) telClean = "221" + telClean;
            window.open(`https://wa.me/${telClean}?text=${encodeURIComponent(msgVisite)}`, '_blank');
        }

        document.getElementById("p-name").value = "";
        document.getElementById("p-tel").value = "";
        
        chargerVisitesCloud();
    } catch(e) {
        alert("Erreur de sauvegarde de la visite.");
    }
};

async function chargerVisitesCloud() {
    const listEl = document.getElementById("visites-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    try {
        const snap = await window.fsGetDocs(window.fsCollection(window.db, "visites"));
        if (snap.empty) {
            listEl.innerHTML = `<p style="text-align:center; color:var(--text-light); padding:15px;">Aucune visite planifiée à l'agenda.</p>`;
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement("div");
            div.className = "form-card";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:var(--dark);">${data.prospectNom}</b>
                    <span class="user-badge" style="background:var(--bg); font-size:0.75rem;">🗓️ Visite</span>
                </div>
                <p style="font-size:0.8rem; color:var(--text-light); margin-top:5px;">
                    🏠 <b>Bien :</b> ${data.bienNom}<br>
                    📅 <b>RDV :</b> ${new Date(data.dateRendezVous).toLocaleString('fr-FR')}<br>
                    👤 <b>Agent :</b> ${data.agentAssigné}
                </p>
            `;
            listEl.appendChild(div);
        });
    } catch (e) {
        console.error("Erreur de chargement des visites:", e);
    }
}
