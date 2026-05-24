let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [] };

function loadDashboard() {
    document.getElementById('app-content').innerHTML = `
        <div class="content-box"><h2>Dashboard</h2><p>Bienvenue sur Sama Gestion.</p></div>
    `;
}

function loadModule(module) {
    const root = document.getElementById('app-content');
    if (module === 'biens') {
        root.innerHTML = `
            <div class="content-box">
                <h2>Mes Biens</h2>
                <input type="text" id="nom" placeholder="Nom/Référence">
                <input type="text" id="locataire" placeholder="Nom Locataire">
                <input type="tel" id="telLocataire" placeholder="Tel Locataire (ex: 22177... )">
                <select id="statut" onchange="toggleLocataire()">
                    <option value="Libre">Libre</option>
                    <option value="Occupé">Occupé</option>
                </select>
                <button class="btn" onclick="saveBien()">Enregistrer</button>
                <div id="list" style="margin-top:20px;"></div>
            </div>
        `;
        renderBiens();
    }
}

function saveBien() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('nom').value,
        locataire: document.getElementById('locataire').value,
        tel: document.getElementById('telLocataire').value,
        statut: document.getElementById('statut').value,
        paiements: []
    };
    appData.biens.push(b);
    localStorage.setItem('sama_data', JSON.stringify(appData));
    renderBiens();
}

function renderBiens() {
    const list = document.getElementById('list');
    list.innerHTML = appData.biens.map(b => `
        <div class="card" onclick="showFiche(${b.id})">
            <strong>${b.nom}</strong><br>Locataire: ${b.locataire || 'N/A'}
        </div>
    `).join('');
}

function showFiche(id) {
    const b = appData.biens.find(x => x.id === id);
    document.getElementById('app-content').innerHTML = `
        <div class="content-box">
            <h2>Fiche : ${b.nom}</h2>
            <button class="btn" onclick="sendWhatsApp('${b.tel}')">Rappel WhatsApp</button>
            <div id="historique">
                <h3>Historique</h3>
                ${b.paiements.map(p => `<p>${p.date} - ${p.type} : ${p.montant} CFA (${p.moyen})</p>`).join('')}
            </div>
        </div>
    `;
}

function sendWhatsApp(tel) {
    if(!tel) { alert("Numéro manquant"); return; }
    window.location.href = `https://wa.me/${tel}?text=Bonjour, nous vous rappelons que votre loyer est en attente.`;
}

document.addEventListener('DOMContentLoaded', loadDashboard);
