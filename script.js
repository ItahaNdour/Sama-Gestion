// --- INITIALISATION ---
let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
let mesBiens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let adminName = localStorage.getItem('sama_admin') || "Gestionnaire Immo";
let zonesInspectees = [];

// --- NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    
    if (viewId === 'biens') renderBiens();
    if (viewId === 'collecter') renderCollecte();
    if (viewId === 'dashboard') updateUI();
    if (viewId === 'etat') initSignature();
}

function updateUI() {
    document.getElementById('totalDisplay').innerText = collected.toLocaleString() + " CFA";
    document.getElementById('displayAdminName').innerText = adminName;
    const percent = (collected / 10000000) * 100;
    document.getElementById('gaugeFill').style.width = Math.min(percent, 100) + "%";
}

// --- ADMIN ---
function updateAdminName() {
    const val = document.getElementById('adminNameInput').value;
    if(val) {
        adminName = val;
        localStorage.setItem('sama_admin', val);
        updateUI();
        showView('dashboard');
    }
}

// --- MES BIENS ---
function renderBiens() {
    const container = document.getElementById('biensList');
    container.innerHTML = mesBiens.length === 0 ? "<p>Aucun bien.</p>" : mesBiens.map((b, i) => `
        <div class="bien-card">
            <div>
                <h4>${b.nom}</h4>
                <p style="font-size:0.8rem; color:gray"><i class="fas fa-map-marker-alt"></i> ${b.adresse}</p>
                <p><strong>${b.loyer.toLocaleString()} CFA</strong></p>
            </div>
            <button onclick="deleteBien(${i})" style="color:red; border:none; background:none; font-size:1.2rem"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

function saveNewBien() {
    const nom = document.getElementById('addNom').value;
    const adresse = document.getElementById('addAdresse').value;
    const loyer = document.getElementById('addLoyer').value;

    if(!nom || !adresse || !loyer) return alert("Veuillez remplir tous les champs (Nom, Adresse et Loyer)");

    mesBiens.push({ nom, adresse, loyer: parseFloat(loyer) });
    localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
    showView('biens');
}

function deleteBien(index) {
    if(confirm("Supprimer ce bien définitivement ?")) {
        mesBiens.splice(index, 1);
        localStorage.setItem('sama_biens', JSON.stringify(mesBiens));
        renderBiens();
    }
}

// --- ÉTAT DES LIEUX & SIGNATURE ---
let canvas, ctx, isDrawing = false;

function initSignature() {
    canvas = document.getElementById('signature-pad');
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const start = (e) => { isDrawing = true; draw(e); };
    const end = () => { isDrawing = false; ctx.beginPath(); };
    
    canvas.onmousedown = start; canvas.onmouseup = end;
    canvas.onmousemove = (e) => { if(isDrawing) draw(e); };

    // Tactile
    canvas.ontouchstart = (e) => { isDrawing = true; e.preventDefault(); };
    canvas.ontouchend = end;
    canvas.ontouchmove = (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    };
}

function draw(e) {
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "black";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function clearSignature() { ctx.clearRect(0,0,canvas.width,canvas.height); }

function toggleZone(zone) {
    const el = document.getElementById('slot-' + zone.toLowerCase().replace(" ", ""));
    el.classList.toggle('active');
    if(zonesInspectees.includes(zone)) zonesInspectees = zonesInspectees.filter(z => z !== zone);
    else zonesInspectees.push(zone);
}

function sendWhatsAppReport() {
    const notes = document.getElementById('etatNotes').value;
    const msg = `🏠 *ÉTAT DES LIEUX - ${adminName}*\nZones inspectées: ${zonesInspectees.join(', ') || 'Aucune'}\nObservations: ${notes || 'RAS'}\n_Signature locataire effectuée_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

// --- COLLECTE ---
function renderCollecte() {
    const container = document.getElementById('collecteList');
    container.innerHTML = mesBiens.map(b => `
        <div class="bien-card">
            <h4>${b.nom}</h4>
            <button class="primary-btn" style="width:auto; padding:10px" onclick="encaisser(${b.loyer})">Encaisser</button>
        </div>
    `).join('');
}

function encaisser(m) {
    collected += m;
    localStorage.setItem('sama_collected', collected);
    updateUI();
    showView('dashboard');
}

window.onload = updateUI;
