let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

function loadModule(module) {
    const root = document.getElementById('app-content');
    if (module === 'biens') {
        renderBiensUI();
    }
}

function renderBiensUI(filter = '') {
    const root = document.getElementById('app-content');
    const libres = appData.biens.filter(b => b.statut === 'Libre' && b.nom.toLowerCase().includes(filter.toLowerCase()));
    const occupes = appData.biens.filter(b => b.statut === 'Occupé' && b.nom.toLowerCase().includes(filter.toLowerCase()));

    root.innerHTML = `
        <div class="content-box">
            <input type="text" placeholder="Rechercher un bien..." oninput="renderBiensUI(this.value)">
            <div class="stats-container">
                <div class="stat-card"><strong>Libres</strong><br>${libres.length}</div>
                <div class="stat-card"><strong>Occupés</strong><br>${occupes.length}</div>
            </div>
            <button class="btn" onclick="showAddForm()">+ Ajouter Bien</button>
            <div id="list" style="margin-top:20px;"></div>
        </div>
    `;
    // Afficher la liste combinée
    document.getElementById('list').innerHTML = [...libres, ...occupes].map(b => `
        <div class="card" onclick="showFiche(${b.id})">
            <strong>${b.nom}</strong> - ${b.statut}
        </div>
    `).join('');
}

function showAddForm() {
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>Nouveau Bien</h2>
            <input type="text" id="nom" placeholder="Nom/Référence">
            <select id="statut"><option value="Libre">Libre</option><option value="Occupé">Occupé</option></select>
            <button class="btn" onclick="saveBien()">Enregistrer</button>
        </div>
    `;
}

function saveBien() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('nom').value,
        statut: document.getElementById('statut').value
    };
    appData.biens.push(b);
    localStorage.setItem('sama_data', JSON.stringify(appData));
    loadModule('biens');
}

function loadDashboard() { /* ... Dashboard inchangé ... */ }
