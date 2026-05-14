let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
const target = 10000000;

function updateUI() {
    const display = document.getElementById('totalDisplay');
    const bar = document.getElementById('gaugeFill');
    if (display && bar) {
        display.innerText = collected.toLocaleString() + " CFA";
        const percent = (collected / target) * 100;
        bar.style.width = Math.min(percent, 100) + "%";
    }
}

// NAVIGATION
function handleAction(id) {
    if (id === 'loyer') {
        collected += 500000;
        localStorage.setItem('sama_collected', collected);
        updateUI();
        alert("Paiement reçu : +500.000 CFA ! ✅");
    } else {
        // Masquer le dashboard, afficher le module
        document.getElementById('view-dashboard').style.display = 'none';
        document.getElementById('view-' + id).style.display = 'block';
    }
}

function showDashboard() {
    document.getElementById('view-dashboard').style.display = 'block';
    document.querySelectorAll('.module-view').forEach(view => {
        view.style.display = 'none';
    });
}

// LOGIQUE ÉTAT DES LIEUX
function simulateCamera(zone) {
    // On simule une capture réussie en changeant l'apparence du bouton
    const slots = document.querySelectorAll('.photo-slot');
    slots.forEach(slot => {
        if(slot.innerText.includes(zone)) {
            slot.classList.add('active');
            slot.innerHTML = `<i class="fas fa-check-circle"></i><span>${zone} OK</span>`;
        }
    });
}

function sendWhatsAppValidation() {
    const msg = encodeURIComponent("Sama Gestion : L'état des lieux a été complété avec succès. 📸");
    window.open(`https://wa.me/221XXXXXXXXX?text=${msg}`, '_blank');
}

window.onload = updateUI;
