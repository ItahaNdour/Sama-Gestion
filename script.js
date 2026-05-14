// On récupère les données sauvegardées
let collected = parseFloat(localStorage.getItem('sama_collected')) || 0;
const target = 10000000; // Objectif de 10 millions

/**
 * Met à jour les éléments visuels de la page
 */
function updateUI() {
    const display = document.getElementById('totalDisplay');
    const bar = document.getElementById('gaugeFill');
    
    if (display && bar) {
        // Affiche le montant formaté (ex: 500,000 CFA)
        display.innerText = collected.toLocaleString() + " CFA";
        
        // Calcul du pourcentage pour la jauge
        const percent = (collected / target) * 100;
        bar.style.width = Math.min(percent, 100) + "%";
    }
}

/**
 * Gère les clics sur les boutons du menu
 */
function handleAction(id) {
    if (id === 'loyer') {
        collected += 500000; // Simule l'ajout d'un loyer
        localStorage.setItem('sama_collected', collected);
        updateUI();
        alert("Paiement de 500 000 CFA enregistré ! ✅");
    } else {
        alert("Module " + id + " : Ouverture bientôt disponible.");
    }
}

// Initialise l'affichage dès que la page est chargée
window.onload = function() {
    updateUI();
};
