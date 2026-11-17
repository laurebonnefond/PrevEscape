/* =====================================================================
   PREVESCAPE — moteur d'escape game, piloté par themes/<nom>/theme.json
   URL : index.html?theme=demo        (debug : &debug=1)
   Plan du fichier :
     1. État du jeu (flags, inventaire, sauvegarde)
     2. Médias (images, musique, bruitages)
     3. Affichage d'une salle
     4. Actions des zones (texte, objet, risque, enigme, porte)
     5. Modules d'énigmes (code, quiz)  <-- ajoute les tiens ici
     6. Fenêtre, indices, chrono, débrief
     7. Démarrage
   ===================================================================== */

const PARAMS = new URLSearchParams(location.search);
const THEME = PARAMS.get('theme') || 'demo';
const BASE = `themes/${THEME}/`;
const CLE = `escape_${THEME}`;
const $ = sel => document.querySelector(sel);

let T;   // le thème (contenu de theme.json)
let E;   // l'état de la partie

/* ---------- 1. ÉTAT ---------- */
function etatNeuf() {
  return { salle: T.depart, flags: [], inventaire: [], indices: {}, debut: Date.now(), fini: false };
}
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(E)); } catch (e) {} }
function charger() { try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; } }

const a = flag => E.flags.includes(flag);            // "le joueur a-t-il ce flag ?"
function poser(flag) { if (flag && !a(flag)) { E.flags.push(flag); sauver(); } }

/* ---------- 2. MÉDIAS ----------
   Tous les fichiers sont rangés dans themes/<nom>/assets/
   Dans theme.json on écrit seulement "images/sas.jpg" ou "sons/porte.mp3". */
const media = fichier => `${BASE}assets/${fichier}`;

function creerImage(fichier, classe, alt) {
  const img = document.createElement('img');
  img.src = media(fichier);
  img.alt = alt || '';
  if (classe) img.className = classe;
  return img;
}

const musique = new Audio();
musique.loop = true;
let sonActif = true;

// Musique d'ambiance : ne redémarre pas si c'est la même d'une salle à l'autre
function jouerMusique(fichier) {
  if (!fichier) return musique.pause();
  const url = new URL(media(fichier), location.href).href;
  if (musique.src !== url) musique.src = url;
  if (sonActif) musique.play().catch(() => {});   // bloqué tant que le joueur n'a pas cliqué
}

// Bruitage ponctuel : nom d'un son déclaré dans theme.json > "sons"
function bruitage(nom) {
  const fichier = T.sons && T.sons[nom];
  if (!sonActif || !fichier) return;
  const b = new Audio(media(fichier));
  b.volume = T.volume_bruitages ?? 0.7;
  b.play().catch(() => {});
}

/* ---------- 3. AFFICHAGE D'UNE SALLE ---------- */
function afficherSalle(avecTransition) {
  const scene = $('#scene');
  const dessiner = () => {
    const s = T.salles[E.salle];
    // Décor : une image du thème, sinon un fond CSS (dégradé) en attendant
    scene.style.background = s.image ? `center / cover url("${media(s.image)}")` : s.fond;
    scene.classList.toggle('sombre', !!s.torche);
    $('#nom-salle').textContent = s.nom;
    jouerMusique(s.musique || T.musique);          // musique de la salle, sinon celle du thème

    const zones = $('#zones');
    zones.replaceChildren();
    for (const z of s.zones) {
      if (z.type === 'objet' && a(z.flag)) continue;   // objet déjà ramassé : il disparaît
      const b = document.createElement('button');
      b.className = 'zone'
        + (z.icone || z.image ? '' : ' invisible')
        + (z.type === 'risque' && a(z.flag) ? ' trouve' : '');
      b.style.cssText = `left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%`;
      if (z.image) b.append(creerImage(z.image));     // objet dessiné (PNG transparent)
      else b.textContent = z.icone || '';              // émoji, ou rien = zone invisible sur le décor
      b.setAttribute('aria-label', z.label);
      b.onclick = () => ACTIONS[z.type](z);
      zones.append(b);
    }
    afficherInventaire();
    scene.classList.remove('fondu');
  };
  if (avecTransition) { scene.classList.add('fondu'); setTimeout(dessiner, 400); }
  else dessiner();
}

function afficherInventaire() {
  const inv = $('#inventaire');
  inv.replaceChildren();
  for (const o of E.inventaire) {
    const d = document.createElement('span');
    d.className = 'objet';
    if (o.image) d.append(creerImage(o.image), o.nom);
    else d.textContent = `${o.icone || '📦'} ${o.nom}`;
    inv.append(d);
  }
}

