// --- DONNÉES ---
const PIECES_MAISON = ["Salon", "Cuisine", "Chambre 1", "Chambre 2", "Chambre 3", "Douche Visiteur", "Salle de Bain", "Balcon"];
let mesBiens = JSON.parse(localStorage.getItem('sama_biens')) || [
    {nom: "Villa Almadies", locataire: "M. Faye"},
    {nom: "Appartement Plateau", locataire: "Mme Diop"}
];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';

    if(viewId === 'planning') {
        const sel = document.getElementById('p-bien');
        sel.innerHTML = mesBiens.map(b => `<option>${b.nom}</option>`).join('');
        renderVisites();
    }
    if(viewId === 'etat') {
        const sel = document.getElementById('e-bien');
        sel.innerHTML = mesBiens.map(b => `<option>${b.nom}</option>`).join('');
        genererZones();
        setTimeout(initSignature, 200);
    }
}

// --- MODULE PLANNING ---
function sauverVisite() {
    const v = {
        nom: document.getElementById('p-name').value,
        phone: document.getElementById('p-phone').value,
        bien: document.getElementById('p-bien').value,
        date: document.getElementById('p-date').value
    };
    if(!v.nom || !v.date) return alert("Nom et Date requis");
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    renderVisites();
}

function renderVisites() {
    const list = document.getElementById('visites-list');
    list.innerHTML = visites.map(v => `
        <div class="form-card">
            <strong>${v.nom}</strong> - ${v.bien}<br>
            <small>${new Date(v.date).toLocaleString('fr-FR')}</small>
        </div>
    `).join('');
}

// --- MODULE ÉTAT DES LIEUX ---
function genererZones() {
    const container = document.getElementById('zones-inspection');
    container.innerHTML = PIECES_MAISON.map(p => `
        <div class="form-card" style="display:flex; justify-content:space-between; align-items:center">
            <span>${p}</span>
            <select style="width:auto; margin:0" id="st-${p}">
                <option>Bon</option><option>Moyen</option><option>Mauvais</option>
            </select>
        </div>
    `).join('');
}

function envoyerRapportWA() {
    const bien = document.getElementById('e-bien').value;
    let detail = "";
    PIECES_MAISON.forEach(p => {
        detail += `- ${p}: ${document.getElementById('st-'+p).value}\n`;
    });
    const msg = `🏠 *ÉTAT DES LIEUX PRO*\n📍 Bien: ${bien}\n\n*DÉTAILS*:\n${detail}\n📝 Obs: ${document.getElementById('e-obs').value}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

// --- SIGNATURE ---
let canvas, ctx, drawing = false;
function initSignature() {
    canvas = document.getElementById('sig-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 150;
    canvas.onmousedown = () => drawing = true;
    window.onmouseup = () => { drawing = false; ctx.beginPath(); };
    canvas.onmousemove = (e) => {
        if(!drawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };
}
function clearSignature() { ctx.clearRect(0,0,canvas.width,canvas.height); }

window.onload = () => showView('dashboard');
