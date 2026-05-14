let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
const target = 10000000;

const mesBiens = [
    { id: 1, nom: "Villa Horizon", adresse: "Almadies, Dakar", loyer: 850000, statut: "Occupé" },
    { id: 2, nom: "Appartement Plateau", adresse: "Centre Ville", loyer: 450000, statut: "Libre" },
    { id: 3, nom: "Studio Ngor", adresse: "Ngor Virage", loyer: 250000, statut: "Occupé" },
    { id: 4, nom: "Résidence Keur Gorgui", adresse: "Sacré-Cœur", loyer: 600000, statut: "Libre" }
];

function updateUI() {
    const display = document.getElementById('totalDisplay');
    const bar = document.getElementById('gaugeFill');
    if (display && bar) {
        display.innerText = collected.toLocaleString() + " CFA";
        const percent = (collected / target) * 100;
        bar.style.width = Math.min(percent, 100) + "%";
    }
}

function handleAction(id) {
    if (id === 'loyer') {
        collected += 500000;
        localStorage.setItem('sama_collected', collected);
        updateUI();
    } else {
        const targetView = document.getElementById('view-' + id);
        if (targetView) {
            document.getElementById('view-dashboard').style.display = 'none';
            targetView.style.display = 'block';
            if (id === 'biens') displayBiens(mesBiens);
        }
    }
}

// Affiche la liste (peut prendre une liste filtrée en entrée)
function displayBiens(liste) {
    const container = document.getElementById('biens-list');
    if (!container) return;
    container.innerHTML = "";
    liste.forEach(bien => {
        const statusClass = bien.statut === "Libre" ? "status-libre" : "status-occupe";
        container.innerHTML += `
            <div class="bien-card">
                <div class="bien-info">
                    <h4>${bien.nom}</h4>
                    <p><i class="fa-solid fa-location-dot"></i> ${bien.adresse}</p>
                    <p><strong>${bien.loyer.toLocaleString()} CFA</strong> / mois</p>
                </div>
                <div class="status-badge ${statusClass}">${bien.statut}</div>
            </div>
        `;
    });
}

// FONCTION DE RECHERCHE
function filterBiens() {
    const text = document.getElementById('searchInput').value.toLowerCase();
    const filtrage = mesBiens.filter(bien => 
        bien.nom.toLowerCase().includes(text) || 
        bien.adresse.toLowerCase().includes(text)
    );
    displayBiens(filtrage);
}

function showDashboard() {
    document.getElementById('view-dashboard').style.display = 'block';
    document.getElementById('view-etat').style.display = 'none';
    document.getElementById('view-biens').style.display = 'none';
}

function simulateCamera(zone, element) { element.classList.toggle('active'); }

function sendWhatsAppValidation() {
    window.open(`https://wa.me/?text=${encodeURIComponent("Sama Gestion : État des lieux validé !")}`, "_blank");
}

window.onload = updateUI;
