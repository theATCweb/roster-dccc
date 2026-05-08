# ✈ Roster DCCC Alger — v4.0

Application mobile de gestion des tableaux de service pour les contrôleurs aériens.  
**ENNA · Centre de Contrôle Régional d'Alger · Équipe D**

---

## 📱 Fonctionnalités

### Gestion des présences
- Marquer présent/absent d'un tap
- Statut journalier : Normal / Malade/Unable / Suspendu / Retour congé <28j / >28j
- Masquage automatique des contrôleurs en congé programmé

### Distribution intelligente (Fairness Engine)
- Groupes de qualifications automatiques (SE/SC/SS/SW ensemble, AI/AS+NW ensemble)
- Heures de pointe par secteur et jour de la semaine
- Fouge 1 / Fouge 2 avec préférences (1er / 2ème / Dynamique)
- Évitement des répétitions de secteur dans la journée
- Mode pression : CALME / NORMAL / PRESSION HAUTE

### Grille Roster
- Annuler (Undo) jusqu'à 15 actions
- **💡 Pourquoi ce choix ?** — explication détaillée pour chaque assignment
- Fusion/Séparation manuelle de secteurs (ex: SS+SW combinés la nuit)
- Verrouillage de cellules
- Superviseurs en assignation manuelle uniquement

### Profils contrôleurs
- Qualifications par groupe avec propagation automatique
- Congés programmés (dates début/fin)
- Incompatibilités entre contrôleurs
- Régime JOUR/J pour les femmes exemptées de nuit
- Ajouter / Supprimer un contrôleur

### Synchronisation sans internet
- Données sauvegardées **localement sur l'appareil**
- Export JSON → partage WhatsApp / email / Bluetooth
- Import JSON depuis un autre superviseur

---

## 🚀 Construire l'APK via GitHub Actions (Recommandé)

### Étape 1 — Créer le dépôt GitHub
```bash
# Sur GitHub.com → New repository → "roster-dccc"
# Puis uploader tous les fichiers du projet
```

### Étape 2 — Activer GitHub Actions
Les workflows se trouvent dans `.github/workflows/build.yml`

### Étape 3 — Déclencher le build
1. Allez sur votre repo GitHub
2. Cliquez sur **Actions** → **Build APK**
3. Cliquez **Run workflow** → choisir `debug`
4. Attendez ~10-15 minutes

### Étape 4 — Télécharger l'APK
1. Cliquez sur le build terminé
2. Section **Artifacts** → `RosterDCCC-debug-N`
3. Téléchargez le ZIP → extrayez l'APK
4. Transférez sur votre téléphone et installez

> **Note:** Activez "Sources inconnues" dans les paramètres Android avant l'installation.

---

## 💻 Construire via GitHub Codespace (Alternative)

### Étape 1 — Ouvrir en Codespace
1. GitHub repo → bouton vert **Code** → **Codespaces** → **New codespace**
2. Attendez que l'environnement se configure (~5 min)

### Étape 2 — Lancer le build
```bash
bash build-apk.sh debug
```

### Étape 3 — Télécharger l'APK
Dans le panneau **Explorateur de fichiers** du Codespace :
- Cherchez `RosterDCCC-debug.apk` à la racine
- Clic droit → **Download**

---

## 🛠 Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
# Ouvrir http://localhost:3000

# Build pour production
npm run build

# Construire l'APK (nécessite Android SDK)
bash build-apk.sh debug
```

---

## 🏗 Architecture

```
roster-app/
├── src/
│   ├── App.jsx              # Application principale
│   ├── main.jsx             # Point d'entrée React
│   └── engine/
│       ├── constants.js     # Secteurs, horaires, couleurs, groupes qual.
│       ├── data.js          # Données Équipe D (40 ctrl + 5 superviseurs)
│       ├── fairness.js      # Moteur de distribution équitable
│       └── storage.js       # Capacitor/localStorage abstraction
├── android/                 # Généré par Capacitor
├── .github/workflows/       # GitHub Actions APK builder
├── .devcontainer/           # Config Codespace + setup Android
├── capacitor.config.json    # Config Capacitor
├── vite.config.js           # Config Vite
├── build-apk.sh             # Script build one-click
└── package.json
```

---

## 📊 Groupes de qualifications

| Niveau | Secteurs | Remarque |
|--------|---------|----------|
| Base   | FDO/FMP | Tous les contrôleurs |
| Sud    | S/E · S/C · S/S · S/W | Une qual = les 4 automatiquement |
| NE     | N/E | Indépendant |
| Nord   | AI/AS · N/W | Une qual = les 2 automatiquement |
| Instructeur | Tous | Qualification globale |

---

## ⏰ Heures de pointe par secteur

### Journée
| Secteur | Heures | Remarque |
|---------|--------|----------|
| N/E & AI/AS | 08h-18h | Plus chargés du jour |
| S/E | 06h-17h | Sauf vendredi · MAX mardi/mercredi |
| S/C | 10h-16h | Modéré |
| S/S + S/W | 11h-18h | Regroupés le jour |

### Nuit
| Secteur | Heures | Remarque |
|---------|--------|----------|
| S/S | 23h30-05h00 | Le plus chargé la nuit |
| S/E + S/C | 23h30-05h00 | Trafic transféré depuis SS |
| N/E | 01h00-05h00 | Modéré |
| AI/AS + N/W | Toute la nuit | Trafic faible |

---

## 🔐 Comptes de démonstration (Équipe D)

| Superviseur | Mot de passe |
|------------|--------------|
| BOUDINA | 1111 |
| MERAZGA | 2222 |
| BRAHIMI | 3333 |
| OULD-AISSA | 4444 |
| MAHIEDDINE | 5555 |

---

## 📋 Horaires de travail

### Journée — Fouge 1
- 06h00 → 08h00
- 10h00 → 11h30
- 13h00 → 15h00

### Journée — Fouge 2
- 08h00 → 10h00
- 11h30 → 13h00
- 15h00 → 17h00

### Nuit — Fouge 1 (arrive 17h)
- 17h00 → 19h00
- 21h00 → 01h30 *(rotation interne à 23h30)*

### Nuit — Fouge 2 (arrive 17h, travaille à partir 19h)
- 19h00 → 21h00
- 01h30 → 06h00 *(rotation interne à 03h30)*

---

*Développé pour ENNA DCCC Alger — Données stockées localement, aucune connexion internet requise.*
