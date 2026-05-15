let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentQualif = '';
let selectedPhoto = '';

function showView(viewId) {
    // Cache TOUTES les vues d'abord
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    // Affiche uniquement celle demandée
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') { populateSelect(); renderVisites(); }
}

// Gestion Photo
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('preview-img').style.display = 'block';
            selectedPhoto = e.target.result; // On stocke l'image en base64
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Sauvegarder Bien
function saveBienPro() {
    const b = {
        id: Date.now(),
        nom: document.getElementById('new-bien-nom').value,
        loyer: document.getElementById('new-bien-loyer').value,
        proprio: document.getElementById('new-bien-proprio').value,
        photo: selectedPhoto || "https://via.placeholder.com/150",
        statut: 'Disponible',
        jardin: document.getElementById('check-jardin').checked,
        clim: document.getElementById('check-clim').checked,
        historique: []
    };
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    const list = document.getElementById('biens-list');
    list.innerHTML = biens.map(b => `
        <div class="visite-item">
            <img src="${b.photo}" style="width:60px; height:60px; border-radius:10px; float:right">
            <strong>${b.nom}</strong><br>
            <small>${b.loyer} CFA - ${b.proprio}</small><br>
            <span style="font-size:0.7rem">${b.jardin?'🌳':''} ${b.clim?'❄️':''}</span>
        </div>
    `).join('');
}

// Visites
function populateSelect() {
    const sel = document.getElementById('p-bien-select');
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const v = {
        id: Date.now(),
        nom: document.getElementById('p-name').value,
        date: document.getElementById('p-date').value,
        bien: document.getElementById('p-bien-select').value,
        status: 'prévu'
    };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    list.innerHTML = visites.map(v => `
        <div class="visite-item">
            <strong>${v.nom}</strong><br><small>${v.bien} | ${v.date}</small>
            ${v.status==='prévu' ? `<button onclick="ouvrirRapport(${v.id})" class="btn-primary" style="padding:5px; margin-top:5px">Terminer</button>` : ''}
        </div>
    `).reverse().join('');
}

window.onload = () => showView('dashboard');
