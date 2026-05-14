// Navigation simple
function showView(viewId) {
    document.querySelectorAll('.module-view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    
    if(viewId === 'etat') {
        setTimeout(initSignature, 200); // On attend que le canvas soit visible
    }
}

// Logique Signature
let canvas, ctx, drawing = false;

function initSignature() {
    canvas = document.getElementById('sig-canvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    
    // Ajuste la taille réelle du dessin
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX || e.touches[0].clientX) - rect.left,
            y: (e.clientY || e.touches[0].clientY) - rect.top
        };
    };

    const start = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    const move = (e) => { if(!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const stop = () => { drawing = false; };

    canvas.onmousedown = start; canvas.onmousemove = move; window.onmouseup = stop;
    canvas.ontouchstart = (e) => { start(e); e.preventDefault(); };
    canvas.ontouchmove = (e) => { move(e); e.preventDefault(); };
    canvas.ontouchend = stop;
}

function clearSig() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Logique WhatsApp
function envoyerWhatsApp() {
    const bien = document.getElementById('etatBienSelect').value;
    const salon = document.getElementById('status-salon').value;
    const cuisine = document.getElementById('status-cuisine').value;
    const obs = document.getElementById('etatObservations').value || "RAS";
    const date = new Date().toLocaleDateString('fr-FR');

    const texte = `🏠 *ÉTAT DES LIEUX - SAMA GESTION*\n\n` +
                  `📍 Bien : ${bien}\n` +
                  `📅 Date : ${date}\n\n` +
                  `✅ *Constat* :\n` +
                  `- Salon : ${salon}\n` +
                  `- Cuisine : ${cuisine}\n\n` +
                  `📝 *Observations* :\n${obs}\n\n` +
                  `_Signé numériquement par le locataire._`;

    const url = `https://wa.me/?text=${encodeURIComponent(texte)}`;
    window.open(url, '_blank');
}
