let ctx;
let drawing = false;

// Initialise le Canvas pour la signature
function initSignatureModule() {
    const canvas = document.getElementById('sig-canvas');
    ctx = canvas.getContext('2d');
    
    // Ajuste la taille au conteneur
    canvas.width = canvas.offsetWidth;
    canvas.height = 150;

    // Événements tactiles et souris
    const startDrawing = () => drawing = true;
    const stopDrawing = () => { drawing = false; ctx.beginPath(); };
    const draw = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    window.addEventListener('mouseup', stopDrawing);
    window.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchmove', (e) => { draw(e); e.preventDefault(); });
}

function clearSig() {
    const canvas = document.getElementById('sig-canvas');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Fonction pour envoyer sur WhatsApp
function preparerWhatsApp() {
    const bienNom = document.getElementById('etatBienSelect').value;
    const salon = document.getElementById('status-salon').value;
    const cuisine = document.getElementById('status-cuisine').value;
    const obs = document.getElementById('etatObservations').value;
    const date = new Date().toLocaleDateString('fr-FR');

    // Construction du message formaté (WhatsApp utilise * pour le gras)
    const message = `🏠 *ÉTAT DES LIEUX - ${bienNom}*
📅 Date : ${date}

📍 *DÉTAILS DES ZONES* :
- Salon : ${salon}
- Cuisine : ${cuisine}

📝 *OBSERVATIONS* :
${obs || "Aucune observation particulière."}

✅ _Document signé numériquement par le locataire sur l'application Sama Gestion._`;

    // Encodage du texte pour l'URL
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
}
