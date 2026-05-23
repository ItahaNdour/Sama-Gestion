const DataManager = {
    init: () => {
        if (!localStorage.getItem('sama_gestion_data')) {
            localStorage.setItem('sama_gestion_data', JSON.stringify({
                users: [{ id: 'admin', email: 'admin@sama.com', password: 'password', role: 'admin' }, 
                        { id: 'courtier1', email: 'courtier@test.com', password: 'password', role: 'courtier' }],
                biens: []
            }));
        }
    },
    getCollection: (name) => JSON.parse(localStorage.getItem('sama_gestion_data'))[name] || [],
    saveBien: (dataForm) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        const user = JSON.parse(sessionStorage.getItem('user'));
        
        const nouveauBien = {
            id: 'bien_' + Date.now(),
            createdBy: user.id,
            statut: 'Disponible',
            ...dataForm
        };
        
        data.biens.push(nouveauBien);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

function naviguerVers(viewId) {
    const isLogged = !!sessionStorage.getItem('user');
    document.getElementById('app-header').style.display = isLogged ? 'flex' : 'none';
    if (viewId !== 'view-login' && !isLogged) viewId = 'view-login';
    
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    if (viewId === 'view-liste') afficherListeBiens();
}

function afficherListeBiens() {
    const conteneur = document.getElementById('liste-biens-container');
    const allBiens = DataManager.getCollection('biens');
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    const biens = (user.role === 'admin') ? allBiens : allBiens.filter(b => b.createdBy === user.id);
    
    conteneur.innerHTML = biens.map(b => `
        <div class="card-bien">
            <div style="display:flex; justify-content:space-between;">
                <h3>${b.nom}</h3>
                <span class="badge">${b.statut}</span>
            </div>
            <p><strong>Loyer:</strong> ${Number(b.loyer).toLocaleString()} FCFA | <strong>Type:</strong> ${b.type}</p>
            <p><strong>Adresse:</strong> ${b.adresse}</p>
        </div>
    `).join('');
}

// Initialisation et gestionnaire de soumission
DataManager.init();
document.getElementById('form-bien').addEventListener('submit', (e) => {
    e.preventDefault();
    DataManager.saveBien({
        nom: document.getElementById('nom').value,
        type: document.getElementById('type').value,
        adresse: document.getElementById('adresse').value,
        statutJuridique: document.getElementById('statutJuridique').value,
        superficie: document.getElementById('superficie').value,
        loyer: document.getElementById('loyer').value,
        fraisAgence: document.getElementById('fraisAgence').value,
        proprio: document.getElementById('proprio').value
    });
    naviguerVers('view-liste');
});

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = DataManager.getCollection('users').find(u => u.email === document.getElementById('email').value && u.password === document.getElementById('password').value);
    if (user) {
        sessionStorage.setItem('user', JSON.stringify(user));
        naviguerVers('view-liste');
    } else alert("Erreur d'authentification");
});

naviguerVers('view-login');
