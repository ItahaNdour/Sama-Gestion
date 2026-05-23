// --- 1. MOTEUR DE STOCKAGE ---
const DataManager = {
    init: () => {
        if (!localStorage.getItem('sama_gestion_data')) {
            localStorage.setItem('sama_gestion_data', JSON.stringify({ biens: [] }));
        }
    },
    getCollection: (name) => JSON.parse(localStorage.getItem('sama_gestion_data'))[name] || [],
    saveDocument: (collectionName, docData) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        docData.id = docData.id || 'bien_' + Date.now();
        data[collectionName].push(docData);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    },
    deleteDocument: (collectionName, id) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        data[collectionName] = data[collectionName].filter(item => item.id !== id);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

// --- 2. NAVIGATION ---
function naviguerVers(viewId) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    if (viewId === 'view-liste') afficherListeBiens();
}

// --- 3. GESTION DES BIENS ---
function afficherListeBiens() {
    const conteneur = document.getElementById('liste-biens-container');
    const biens = DataManager.getCollection('biens');
    conteneur.innerHTML = biens.map(b => `
        <div class="card-bien">
            <div class="bien-img"></div>
            <h3>${b.nom}</h3>
            <p>${b.adresse}</p>
            <span class="com-badge">${b.type}</span>
            <div class="proprio-info">Propriétaire : ${b.proprio}</div>
            <button onclick="supprimerBien('${b.id}')">Supprimer</button>
        </div>
    `).join('');
}

function supprimerBien(id) {
    DataManager.deleteDocument('biens', id);
    afficherListeBiens();
}

// Initialisation
DataManager.init();
document.getElementById('form-bien').addEventListener('submit', (e) => {
    e.preventDefault();
    const nouveauBien = {
        nom: document.getElementById('nom').value,
        adresse: document.getElementById('adresse').value,
        type: document.getElementById('type').value,
        proprio: document.getElementById('proprio').value
    };
    DataManager.saveDocument('biens', nouveauBien);
    e.target.reset();
    naviguerVers('view-liste');
});

// Premier affichage
afficherListeBiens();
