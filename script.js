// ==========================================
// CONFIGURATION & VARIABLES GLOBALES
// ==========================================
let currentUserData = null;
let localBiens = [];
let localTransactions = [];
let currentFilterStatus = "Disponible";

const ROOMS_LIST = ["Salon / Séjour", "Chambre Principale", "Cuisine", "Salle de Bain / WC", "Balcon / Extérieur"];

// ==========================================
// DÉBARQUEMENT & SÉCURITÉ ROUTING
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    window.fbOnAuth(window.auth, async (user) => {
        if (user) {
            try {
                const userDoc = await window.fsGetDoc(window.fsDoc(window.db, "users", user.uid));
                if (userDoc.exists()) {
                    currentUserData = { id: user.uid, ...userDoc.data() };
                    await initialiserApplication();
                } else {
                    document.getElementById("login-error").innerText = "Profil introuvable.";
                    document.getElementById("login-error").style.display = "block";
                    window.fbSignOut(window.auth);
                }
            } catch (error) {
                console.error(error);
                deconnexion();
            }
        } else {
            // VERROUILLAGE TOTAL : masquer la barre de navigation et forcer le login screen
            document.getElementById("login-screen").style.display = "flex";
            document.getElementById("main-navbar").style.display = "none";
            document.getElementById("header-user-badge").innerText = "...";
        }
    });
});

async function initialiserApplication() {
    document.getElementById("login-screen").style.display = "none";
    
    // Affichage Barre de navigation après auth réussie
    const navbar = document.getElementById("main-navbar");
    if (navbar) navbar.style.display = "flex";

    const nameDisplay = currentUserData.fullname ? currentUserData.fullname.split(' ')[0] : "Agent";
    document.getElementById("header-user-badge").innerHTML = `<i class="fas fa-user-circle"></i> ${nameDisplay}`;
    
    // Vérification Rôle Admin pour l'onglet de création d'agent
    const isAdmin = currentUserData.role === "SuperAdmin" || currentUserData.role === "superadmin" || currentUserData.email === "19amadoundour@gmail.com";
    const adminSection = document.getElementById("admin-management-section");
    const navProfilItem = document.getElementById("nav-profil-item");
    
    if (adminSection) adminSection.style.display = isAdmin ? "block" : "none";
    if (navProfilItem) navProfilItem.style.display = isAdmin ? "block" : "none";

    // Chargement parallèle sans ralentir l'UI
    await chargerTransactionsCloud();
    await chargerBiensCloud();
    chargerVisitesCloud();
    chargerEDLCloudList();
    
    showView("dashboard");
}

window.showView = function(viewId) {
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
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
// GESTION DU CATALOGUE DE BIENS & RELANCES
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
        genererRelancesPaiement();
    } catch (error) {
        console.error("Erreur biens:", error);
    }
}