/* ---------- 4. ACTIONS DES ZONES ---------- */
const ACTIONS = {
  // Observation, avec illustration facultative (affiche, document, photo…)
  texte(z) {
    if (!z.illustration) return dialogue(z.label, z.texte);
    const div = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = z.texte;
    div.append(creerImage(z.illustration, 'illustration', z.label), p);
    dialogue(z.label, div);
  },

  // Objet à ramasser : va dans l'inventaire et pose un flag
  objet(z) {
    E.inventaire.push({ nom: z.label, icone: z.icone, image: z.image });
    poser(z.flag);
    bruitage('objet');
    afficherSalle();
    dialogue(`${z.label} récupéré`, z.message);
  },

  // Chasse aux risques : cliquer un danger dans le décor
  risque(z) {
    poser(z.flag);
    bruitage('risque');
    afficherSalle();
    dialogue('⚠️ Risque repéré', z.message);
  },

  // Ouvre une énigme définie dans theme.json > "enigmes"
  enigme(z) {
    const en = T.enigmes[z.enigme];
    if (a(en.donne)) return dialogue(en.titre, `✅ Déjà résolu. ${en.message}`);
    MODULES[en.type](en, () => {
      poser(en.donne);
      bruitage('reussite');
      afficherSalle();
      dialogue('✅ Bravo', en.message);
    });
  },

  // Porte : s'ouvre si tous les flags de "ouvre_si" sont posés
  porte(z) {
    const manque = (z.ouvre_si || []).filter(f => !a(f));
    if (manque.length) {
      bruitage('verrou');
      return dialogue('🔒 Verrouillé', z.verrou || 'Il te manque encore quelque chose…');
    }
    bruitage('porte');
    if (z.vers === 'FIN') return fin(true);
    E.salle = z.vers;
    sauver();
    afficherSalle(true);
  }
};

/* ---------- 5. MODULES D'ÉNIGMES ----------
   Un module reçoit (enigme, reussi). Il affiche son interface dans la
   fenêtre et appelle reussi() quand le joueur a trouvé.                */
const MODULES = {
  // Digicode : { type:"code", titre, question, reponse, donne, message, illustration? }
  code(en, reussi) {
    const corps = document.createElement('div');
    if (en.illustration) corps.append(creerImage(en.illustration, 'illustration', en.titre));
    const p = document.createElement('p'); p.textContent = en.question;
    const champ = document.createElement('input');
    champ.className = 'saisie-code'; champ.inputMode = 'numeric'; champ.maxLength = en.reponse.length;
    const err = document.createElement('p'); err.className = 'erreur';
    corps.append(p, champ, err);
    const valider = () => {
      if (champ.value.trim() === en.reponse) return reussi();
      bruitage('erreur');
      err.textContent = 'Code incorrect.';
      champ.classList.remove('secoue'); void champ.offsetWidth; champ.classList.add('secoue');
      champ.value = '';
    };
    champ.onkeydown = ev => { if (ev.key === 'Enter') valider(); };
    dialogue(en.titre, corps, [['Valider', valider, true], ['Fermer', fermer]]);
    champ.focus();
  },

  // Quiz : { type:"quiz", titre, question, choix:[...], bonne:<index>, donne, message, illustration? }
  quiz(en, reussi) {
    const corps = document.createElement('div');
    if (en.illustration) corps.append(creerImage(en.illustration, 'illustration', en.titre));
    const p = document.createElement('p'); p.textContent = en.question;
    const err = document.createElement('p'); err.className = 'erreur';
    corps.append(p);
    en.choix.forEach((texte, i) => {
      const b = document.createElement('button');
      b.className = 'choix'; b.textContent = texte;
      b.onclick = () => {
        if (i === en.bonne) return reussi();
        bruitage('erreur');
        err.textContent = en.erreur || 'Ce n\'est pas ça, regarde mieux autour de toi.';
      };
      corps.append(b);
    });
    corps.append(err);
    dialogue(en.titre, corps, [['Fermer', fermer]]);
  }
};

/* ---------- 6. FENÊTRE, INDICES, CHRONO, DÉBRIEF ---------- */
// contenu : texte ou élément DOM ; boutons : [[libellé, action, gardeOuvert?], ...]
function dialogue(titre, contenu, boutons) {
  $('#modal-titre').textContent = titre;
  const corps = $('#modal-corps');
  corps.replaceChildren();
  if (typeof contenu === 'string') { const p = document.createElement('p'); p.textContent = contenu; corps.append(p); }
  else if (contenu) corps.append(contenu);
  const zone = $('#modal-boutons');
  zone.replaceChildren();
  for (const [libelle, action, gardeOuvert] of boutons || [['OK', fermer]]) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = libelle;
    b.onclick = () => { if (!gardeOuvert) fermer(); if (action !== fermer) action(); };
    zone.append(b);
  }
  $('#modal').hidden = false;
}
function fermer() { $('#modal').hidden = true; }

