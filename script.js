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

function handleAction(id) {
    if (id === 'loyer') {
        collected += 500000;
        localStorage.setItem('sama_collected', collected);
        updateUI();
    } else if (id === 'etat') {
        document.getElementById('view-dashboard').style.display = 'none';
        document.getElementById('view-etat').style.display = 'block';
    }
}

function showDashboard() {
    document.getElementById('view-dashboard').style.display = 'block';
    document.getElementById('view-etat').style.display = 'none';
}

function simulateCamera(zone, element) {
    element.classList.toggle('active');
}

function sendWhatsAppValidation() {
    const message = "Sama Gestion : État des lieux validé !";
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

window.onload = updateUI;
