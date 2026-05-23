let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

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
    }
}

function toggleLocataire() {
    const statut = document.getElementById('statut').value;
    document.getElementById('locataire-fields').classList.toggle('hidden', statut !== 'Occupé');
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
}

function renderBiens() {
    const list = document.getElementById('list');
    list.innerHTML = appData.biens.map(b => `
        <div class="card">
            <strong>${b.nom}</strong><br>Proprio: ${b.proprio} (${b.telProprio})<br>
            Statut: ${b.statut} ${b.statut === 'Occupé' ? `<br>Locataire: ${b.locataire} (${b.telLocataire}) - Entrée: ${b.dateEntree}` : ''}
        </div>
    `).join('');
}
