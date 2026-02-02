/* ==========================================
   HARDBEAT PRO - EXTERNAL MODULES (V1)
   ========================================== */
console.log("Modules System : Loading...");

// MODULE : KICK RUMBLE UI
// Ajoute un slider "Rumble" dans le panneau des paramètres du Kick
function initKickRumbleUI() {
    const kickParams = document.getElementById('params-track-0');
    if (!kickParams) {
        console.warn("Module Rumble: Impossible de trouver les paramètres du Kick.");
        return;
    }

    // 1. Création du container du slider
    const div = document.createElement('div');
    div.className = "group"; // Même style que les autres
    div.style.border = "1px solid #a855f7"; // Bordure Violette pour le distinguer
    div.style.padding = "2px 5px";
    div.style.borderRadius = "4px";

    // 2. Le Label
    const label = document.createElement('label');
    label.innerText = "RUMBLE";
    label.style.color = "#a855f7"; // Texte Violet
    label.style.fontWeight = "bold";

    // 3. L'Input Range
    const input = document.createElement('input');
    input.type = "range";
    input.min = "0";
    input.max = "1"; // 0 à 100%
    input.step = "0.01";
    input.value = "0"; // Par défaut 0
    input.id = "kick-rumble-amount";

    // 4. L'Écouteur (Lien vers le moteur audio)
    input.oninput = (e) => {
        const val = parseFloat(e.target.value);
        // On envoie la valeur dans audio.js (variable qu'on va créer après)
        if (window.kickSettings) {
            window.kickSettings.rumble = val;
        }
    };

    // 5. Injection
    div.appendChild(label);
    div.appendChild(input);
    
    // On l'ajoute à la fin de la liste des potards du kick
    kickParams.appendChild(div);

    console.log("Module Rumble: Injecté.");
}

// AUTO-INIT AU CHARGEMENT
window.addEventListener('load', () => {
    // On attend un tout petit peu que logic.js ait créé l'interface de base
    setTimeout(() => {
        initKickRumbleUI();
    }, 500);
});
