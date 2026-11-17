# 🔐 PrevEscape

**Moteur d'escape game numérique immersif pour la prévention santé-travail et santé publique.**

Un seul moteur, des univers à l'infini : chaque thème est un simple dossier de contenu (JSON + images), sans toucher au code.

▶️ **Jouer à la démo :** https://laurebonnefond.github.io/PrevEscape/?theme=demo

---

## ✨ Fonctionnalités

- 🖼️ Images : décors, objets dessinés, illustrations dans les messages
- 🎵 Musique d'ambiance par thème ou par salle + bruitages, bouton 🔊/🔇
- 🚪 Salles multiples avec transitions et portes conditionnelles
- 🔍 Chasse aux risques directement dans le décor
- 🔢 Énigmes : digicode, quiz (modules extensibles)
- 🎒 Inventaire d'objets
- 🔦 Effet lampe torche pour les salles sombres
- 💡 Indices progressifs par salle
- ⏱️ Chronomètre
- 💾 Sauvegarde automatique de la progression
- 📋 Débrief prévention généré automatiquement en fin de partie
- 📱 Mobile et tactile

---

## 🗂️ Structure

```
PrevEscape/
├─ index.html              ← la page (ne change jamais)
├─ style.css               ← l'apparence
├─ engine.js               ← le moteur
└─ themes/
   └─ demo/
      ├─ theme.json        ← tout le contenu du thème
      └─ assets/           ← tous les médias du thème
         ├─ images/        ← décors, objets, illustrations
         └─ sons/          ← musiques et bruitages
```

---

## 🎨 Créer un nouveau thème

1. Copier `themes/demo/` et le renommer (ex. `themes/tms-entrepot/`)
2. Modifier `theme.json` : salles, zones, énigmes, débrief
3. Déposer les médias dans `assets/images/` et `assets/sons/`
4. Jouer via `?theme=tms-entrepot`

### Types de zones

| Type | Effet |
|---|---|
| `texte` | Affiche une observation |
| `objet` | Ajoute l'objet à l'inventaire et pose un flag |
| `risque` | Risque repéré, message de prévention |
| `enigme` | Ouvre une énigme (`code`, `quiz`) |
| `porte` | Change de salle si tous les flags `ouvre_si` sont posés (`"vers": "FIN"` termine la partie) |

Les positions (`x`, `y`, `w`, `h`) sont exprimées en **% de la scène**.

### 🖼️ Images et 🎵 sons

Dans `theme.json`, les chemins partent du dossier `assets/` : on écrit `"images/sas.jpg"`, pas `"assets/images/sas.jpg"`.

| Où | Champ | Exemple |
|---|---|---|
| Thème | `musique` | `"sons/ambiance.mp3"` (musique par défaut, en boucle) |
| Thème | `sons` | `{ "objet": "...", "risque": "...", "erreur": "...", "verrou": "...", "reussite": "...", "porte": "...", "victoire": "...", "defaite": "..." }` |
| Thème | `volume_musique` / `volume_bruitages` | `0.35` / `0.7` (de 0 à 1) |
| Salle | `image` | `"images/labo.jpg"` (décor) |
| Salle | `musique` | `"sons/labo.mp3"` (remplace celle du thème) |
| Zone | `image` | `"images/cle.png"` (remplace l'émoji, aussi affichée dans l'inventaire) |
| Zone `texte` | `illustration` | `"images/affiche.jpg"` (image dans le message) |
| Énigme | `illustration` | `"images/plan.jpg"` (image au-dessus de la question) |

Tous ces champs sont facultatifs. Sans image, une zone sans `icone` devient **invisible** : on la pose sur un détail du décor.

**Formats conseillés**
- Décors : **16:9** (1920×1080), JPG ou WebP, < 400 Ko
- Objets : PNG transparent ou SVG
- Sons : MP3, musique en boucle de 1 à 3 Mo
- Noms en **minuscules, sans espace ni accent** (`Sas.JPG` ≠ `sas.jpg` sur GitHub Pages)

**Sources libres de droits** : Pixabay (musiques et bruitages), Freesound (filtre CC0).
Les sons et images du thème `demo` sont des exemples générés, à remplacer.

### 🛠️ Mode debug

`?theme=<nom>&debug=1`, puis clic dans la scène : les coordonnées s'affichent dans la console (F12).

---

## 💻 Tester en local

Le jeu doit être servi par un serveur web (le double-clic sur `index.html` ne charge pas le thème) :

```bash
python -m http.server
```

Puis ouvrir http://localhost:8000/?theme=demo

---

## 🧭 Principes pédagogiques

- **Une énigme = un message de prévention**
- Le joueur **raisonne** (repérer, choisir, ordonner) plutôt que de répondre à un quiz
- Indices progressifs : personne ne reste bloqué
- Débrief final systématique, avec sources (INRS, Santé publique France, Code du travail)

---

## ⚠️ À savoir

Le dépôt est public : le contenu des `theme.json` (codes, réponses) est lisible par tous. Ne jamais y placer de données d'entreprise ou de données personnelles.

---

## 👩‍⚕️ Autrice

**Laure Bonnefond**, IDE-ST et préventrice, SPSTI 23/87
Projet de la famille **PréventIA**

Stack : HTML · CSS · JavaScript, sans framework · GitHub Pages
