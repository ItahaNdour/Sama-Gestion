let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

function loadDashboard() {
    document.getElementById('app-content').innerHTML = `
        <div class="today-container"><div class="card-small">Visite : 0</div><div class="card-small">EDL : 0</div></div>
        <div class="grid-modules">
            <div class="module-card" style="background: #2563EB;" onclick="loadModule('visites')">Visite</div>
            <div class="module-card" style="background: #D97706;" onclick="loadModule('edl')">EDL</div>
            <div class="module-card" style="background: #059669;" onclick="loadModule('collecte')">Collecter</div>
            <div class="module-card" style="background: #DC2626;" onclick="loadModule('biens')">Biens</div>
        </div>
        <div class="finance-card"><p>Total Loyers</p><h3>0 CFA</h3></div>
    `;
}

function renderBiensUI(filter = '') {
    const libres = appData.biens.filter(b => b.statut === 'Libre' && b.nom.toLowerCase().includes(filter.toLowerCase()));
    const occupes = appData.biens.filter(b => b.statut === 'Occupé' && b.nom.toLowerCase().includes(filter.toLowerCase()));

    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <input type="text" placeholder="Rechercher..." oninput="renderBiensUI(this.value)">
            <div class="stats-container"><div class="stat-card"><strong>Libres</strong><br>${libres.length}</div><div class="stat-card"><strong>Occupés</strong><br>${occupes.length}</div></div>
            <button class="btn" onclick="showAddForm()">+ Ajouter Bien</button>
            <div id="list">${[...libres, ...occupes].map(b => `<div class="card" onclick="showFiche(${b.id})"><strong>${b.nom}</strong><br>${b.statut}</div>`).join('')}</div>
        </div>
    `;
}

function showAddForm() {
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>Nouveau Bien</h2>
            <input type="text" id="nom" placeholder="Nom/Référence">
            <input type="number" id="loyer" placeholder="Loyer (CFA)">
            <select id="statut"><option value="Libre">Libre</option><option value="Occupé">Occupé</option></select>
            <input type="file" id="photos" accept="image/*" multiple capture="environment">
            <button class="btn" onclick="saveBien()">Enregistrer</button>
        </div>
    `;
}

async function saveBien() {
    const files = document.getElementById('photos').files;
    let photos = [];
    // Logique de compression basique (via lecture base64)
    for(let i=0; i<Math.min(files.length, 3); i++) {
        photos.push(await new Promise(r => {
            let reader = new FileReader();
            reader.onload = e => r(e.target.result);
            reader.readAsDataURL(files[i]);
        }));
    }
    const b = { 
        id: Date.now(), 
        nom: document.getElementById('nom').value, 
        loyer: document.getElementById('loyer').value,
        statut: document.getElementById('statut').value,
        commission: document.getElementById('loyer').value * 0.1,
        photos: photos,
        paiements: []
    };
    appData.biens.push(b);
    localStorage.setItem('sama_data', JSON.stringify(appData));
    renderBiensUI();
}

function showFiche(id) {
    const b = appData.biens.find(x => x.id === id);
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>${b.nom}</h2>
            <div>${b.photos.map(p => `<img src="${p}" class="photo-preview">`).join('')}</div>
            <p>Commission: ${b.commission} CFA</p>
            <button class="btn" onclick="window.open('https://wa.me/?text=Rappel paiement pour ${b.nom}')">Rappel WhatsApp</button>
            <h3>Historique</h3>
            <button class="btn" onclick="renderBiensUI()">Retour</button>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', loadDashboard);
