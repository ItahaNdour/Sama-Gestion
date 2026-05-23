// --- INITIALISATION DES DONNÉES LOCALES ---
let biens = JSON.parse(localStorage.getItem('biens')) || [];

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    if(viewId === 'biens') renderBiens();
    if(viewId === 'dashboard') calculerKPI();
}

// --- GESTION DES BIENS ---
function saveBien() {
    const nom = document.getElementById('new-bien-nom').value;
    const loyer = parseFloat(document.getElementById('new-bien-loyer').value);

    if(!nom || !loyer) return alert("Veuillez remplir les champs obligatoires.");

    biens.push({ id: Date.now(), nom, loyer, statut: 'Disponible' });
    localStorage.setItem('biens', JSON.stringify(biens));
    
    document.getElementById('new-bien-nom').value = "";
    document.getElementById('new-bien-loyer').value = "";
    
    alert("Mandat enregistré avec succès !");
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    list.innerHTML = biens.map(b => `
        <div class="form-card">
            <h3>${b.nom}</h3>
            <p>Loyer : ${b.loyer.toLocaleString()} CFA</p>
            <button class="btn-primary" style="background:red;" onclick="supprimerBien(${b.id})">Supprimer</button>
        </div>
    `).join('');
}

function supprimerBien(id) {
    if(confirm("Supprimer ce mandat ?")) {
        biens = biens.filter(b => b.id !== id);
        localStorage.setItem('biens', JSON.stringify(biens));
        renderBiens();
    }
}

// --- KPI & CALCULS ---
function calculerKPI() {
    const total = biens.reduce((acc, b) => acc + b.loyer, 0);
    document.getElementById('total-display').innerText = total.toLocaleString() + " CFA";
}

// Lancement automatique
calculerKPI();
