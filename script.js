let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
let mesBiens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let zonesInspectees = [];

// --- GESTION DES VUES ---
function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    
    if (viewId === 'biens') renderBiens();
    if (viewId === 'collecter') renderCollecte();
    if (viewId === 'dashboard') updateDashboard();
    if (viewId === 'etat') initSignaturePad();
}

// --- MODULE BIENS (AJOUT + SUPPRESSION) ---
function renderBiens() {
    const container = document.getElementById('biensList');
    container.innerHTML = mesBiens.length === 0 ? "<p>Aucun bien enregistré.</p>" : mesBiens.map((b, index) => `
        <div class="bien-card">
            <div>
                <h4>${b.nom}</h4>
                <p>${b.loyer.toLocaleString()} CFA</p>
            </div>
            <button class="delete-btn" onclick="deleteBien(${index})"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('');
}

function saveNewBien() {
    const nom = document.getElementById('addNom').value;
    const loyer = document.getElementById('addLoyer').value;
    if(!nom || !loyer) return alert("Remplissez tout !");
    
    mesBiens.push({ nom, loyer: parseFloat(loyer) });
    localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
    showView('biens');
}

function deleteBien(index) {
    if(confirm("Supprimer ce bien ?")) {
        mesBiens.splice(index, 1);
        localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
        renderBiens();
    }
}

// --- MODULE ÉTAT DES LIEUX (SIGNATURE) ---
let canvas, ctx, drawing = false;

function initSignaturePad() {
    canvas = document.getElementById('signature-pad');
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    canvas.addEventListener('mousedown', () => drawing = true);
    canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
    canvas.addEventListener('mousemove', draw);
    
    // Support Tactile
    canvas.addEventListener('touchstart', (e) => { drawing = true; e.preventDefault(); });
    canvas.addEventListener('touchend', () => { drawing = false; ctx.beginPath(); });
    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    });
}

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function toggleZone(zone) {
    const el = document.getElementById('slot-' + zone.toLowerCase());
    el.classList.toggle('active');
    if(zonesInspectees.includes(zone)) zonesInspectees = zonesInspectees.filter(z => z!==zone);
    else zonesInspectees.push(zone);
}

function sendWhatsAppReport() {
    const msg = `🏠 *ETAT DES LIEUX SIGNÉ*\nZones: ${zonesInspectees.join(', ') || 'N/A'}\n_Signature effectuée sur mobile_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

// --- COLLECTE ---
function renderCollecte() {
    const container = document.getElementById('collecteList');
    container.innerHTML = mesBiens.map(b => `
        <div class="bien-card">
            <h4>${b.nom}</h4>
            <button class="primary-btn" style="width:auto" onclick="encaisser(${b.loyer})">Encaisser</button>
        </div>
    `).join('');
}

function encaisser(m) {
    collected += m;
    localStorage.setItem('sama_collected', collected);
    updateDashboard();
    showView('dashboard');
}

function updateDashboard() {
    document.getElementById('totalDisplay').innerText = collected.toLocaleString() + " CFA";
    const percent = (collected / 10000000) * 100;
    document.getElementById('gaugeFill').style.width = Math.min(percent, 100) + "%";
}

window.onload = updateDashboard;
