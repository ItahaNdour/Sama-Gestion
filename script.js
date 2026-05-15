let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];
let currentVisiteId = null;
let currentStatus = '';

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    if(viewId === 'planning') { renderVisites(); populateSelect(); }
    if(viewId === 'biens') renderBiens();
}

function populateSelect() {
    const sel = document.getElementById('p-bien-select');
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const v = {
        id: Date.now(),
        nom: document.getElementById('p-name').value,
        tel: document.getElementById('p-phone').value,
        bien: document.getElementById('p-bien-select').value,
        date: document.getElementById('p-date').value,
        status: 'prévu', // prévu, terminé
        qualif: '', // chaud, relancer, froid
        note: ''
    };
    if(!v.nom || !v.date) return alert("Nom et Date requis");
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const container = document.getElementById('visites-list');
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = visites.map(v => {
        const vDate = v.date.split('T')[0];
        const isToday = vDate === today;
        const isDone = v.status === 'terminé';

        return `
        <div class="visite-item ${isToday ? 'active' : ''} ${isDone ? 'done' : ''}">
            <div style="display:flex; justify-content:space-between">
                <strong>${v.nom}</strong>
                <small>${v.qualif ? '【'+v.qualif.toUpperCase()+'】' : ''}</small>
            </div>
            <div style="font-size:0.8rem; color:#666">${v.bien} | ${new Date(v.date).toLocaleString()}</div>
            
            ${!isDone ? `
                <button class="v-btn-check" ${!isToday ? 'disabled' : ''} onclick="ouvrirRapport(${v.id})">
                    ${isToday ? '➡️ Débuter la visite' : '🔒 Disponible le jour J'}
                </button>
            ` : `<p style="font-size:0.8rem; margin:5px 0; color:var(--blue)">✅ Visite effectuée : ${v.note}</p>`}
        </div>`;
    }).reverse().join('');
}

// LOGIQUE RAPPORT
function ouvrirRapport(id) {
    currentVisiteId = id;
    const v = visites.find(vis => vis.id === id);
    document.getElementById('rapport-client-name').innerText = "Client : " + v.nom;
    document.getElementById('modal-rapport').style.display = 'flex';
}

function setClientStatus(st) {
    currentStatus = st;
    document.querySelectorAll('.st-btn').forEach(b => b.classList.remove('selected-st'));
    event.target.classList.add('selected-st');
}

function validerRapport() {
    const note = document.getElementById('rapport-note').value;
    const idx = visites.findIndex(v => v.id === currentVisiteId);
    
    visites[idx].status = 'terminé';
    visites[idx].qualif = currentStatus;
    visites[idx].note = note;

    localStorage.setItem('sama_visites', JSON.stringify(visites));
    document.getElementById('modal-rapport').style.display = 'none';
    renderVisites();
}

// BIENS (Base)
function saveBien() {
    const b = { nom: document.getElementById('new-bien-nom').value, loyer: document.getElementById('new-bien-loyer').value };
    biens.push(b);
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    document.getElementById('biens-list').innerHTML = biens.map(b => `<div class="form-card"><strong>${b.nom}</strong> - ${b.loyer} CFA</div>`).join('');
}

window.onload = () => showView('dashboard');
