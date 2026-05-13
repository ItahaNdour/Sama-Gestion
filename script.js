/**
 * SAMA GESTION - Moteur Principal V1
 */
const app = {
    // État de l'application
    state: {
        totalTarget: 15000000,
        collected: parseFloat(localStorage.getItem('sama_collected')) || 0,
        currency: 'CFA'
    },

    // Initialisation
    init: function() {
        console.log("Sama Gestion Initialisée...");
        this.updateDisplay();
    },

    // Mise à jour de l'interface
    updateDisplay: function() {
        const revenueEl = document.getElementById('revenueValue');
        const progressEl = document.getElementById('progressBar');
        
        // Formatage du montant
        revenueEl.innerText = `${this.state.collected.toLocaleString()} ${this.state.currency}`;
        
        // Calcul de la jauge
        const percent = (this.state.collected / this.state.totalTarget) * 100;
        progressEl.style.width = `${Math.min(percent, 100)}%`;
    },

    // Gestionnaire d'actions
    trigger: function(actionId) {
        switch(actionId) {
            case 'pay':
                this.addPayment(500000); // Exemple d'encaissement d'un loyer
                break;
            case 'visite':
                alert("Ouverture du module caméra pour la visite...");
                break;
            default:
                console.log("Action non configurée : " + actionId);
        }
    },

    // Logique de paiement & Synchro Locale
    addPayment: function(amount) {
        this.state.collected += amount;
        localStorage.setItem('sama_collected', this.state.collected);
        this.updateDisplay();
        this.sendWhatsAppNotification(amount);
    },

    // Intégration WhatsApp
    sendWhatsAppNotification: function(amount) {
        const msg = encodeURIComponent(`Sama Gestion : Nouveau paiement de ${amount} CFA encaissé avec succès ! ✅`);
        window.open(`https://wa.me/221XXXXXXXXX?text=${msg}`, '_blank');
    }
};

// Lancement au démarrage
document.addEventListener('DOMContentLoaded', () => app.init());
