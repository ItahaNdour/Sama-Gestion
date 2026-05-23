// Initialisation des données
let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

// Fonction pour charger le Dashboard (l'écran d'accueil)
function loadDashboard() {
    const root = document.getElementById('app-content');
    root.innerHTML = `
        <div class="today-container">
            <div class="card-small">Visite : 0</div>
            <div class="card-small">EDL : 0</div>
        </div>
        <div class="grid-modules">
            <div class="module-card" style="background: #2563EB;" onclick="loadModule('visites')">Visite</div>
            <div class="module-card" style="background: #D97706;" onclick="loadModule('edl')">EDL</div>
            <div class="module-card" style="background: #059669;" onclick="loadModule('collecte')">Collecter</div>
            <div class="module-card" style="background: #DC2626;" onclick="loadModule('biens')">Biens</div>
        </div>
        <div class="finance-card">
            <p>Total Loyers</p>
            <h3>0 CFA</h3>
        </div>
    `;
}

// Moteur de navigation
function loadModule(module) {
    const root = document.getElementById('app-content');
    if (module === 'biens') {
        root.innerHTML = `
            <div class="content-box">
                <h2>Ajouter un Bien</h2>
                <input type="text" id="nom" placeholder="Nom/Référence">
                <input type="text" id="proprio" placeholder="Nom Propriétaire">
                <input type="tel" id="telProprio" placeholder="Tel Propriétaire">
                <select id="statut" onchange="toggleLocataire()">
                    <option value="Libre">Libre</option>
                    <option value="Occupé">Occupé</option>
                </select>
                <div id="locataire-fields" class="hidden">
                    <input type="text" id="locataire" placeholder="Nom Locataire">
                    <input type="tel" id="telLocataire" placeholder="Tel Locataire">
                    <input type="date" id="dateEntree">
                </div>
                <button class="btn" onclick="saveBien()">Enregistrer</button>
                <hr>
                <div id="list"></div>
            </div>
        `;
        renderBiens();
    } else {
        root.innerHTML = `<div class="content-box"><h2>Module ${module}</h2><p>En construction...</p></div>`;
    }
}

function toggleLocataire() {
    const statut = document.getElementById('statut').value;
    const fields = document.getElementById('locataire-fields');
    if(statut === 'Occupé') {
        fields.classList.remove('hidden');
    } else {
        fields.classList.add('hidden');
    }
}

function saveBien() {
    const bien = {
        nom: document.getElementById('nom').value,
        proprio: document.getElementById('proprio').value,
        telProprio: document.getElementById('telProprio').value,
        statut: document.getElementById('statut').value,
        locataire: document.getElementById('locataire').value,
        telLocataire: document.getElementById('telLocataire').value,
        dateEntree: document.getElementById('dateEntree').value
    };
    appData.biens.push(bien);
    localStorage.setItem('sama_data', JSON.stringify(appData));
    renderBiens();
    alert('Bien enregistré !');
}

function renderBiens() {
    const list = document.getElementById('list');
    if (!list) return;
    list.innerHTML = appData.biens.map(b => `
        <div class="card">
            <strong>${b.nom}</strong><br>Proprio: ${b.proprio} (${b.telProprio})<br>
            Statut: ${b.statut} ${b.statut === 'Occupé' ? `<br>Locataire: ${b.locataire} (${b.telLocataire}) - Entrée: ${b.dateEntree}` : ''}
        </div>
    `).join('');
}

// IMPORTANT : Cette ligne lance le Dashboard au démarrage
document.addEventListener('DOMContentLoaded', loadDashboard);
