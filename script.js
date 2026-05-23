const DataManager = {
    init: () => {
        if (!localStorage.getItem('sama_gestion_data')) {
            localStorage.setItem('sama_gestion_data', JSON.stringify({ 
                users: [{id:'admin', email:'admin@sama.com', password:'password', role:'admin'}], 
                biens: [] 
            }));
        } 
    },
    getCollection: (name) => JSON.parse(localStorage.getItem('sama_gestion_data'))[name] || [],
    saveBien: (bienData) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        bienData.id = 'b_' + Date.now();
        data.biens.push(bienData);
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    }
};

async function compresserImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = (img.height * 800) / img.width;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

function naviguerVers(viewId) {
    const isLogged = !!sessionStorage.getItem('user');
    document.getElementById('app-header').style.display = isLogged ? 'flex' : 'none';
    if (viewId !== 'view-login' && !isLogged) viewId = 'view-login';
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    if (viewId === 'view-liste') filtrerEtAfficher();
}

function filtrerEtAfficher() {
    const conteneur = document.getElementById('liste-biens-container');
    const allBiens = DataManager.getCollection('biens');
    const term = document.getElementById('search').value.toLowerCase();
    const type = document.getElementById('filter-type').value;

    const filtered = allBiens.filter(b => 
        (b.nom.toLowerCase().includes(term)) && 
        (type === 'Tous' || b.type === type)
    );

    conteneur.innerHTML = filtered.map(b => `
        <div class="card-bien">
            <div class="card-img" style="background-image: url('${b.photo}')"></div>
            <div class="card-body">
                <h3>${b.nom}</h3>
                <span class="badge">Disponible</span>
                <div class="price-tag">${Number(b.loyer).toLocaleString()} FCFA</div>
            </div>
        </div>
    `).join('');
}

function logout() { sessionStorage.removeItem('user'); window.location.reload(); }

DataManager.init();
document.getElementById('form-bien').addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoFile = document.getElementById('photoInput').files[0];
    const photoBase64 = photoFile ? await compresserImage(photoFile) : '';
    DataManager.saveBien({ nom: document.getElementById('nom').value, loyer: document.getElementById('loyer').value, type: document.getElementById('type').value, photo: photoBase64 });
    naviguerVers('view-liste');
});

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = DataManager.getCollection('users').find(u => u.email === document.getElementById('email').value && u.password === document.getElementById('password').value);
    if (user) { sessionStorage.setItem('user', JSON.stringify(user)); naviguerVers('view-liste'); }
    else alert("Erreur d'authentification");
});

naviguerVers('view-login');
