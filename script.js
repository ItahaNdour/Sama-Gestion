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

// NAVIGATION CORRIGÉE
function handleAction(id) {
    switch(id) {
        case 'loyer':
            collected += 500000;
            localStorage.setItem('sama_collected', collected);
            updateUI();
            alert("Paiement enregistré ! ✅");
            break;
        
        case 'etat':
            document.getElementById('view-dashboard').style.display = 'none';
            document.getElementById('view-etat').style.display = 'block';
            break;

        case 'visite':
            alert("Module Visite : En cours de branchement...");
            break;

        case 'biens':
            alert("Module Mes Biens : Bientôt disponible !");
            break;
    }
}

function showDashboard() {
    document.getElementById('view-dashboard').style.display = 'block';
    document.getElementById('view-etat').style.display = 'none';
}

function simulateCamera(zone) {
    alert("Photo enregistrée pour : " + zone);
}

function sendWhatsAppValidation() {
    window.open("https://wa.me/?text=EtatDesLieuxTerminé", "_blank");
}

window.onload = updateUI;
