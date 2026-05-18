let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentVisiteId = null;
let currentQualif = '';

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'planning') { updateBienSelect(); renderVisites(); }
    if(viewId === 'biens') renderBiens();
}

// --- LOGIQUE VISITE (FIXÉE) ---

function updateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(biens.length === 0) {
        sel.innerHTML = '<option>Créez d\'abord un bien</option>';
        return;
    }
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const date = document.getElementById('p-date').value;
    const bien = document.getElementById('p-bien-select').value;

    if(!nom || !date) return alert("Remplir Nom et Date");

    const v = {
        id: Date.now(),
        nom: nom,
        date: date,
        bien: bien,
        status: 'prévu',
        qualif: '',
        note: ''
    };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('p-name').value = "";
    document.getElementById('p-date').value = "";
    renderVisites();
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    const today = new Date().toLocaleDateString();

    list.innerHTML = visites.map(v => {
        const dateV = new Date(v.date).toLocaleDateString();
        const isToday = (today === dateV);

        return `
        <div class="form-card" style="border-left: 5px solid ${v.status === 'terminé' ? '#ccc' : '#4A69FF'}">
            <div style="display:flex; justify-content:space-between">
                <strong>${v.nom}</strong>
                <span>${v.qualif}</span>
            </div>
            <small>${v.bien} | Le ${v.date.replace('T', ' à ')}</small>
            
            ${v.status === 'prévu' ? `
                <button class="btn-primary" 
                    style="margin-top:10px; background:${isToday ? '#4A69FF' : '#cbd5e1'}; cursor:${isToday ? 'pointer' : 'not-allowed'}"
                    onclick="${isToday ? `ouvrirRapport(${v.id})` : `alert('Revenez le jour de la visite (${dateV})')`}">
                    ${isToday ? 'Terminer la visite' : 'Bloqué (Pas aujourd\\'hui)'}
                </button>
            ` : `
                <div style="margin-top:10px; font-size:0.9rem; color:#666; font-style:italic">Note : ${v.note}</div>
            `}
        </div>`;
    }).reverse().join('');
}

function ouvrirRapport(id) {
    currentVisiteId = id;
    document.getElementById('modal-rapport').style.display = 'flex';
}

function setQualif(q) { currentQualif = q; alert("Client " + q); }

function validerRapport() {
    if(!currentQualif) return alert("Choisir Chaud ou Froid");
    const v = visites.find(x => x.id === currentVisiteId);
    v.status = 'terminé';
    v.qualif = currentQualif;
    v.note = document.getElementById('rapport-note').value;
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display = 'none';
    currentQualif = "";
    renderVisites();
}

// --- LOGIQUE BIENS (VERSION SIMPLE POUR L'INSTANT) ---
function renderBiens() {
    const list = document.getElementById('biens-list');
    list.innerHTML = biens.map(b => `
        <div class="form-card">
            <strong>${b.nom}</strong> - ${b.statut}
        </div>
    `).join('') || '<p>Aucun bien.</p>';
}

window.onload = () => showView('dashboard');
