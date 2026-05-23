let appData = JSON.parse(localStorage.getItem('sama_data')) || { biens: [], visites: [], collecte: [] };

function save() { localStorage.setItem('sama_data', JSON.stringify(appData)); }

function loadModule(module) {
    const root = document.getElementById('app-root');
    root.innerHTML = `<h1>${module.charAt(0).toUpperCase() + module.slice(1)}</h1>`;
    
    if (module === 'biens') {
        root.innerHTML += `
            <input type="text" placeholder="Rechercher par quartier..." oninput="filterBiens(this.value)">
            <div id="list-container"></div>
        `;
        renderBiens();
    }
}

function renderBiens() {
    const list = document.getElementById('list-container');
    list.innerHTML = appData.biens.map(b => `
        <div class="card">
            <h3>${b.nom}</h3>
            <p>${b.type} - ${b.quartier}</p>
            <p><b>${b.loyer} CFA</b></p>
        </div>
    `).join('');
}

function openModal() { document.getElementById('modal').style.display = 'block'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }

// Chargement initial
loadModule('biens');
