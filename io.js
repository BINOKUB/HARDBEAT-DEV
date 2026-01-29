/* HARDBEAT PRO - IO SYSTEM (V13 Beta)
  Gère l'Import / Export des presets JSON
*/

const IO = {
    // 1. EXPORT (Machine vers Fichier)
    exportPreset: function() {
        console.log("Tentative d'exportation...");
        alert("Fonction Export activée (Test)");
    },

    // 2. IMPORT (Fichier vers Machine)
    importPreset: function(event) {
        console.log("Fichier détecté...");
    }
};

console.log("Système IO V13 chargé.");
