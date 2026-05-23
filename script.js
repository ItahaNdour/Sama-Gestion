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
    saveBien: (bienData) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        const user = JSON.parse(sessionStorage.getItem('user'));
        bienData.id = 'bien_' + Date.now();
        bienData.createdBy = user.id;
        data.biens.push(bienData);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

function logout() {
    sessionStorage.removeItem('user');
    window.location.reload();
}

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
            <h3>${b.nom}</h3>
            <p>${b.adresse}</p>
        </div>
    `).join('');
}

DataManager.init();
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = DataManager.getCollection('users').find(u => u.email === document.getElementById('email').value && u.password === document.getElementById('password').value);
    if (user) {
        sessionStorage.setItem('user', JSON.stringify(user));
        naviguerVers('view-liste');
    } else alert("Erreur d'authentification");
});

document.getElementById('form-bien').addEventListener('submit', (e) => {
    e.preventDefault();
    DataManager.saveBien({ nom: document.getElementById('nom').value, adresse: document.getElementById('adresse').value });
    naviguerVers('view-liste');
});

// Lancement initial
naviguerVers('view-login');
