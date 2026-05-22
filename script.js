let profilRole = null;
let courtierNom = null; 
let courtierEmail = null;
let monAvatar = "💼";
let monLienPaiement = "";

let utilisateurs = [];
let biens = [];
let visites = [];
let etatsLieux = [];
let comTotaleGlobal = 0;

let currentFilter = 'Disponible';
let selectedPhotos = [];
let selectedPhotosEDL = [];

const ROOMS_CONFIG = ["Salon", "Cuisine", "Chambre Principale", "SDE / WC", "Balcon / Terrasse"];

// ✅ FIX AUTH FIREBASE
window.onload = () => {
    window.fbOnAuth(window.auth, async (user) => {
        if (user) {
            try {
                courtierEmail = user.email;

                const docProfil = await window.fsGetDoc(
                    window.fsDoc(window.db, "profils", user.uid)
                );

                if (docProfil.exists()) {
                    const data = docProfil.data();
                    profilRole = data.role;
                    courtierNom = data.fullname || data.username;
                    monLienPaiement = data.lienPaiement || "";
                    monAvatar = data.avatar || "🏢";
                } else {
                    // ✅ création profil auto
                    await window.fsSetDoc(
                        window.fsDoc(window.db, "profils", user.uid),
                        {
                            uid: user.uid,
                            username: user.email.split('@')[0],
                            fullname: "Nouvel utilisateur",
                            role: "Courtier",
                            avatar: "🏢",
                            lienPaiement: "",
                            email: user.email
                        }
                    );

                    profilRole = "Courtier";
                    courtierNom = "Nouvel utilisateur";
                }

                await chargerDonneesCloud();

                document.getElementById('login-screen').style.display = 'none';
                majInterfaceProfil();
                showView('dashboard');

            } catch (e) {
                console.error("Erreur chargement :", e);
            }
        } else {
            document.getElementById('login-screen').style.display = 'flex';
        }
    });
};

async function chargerDonneesCloud() {
    try {
        const queryUsers = await window.fsGetDocs(window.fsCollection(window.db, "profils"));
        utilisateurs = []; queryUsers.forEach(doc => utilisateurs.push(doc.data()));

        const queryBiens = await window.fsGetDocs(window.fsCollection(window.db, "biens"));
        biens = []; queryBiens.forEach(doc => biens.push(doc.data()));

        const queryVisites = await window.fsGetDocs(window.fsCollection(window.db, "visites"));
        visites = []; queryVisites.forEach(doc => visites.push(doc.data()));

        const queryEDL = await window.fsGetDocs(window.fsCollection(window.db, "etats_des_lieux"));
        etatsLieux = []; queryEDL.forEach(doc => etatsLieux.push(doc.data()));

        const docCom = await window.fsGetDoc(window.fsDoc(window.db, "config", "finance"));
        if(docCom.exists()) comTotaleGlobal = docCom.data().comTotaleGlobal || 0;
        
        verifierAlertesEcheances();
    } catch (e) { console.error(e); }
}

// ✅ LOGIN FIX COMPLET
async function verifierConnexion() {
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    try {
        await window.fbSignIn(window.auth, email, password);
    } catch (error) {
        console.error("Erreur Firebase:", error);

        let message = "Erreur de connexion";

        switch (error.code) {
            case "auth/user-not-found":
                message = "Utilisateur introuvable";
                break;
            case "auth/wrong-password":
                message = "Mot de passe incorrect";
                break;
            case "auth/invalid-email":
                message = "Email invalide";
                break;
            case "auth/invalid-credential":
                message = "Identifiants incorrects";
                break;
        }

        alert(message);
    }
}

// ✅ LOGOUT FIX
function deconnexion() {
    window.fbSignOut(window.auth)
        .then(() => {
            document.getElementById('login-screen').style.display = 'flex';
        })
        .catch((error) => {
            console.error(error);
        });
}
``
