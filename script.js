// --- 1. BASE DE DONNÉES LOCALES (SIMULÉE AVEC LOCALSTORAGE) ---
let database = JSON.parse(localStorage.getItem('immo_db')) || {
    biens: [],
    locataires: [],
    transactions: []
};

// Fonction pour sauvegarder l'état dans le LocalStorage
function saveToStorage() {
    localStorage.setItem('immo_db', JSON.stringify(database));
    updateDashboardCounters();
    populateDropdowns();
}

// --- 2. GESTION DE LA NAVIGATION (VUES) ---
function switchView(viewId) {
    // Masquer toutes les vues
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active-view');
    });
    // Afficher la vue demandée
    document.getElementById(viewId).classList.add('active-view');
    
    // Si on charge l'historique, rafraîchir la liste automatiquement
    if(viewId === 'view-historique') {
        renderTransactions('tous');
    }
}

// --- 3. PREVIEW IMAGE (AJOUT BIENS) ---
function previewImages(input) {
    const container = document.getElementById('previews-container');
    container.innerHTML = ''; // Reset les anciennes miniatures
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('preview-img');
                container.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    }
}

// --- 4. ENREGISTREMENT DES BIENS ---
function saveBien(event) {
    event.preventDefault();
    const nom = document.getElementById('bien-nom').value;
    const type = document.getElementById('bien-type').value;
    const loyer = parseFloat(document.getElementById('bien-loyer').value);
    const charges = parseFloat(document.getElementById('bien-charges').value);

    const nouveauBien = {
        id: 'b_' + Date.now(),
        nom: nom,
        type: type,
        loyerHC: loyer,
        charges: charges,
        totalCC: loyer + charges
    };

    database.biens.push(nouveauBien);
    saveToStorage();

    alert('Bien immobilier enregistré avec succès !');
    document.getElementById('form-bien').reset();
    document.getElementById('previews-container').innerHTML = '';
    switchView('view-dashboard');
}

// --- 5. ENREGISTREMENT DES LOCATAIRES ---
function saveLocataire(event) {
    event.preventDefault();
    const nom = document.getElementById('loc-nom').value;
    const tel = document.getElementById('loc-tel').value;
    const email = document.getElementById('loc-email').value;
    const bienId = document.getElementById('loc-bien-select').value;
    const dateEntree = document.getElementById('loc-date-entree').value;

    const trouveBien = database.biens.find(b => b.id === bienId);

    const nouveauLocataire = {
        id: 'l_' + Date.now(),
        nom: nom,
        tel: tel,
        email: email,
        bienId: bienId,
        bienNom: trouveBien ? trouveBien.nom : 'Inconnu',
        loyerTotal: trouveBien ? trouveBien.totalCC : 0,
        dateEntree: dateEntree
    };

    database.locataires.push(nouveauLocataire);
    saveToStorage();

    alert('Contrat locataire créé et activé !');
    document.getElementById('form-locataire').reset();
    switchView('view-dashboard');
}

// --- 6. GESTION DES MENUS DÉROULANTS DYNAMIQUES (DROPDOWNS) ---
function populateDropdowns() {
    const locBienSelect = document.getElementById('loc-bien-select');
    const payLocSelect = document.getElementById('pay-locataire-select');

    if (!locBienSelect || !payLocSelect) return;

    // Réinitialisation des menus
    locBienSelect.innerHTML = '<option value="">-- Choisir un bien disponible --</option>';
    payLocSelect.innerHTML = '<option value="">-- Sélectionner --</option>';

    // Injecter les biens créés
    database.biens.forEach(bien => {
        const estOccupe = database.locataires.some(l => l.bienId === bien.id);
        const suffixe = estOccupe ? ' (Occupé)' : '';
        locBienSelect.innerHTML += `<option value="${bien.id}">${bien.nom} - ${bien.totalCC}€ ${suffixe}</option>`;
    });

    // Injecter les locataires créés
    database.locataires.forEach(loc => {
        payLocSelect.innerHTML += `<option value="${loc.id}">${loc.nom} (${loc.bienNom})</option>`;
    });
}

