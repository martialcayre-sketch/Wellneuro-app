# Brainstorming Journal alimentaire 5.0 — « Ma spirale alimentaire »

> Session du 2026-07-16, à la suite de la relecture intégrale du pack
> `2026-07-16-journal-alimentaire-5-0/` (11 documents, contrats de référence,
> prototype). Ce document consigne le cap produit retenu après confrontation
> des trois visions du pack, les décisions de brainstorm prises par
> l'utilisateur, et les idées ajoutées en session. Il alimente
> `ARBITRAGES_JA_5_0.md` (revue D2–D12) puis l'actation au registre
> (`REGISTRE_FRONTIERES.md`, A7).
> **Périmètre : documentaire — aucune campagne compilée, aucun code.**

## Les trois visions du pack

| Vision | Source | Unité centrale | Question posée au patient |
|---|---|---|---|
| Carnet adaptatif | docs 00–06 | le repas (empreintes, signatures) | « Qu'avez-vous mangé ? » (proportionné) |
| Capteur d'action | doc 09 (synthèse critique) | l'action validée | « Avez-vous réalisé l'action prévue ? » |
| Atelier d'expériences | doc 10 (vision exploratoire) | la faisabilité de l'action | « Qu'est-ce qui a rendu l'action facile, difficile ou inutile ? » |

## Arbitrages posés (revue utilisateur du 2026-07-16)

| Question | Décision |
|---|---|
| Nom patient (D1 du pack) | **« Ma spirale alimentaire »** (praticien : « Trajectoire alimentaire ») |
| Noyau produit | **Expérience/friction (doc 10), fusionné** : l'expérience est l'épisode recadré — `FoodObservationEpisode` porte l'hypothèse et les versions d'action ; pas d'objet `DietaryActionExperiment` séparé |
| Vocabulaire patient | **« Essai »** (« ce que nous essayons cette phase ») ; « expérience » reste un terme interne praticien |
| Panorama léger J1–J3 | **Optionnel** : prescriptible par le praticien au premier tour quand le schéma alimentaire est peu documenté ; jamais imposé par défaut |
| Trois vérités (prévu/observé/choisi) | **Choix patient au noyau** : à la clôture du tour, le patient désigne la version de l'action qu'il juge durable — préférence transmise, jamais auto-prescription |
| Bibliothèque personnelle de solutions | **Concept au noyau, persistance gatée** : restitution intra-épisode ; la persistance inter-épisodes dépend d'IDP (conforme D6) |
| Durée d'un tour | **Cible adaptative** : 21 jours par défaut, clôture anticipée possible quand la couverture est exploitable, prolongation/suspension par décision humaine |
| Fermeture de boucle | **Les quatre idées retenues** : retour de décision, tour suivant préparé, charge perçue en clôture, trace depuis notification (conditionnée à D9) |

## Le parti pris : on n'observe pas le patient, on teste la conception de l'action

Tous les journaux alimentaires du marché capturent le **contenu** des repas.
Aucun ne capture la **faisabilité d'un changement** — or c'est la donnée dont
le praticien a besoin pour concevoir le tour suivant, et celle qu'aucune photo
d'assiette ne donnera jamais.

Le renversement est triple :

1. **La friction devient la donnée première.** Occasion présentée ?
   praticable ? qu'est-ce qui a compté ? La restitution praticien décrit les
   conditions qui facilitent ou empêchent l'action, jamais la conformité du
   patient.
2. **La métrique s'inverse.** Le succès n'est plus « 21 jours remplis » mais
   « le moins de saisie possible pour une meilleure décision ». Le droit au
   silence utile (« vous n'avez rien à noter aujourd'hui ») est un résultat
   positif — la minimisation RGPD rendue tangible, cohérente avec TRUST.
