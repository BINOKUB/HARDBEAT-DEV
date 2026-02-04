/* ==========================================
   HARDBEAT PRO - FACTORY PRESETS LIBRARY
   ========================================== */

// Helper pour générer les séquences rapidement sans écrire 64 "false"
const makeSeq = (indices, len = 64) => {
    const arr = new Array(len).fill(false);
    indices.forEach(i => { if(i < len) arr[i] = true; });
    return arr;
};

window.FACTORY_PRESETS = {
    
    "init": {
        name: "INIT / BLANK",
        masterLength: 16,
        bpm: 120,
        swing: 0,
        drums: {
            // Kick sur 1, 5, 9, 13
            seq: [makeSeq([]), makeSeq([]), makeSeq([]), makeSeq([]), makeSeq([])],
            accents: [makeSeq([]), makeSeq([]), makeSeq([]), makeSeq([]), makeSeq([])]
        },
        synths: { seq2: makeSeq([]), seq3: makeSeq([]) },
        freqs: { s2: 440, s3: 110 } // Base freqs
    },


   "BASS": {
        name: "FM BASS ",
        masterLength: 64,
        bpm: 120,
        swing: 0,
        trackLengths: [16, 16, 16, 16, 16],
        drums: {
            seq: [
                makeSeq([3, 5, 7, 10, 13]), makeSeq([7, 15]), makeSeq([0, 2, 4, 6, 8, 10, 12, 14]), makeSeq([1, 5, 9, 13]), makeSeq([3, 7, 10, 13])
            ],
            accents: [
                makeSeq([0]), makeSeq([4, 12]), makeSeq([0]), makeSeq([]), makeSeq([0])
            ],
            fmFreqs: [100, 100, 100, 50, 100, 100, 100, 63, 100, 100, 76, 100, 100, 104, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
        },
        synths: {
            seq2: makeSeq([]),
            seq3: makeSeq([])
        },
        freqs2: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        freqs3: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        accents2: makeSeq([]),
        accents3: makeSeq([])
    },



    "GROOVE2": {
        name: "HARDGROOVE2",
        masterLength: 16,
        bpm: 120,
        swing: 0,
        trackLengths: [16, 16, 16, 16, 16],
        
        // --- V19 CONTROLS ---
        controls: {
            "isChordMode": true,
            "delay": 0,
            "s2": {
                    "disto": 0,
                    "res": 5,
                    "cutoff": 4,
                    "decay": 0.2,
                    "vol": 0.6
                    },
            "s3": {
                    "disto": 0,
                    "res": 6,
                    "cutoff": 4,
                    "decay": 0.8,
                    "vol": 0.6
            },
            "kick": {
                    "pitch": 113,
                    "decay": 0.5,
                    "level": 1,
                    "rumble": 0
            },
            "snare": {
                    "snappy": 0.6,
                    "tone": 1000,
                    "level": 0.6
            },
            "hh": {
                    "tone": 6700,
                    "decayClose": 0.05,
                    "decayOpen": 0.35,
                    "levelClose": 0.4,
                    "levelOpen": 0.5
            },
            "fm": {
                    "carrierPitch": 100,
                    "modPitch": 50,
                    "fmAmount": 100,
                    "decay": 0.3,
                    "level": 0.5
            }
},

        drums: {
            seq: [
                makeSeq([0, 3, 6, 9, 12, 15]), // KICK
                makeSeq([5, 12]), // SNARE
                makeSeq([1, 5, 9, 13]), // HHC
                makeSeq([3, 7, 11, 15]), // HHO
                makeSeq([11, 13])  // FM
            ],
            accents: [
                makeSeq([]),
                makeSeq([]),
                makeSeq([]),
                makeSeq([]),
                makeSeq([11, 13])
            ],
            fmFreqs: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 117, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
        },

        synths: {
            seq2: makeSeq([]),
            seq3: makeSeq([1, 3, 5, 8]),
            acc2: makeSeq([]),
            acc3: makeSeq([])
        },

        freqs2: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        freqs3: [349, 168, 387, 222, 842, 146, 432, 171, 164, 837, 639, 727, 450, 318, 436, 195, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        
        chords: {
            qual: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
        }
    },
   

    "GROOVE1": {
        name: "SYMFONIC GROOVE",
        masterLength: 16,
        bpm: 120,
        swing: 6,
        trackLengths: [3, 16, 16, 16, 4],
        
        // --- V19 CONTROLS ---
        controls: {
            "isChordMode": true,
            "delay": 0,
            "s2": {
                    "disto": 0,
                    "res": 5,
                    "cutoff": 4,
                    "decay": 0.2,
                    "vol": 0.6
                    },
            "s3": {
                    "disto": 0,
                    "res": 7,
                    "cutoff": 3.4,
                    "decay": 0.65,
                    "vol": 0.62
            },
            "kick": {
                    "pitch": 150,
                    "decay": 0.5,
                    "level": 0.8,
                    "rumble": 0
            },
            "snare": {
                    "snappy": 0.6,
                    "tone": 1000,
                    "level": 0.6
            },
            "hh": {
                    "tone": 8000,
                    "decayClose": 0.05,
                    "decayOpen": 0.3,
                    "levelClose": 0.4,
                    "levelOpen": 0.5
            },
            "fm": {
                    "carrierPitch": 100,
                    "modPitch": 50,
                    "fmAmount": 100,
                    "decay": 0.3,
                    "level": 0.5
            }
},

        drums: {
            seq: [
                makeSeq([0, 2]), // KICK
                makeSeq([4, 12]), // SNARE
                makeSeq([2, 6, 10, 14, 15]), // HHC
                makeSeq([]), // HHO
                makeSeq([0, 2, 3])  // FM
            ],
            accents: [
                makeSeq([]),
                makeSeq([]),
                makeSeq([]),
                makeSeq([]),
                makeSeq([3])
            ],
            fmFreqs: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
        },

        synths: {
            seq2: makeSeq([]),
            seq3: makeSeq([0, 3, 6, 9, 12]),
            acc2: makeSeq([]),
            acc3: makeSeq([])
        },

        freqs2: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        freqs3: [113, 440, 440, 135, 440, 440, 142, 440, 440, 113, 440, 113, 128, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        
        chords: {
            qual: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
        }
    },   

   
  
    "POLYSWEET": {
        name: "RANDOM-X-001",
        masterLength: 64,
        bpm: 107,
        swing: 0,
        trackLengths: [16, 16, 3, 16, 16],
        drums: {
            seq: [
                makeSeq([0, 7, 8]), makeSeq([4, 12]), makeSeq([0, 1, 2]), makeSeq([]), makeSeq([2, 5, 8, 11, 14])
            ],
            accents: [
                makeSeq([8]), makeSeq([4, 12]), makeSeq([2]), makeSeq([]), makeSeq([])
            ]
        },
        synths: {
            seq2: makeSeq([0, 10, 12, 14, 30, 34, 36, 38, 40, 42, 44, 46]),
            seq3: makeSeq([60, 61, 62])
        },
        freqs2: [313, 440, 440, 440, 440, 440, 440, 440, 440, 440, 262, 440, 350, 440, 316, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 284, 440, 440, 440, 284, 440, 284, 440, 284, 440, 284, 440, 272, 440, 211, 440, 211, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
        freqs3: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 208, 260, 310, 440],
        accents2: makeSeq([]),
        accents3: makeSeq([])
    },
   
   
   
    "rumble": {
        name: "BERLIN RUMBLE (132 BPM)",
        masterLength: 64, // 4 mesures
        bpm: 132,
        swing: 0,
        trackLengths: [16, 16, 16, 16, 16], // Tout droit
        drums: {
            seq: [
                makeSeq([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]), // Kick 4/4
                makeSeq([4, 12, 20, 28, 36, 44, 52, 60]), // Snare classique
                makeSeq([2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62]), // HHC Offbeat
                makeSeq([10, 26, 42, 58]), // HHO Rare
                makeSeq([3, 7, 11, 15, 19, 23, 31, 47, 63]) // FM Rumble
            ],
            accents: [
                makeSeq([0, 16, 32, 48]), // Accent Kick 1er temps
                makeSeq([4, 12, 20, 28, 36, 44, 52, 60]), // Accent Snare
                makeSeq([]), makeSeq([]), makeSeq([])
            ]
        },
        synths: {
            // Une ligne de basse hypnotique sur SEQ 3
            seq2: makeSeq([]), // Pas de lead
            seq3: makeSeq([0, 2, 3, 6, 8, 11, 14, 16, 18, 22, 32, 34, 48, 50, 51]) // Rumble Bass
        },
        // Fréquences fixes pour l'exemple (basse)
        freqs2: new Array(64).fill(440),
        freqs3: new Array(64).fill(0).map((_, i) => [0, 2, 3, 6].includes(i % 16) ? 55 : 65) 
    },

    "polymills": {
        name: "DETROIT POLY (138 BPM)",
        masterLength: 64,
        bpm: 138,
        swing: 5,
        // LA MAGIE : Des longueurs différentes !
        trackLengths: [16, 16, 12, 16, 5], 
        drums: {
            seq: [
                makeSeq([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]), // Kick
                makeSeq([4, 12, 20, 28, 36, 44, 52, 60]), // Snare
                makeSeq([0, 2, 4, 6, 8, 10]), // HHC sur 12 pas (loop)
                makeSeq([2, 6, 10, 14]), // HHO Standard
                makeSeq([0, 2, 4]) // FM sur 5 pas (loop rapide)
            ],
            accents: [makeSeq([0, 16, 32, 48]), makeSeq([4, 20, 36, 52]), makeSeq([0]), makeSeq([]), makeSeq([0])]
        },
        synths: {
            seq2: makeSeq([0, 3, 5, 7, 10, 12, 15, 18, 20, 25, 30, 40, 50, 60]), // Arpeggio mental
            seq3: makeSeq([])
        },
        freqs2: new Array(64).fill(0).map((_, i) => 440 + (i % 8) * 50), // Monte en fréquence
        freqs3: new Array(64).fill(110)
    },

    "hardgroove": {
        name: "HARDGROOVE 909 (142 BPM)",
        masterLength: 32, // Boucle sur 2 mesures
        bpm: 142,
        swing: 15, // Gros Swing
        trackLengths: [16, 16, 16, 16, 16],
        drums: {
            seq: [
                makeSeq([0, 4, 8, 12, 16, 20, 24, 28]),
                makeSeq([4, 7, 12, 15, 20, 23, 28, 31]), // Snare Ghost notes
                makeSeq([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]), // Rolling Hats
                makeSeq([2, 6, 10, 14, 18, 22, 26, 30]), // Open Hats Offbeat
                makeSeq([14, 30]) // FM Perc à la fin
            ],
            accents: [makeSeq([0, 16]), makeSeq([4, 12, 20, 28]), makeSeq([0, 4, 8, 12]), makeSeq([2, 6]), makeSeq([14])]
        },
        synths: {
            seq2: makeSeq([14, 15, 30, 31]), // Stab fin de mesure
            seq3: makeSeq([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]) // Basse galopante
        },
        freqs2: new Array(64).fill(880),
        freqs3: new Array(64).fill(60)
    }
};
