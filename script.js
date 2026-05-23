let biens = JSON.parse(localStorage.getItem('biens')) || [];

function saveBien() {
    const bien = {
        id: Date.now(),
        nom: document.getElementById('nom').value,
        quartier: document.getElementById('quartier').value,
        loyer: parseFloat(document.getElementById('loyer').value),
        superficie: document.getElementById('superficie').value,
        papier: document.getElementById('papier').value,
        type: document.getElementById('type').value,
        statut: 'Disponible',
        photo: '' // Logique de conversion Base64 à venir
    };

    // Gestion photo
    const file = document.getElementById('photo').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            bien.photo = e.target.result;
            biens.push(bien);
            localStorage.setItem('biens', JSON.stringify(biens));
            renderBiens();
            document.getElementById('form-modal').style.display = 'none';
        };
        reader.readAsDataURL(file);
    } else {
        biens.push(bien);
        localStorage.setItem('biens', JSON.stringify(biens));
        renderBiens();
    }
}

function renderBiens() {
    const container = document.getElementById('biens-container');
    const search = document.getElementById('search').value.toLowerCase();
    const type = document.getElementById('filter-type').value;

    const filtered = biens.filter(b => 
        (b.nom.toLowerCase().includes(search) || b.quartier.toLowerCase().includes(search)) &&
        (type === "" || b.type === type)
    );

    container.innerHTML = filtered.map(b => `
        <div class="card">
            ${b.photo ? `<img src="${b.photo}">` : ''}
            <h3>${b.nom}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${b.quartier} | ${b.superficie} m²</p>
            <p><b>${b.loyer.toLocaleString()} CFA</b> - ${b.papier}</p>
            <button onclick="toggleStatut(${b.id})">${b.statut}</button>
        </div>
    `).join('');
}

function toggleStatut(id) {
    biens = biens.map(b => b.id === id ? {...b, statut: b.statut === 'Disponible' ? 'Occupé' : 'Disponible'} : b);
    localStorage.setItem('biens', JSON.stringify(biens));
    renderBiens();
}

function showForm() { document.getElementById('form-modal').style.display = 'block'; }

renderBiens();
