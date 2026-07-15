# Brainstorming WellNeuro 5.0 — « La Spirale »

> Session du 2026-07-15, à la suite de `../2026-07-15-wellneuro-4-0/PISTES_WELLNEURO_5_0.md`
> (les huit pistes, toutes retenues par l'utilisateur). Ce document transforme
> chaque piste en concept d'interface, consigne les arbitrages pris, et
> accompagne la maquette dédiée `maquette-wellneuro-5-0.html`.
> **Horizon 5.0 : vision non cadrée — aucune campagne, aucun calendrier.**

## Arbitrages posés (revue utilisateur du 2026-07-15)

| Question | Décision |
|---|---|
| Ambition visuelle de la Spirale | **Navigation temporelle complète** : cliquer un tour recharge la fiche telle qu'elle était à cette date (time-travel), en lecture seule |
| Périmètre du copilote v1 | **Maximal, écoute ambiante incluse** — sous condition bloquante d'un cadre de consentement formalisé (voir garde-fous) |
| Fondation à instruire en premier | **Identité patient durable** (la Spirale au sens propre exige les tours multiples) ; HDS en second |
| Livrable | Document + **maquette interactive dédiée** (URL distincte de la 4.0) |

## Le parti pris : le dossier devient trajectoire

La 4.0 organise chaque écran autour de **l'étape en cours** de la Boucle. La
5.0 l'organise autour de **ce que les tours précédents ont appris**. Trois
couches d'interface :

1. **Le Fil du jour** — l'axe du temps : ce qui arrive maintenant
   (consultations préparées, signaux, relectures), chaque carte disant
   « pourquoi maintenant ».
2. **La Fiche-trajectoire** — l'axe du patient : la Spirale comme index
   temporel navigable, le présent comparé aux tours passés, l'estimé confronté
   au mesuré.
3. **Les Instruments** — bibliothèques, questionnaires, documents : inchangés,
   hérités de la 4.0.

La Spirale elle-même est un **objet de navigation, jamais un graphe** : les
données restent en barres, bandes et lignes ; la spirale oriente, indexe et
transporte dans le temps.

## Huit pistes → huit concepts d'interface

### 1. Réconciliation estimé ↔ mesuré *(second temps — HDS)*

- **Objet** : `reconcile-row` — un même axe portant deux marqueurs, ◇ estimé
  (questionnaire) et ◆ mesuré (biologie), avec l'écart commenté.
- **Cycle de statut d'une donnée** : estimé → prélevé → mesuré → réconcilié.
- **Langage** : l'écart est une information de recueil (« déclaratif antérieur
  au changement d'habitude »), **jamais** « le patient surestime ».
- **Écarté** : toute fusion des deux valeurs en un chiffre unique.

### 2. Copilote de consultation

- **Pré-vol (T-10 min)** : ce qui a changé depuis la dernière consultation,
  discordances inter-instruments **citant leurs sources** (instrument, date,
  version de scoring), questions à poser suggérées.
- **Écoute ambiante (pendant)** : état de consentement de séance visible en
  permanence (recueil daté, suspension à tout moment, transcription
  consultable par le patient) ; notes structurées produites en brouillon.
- **La minute d'après (clôture)** : décision, protocole ajusté et document
  patient pré-remplis — trois relectures obligatoires, rien d'envoyable
  directement.
- **Principe affiché partout** : *préparé par le copilote · décidé par vous ·
  tracé*.
- **Écarté** : chatbot patient, envoi automatique, conservation de l'audio
  au-delà des notes validées.

### 3. Météo d'adhésion

- **Objet** : signal typé à trois états — *régulière / fragile / interrompue* —
  toujours texte + icône, toujours avec la **cause observable citée**
  (« journal silencieux depuis 5 jours », « rendez-vous J14 en retard »).
- **Côté patient** : jamais affichée ; à la place, le plan minimal se
  reformule (« une semaine difficile est prévue par le protocole »).
- **Écarté** : score de risque chiffré, notification culpabilisante.

### 4. Questionnaires adaptatifs

- **Côté patient** : la jauge « précision atteinte » remplace le compteur
  d'items — le questionnaire s'arrête quand la mesure suffit.
- **Côté praticien** : badge précision + version d'algorithme sur chaque score.
- **Gate absolu** : aucune adaptativité sur instrument certifié sans
  validation psychométrique ; pilotes bornés aux familles auditées (QX).

### 5. Mémoire longitudinale *(fondation : identité patient)*

- **Objets** : « reprise en douceur » (accueil dédié du patient qui revient :
  « voici où vous vous étiez arrêté »), comparateur multi-épisodes (extension
  du composant compare 4.0 — même instrument, même version, épisodes côte à
  côte), la Spirale comme index des épisodes.

### 6. Cabinet apprenant

- **Objet** : « repère du cabinet » — médiane discrète sur la courbe de
  momentum, avec `n=` toujours affiché, masqué sous un seuil à définir.
- **Langage** : « repère », jamais « prédiction » ; jamais individuel.
- **Écarté** : benchmark inter-cabinets (v1), tout pronostic nominatif.

### 7. Réseau de soin *(HDS pour les pièces jointes)*

- **Objet** : le courrier C3 devient **fil de correspondance** — la réponse du
  médecin traitant revient dans le fil, la pièce jointe biologique alimente
  la réconciliation (piste 1).

### 8. Interface ambiante

- **Objet** : le Fil du jour comme accueil — le matin, les consultations
  préparées ; à la clôture, les relectures. **Proposition, jamais capture** :
  le rail 4.0 reste intégral, chaque automatisme affiche son « pourquoi
  maintenant », tout est refusable.

## Garde-fous — ce que la 5.0 refuse

- Gamification patient (badges, séries) — contradictoire avec le langage non
  culpabilisant ; le journal reste sans score.
- Score de risque chiffré, prédiction individuelle, pronostic nominatif.
- Chatbot patient médicalisant.
- Envoi automatique de quoi que ce soit — la chaîne Relu → Validé pour
  diffusion → Envoyé reste la loi.
- Spirale-graphe (données encodées en spirale) — gadget écarté d'office.
- IA non sourcée : toute proposition du copilote cite instrument, date,
  version de scoring.
- Écoute ambiante sans cadre : **condition bloquante** — consentement
  formalisé, information du patient, droit d'accès à la transcription,
  non-conservation de l'audio ; à instruire réglementairement (RGPD/CNIL)
  avant tout développement.

## Une journée 5.0 (narratif)

**8h50** — Le Fil du jour s'ouvre : trois consultations, deux pré-vols prêts,
une météo d'adhésion fragile (Michel Dogné, journal silencieux 5 jours).
**8h55** — Pré-vol Jennifer Martin : une discordance sourcée (plaintes sommeil
8/10 au J14 vs domaine Sommeil satisfaisant au T0) et deux questions
suggérées. **9h00** — Consultation ; consentement de séance recueilli 9h02 ;
notes structurées en brouillon pendant l'échange. **9h32** — La minute
d'après : décision, protocole et document pré-remplis, trois relectures, un
envoi. **11h00** — Michel : le pré-vol cite la cause de la météo fragile ; en
consultation, le plan minimal est reformulé plutôt que renforcé. **14h30** —
Fiche-trajectoire de Sophie Nicola, de retour après 12 mois : la Spirale
montre l'épisode 2025 clos (momentum final +11) ; un clic sur le tour J21
recharge la fiche de l'époque ; retour au présent, comparaison, décision.
**17h30** — Correspondance : réponse du médecin traitant, pièce jointe
biologique — rapprochement proposé avec l'estimation questionnaire (HDS
requis pour aller au bout). **18h00** — Le Fil se ferme sur ce qui attend
demain.

