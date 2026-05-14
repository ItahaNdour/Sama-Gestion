// --- INITIALISATION ---
let biens = JSON.parse(localStorage.getItem('sama_biens')) || [];
let visites = JSON.parse(localStorage.getItem('sama_visites')) || [];

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';

    if(viewId === 'biens') renderBiens();
    if(viewId === 'planning') {
        populateBienSelect();
        renderVisites();
    }
}

// --- MODULE BIENS ---
function saveBien() {
    const nom = document.getElementById('new-bien-nom').value;
    const loc = document.getElementById('new-bien-locataire').value;
    const loy = document.getElementById('new-bien-loyer').value;

    if(!nom || !loy) return alert("Nom et Loyer requis");
    biens.push({ id: Date.now(), nom, locataire: loc, loyer: parseInt(loy) });
    localStorage.setItem('sama_biens', JSON.stringify(biens));
    showView('biens');
}

function renderBiens() {
    const container = document.getElementById('biens-list');
    container.innerHTML = biens.length === 0 ? '<p style="text-align:center;padding:20px;">Aucun bien enregistré.</p>' :
        biens.map(b => `<div class="revenue-card" style="margin-bottom:12px;"><strong>${b.nom}</strong><br><small>Locataire: ${b.locataire || 'N/A'}</small><br><span style="color:var(--blue);font-weight:bold;">${b.loyer.toLocaleString()} CFA</span></div>`).join('');
}

// --- MODULE PLANNING PRO ---
function populateBienSelect() {
    const sel = document.getElementById('p-bien-select');
    if(biens.length === 0) {
        sel.innerHTML = '<option value="">Ajoutez un bien d\'abord</option>';
        return;
    }
    sel.innerHTML = biens.map(b => `<option value="${b.nom}">${b.nom}</option>`).join('');
}

function sauverVisitePro() {
    const nom = document.getElementById('p-name').value;
    const tel = document.getElementById('p-phone').value;
    const bien = document.getElementById('p-bien-select').value;
    const date = document.getElementById('p-date').value;

    if(!nom || !date || !tel) return alert("Remplissez tous les champs !");

    const v = { id: Date.now(), nom, tel, bien, date };
    visites.push(v);
    localStorage.setItem('sama_visites', JSON.stringify(visites));
    
    // Après sauvegarde, on propose d'envoyer la confirmation
    if(confirm("Visite enregistrée ! Envoyer la confirmation par WhatsApp au client ?")) {
        envoyerConfirmationWA(v);
    }
    
    renderVisites();
}

function renderVisites() {
    const container = document.getElementById('visites-list');
    if(visites.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Aucune visite prévue.</p>';
        return;
    }
    container.innerHTML = visites.map(v => {
        const dateFmt = new Date(v.date).toLocaleString('fr-FR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
        return `
        <div class="visite-item">
            <div class="v-header"><strong>${v.nom}</strong> <small style="color:var(--blue)">${dateFmt}</small></div>
            <div class="v-info">Bien : ${v.bien}</div>
            <div class="v-actions">
                <a href="tel:${v.tel}" class="v-btn v-call"><i class="fas fa-phone"></i> Appeler</a>
                <button onclick="envoyerRappelWA('${v.id}')" class="v-btn v-wa"><i class="fab fa-whatsapp"></i> Rappel</button>
                <button onclick="supprimerVisite('${v.id}')" class="v-btn v-del"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).reverse().join('');
}

function envoyerConfirmationWA(v) {
    const dateFmt = new Date(v.date).toLocaleString('fr-FR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
    const texte = `Bonjour ${v.nom}, c'est Sama Gestion. Je vous confirme votre visite pour le bien *${v.bien}* le *${dateFmt}*. À bientôt !`;
    window.open(`https://wa.me/${v.tel}?text=${encodeURIComponent(texte)}`, '_blank');
}

function envoyerRappelWA(id) {
    const v = visites.find(visite => visite.id == id);
    const dateFmt = new Date(v.date).toLocaleString('fr-FR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
    const texte = `Petit rappel pour notre visite d'aujourd'hui (${v.bien}) prévue à ${dateFmt}. Merci !`;
    window.open(`https://wa.me/${v.tel}?text=${encodeURIComponent(texte)}`, '_blank');
}

function supprimerVisite(id) {
    if(confirm("Supprimer ce rendez-vous ?")) {
        visites = visites.filter(v => v.id != id);
        localStorage.setItem('sama_visites', JSON.stringify(visites));
        renderVisites();
    }
}

window.onload = () => showView('dashboard');
