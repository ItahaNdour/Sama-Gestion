let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

function loadDashboard() {
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
            <p>Total Loyers</p>
            <h3>0 CFA</h3>
        </div>
    `;
}

function loadModule(module) {
    const root = document.getElementById('app-content');
    if (module === 'biens') {
        root.innerHTML = `
            <div class="content-box">
                <h2>Nouveau Bien</h2>
                <input type="text" id="photo" placeholder="URL Photo (optionnel)">
                <input type="text" id="nom" placeholder="Nom du bien / Référence">
                <select id="type">
                    <option value="Appartement">Appartement</option>
                    <option value="Villa">Villa</option>
                    <option value="Studio">Studio</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Terrain">Terrain</option>
                </select>
                <input type="text" id="quartier" placeholder="Quartier">
                <input type="number" id="superficie" placeholder="Superficie (m2)">
                <input type="number" id="loyer" placeholder="Prix du Loyer (CFA)">
                <input type="text" id="doc" placeholder="Documents (ex: Titre foncier, bail)">
                
                <input type="text" id="proprio" placeholder="Nom Propriétaire">
                <input type="tel" id="telProprio" placeholder="Numéro Propriétaire">
                
                <select id="statut" onchange="toggleLocataire()">
                    <option value="Libre">Libre</option>
                    <option value="Occupé">Occupé</option>
                    <option value="Travaux">En travaux</option>
                </select>

                <div id="locataire-fields" class="hidden">
                    <input type="text" id="locataire" placeholder="Nom Locataire">
                    <input type="tel" id="telLocataire" placeholder="Numéro Locataire">
                    <input type="date" id="dateEntree">
                </div>
                
                <button class="btn" onclick="saveBien()">Enregistrer</button>
                <div id="list" style="margin-top:20px;"></div>
            </div>
        `;
        renderBiens();
    } else {
        root.innerHTML = `<div class="content-box"><h2>Module ${module}</h2><p>En construction...</p></div>`;
    }
}

function toggleLocataire() {
    const s = document.getElementById('statut').value;
    document.getElementById('locataire-fields').className = (s === 'Occupé') ? '' : 'hidden';
}

function saveBien() {
    const b = {
        photo: document.getElementById('photo').value,
        nom: document.getElementById('nom').value,
        type: document.getElementById('type').value,
        quartier: document.getElementById('quartier').value,
        superficie: document.getElementById('superficie').value,
        loyer: document.getElementById('loyer').value,
        doc: document.getElementById('doc').value,
        proprio: document.getElementById('proprio').value,
        telProprio: document.getElementById('telProprio').value,
        statut: document.getElementById('statut').value,
        locataire: document.getElementById('locataire').value,
        telLocataire: document.getElementById('telLocataire').value,
        dateEntree: document.getElementById('dateEntree').value
    };
    appData.biens.push(b);
    localStorage.setItem('sama_data', JSON.stringify(appData));
    renderBiens();
    alert('Bien enregistré !');
}

function renderBiens() {
    const list = document.getElementById('list');
    if(list) list.innerHTML = appData.biens.map(b => `
        <div class="card">
            <strong>${b.nom}</strong> (${b.type})<br>
            Quartier: ${b.quartier} - ${b.loyer} CFA<br>
            Proprio: ${b.proprio} (${b.telProprio})<br>
            Statut: ${b.statut} ${b.statut === 'Occupé' ? `<br>Locataire: ${b.locataire} (${b.telLocataire})` : ''}
        </div>`).join('');
}

document.addEventListener('DOMContentLoaded', loadDashboard);