## Phasage — identité d'abord

```text
Phase A (sans prérequis nouveau)
  copilote-préparation (sur C2A) · repères du cabinet (dès épisodes clos)
  Fil du jour (statique)
Phase B (identité patient durable)  ← fondation choisie en premier
  Spirale + time-travel · mémoire longitudinale · reprise en douceur
  messagerie → réseau de soin (fils)
Phase C (HDS)
  biologie réelle · réconciliation estimé↔mesuré · pièces jointes de
  correspondance
Transverse (réglementaire, en parallèle)
  cadre de consentement de l'écoute ambiante — bloquant pour ce volet
  du copilote uniquement
```

## Direction artistique (v2, 2026-07-15) — « l'Observatoire et le Jardin »

Arbitrage utilisateur : **Nuit spectrale pour le praticien, Forêt & cuivre
pour le patient**. Deux mondes, une même spirale : le praticien observe
depuis la nuit (précision, profondeur), le patient avance dans un jardin
(chaleur, croissance).

### Praticien — Nuit spectrale

| Rôle | Valeur |
|---|---|
| Rail (signature sombre A5 conservée) | dégradé `#151C38 → #10162B`, bordure `#2A3358` |
| Espace de travail (clair A5 conservé) | fond `#F7F8FA`, surface blanc, encre `#1B2337` |
| Primaire | indigo `#3D4A9E` |
| Données | menthe `#0D9488` |
| Accent | solaire `#E8A33D` (graphique) / `#8A5B10` (texte, contraste AA) |
| Épisodes de la spirale (couleur d'entité fixe) | épisode 1 = menthe · épisode 2 = indigo · position courante = point solaire |
| Typo | **Sora** (titres) · **Instrument Sans** (texte) · **IBM Plex Mono** (heures, valeurs, transcript) |

**Validateur dataviz** (trio `#0D9488, #3D4A9E, #E8A33D`, mode light) :
lightness PASS, chroma PASS (menthe remontée de `#0E8578` à `#0D9488` pour
franchir le plancher), CVD ΔE 48 PASS ; **WARN contraste sur le solaire
(2.1:1)** → règle de relief obligatoire, identique à l'or 4.0 : le solaire ne
porte jamais une information sans étiquette textuelle directe.

### Patient — Forêt & cuivre

| Rôle | Valeur |
|---|---|
| Fond | ivoire `#FAF8F3`, surface `#FFFDF9`, encre chaude `#2B2115` |
| Primaire | vert forêt `#1E6F54` |
| Données | sauge `#2F9E6E` (remontée de `#4E8D6E` pour le plancher de chroma) |
| Accent | cuivre `#B25E38` |
| Typo | **Bricolage Grotesque** (titres) · **Albert Sans** (texte) |

**Validateur dataviz** (duo `#2F9E6E, #B25E38`, mode light) : tous les
contrôles PASS (contraste ≥ 3:1 inclus).

### Mise en œuvre et gouvernance

- Polices embarquées en `@font-face` data URI (7 fichiers woff2 latin,
  ~107 Ko — la CSP artifact interdit les CDN) ; piles de secours système.
- Le graphe « Mode de vie » devient **point sur zones de seuil** : fond
  teinté selon les **vraies bornes du référentiel par domaine** (ex.
  Sommeil /28 : 32 % / 52 % ; Adaptation /24 : 38 % / 73 % ; Activité /20 :
  33 % / 68 %), point plein = aujourd'hui, point creux = T0, valeur + statut
  textuel — la couleur n'est jamais seule.
- Le rail affiche le groupe **« Héritage 4.0 — inchangé »** (Questionnaires
  & packs, Bibliothèque, Documents, Agenda, Biologie) : la 5.0 est une
  couche au-dessus de la 4.0, aucun outil n'est abandonné.
- **Gouvernance** : cette DA est une exploration 5.0. La structure A5 (rail
  sombre signature + espaces clairs, patient clair fixe) est strictement
  conservée ; l'adoption des nouvelles teintes en production serait une
  évolution du design system à acter au registre. Les tokens réels de
  `web/src/app/globals.css` ne sont pas touchés.

## Questions pour la prochaine revue

1. **Time-travel** : lecture seule stricte (recommandé), ou autoriser
   l'annotation rétrospective (« note de relecture » horodatée au présent) ?
2. **Seuil du cabinet apprenant** : à partir de quel `n` afficher le repère ?
3. **Écoute ambiante** : qui recueille le consentement et sous quelle forme
   (case en début de séance, document signé, mention au dossier) ?
4. **Le Fil du jour** remplace-t-il l'accueil 4.0 (file de décisions) ou
   s'y superpose-t-il selon l'heure ?
5. La **reprise patient** déclenche-t-elle un pack de réévaluation
   automatiquement proposé (jamais auto-assigné) ?

## Raccordement

Chaque concept passera par son cadrage de campagne au moment voulu ; ce
brainstorming n'engage aucun lot. Si la revue visuelle retient la Spirale et
le Fil, les inscrire au registre comme candidats post-programme 3.0, avec
leurs deux fondations (identité patient, HDS) comme préalables instruits.
