// --- MOTEUR DE DONNÉES ---
const DataManager = {
    init: () => {
        if (!localStorage.getItem('sama_gestion_data')) {
            localStorage.setItem('sama_gestion_data', JSON.stringify({ biens: [] }));
        }
    },
    getCollection: (name) => JSON.parse(localStorage.getItem('sama_gestion_data'))[name] || [],
    saveDocument: (collectionName, docData) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        docData.id = 'bien_' + Date.now();
        data[collectionName].push(docData);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

// --- AUTHENTIFICATION ---
const Auth = {
    login: (email, password) => {
        if (email === "admin@sama.com" && password === "password") {
            sessionStorage.setItem('isLoggedIn', 'true');
            return true;
        }
        return false;
    }
};

// --- NAVIGATION ---
function naviguerVers(viewId) {
    if (viewId !== 'view-login' && !sessionStorage.getItem('isLoggedIn')) viewId = 'view-login';
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    if (viewId === 'view-liste') afficherListeBiens();
}

// --- GESTION DES BIENS ---
function afficherListeBiens() {
    const conteneur = document.getElementById('liste-biens-container');
    const biens = DataManager.getCollection('biens');
    conteneur.innerHTML = biens.map(b => `
        <div class="card-bien">
            <h3>${b.nom}</h3>
            <p>${b.adresse}</p>
            <span>${b.type}</span>
        </div>
    `).join('');
}

// --- INITIALISATION ---
DataManager.init();
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    if (Auth.login(document.getElementById('email').value, document.getElementById('password').value)) {
        naviguerVers('view-liste');
    } else {
        alert("Accès refusé");
    }
});

document.getElementById('form-bien').addEventListener('submit', (e) => {
    e.preventDefault();
    DataManager.saveDocument('biens', {
        nom: document.getElementById('nom').value,
        adresse: document.getElementById('adresse').value,
        type: document.getElementById('type').value,
        proprio: document.getElementById('proprio').value
    });
    naviguerVers('view-liste');
});
