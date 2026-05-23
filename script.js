// --- SCRIPT COMPLET - SAMA GESTION ---

// 1. Initialisation des données
const DataManager = {
    init: () => {
        // Pour forcer la remise à zéro lors des tests, tu peux décommenter la ligne suivante :
        // localStorage.removeItem('sama_gestion_data');
        
        if (!localStorage.getItem('sama_gestion_data')) {
            const initialData = {
                users: [
                    { id: 'admin', email: 'admin@sama.com', password: 'password', role: 'admin' },
                    { id: 'courtier1', email: 'courtier@test.com', password: 'password', role: 'courtier' }
                ],
                biens: []
            };
            localStorage.setItem('sama_gestion_data', JSON.stringify(initialData));
            console.log("Base de données initialisée");
        }
    },
    getCollection: (name) => JSON.parse(localStorage.getItem('sama_gestion_data'))[name] || [],
    
    saveBien: (bienData) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        const user = JSON.parse(sessionStorage.getItem('user'));
        
        bienData.id = 'bien_' + Date.now();
        bienData.createdBy = user.id;
        
        data.biens.push(bienData);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

// 2. Auth & Navigation
const Auth = {
    login: (email, password) => {
        const users = DataManager.getCollection('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            sessionStorage.setItem('user', JSON.stringify(user));
            return true;
        }
        return false;
    }
};

function naviguerVers(viewId) {
    if (viewId !== 'view-login' && !sessionStorage.getItem('user')) viewId = 'view-login';
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    if (viewId === 'view-liste') afficherListeBiens();
}

// 3. Affichage
function afficherListeBiens() {
    const conteneur = document.getElementById('liste-biens-container');
    const allBiens = DataManager.getCollection('biens');
    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    
    if (!currentUser) return;

    const biensAffiches = (currentUser.role === 'admin') 
        ? allBiens 
        : allBiens.filter(b => b.createdBy === currentUser.id);

    conteneur.innerHTML = biensAffiches.map(b => `
        <div class="card-bien">
            <h3>${b.nom}</h3>
            <p>${b.adresse}</p>
        </div>
    `).join('');
}

// 4. Events
DataManager.init();

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    if (Auth.login(email, pass)) {
        naviguerVers('view-liste');
    } else {
        alert("Identifiants incorrects");
    }
});

document.getElementById('form-bien').addEventListener('submit', (e) => {
    e.preventDefault();
    DataManager.saveBien({
        nom: document.getElementById('nom').value,
        adresse: document.getElementById('adresse').value
    });
    naviguerVers('view-liste');
});