// Indices progressifs par salle : theme.json > salles.<id>.indices
function indice() {
  const liste = T.salles[E.salle].indices || [];
  const n = E.indices[E.salle] || 0;
  if (!liste.length) return dialogue('💡 Indice', 'Pas d\'indice ici : observe bien le décor.');
  dialogue(`💡 Indice ${Math.min(n + 1, liste.length)}/${liste.length}`, liste[Math.min(n, liste.length - 1)]);
  E.indices[E.salle] = n + 1;
  sauver();
}

function chrono() {
  if (E.fini) return;
  const reste = Math.max(0, T.duree_min * 60 - Math.floor((Date.now() - E.debut) / 1000));
  const c = $('#chrono');
  c.textContent = `${String(Math.floor(reste / 60)).padStart(2, '0')}:${String(reste % 60).padStart(2, '0')}`;
  c.classList.toggle('urgent', reste < 60);
  if (reste === 0) fin(false);
}

// Débrief : reprend automatiquement le message de chaque risque, objet et énigme du thème
function fin(gagne) {
  E.fini = true; sauver();
  bruitage(gagne ? 'victoire' : 'defaite');
  const corps = document.createElement('div');
  const intro = document.createElement('p');
  intro.textContent = gagne ? T.fin.gagne : T.fin.perdu;
  const ul = document.createElement('ul');
  const messages = [];
  for (const s of Object.values(T.salles))
    for (const z of s.zones) if (z.message) messages.push([a(z.flag), z.message]);
  for (const en of Object.values(T.enigmes)) messages.push([a(en.donne), en.message]);
  for (const [trouve, msg] of messages) {
    const li = document.createElement('li');
    li.textContent = `${trouve ? '✅' : '❌'} ${msg}`;
    ul.append(li);
  }
  const src = document.createElement('p');
  src.textContent = T.fin.sources || '';
  corps.append(intro, ul, src);
  dialogue(gagne ? '🎉 Mission réussie' : '⏰ Temps écoulé', corps, [['Rejouer', recommencer]]);
}

function recommencer() { E = etatNeuf(); sauver(); fermer(); afficherSalle(true); }

/* ---------- 7. DÉMARRAGE ---------- */
async function demarrer() {
  try {
    T = await (await fetch(`${BASE}theme.json`)).json();
  } catch (e) {
    $('#titre').textContent = 'Thème introuvable';
    return dialogue('Erreur', `Impossible de charger ${BASE}theme.json. Le jeu doit être servi par un serveur web (GitHub Pages ou "python -m http.server"), pas ouvert en double-cliquant sur le fichier.`);
  }
  document.title = T.titre;
  $('#titre').textContent = T.titre;
  for (const [nom, valeur] of Object.entries(T.couleurs || {}))
    document.documentElement.style.setProperty(`--${nom}`, valeur);
  musique.volume = T.volume_musique ?? 0.4;

  E = charger();
  const reprise = E && !E.fini && T.salles[E.salle];
  if (!reprise) E = etatNeuf();

  $('#btn-indice').onclick = indice;
  $('#btn-reset').onclick = () => dialogue('Recommencer ?', 'Ta progression sera effacée.', [['Oui', recommencer], ['Non', fermer]]);

  // Bouton son : coupe / relance musique et bruitages
  $('#btn-son').onclick = () => {
    sonActif = !sonActif;
    $('#btn-son').textContent = sonActif ? '🔊' : '🔇';
    if (sonActif) musique.play().catch(() => {}); else musique.pause();
  };
  // Les navigateurs bloquent le son tant que le joueur n'a pas cliqué : le 1er clic lance la musique
  document.addEventListener('pointerdown', () => { if (sonActif) musique.play().catch(() => {}); }, { once: true });

  // La lampe torche suit le doigt ou la souris
  $('#scene').addEventListener('pointermove', ev => {
    const r = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.style.setProperty('--tx', `${((ev.clientX - r.left) / r.width) * 100}%`);
    ev.currentTarget.style.setProperty('--ty', `${((ev.clientY - r.top) / r.height) * 100}%`);
  });

  // Mode debug (?debug=1) : affiche les coordonnées en % au clic, pour placer les zones
  if (PARAMS.has('debug')) {
    $('#scene').addEventListener('click', ev => {
      const r = ev.currentTarget.getBoundingClientRect();
      const x = Math.round(((ev.clientX - r.left) / r.width) * 100);
      const y = Math.round(((ev.clientY - r.top) / r.height) * 100);
      console.log(`"x": ${x}, "y": ${y}`);
      $('#nom-salle').textContent = `DEBUG  x:${x}  y:${y}`;
    });
  }

  afficherSalle();
  setInterval(chrono, 1000); chrono();
  if (!reprise) dialogue(T.titre, T.intro, [['Commencer', fermer]]);
}

demarrer();