3. **L'échec change de camp.** Une action peu réalisée révèle un défaut de
   conception (pas d'occasion réelle, action trop complexe, mauvais moment) —
   jamais un échec du patient. L'expérience non concluante est un
   apprentissage valable.

Le nom acté prend alors son sens plein : **chaque tour de spirale est un
essai qui améliore la conception du tour suivant**. La spirale n'est pas une
métaphore décorative, c'est le mécanisme.

## Les innovations du doc 10 passées au crible

### Retenues au noyau

- **Capture occasion/praticabilité/friction** en 2–3 gestes structurés
  (< 10 s). La taxonomie des frictions (temps, disponibilité, appétit, coût,
  contexte social, tolérance, oubli) est un **registre versionné à catégories
  fermées**, sur le modèle du registre de marqueurs (doc 03 §4) — donnée
  contextuelle de vie, descriptive, jamais psychologisante, pas de texte
  libre par défaut.
- **Hypothèse et versions d'action** (idéale / simple / secours) portées par
  l'épisode lui-même — fusion avec le plan idéal/minimal/secours déjà présent
  dans l'action structurée (doc 03 §2). Un objet de moins, un concept de plus.
- **Budget d'attention** réglable par le patient dans les limites du
  protocole, calibré au tour suivant par la **charge perçue en clôture**
  (une seule question).
- **Droit au silence utile** : arrêt des sollicitations quand la couverture
  devient exploitable pour la revue.
- **Trois vérités séparées** : prévu (protocole) / observé (traces) / choisi
  (préférence patient à la clôture). Garde-fou : le choix patient est une
  préférence transmise au praticien, structurellement distincte d'une
  décision clinique.
- **Delta de décision** : à la PhaseReview, la décision a-t-elle été
  confirmée, simplifiée, remplacée, suspendue ou arrêtée ? Un champ unique —
  la valeur du dispositif se mesure sans nouveau moteur.
- **Bibliothèque personnelle de solutions** : les signatures deviennent des
  « solutions qui fonctionnent pour moi » liées à un contexte (départ
  matinal, faible appétit, déplacement…). Concept au noyau ; persistance
  inter-épisodes gatée par IDP.

### Idées ajoutées en session (hors pack)

Le pack avoue sa faiblesse principale (doc 09 §4.1) : la trace ne crée de
valeur que si la boucle patient-praticien est visible. Quatre ajouts pour la
fermer :

1. **Le retour de décision** — après la revue, le patient voit ce que ses
   traces ont changé : « vos 9 repères ont conduit à simplifier l'action ».
   Texte déterministe composé d'objets validés, envoyé via la chaîne
   Relu → Validé → Envoyé. C'est la réponse directe à « pourquoi je note ? ».
2. **Le tour suivant préparé en continu** — chaque friction répétée alimente
   un brouillon de reformulation de l'action, visible du praticien seul,
   candidat ProtocolDraft, jamais auto-envoyé.
3. **La charge perçue en clôture** — calibre le budget d'attention du tour
   suivant ; germe du cabinet apprenant sans agrégation.
4. **La trace depuis la notification** — occasion → praticable → friction en
   deux gestes sans ouvrir l'application. Conditionnée à l'arbitrage D9
   (notifications contextuelles avec « pourquoi maintenant »).

### Différées (hors noyau)

- capture photo/voix (docs 01 §3 niveau 3, 04 §5) ;
- météo d'adhésion agrégée — le noyau restitue des **constats directs
  observables** (« aucune trace depuis 5 jours, plan minimal non activé ») ;
  l'agrégation en trois états reste à trancher en D8 ;
- description exhaustive des repas et projections SIIN automatiques ;
- Nutrition Lab avancé (repas miroir, simulateur d'action) ;
- cabinet apprenant ;
- comparaison multi-épisodes automatique ;
- hors-ligne complexe et résolution de conflits.

L'empreinte de repas (marqueurs ✓/○) n'est pas abandonnée : elle sert le
panorama optionnel et la documentation des occasions réalisées, au second
niveau de lecture praticien.

## Garde-fous confirmés

Inchangés par rapport au pack (README « principes non négociables ») et au
registre : aucune notation du patient, aucune gamification, aucune absence
convertie en zéro, aucune recommandation autonome, chaque automatisme dit
« pourquoi maintenant », propositions IA confirmées/sourcées/révocables,
historique immuable (une correction crée un événement), praticien seul
décideur. S'y ajoutent, issus de cette session :

- le registre de frictions est versionné, à catégories fermées, descriptif ;
- le choix patient (troisième vérité) ne déclenche jamais seul une
  modification du protocole ;
- le retour de décision suit la chaîne Relu → Validé → Envoyé ;
- le brouillon de reformulation n'est jamais visible du patient ni envoyé.

## Raccordement

- **Suite immédiate** : revue des décisions D2–D12 du pack
  (`docs/07_DECISIONS_A_ARBITRER.md`) une par une, éclairées par ce cap →
  `ARBITRAGES_JA_5_0.md`.
- **Actation** : entrée A7 au `REGISTRE_FRONTIERES.md` (§2) + mise à jour de
  la fiche JA (§3) ; recadrage de
  `campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md` (le gate
  d'audit clinique/RGPD JA-00 reste premier ; persistance toujours gatée par
  C2A + confirmation migration).
- **Hors périmètre** : aucun code (`web/src/lib/food-observation/` attendra
  un lot ultérieur), aucune migration, aucun changement de scoring
  `Q_ALI_01`/`Q_ALI_02`.
