# Brief — 6.0-C : Le récit du parcours

## Objectif

La prise en charge a une histoire, et le patient participe à l'enquête. Tout
ce que cette campagne montre existe déjà dans des tables datées : elle
**restitue, elle ne produit jamais** — pas de nouvelle conclusion clinique, pas
de diagnostic, pas de causalité inférée (DC-31, DC-32, DC-34, DC-35). Le fil
patient actuel est une inbox d'actions ; la campagne lui adjoint une
chronologie racontée, une double lecture praticien/patient et des messages au
moment clinique — chaque texte dérivé d'un bloc déterministe et passé par la
garde du Socle, jamais généré librement (DC-01, DC-02, DC-26).

Référence d'architecture : §8 de l'audit du 2026-08-21 (architecture 6.0).

## Principes invariants (patrons du dépôt)

- **Projection, pas duplication** : la timeline se calcule depuis les tables
  datées append-only existantes (consultations, envois, check-ins,
  corrections, arbitrages biologiques) ; aucune table « événement » parallèle
  qui pourrait diverger de la source.
- **Append-only chaîné** pour tout nouvel objet persistant (patron des
  corrections et arbitrages existants) : on n'écrase jamais, on ajoute.
- **Versions hash-verrouillées** pour tout contenu servi au patient, façon
  `trust/contenus/registre.ts` : un texte exposé est signé, versionné, et le
  code refuse une version inconnue (DC-26).
- **Deux dates** sur chaque événement projeté : date de l'événement clinique
  et date d'enregistrement — jamais confondues.
- **Garde structurelle par test** : chaque invariant ci-dessus est tenu par un
  test qui échoue si on le viole, pas par une consigne (leçon D-043 : une
  règle sans banc reste opposable sur parole seulement).
- **Un trou dans la chronologie n'est jamais « rien à signaler »** : une
  période sans donnée s'affiche comme absence de donnée, pas comme normalité
  ni comme zéro (DC-24, DC-25).

## Lots pressentis (5)

1. **Timeline racontée par dossier** — écran de PROJECTION depuis les tables
   datées existantes. Le fil actuel est une inbox d'actions, pas une
   chronologie : ce lot ajoute la lecture chronologique sans créer de
   stockage nouveau. Les trous sont rendus comme des trous (DC-24). Aucune
   interprétation ajoutée : les événements parlent par leurs données et leurs
   claims (DC-34).
2. **Journal des petites victoires** — objet patient léger (saisie libre
   courte du patient), repositionné sur la timeline. JAMAIS présenté comme
   causal : une victoire voisine d'un changement de protocole est une
   coïncidence temporelle affichée comme telle, association ≠ causalité
   (DC-27). Donnée déclarative, jamais moyennée avec un score ni promue en
   signal clinique (DC-28, DC-30).
3. **« Pourquoi maintenant ? » + double lecture praticien/patient** — textes
   à deux registres (technique praticien, accessible patient) dérivés du
   même bloc déterministe, passés par la garde étendue du Socle. C'est un
   renforcement d'explicabilité : toute sortie reste explicable par données +
   claims, y compris quand elle s'abstient (DC-34, DC-35). Le registre
   patient ne simplifie jamais au point d'inventer un seuil ou une certitude
   (DC-19, DC-20, DC-25).
4. **Hypothèses partagées à statut** — renforcée / à explorer / moins
   centrale. Chaque exposition au patient est validée explicitement par le
   praticien, formulée dans le vocabulaire gardé du Socle. Une hypothèse
   n'est jamais un diagnostic et ne s'affiche jamais comme tel : diagnostic,
   hypothèse et orientation restent trois objets distincts, le diagnostic
   hors périmètre (DC-31, DC-32). Une discordance entre hypothèses se
   signale, ne se moyenne pas (DC-30).
5. **Messages au moment clinique** — courts, déclenchés par la trajectoire de
   façon déterministe (règles à provenance certifiée, pas de génération
   libre — DC-01), servis DEPUIS le registre signé du Socle (DC-26).
   **Aucune donnée de santé en email** : le message invite à ouvrir le
   portail, patron `relanceEmail` existant.

## Gates (conditions d'ouverture)

- **Socle** : garde étendue + registre signé livrés — les lots 3, 4 et 5 en
  dépendent directement ; sans eux, aucun texte à deux registres ni message
  ne peut être servi.
- **6.0-A** : livrée avant ouverture (dépendance de portefeuille 6.0).

## Contraintes et interdits

- Restitution seulement : aucun moteur nouveau, aucun score nouveau, aucun
  seuil nouveau (DC-17, DC-19, DC-20). Toute évolution qui toucherait la
  logique clinique exige décision `D-xxx` + fragment `changelog.d/`
  (DC-17, DC-18).
- Un signal de sécurité présent dans la trajectoire prime sur tout élément
  narratif et ne se raconte pas comme une péripétie (DC-12, DC-23).
- Identités de fixture uniquement dans le dépôt et les tests : Sophie
  Nicola, Jennifer Martin, Michel Dogné. Aucune donnée patient réelle.
- UI en français ; aucun secret en dur.
- Classe clinique/exposition patient : revue `wn-reviewer` avant de passer la
  main sur les lots 3, 4 et 5.

## Dépendances

- Gates : Socle (garde + registre) et 6.0-A — voir ci-dessus.
- Le lot 1 (projection pure) et le lot 2 (objet patient léger) ne dépendent
  pas de la garde étendue et peuvent ouvrir la campagne.
- Les lots 3→5 consomment le registre signé : ordre interne 1/2 avant 3/4/5.

## À l'ouverture (pas maintenant)

Ce dossier est init-only : le cadrage complet (CAMPAGNE.md, découpage en
lots/, critères d'acceptation, fichiers pressentis) s'écrira à l'ouverture de
la campagne, après vérification des gates.
