// Configuration des modules
const MODULES = [
    { id: 'visite', label: 'Visite', icon: 'fa-home', color: 'blue' },
    { id: 'etat', label: 'État des Lieux', icon: 'fa-camera', color: 'orange' },
    { id: 'loyer', label: 'Collecter Loyer', icon: 'fa-money-bill-wave', color: 'green' },
    { id: 'biens', label: 'Mes Biens', icon: 'fa-building', color: 'red' }
];

// Gestionnaire d'état de l'application
const SamaStore = {
    revenue: {
        totalTarget: 15000000,
        collected: JSON.parse(localStorage.getItem('collected')) || 0
    },

    init() {
        this.renderGrid();
        this.updateUI();
    },

    // Génération dynamique de la grille
    renderGrid() {
        const grid = document.getElementById('actionGrid');
        grid.innerHTML = MODULES.map(m => `
            <div class="action-item" onclick="SamaStore.handleAction('${m.id}')">
                <i class="fas ${m.icon}"></i>
                <div><strong>${m.label}</strong></div>
            </div>
        `).join('');
    },

    // Logique de paiement
    handleAction(action) {
        if (action === 'loyer') {
            const amount = 500000; // Simulation d'un encaissement
            this.revenue.collected += amount;
            localStorage.setItem('collected', this.revenue.collected);
            this.updateUI();
            this.notifyWhatsApp(amount);
        }
    },

    updateUI() {
        const percent = (this.revenue.collected / this.revenue.totalTarget) * 100;
        document.getElementById('totalDisplay').innerText = `${this.revenue.collected.toLocaleString()} CFA`;
        document.getElementById('gaugeFill').style.width = `${Math.min(percent, 100)}%`;
    },

    notifyWhatsApp(amount) {
        const msg = encodeURIComponent(`Sama Gestion : Paiement de ${amount} CFA validé !`);
        window.open(`https://wa.me/221XXXXXXXXX?text=${msg}`, '_blank');
    }
};

// Lancement au chargement
document.addEventListener('DOMContentLoaded', () => SamaStore.init());