// Remplissage automatique du montant selon le locataire sélectionné
function autoFillAmount() {
    const locId = document.getElementById('pay-locataire-select').value;
    const locataire = database.locataires.find(l => l.id === locId);
    if(locataire) {
        document.getElementById('pay-montant').value = locataire.loyerTotal;
    } else {
        document.getElementById('pay-montant').value = '';
    }
}

// --- 7. TRAITEMENT DE L'ENCAISSEMENT & DU REÇU ---
function processEncaissement(event) {
    event.preventDefault();
    const locId = document.getElementById('pay-locataire-select').value;
    const montant = parseFloat(document.getElementById('pay-montant').value);
    const mode = document.querySelector('input[name="mode-paiement"]:checked').value;
    const periode = document.getElementById('pay-periode').value;

    const locataire = database.locataires.find(l => l.id === locId);

    if(!locataire) return alert("Sélectionnez un locataire valide.");

    const transaction = {
        id: 't_' + Date.now(),
        locataireNom: locataire.nom,
        bienNom: locataire.bienNom,
        montant: montant,
        mode: mode,
        periode: periode,
        dateAction: new Date().toLocaleDateString('fr-FR')
    };

    database.transactions.push(transaction);
    saveToStorage();

    // Remplir les champs de la boîte de dialogue modale (reçu)
    document.getElementById('modal-loc').innerText = transaction.locataireNom;
    document.getElementById('modal-bien').innerText = transaction.bienNom;
    document.getElementById('modal-periode').innerText = transaction.periode;
    document.getElementById('modal-methode').innerText = transaction.mode;
    document.getElementById('modal-montant').innerText = transaction.montant.toFixed(2) + ' €';

    // Ouvrir la modal de succès
    document.getElementById('receipt-modal').style.display = 'flex';
    document.getElementById('form-encaissement').reset();
}

function closeModal() {
    document.getElementById('receipt-modal').style.display = 'none';
    switchView('view-dashboard');
}

// --- 8. CALCULS DES COMPTEURS DU TABLEAU DE BORD ---
function updateDashboardCounters() {
    const total = database.transactions.reduce((sum, current) => sum + current.montant, 0);
    const element = document.getElementById('total-revenue');
    if (element) {
        element.innerText = total.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
    }
}

// --- 9. FILTRES D'ONGLETS ET CONSTRUCION DE L'HISTORIQUE ---
function switchTab(mode) {
    const btns = document.querySelectorAll('.tabs-container .tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    if(event && event.target) {
        event.target.classList.add('active');
    }

    renderTransactions(mode);
}

function renderTransactions(filterMode) {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    container.innerHTML = '';

    // Application du filtre
    const listeFiltree = filterMode === 'tous' 
        ? database.transactions 
        : database.transactions.filter(t => t.mode === filterMode);

    if(listeFiltree.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#64748b; font-size:0.9rem; margin-top:30px;">Aucune transaction enregistrée.</p>`;
        return;
    }

    // Afficher les transactions du plus récent au plus ancien
    [...listeFiltree].reverse().forEach(t => {
        container.innerHTML += `
            <div class="form-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; margin-bottom:10px;">
                <div>
                    <p style="margin:0; font-weight:bold; font-size:0.95rem;">${t.locataireNom}</p>
                    <p style="margin:2px 0 0; color:#64748b; font-size:0.75rem;">${t.bienNom} • ${t.periode}</p>
                    <span style="display:inline-block; margin-top:5px; font-size:0.7rem; background:#E0E7FF; color:var(--blue); padding:2px 8px; border-radius:8px; font-weight:bold;">${t.mode}</span>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-weight:bold; color:var(--green); font-size:1.1rem;">+ ${t.montant.toFixed(2)} €</p>
                    <p style="margin:2px 0 0; color:#94a3b8; font-size:0.7rem;">${t.dateAction}</p>
                </div>
            </div>
        `;
    });
}

// --- 10. INITIALISATION AU LANCEMENT ---
window.onload = function() {
    updateDashboardCounters();
    populateDropdowns();
};
