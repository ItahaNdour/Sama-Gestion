// 1. Initialisation des données persistantes
let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
const target = 10000000;

// 2. "Base de données" de tes biens
const mesBiens = [
    { id: 1, nom: "Villa Horizon", adresse: "Almadies, Dakar", loyer: 850000, statut: "Occupé" },
    { id: 2, nom: "Appartement Plateau", adresse: "Centre Ville", loyer: 450000, statut: "Libre" },
    { id: 3, nom: "Studio Ngor", adresse: "Ngor Virage", loyer: 250000, statut: "Occupé" },
    { id: 4, nom: "Résidence Keur Gorgui", adresse: "Sacré-Cœur", loyer: 600000, statut: "Libre" }
];

// 3. Mise à jour de l'interface principale
function updateUI() {
    const display = document.getElementById('totalDisplay');
    const bar = document.getElementById('gaugeFill');
    if (display && bar) {
        display.innerText = collected.toLocaleString() + " CFA";
        const percent = (collected / target) * 100;
        bar.style.width = Math.min(percent, 100) + "%";
    }
}

// 4. Gestionnaire de navigation et d'actions
function handleAction(id) {
    if (id === 'loyer') {
        collected += 500000;
        localStorage.setItem('sama_collected', collected);
        updateUI();
    } else {
        // Cache le dashboard et affiche le module
        document.getElementById('view-dashboard').style.display = 'none';
        const targetView = document.getElementById('view-' + id);
        if (targetView) {
            targetView.style.display = 'block';
            // Si on ouvre les biens, on génère la liste
            if (id === 'biens') displayBiens();
        } else {
            alert("Module " + id + " en cours de développement !");
            showDashboard();
        }
    }
}

// 5. Génération dynamique de la liste des biens
function displayBiens() {
    const container = document.getElementById('biens-list');
    container.innerHTML = ""; // Vide le conteneur

    mesBiens.forEach(bien => {
        const statusClass = bien.statut === "Libre" ? "status-libre" : "status-occupe";
        
        container.innerHTML += `
            <div class="bien-card">
                <div class="bien-info">
                    <h4>${bien.nom}</h4>
                    <p><i class="fa-solid fa-location-dot"></i> ${bien.adresse}</p>
                    <p><strong>${bien.loyer.toLocaleString()} CFA</strong> / mois</p>
                </div>
                <div class="status-badge ${statusClass}">
                    ${bien.statut}
                </div>
            </div>
        `;
    });
}

// 6. Fonctions Utilitaires
function showDashboard() {
    document.getElementById('view-dashboard').style.display = 'block';
    document.getElementById('view-etat').style.display = 'none';
    document.getElementById('view-biens').style.display = 'none';
}

function simulateCamera(zone, element) {
    element.classList.toggle('active');
}

function sendWhatsAppValidation() {
    const message = "Sama Gestion : État des lieux validé !";
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

// Lancement
window.onload = updateUI;