async function chargerTransactionsCloud() {
    try {
        const querySnapshot = await window.fsGetDocs(window.fsCollection(window.db, "transactions"));
        localTransactions = [];
        querySnapshot.forEach(doc => {
            localTransactions.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error("Erreur transactions:", error);
    }
}

function calculerKpiCommissions() {
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
    const totalDisplay = document.getElementById("total-display");
    if (totalDisplay) totalDisplay.innerText = new Intl.NumberFormat('fr-FR').format(cumul) + " CFA";
}

function genererRelancesPaiement() {
    const relancesContainer = document.getElementById("dashboard-relances");
    if (!relancesContainer) return;
    relancesContainer.innerHTML = "";

    const biensLoues = localBiens.filter(b => b.statut === "Occupé");

    if (biensLoues.length === 0) {
        relancesContainer.innerHTML = `<p style="color:var(--text-light); font-size:0.85rem;">Aucun loyer en attente de relance.</p>`;
        return;
    }

    biensLoues.forEach(b => {
        const card = document.createElement("div");
        card.className = "form-card";
        card.style.borderLeft = "4px solid var(--gold)";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <b>${b.nom}</b><br>
                    <small>Locataire : ${b.locataireNom} (${b.locataireTel || 'Pas de numéro'})</small>
                </div>
                <button class="btn-danger" style="background:var(--gold); font-size:0.75rem; padding:5px 10px;" onclick="window.relancerPaiementWhatsApp('${b.id}')">
                    <i class="fab fa-whatsapp"></i> Relancer
                </button>
            </div>
        `;
        relancesContainer.appendChild(card);
    });
}

window.relancerPaiementWhatsApp = function(bienId) {
    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;
    let msg = `Bonjour ${b.locataireNom}, sauf erreur de notre part, le loyer mensuel pour le bien *${b.nom}* d'un montant de *${new Intl.NumberFormat('fr-FR').format(b.loyer)} CFA* est arrivé à échéance. Merci de régulariser via Wave, OM ou directement à l'agence.`;
    let tel = b.locataireTel ? b.locataireTel.replace(/\s+/g, '') : "";
    if (tel && !tel.startsWith("+") && tel.length === 9) tel = "221" + tel;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.filterBiens = function(status, event) {
    currentFilterStatus = status;
    document.querySelectorAll(".tabs .tab-btn").forEach(btn => btn.classList.remove("active"));
    if (event) event.target.classList.add("active");
    renderBiens();
};

window.renderBiens = function() {
    const listEl = document.getElementById("biens-list");
    if (!listEl) return;
    const searchVal = document.getElementById("search-bien-input").value.toLowerCase();
    listEl.innerHTML = "";

    const filtrés = localBiens.filter(b => {
        const matchStatus = b.statut === currentFilterStatus;
        const matchSearch = (b.nom && b.nom.toLowerCase().includes(searchVal)) || 
                            (b.adresse && b.adresse.toLowerCase().includes(searchVal)) ||
                            (b.proprioNom && b.proprioNom.toLowerCase().includes(searchVal));
        return matchStatus && matchSearch;
    });

    if (filtrés.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; color:var(--text-light); padding:20px;">Aucun bien disponible.</p>`;
        return;
    }

    filtrés.forEach(b => {
        const card = document.createElement("div");
        card.className = "form-card";
        card.style.cursor = "pointer";
        card.onclick = () => ouvrirModalBien(b);

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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid var(--border); padding-top:8px;">
                <b style="color:var(--gold); font-size:1rem;">${new Intl.NumberFormat('fr-FR').format(b.loyer)} CFA /mois</b>
                <span style="font-size:0.75rem; font-weight:600; background:var(--bg); padding:4px 8px; border-radius:6px;">📄 ${b.papier || 'N/A'}</span>
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
// FORMULAIRE AJOUT / EDITION DE BIEN
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

window.saveBien = async function() {
    const btn = document.getElementById("btn-save-bien");
    const id = document.getElementById("edit-bien-id").value;
    const nom = document.getElementById("new-bien-nom").value.trim();
    const loyer = parseFloat(document.getElementById("new-bien-loyer").value) || 0;

    if (!nom || !loyer) {
        alert("Nom et Loyer obligatoires.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Sauvegarde...";

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
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            payload.locataireNom = document.getElementById("edit-bien-locataire").value.trim();
            payload.locataireTel = document.getElementById("edit-bien-locataire-tel").value.trim();
            payload.dateEntree = document.getElementById("edit-bien-date-entree").value;
            payload.statut = (payload.locataireNom) ? "Occupé" : "Disponible";
            await window.fsUpdateDoc(window.fsDoc(window.db, "biens", id), payload);
        } else {
            payload.statut = "Disponible";
            payload.createdAt = new Date().toISOString();
            await window.fsSetDoc(window.fsDoc(window.fsCollection(window.db, "biens")), payload);
        }
        await chargerBiensCloud();
        showView("biens");
    } catch (e) {
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerText = "Enregistrer";
    }
};

// ==========================================
// MODAL DÉTAILS & HISTORIQUE DES TRANSACTIONS
// ==========================================
window.ouvrirModalBien = function(bien) {
    const body = document.getElementById("modal-body");
    const historyBox = document.getElementById("modal-transactions-history");
    if (!body || !historyBox) return;

    body.innerHTML = `
        <h3 style="color:var(--dark);">${bien.nom}</h3>
        <p style="font-size:0.85rem; color:var(--text-light); margin-bottom:10px;"><i class="fas fa-map-marker-alt"></i> ${bien.adresse || 'N/A'}</p>
        
        <table class="table-suivi">
            <tr><th>Type / Papier</th><td>${bien.type} (${bien.papier})</td></tr>
            <tr><th>Loyer</th><td><b style="color:var(--gold);">${new Intl.NumberFormat('fr-FR').format(bien.loyer)} CFA</b></td></tr>
            <tr><th>Propriétaire</th><td>${bien.proprioNom || 'N/A'} (${bien.proprioTel || 'N/A'})</td></tr>
            <tr><th>Statut</th><td><b>${bien.statut}</b></td></tr>
            ${bien.statut === 'Occupé' ? `
                <tr style="background:#F0FDF4;"><th style="color:var(--green);">Locataire</th><td><b>${bien.locataireNom}</b></td></tr>
                <tr style="background:#F0FDF4;"><th style="color:var(--green);">Téléphone</th><td>${bien.locataireTel}</td></tr>
            ` : ''}
        </table>

        <div style="margin-top:15px;">
            <button class="btn-primary" onclick="window.preparerEditionBien('${bien.id}')"><i class="fas fa-edit"></i> Modifier / Louer le bien</button>
        </div>
    `;

    // Filtre et construction de l'historique financier réel du bien cliqué
    const filtrées = localTransactions.filter(t => t.bienId === bien.id);
    historyBox.innerHTML = "";
    
    if (filtrées.length === 0) {
        historyBox.innerHTML = `<p style="font-size:0.8rem; color:var(--text-light);">Aucun encaissement enregistré.</p>`;
    } else {
        const table = document.createElement("table");
        table.innerHTML = `<tr><th>Date</th><th>Nature</th><th>Montant</th><th>Mode</th></tr>`;
        filtrées.forEach(t => {
            table.innerHTML += `
                <tr>
                    <td>${new Date(t.dateEnregistrement).toLocaleDateString('fr-FR')}</td>
                    <td><b>${t.nature}</b></td>
                    <td style="color:var(--green); font-weight:700;">${new Intl.NumberFormat('fr-FR').format(t.montant)}</td>
                    <td><span class="user-badge" style="background:var(--border);">${t.modePaiement}</span></td>
                </tr>`;
        });
        historyBox.appendChild(table);
    }

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
    document.getElementById("new-bien-papier").value = b.papier || "";
    document.getElementById("new-bien-loyer").value = b.loyer;
    document.getElementById("new-bien-adresse").value = b.adresse || "";
    document.getElementById("new-bien-com").value = b.commission || "";
    document.getElementById("new-bien-proprio").value = b.proprioNom || "";
    document.getElementById("new-bien-proprio-tel").value = b.proprioTel || "";
    
    document.getElementById("edit-only-fields").style.display = "block";
    document.getElementById("edit-bien-locataire").value = b.locataireNom || "";
    document.getElementById("edit-bien-locataire-tel").value = b.locataireTel || "";
    document.getElementById("edit-bien-date-entree").value = b.dateEntree || "";

    showView("ajouter-bien");
};

// ==========================================
// AUTOMATISATION DE L'ENCAISSEUR
// ==========================================
window.analyserReliquatComptable = function() {
    const bienId = document.getElementById("c-bien-select").value;
    const typeFlux = document.getElementById("c-type").value;
    const statusBox = document.getElementById("c-live-status");
    
    if (!bienId) {
        if (statusBox) statusBox.style.display = "none";
        return;
    }

    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    statusBox.style.display = "block";
    statusBox.style.background = "var(--gold-light)";
    statusBox.style.color = "#9A3412";
    
    if (typeFlux === "Loyer") {
        statusBox.innerHTML = `👤 <b>Locataire :</b> ${b.locataireNom}<br>💰 <b>Montant Loyer :</b> ${new Intl.NumberFormat('fr-FR').format(b.loyer)} CFA`;
        document.getElementById("c-montant").value = b.loyer;
    } else if (typeFlux === "Caution") {
        statusBox.innerHTML = `👤 <b>Locataire :</b> ${b.locataireNom}<br>🔑 <b>Caution Standard (2 mois) :</b> ${new Intl.NumberFormat('fr-FR').format(b.loyer * 2)} CFA`;
        document.getElementById("c-montant").value = b.loyer * 2;
    } else {
        statusBox.innerHTML = `👤 <b>Locataire :</b> ${b.locataireNom}`;
        document.getElementById("c-montant").value = "";
    }
};

window.validerCollecte = async function(cibleNotification) {
    const bienId = document.getElementById("c-bien-select").value;
    const typeFlux = document.getElementById("c-type").value;
    const montant = document.getElementById("c-montant").value;
    const mode = document.querySelector('input[name="pay-mode"]:checked').value;

    if (!bienId || !montant) return alert("Données manquantes.");

    const b = localBiens.find(x => x.id === bienId);
    if (!b) return;

    try {
        await window.fsSetDoc(window.fsDoc(window.fsCollection(window.db, "transactions")), {
            bienId: bienId, bienNom: b.nom, locataireNom: b.locataireNom,
            montant: parseFloat(montant), nature: typeFlux, modePaiement: mode,
            dateEnregistrement: new Date().toISOString()
        });
        
        let recu = `🧾 *REÇU NUMÉRIQUE - SAMA GESTION PRO*\n-------------------------------------------\n🏠 *Bien :* ${b.nom}\n👤 *Locataire :* ${b.locataireNom}\n💵 *Montant Perçu :* ${new Intl.NumberFormat('fr-FR').format(montant)} CFA\n🎯 *Nature :* ${typeFlux}\n💳 *Mode :* ${mode}\n📅 *Date :* ${new Date().toLocaleDateString('fr-FR')}\n-------------------------------------------\n✅ _Paiement validé avec succès._`;
        let tel = (cibleNotification === "locataire") ? b.locataireTel : b.proprioTel;
        if (tel) {
            tel = tel.replace(/\s+/g, '');
            if (!tel.startsWith("+") && tel.length === 9) tel = "221" + tel;
            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(recu)}`, '_blank');
        }
        await chargerTransactionsCloud();
        await chargerBiensCloud();
        showView("dashboard");
    } catch(e) { console.error(e); }
};

// ==========================================
// PIPELINE DES VISITES PROSPECTS
// ==========================================
window.sauverVisite = async function() {
    const nom = document.getElementById("p-name").value.trim();
    const tel = document.getElementById("p-tel").value.trim();
    const bienId = document.getElementById("p-bien-select").value;
    const dateVisite = document.getElementById("p-date").value;

    if (!nom || !bienId || !dateVisite) return alert("Données requises.");
    const b = localBiens.find(x => x.id === bienId);

    try {
        await window.fsSetDoc(window.fsDoc(window.fsCollection(window.db, "visites")), {
            prospectNom: nom, prospectTel: tel, bienId: bienId, bienNom: b.nom,
            dateRendezVous: dateVisite, statutPipeline: "Planifié", createdAt: new Date().toISOString()
        });
        document.getElementById("p-name").value = "";
        document.getElementById("p-tel").value = "";
        chargerVisitesCloud();
    } catch(e) { console.error(e); }
};

async function chargerVisitesCloud() {
    const listEl = document.getElementById("visites-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    try {
        const snap = await window.fsGetDocs(window.fsCollection(window.db, "visites"));
        snap.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const card = document.createElement("div");
            card.className = "form-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b>${data.prospectNom} (${data.prospectTel || 'Pas de numéro'})</b>
                    <span class="user-badge" style="background:var(--gold-light); color:var(--gold);">${data.statutPipeline}</span>
                </div>
                <p style="font-size:0.8rem; margin: 5px 0;">🏠 Bien : ${data.bienNom} | 📅 RDV : ${new Date(data.dateRendezVous).toLocaleString('fr-FR')}</p>
                <div style="display:flex; gap:5px; margin-top:8px;">
                    <button class="btn-outline" style="font-size:0.75rem; padding:4px;" onclick="window.changerStatutProspect('${id}', 'Débuté')">🏁 Débuter</button>
                    <button class="btn-outline" style="font-size:0.75rem; padding:4px;" onclick="window.changerStatutProspect('${id}', 'Qualifié')">💎 Qualifier</button>
                    <button class="btn-outline" style="font-size:0.75rem; padding:4px;" onclick="window.relancerProspect('${id}')"><i class="fab fa-whatsapp"></i> Relancer</button>
                </div>
            `;
            listEl.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

window.changerStatutProspect = async function(docId, nouveauStatut) {
    try {
        await window.fsUpdateDoc(window.fsDoc(window.db, "visites", docId), { statutPipeline: nouveauStatut });
        chargerVisitesCloud();
    } catch(e) { console.error(e); }
};

window.relancerProspect = async function(docId) {
    try {
        const docRef = await window.fsGetDoc(window.fsDoc(window.db, "visites", docId));
        if (!docRef.exists()) return;
        const data = docRef.data();
        let msg = `Bonjour ${data.prospectNom}, nous revenons vers vous concernant votre intérêt pour le bien immobilier *${data.bienNom}*. Avez-vous des questions ou souhaitez-vous bloquer la location ?`;
        let tel = data.prospectTel ? data.prospectTel.replace(/\s+/g, '') : "";
        if (tel && !tel.startsWith("+") && tel.length === 9) tel = "221" + tel;
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch(e) { console.error(e); }
};

// ==========================================
// GESTION DES PROFILS AGENTS
// ==========================================
window.creerProfilAgent = async function() {
    const name = document.getElementById("new-agent-name").value.trim();
    const email = document.getElementById("new-agent-email").value.trim();
    const role = document.getElementById("new-agent-role").value;

    if (!name || !email) return alert("Veuillez remplir les informations de l'agent.");

    try {
        alert("Pour des raisons de sécurité Firebase Auth, créez d'abord l'authentification de l'agent sur votre console Firebase. Ce bouton va maintenant initialiser sa fiche Firestore.");
        const fakeUid = "agent_" + Math.random().toString(36).substr(2, 9);
        await window.fsSetDoc(window.fsDoc(window.db, "users", fakeUid), {
            fullname: name,
            email: email,
            role: role,
            createdAt: new Date().toISOString()
        });
        alert(`Fiche profil de l'agent ${name} créée avec succès dans Firestore.`);
        document.getElementById("new-agent-name").value = "";
        document.getElementById("new-agent-email").value = "";
    } catch(e) { alert("Erreur de création de profil agent."); }
};

// ==========================================
// IMAGE COMPRESSION & UTILS PRORATA
// ==========================================
window.previewAndCompressImage = function(input, type) {
    const files = input.files;
    const container = type === 'bien' ? document.getElementById("previews-container") : document.getElementById("edl-previews-container");
    if (!container) return;
    container.innerHTML = "";
    
    for (let i = 0; i < Math.min(files.length, 3); i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.width = "65px"; img.style.height = "55px"; img.style.borderRadius = "4px";
            container.appendChild(img);
            if (type === 'bien') currentBienUploadedPhotos.push(e.target.result);
        };
        reader.readAsDataURL(files[i]);
    }
};

window.calculerProrataAutomatique = function() {
    const loyer = parseFloat(document.getElementById("new-bien-loyer").value) || 0;
    const dateStr = document.getElementById("edit-bien-date-entree").value;
    const box = document.getElementById("prorata-box");
    const res = document.getElementById("prorata-result");

    if (!loyer || !dateStr) return;
    const d = new Date(dateStr);
    const jour = d.getDate();
    const totalJours = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    if (box && res) {
        box.style.display = "block";
        if (jour === 1) {
            res.innerText = "Entrée le 1er du mois : Plein tarif.";
        } else {
            const dus = totalJours - jour + 1;
            const prorata = Math.round((loyer / totalJours) * dus);
            res.innerText = `Prorata (${dus} jours restants) : ${new Intl.NumberFormat('fr-FR').format(prorata)} CFA.`;
        }
    }
};

// ==========================================
// AUTRES FONCTIONS COMPLÉMENTAIRES EDL
// ==========================================
window.ouvrirFormulaireEDL = function() {
    remplirSelectsBiens();
    const container = document.getElementById("edl-rooms-container");
    if (!container) return;
    container.innerHTML = "";
    ROOMS_LIST.forEach((piece) => {
        const div = document.createElement("div");
        div.style.marginBottom = "5px";
        div.innerHTML = `<small><b>${piece}</b></small><select class="edl-state-select" data-room="${piece}"><option value="Excellent">✨ Excellent</option><option value="Bon état">👍 Bon état</option><option value="Moyen">⚠️ Moyen</option><option value="Dégradé">🚨 Dégradé</option></select>`;
        container.appendChild(div);
    });
    showView("nouveau-edl");
};

window.saveEDLCloud = async function() {
    const bienId = document.getElementById("edl-bien-select").value;
    if (!bienId) return alert("Sélectionnez un bien.");
    const b = localBiens.find(x => x.id === bienId);
    try {
        await window.fsSetDoc(window.fsDoc(window.fsCollection(window.db, "etats_lieux")), {
            bienId: bienId, bienNom: b.nom, type: document.getElementById("edl-type").value,
            dateCertificat: new Date().toISOString()
        });
        chargerEDLCloudList();
        showView("edl");
    } catch(e) { console.error(e); }
};

async function chargerEDLCloudList() {
    const listEl = document.getElementById("edl-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    try {
        const snap = await window.fsGetDocs(window.fsCollection(window.db, "etats_lieux"));
        snap.forEach(doc => {
            const data = doc.data();
            listEl.innerHTML += `<div class="form-card"><b>${data.bienNom}</b> - Constat d'${data.type}</div>`;
        });
    } catch(e) { console.error(e); }
}
