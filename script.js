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
        <div class="finance-card"><p>Total Commissions</p><h3>0 CFA</h3></div>
    `;
}

function loadModule(module) {
    if(module === 'biens') renderBiensUI();
    else document.getElementById('app-content').innerHTML = `<div class="content-box"><h2>Module ${module}</h2></div>`;
}

function renderBiensUI(filter = '') {
    const list = appData.biens.filter(b => b.nom.toLowerCase().includes(filter.toLowerCase()));
    const libres = list.filter(b => b.statut === 'Libre').length;
    const occupes = list.filter(b => b.statut === 'Occupé').length;
    
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <input type="text" placeholder="Rechercher..." oninput="renderBiensUI(this.value)">
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <div class="card" style="flex:1">Libres: ${libres}</div>
                <div class="card" style="flex:1">Occupés: ${occupes}</div>
            </div>
            <button class="btn" onclick="showAddForm()">+ Ajouter Bien</button>
            <div id="list">${list.map(b => `<div class="card" onclick="showFiche(${b.id})"><strong>${b.nom}</strong><br>Statut: ${b.statut}</div>`).join('')}</div>
        </div>
    `;
}

function showAddForm() {
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>Nouveau Bien</h2>
            <input type="text" id="nom" placeholder="Nom/Référence">
            <select id="type"><option value="Appartement">Appartement</option><option value="Villa">Villa</option></select>
            <input type="text" id="quartier" placeholder="Quartier">
            <input type="number" id="loyer" placeholder="Loyer">
            <input type="number" id="comm" placeholder="% Commission">
            <input type="text" id="proprio" placeholder="Nom Propriétaire">
            <input type="tel" id="telProprio" placeholder="Tel Propriétaire">
            <select id="statut" onchange="toggleLoc()"><option value="Libre">Libre</option><option value="Occupé">Occupé</option></select>
            <div id="locFields" class="hidden">
                <input type="text" id="loc" placeholder="Nom Locataire">
                <input type="tel" id="telLoc" placeholder="Tel Locataire">
            </div>
            <button class="btn" onclick="saveBien()">Enregistrer</button>
        </div>
    `;
}

function toggleLoc() {
    const s = document.getElementById('statut').value;
    document.getElementById('locFields').className = s === 'Occupé' ? '' : 'hidden';
}

function saveBien() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('nom').value,
        type: document.getElementById('type').value,
        quartier: document.getElementById('quartier').value,
        loyer: document.getElementById('loyer').value,
        comm: document.getElementById('comm').value,
        proprio: document.getElementById('proprio').value,
        telProprio: document.getElementById('telProprio').value,
        statut: document.getElementById('statut').value,
        loc: document.getElementById('loc').value,
        telLoc: document.getElementById('telLoc').value,
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
            <p>Propriétaire: ${b.proprio} (${b.telProprio})</p>
            ${b.statut === 'Occupé' ? `<p>Locataire: ${b.loc} (${b.telLoc})</p>` : ''}
            <button class="btn" onclick="window.location.href='https://wa.me/${b.telLoc}'">Rappel WhatsApp Locataire</button>
            <h3>Historique Paiements</h3>
            <button class="btn" onclick="renderBiensUI()">Retour</button>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', loadDashboard);
