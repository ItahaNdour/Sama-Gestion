// --- MOTEUR DE DONNÉES ---
const DataManager = {
    init: () => {
        if (!localStorage.getItem('sama_gestion_data')) {
            const initialData = {
                users: [
                    { id: 'admin', email: 'admin@sama.com', password: 'password', role: 'admin' },
                    { id: 'courtier1', email: 'courtier@test.com', password: 'password', role: 'courtier' }
                ],
                biens: []
            };
            localStorage.setItem('sama_gestion_data', JSON.stringify(initialData));
        }
    },
    getCollection: (name) => JSON.parse(localStorage.getItem('sama_gestion_data'))[name] || [],
    
    // Sauvegarder un bien en lui associant le propriétaire (l'utilisateur connecté)
    saveBien: (bienData) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        const user = JSON.parse(sessionStorage.getItem('user'));
        
        bienData.id = 'bien_' + Date.now();
        bienData.createdBy = user.id; // L'ID de l'utilisateur qui crée
        bienData.role = user.role;    // Le rôle de l'utilisateur
        
        data.biens.push(bienData);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

// --- AUTHENTIFICATION ---
const Auth = {
    login: (email, password) => {
        const users = DataManager.getCollection('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            sessionStorage.setItem('user', JSON.stringify(user));
            return user;
        }
        return null;
    }
};

// --- LOGIQUE D'AFFICHAGE SÉCURISÉ ---
function afficherListeBiens() {
    const conteneur = document.getElementById('liste-biens-container');
    const allBiens = DataManager.getCollection('biens');
    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    
    // Filtrage : Admin voit tout, les autres ne voient que ce qu'ils ont créé
    const biensAffiches = (currentUser.role === 'admin') 
        ? allBiens 
        : allBiens.filter(b => b.createdBy === currentUser.id);

    conteneur.innerHTML = biensAffiches.map(b => `
        <div class="card-bien">
            <h3>${b.nom}</h3>
            <p>${b.adresse}</p>
            <span class="com-badge">${b.type}</span>
            <small>Propriétaire: ${b.proprio}</small>
        </div>
    `).join('');
}

// Initialisation
DataManager.init();
