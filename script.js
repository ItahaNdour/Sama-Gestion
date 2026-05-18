// --- FONCTION DE RELANCE WHATSAPP ---
function envoyerRelance(nomLocataire, bienNom, reste) {
    const msg = `*RAPPEL DE PAIEMENT - SAMA GESTION*%0A` +
                `------------------------------%0A` +
                `Bonjour ${nomLocataire},%0A` +
                `Sauf erreur de notre part, le paiement pour le bien *${bienNom}* est incomplet.%0A` +
                `*Reste à régler : ${parseInt(reste).toLocaleString()} CFA*%0A%0A` +
                `Merci de régulariser dès que possible pour éviter les frais de retard.%0A` +
                `------------------------------`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// --- COLLECTE AVEC GESTION DU RELIQUAT ---
function validerCollecte() {
    const montantPaye = parseFloat(document.getElementById('c-montant').value);
    const bien = biens.find(b => b.nom === document.getElementById('c-bien-select').value);
    const type = document.getElementById('c-type').value;
    
    let loyerTheorique = parseFloat(bien.loyer);
    let reliquat = 0;

    // Si c'est un loyer et que le montant est inférieur
    if(type === 'Loyer' && montantPaye < loyerTheorique) {
        reliquat = loyerTheorique - montantPaye;
        alert(`Attention: Reliquat de ${reliquat.toLocaleString()} CFA enregistré.`);
    }

    // Calcul commission selon ta règle : 1 mois complet sur les 3 de l'entrée
    let maCom = 0;
    if(type === 'Caution') {
        // Dans le cas des 3 mois (2 caution + 1 com), ta com est souvent le montant d'un loyer
        maCom = loyerTheorique; 
    } else {
        // Commission sur loyer mensuel classique (ex: 10% si précisé)
        maCom = bien.com.includes('%') ? (parseFloat(bien.com)/100) * montantPaye : parseFloat(bien.com);
    }

    comTotale += maCom;
    localStorage.setItem('sama_com_totale', comTotale);
    
    // Génération du reçu avec mention du reliquat
    let msg = `*REÇU SAMA GESTION*%0A` +
              `🏠 *Bien:* ${bien.nom}%0A` +
              `💰 *Montant versé:* ${montantPaye.toLocaleString()} CFA%0A`;
    
    if(reliquat > 0) msg += `⚠️ *RESTE À PAYER:* ${reliquat.toLocaleString()} CFA%0A`;
    
    msg += `📅 *Date:* ${new Date().toLocaleDateString()}%0A` +
           `------------------%0A` +
           `*Net Bailleur:* ${(montantPaye - (type === 'Caution' ? 0 : maCom)).toLocaleString()} CFA`;

    window.open(`https://wa.me/?text=${msg}`, '_blank');
    showView('dashboard');
}

// --- FICHE DÉTAIL DU BIEN (MODAL) ---
function voirDetailBien(id) {
    const b = biens.find(x => x.id === id);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px; text-align:left;">
            <h3 style="color:var(--blue); margin-top:0;">${b.nom}</h3>
            <p><strong>Type:</strong> ${b.type}</p>
            <p><strong>Adresse:</strong> ${b.adresse || 'Non renseignée'}</p>
            <p><strong>Prix/Loyer:</strong> ${parseInt(b.loyer).toLocaleString()} CFA</p>
            <p><strong>Ma Commission:</strong> ${b.com}</p>
            <hr>
            <p><strong>Statut:</strong> ${b.statut}</p>
            <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">Fermer</button>
            <button class="btn-primary" style="background:red; margin-top:10px;" onclick="supprimerBien(${b.id})">Supprimer le bien</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function supprimerBien(id) {
    if(confirm("Supprimer définitivement ce bien ?")) {
        biens = biens.filter(x => x.id !== id);
        localStorage.setItem('sama_biens', JSON.stringify(biens));
        location.reload(); // Pour rafraîchir la liste
    }
}
