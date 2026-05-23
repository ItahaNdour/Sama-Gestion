// ==============================================================================
// 1. MOTEUR DE STOCKAGE LOCAL (Data Manager)
// ==============================================================================
const DataManager = {
    init: () => {
        if (!localStorage.getItem('sama_gestion_data')) {
            const defaultData = {
                profils: [],
                biens: [],
                visites: [],
                etats_des_lieux: [],
                config: { finance: { comTotaleGlobal: 0 } }
            };
            localStorage.setItem('sama_gestion_data', JSON.stringify(defaultData));
        }
    },

    getCollection: (name) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        return data[name] || [];
    },

    saveCollection: (name, array) => {
        const data = JSON.parse(localStorage.getItem('sama_gestion_data'));
        data[name] = array;
        localStorage.setItem('sama_gestion_data', JSON.stringify(data));
    },

    saveDocument: (collectionName, id, docData) => {
        const collection = DataManager.getCollection(collectionName);
        const index = collection.findIndex(item => String(item.id) === String(id));
        if (index !== -1) {
            collection[index] = { ...collection[index], ...docData };
        } else {
            collection.push({ ...docData, id });
        }
        DataManager.saveCollection(collectionName, collection);
    }
};

// Initialisation au chargement de la page
DataManager.init();

// ==============================================================================
// 2. LOGIQUE DE CHARGEMENT DES DONNÉES (Remplacement de Firebase)
// ==============================================================================
/**
 * Charge les données depuis le stockage local vers l'interface
 * @param {string} collection - Nom de la collection à charger
 * @param {Function} callback - Fonction pour traiter les données après récupération
 */
function chargerDonnees(collection, callback) {
    console.log(`Chargement de la collection : ${collection}`);
    try {
        const data = DataManager.getCollection(collection);
        if (callback) {
            callback(data);
        }
    } catch (error) {
        console.error("Erreur lors du chargement des données locales :", error);
    }
}

// Exemple d'utilisation : 
// chargerDonnees('biens', (biens) => { afficherListeBiens(biens); });
