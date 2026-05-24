let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

// Fonction de calcul de total commission (Cumulative)
function getTotalCommissions() {
    return appData.biens.reduce((total, b) => total + (b.loyer * (b.commissionRate / 100)), 0);
}

function loadDashboard() {
    const totalCom = getTotalCommissions();
    document.getElementById('app-content').innerHTML = `
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
            <p>Total Commissions Cumulées</p>
            <h3>${totalCom.toLocaleString()} CFA</h3>
        </div>
    `;
}

function loadModule(module) {
    if (module === 'biens') renderBiensUI();
    else document.getElementById('app-content').innerHTML = `<h2>Module ${module}</h2>`;
}

function renderBiensUI(filter = '') {
    const root = document.getElementById('app-content');
    const filtered = appData.biens.filter(b => b.nom.toLowerCase().includes(filter.toLowerCase()));
    
    root.innerHTML = `
        <div class="content-box">
            <input type="text" placeholder="Rechercher..." oninput="renderBiensUI(this.value)">
            <button class="btn" onclick="showAddForm()">+ Ajouter Bien</button>
            <div id="list"></div>
        </div>
    `;
    document.getElementById('list').innerHTML = filtered.map(b => `
        <div class="card" onclick="showFiche(${b.id})">
            <strong>${b.nom}</strong><br>Loyer: ${b.loyer} | Comm: ${b.commissionRate}%
        </div>
    `).join('');
}

function showAddForm() {
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>Nouveau Bien</h2>
            <input type="text" id="nom" placeholder="Nom/Référence">
            <input type="number" id="loyer" placeholder="Loyer (CFA)">
            <input type="number" id="commissionRate" placeholder="% Commission">
            <select id="statut"><option value="Libre">Libre</option><option value="Occupé">Occupé</option></select>
            <button class="btn" onclick="saveBien()">Enregistrer</button>
        </div>
    `;
}

function saveBien() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('nom').value,
        loyer: parseFloat(document.getElementById('loyer').value),
        commissionRate: parseFloat(document.getElementById('commissionRate').value),
        statut: document.getElementById('statut').value
    };
    appData.biens.push(b);
    localStorage.setItem('sama_data', JSON.stringify(appData));
    renderBiensUI();
}

function showFiche(id) {
    const b = appData.biens.find(x => x.id === id);
    const comm = (b.loyer * (b.commissionRate / 100)).toLocaleString();
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>${b.nom}</h2>
            <p>Commission calculée : ${comm} CFA (${b.commissionRate}%)</p>
            <button class="btn" onclick="renderBiensUI()">Retour</button>
        </div>
    `;
}
