// Initialisation des données locales
let appData = JSON.parse(localStorage.getItem('sama_gestion')) || {
    biens: [],
    collecte: [],
    totalCollecte: 0
};

// Fonction pour charger le Dashboard (l'écran principal)
function loadDashboard() {
    const root = document.getElementById('app-content');
    root.innerHTML = `
        <div class="today-container">
            <div class="card-small">📅 Visite 10h<br>Modou Diouf</div>
            <div class="card-small">📋 EDL<br>Fatou Cissé</div>
        </div>
        <div class="grid-modules">
            <div class="module-card" style="background: #2563EB;" onclick="loadModule('visites')">Visite</div>
            <div class="module-card" style="background: #D97706;" onclick="loadModule('edl')">État des lieux</div>
            <div class="module-card" style="background: #059669;" onclick="loadModule('collecte')">Collecter Loyer</div>
            <div class="module-card" style="background: #DC2626;" onclick="loadModule('biens')">Mes Biens</div>
        </div>
        <div class="finance-card">
            <div style="font-size: 0.9rem; color: #666;">Total Loyers Collectés</div>
            <div style="font-size: 1.5rem; font-weight: bold;">${appData.totalCollecte.toLocaleString()} CFA</div>
        </div>
    `;
}

// Moteur de chargement des modules
function loadModule(module) {
    const root = document.getElementById('app-content');
    root.innerHTML = `<div style="padding: 20px;"><h1>Module ${module.toUpperCase()}</h1><p>En construction...</p></div>`;
}

// Lancement au démarrage
loadDashboard();
