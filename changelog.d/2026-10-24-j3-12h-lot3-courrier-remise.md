### J3-12h, lot 3 : le courrier au médecin avant un complément ciblé, sa remise au clic et le refus, sous drapeau éteint (D-356 ; D-345 §4-§7, 2026-10-24)

- Le code consommateur de la trace de remise du lot 2 (#1679, appliquée en
  production et constatée par conteneur le 2026-10-24). Aucune migration,
  aucun `schema.prisma`. Le tout est livré sous `WN_COURRIER_COMPLEMENT`,
  **éteint** : drapeau fermé, le clic « Valider pour diffusion » lit et écrit
  exactement ce qu'il faisait avant, jeton compris.
- Arbitrages du responsable du 2026-10-24 (D-356) :
  - **le texte du courrier est validé** : il ne nomme ni la population ni la
    situation (forme opaque) ;
  - **« déjà tracé »** veut dire que la liste de la version est contenue
    dans celle d'**une** remise antérieure ;
  - le portail viendra au lot 4 ;
  - un seul drapeau couvre tout le lot.
- `lib/correspondance/courrierComplementListe.ts` : la liste couverte,
  calculée depuis les actions PERSISTÉES par la règle du trigger. Elle refuse
  en clair, avant toute insertion :
  - un format d'identifiant invalide ;
  - un intitulé vide ;
  - une référence catalogue nulle ;
  - un contrat qui n'est pas en V4.
- `lib/correspondance/courrierComplement.ts` et le modèle
  `courrier_complement` : le générateur, rendu sous la garde non
  prescriptive. Le nom du patient ne figure que dans l'en-tête du rendu.
- `lib/correspondance/courrierComplementConsignation.ts` et la route
  `POST /api/praticien/protocoles/courrier-complement` :
  - la version persistée, la garde et l'accord de partage (régime fermé)
    sont relus ;
  - le courrier et sa liste s'écrivent dans **une seule transaction**,
    l'accord étant relu sous verrou.
- `lib/clinical/entreesGardeComplement.ts` lit :
  - l'âge, par `statutAge` ;
  - la tête des fils grossesse et allaitement de la fiche physiologique ;
  - toutes les anamnèses envoyées, datées par leur envoi ;
  - l'accord.

  La garde du lot 1 prend ses valeurs signées par défaut, sans injection.
- `lib/correspondance/courrierComplementRemise.ts`, branché sur le clic de
  diffusion :
  - **parmi les refus d'avant l'embranchement**, le clic rend
    `409 courrier_complement_requis` avec un motif en clair quand :
    - la garde refuse ;
    - le courrier est requis mais n'a pas été préparé ;
    - un courrier est à remettre alors que le chemin des fiches est fermé ;
    - le dossier est bloqué ;
  - l'aperçu, recalculé sous verrou, **entre dans le jeton** du clic ;
  - la remise passe par `createMany` : 0 ligne ou un conflit 23505 se lisent
    « déjà remis », après vérification. **Tout autre refus annule le clic
    entier** (fail-closed), à la différence de la lettre d'adressage.
- Écrans :
  - la case « Ciblé / Multivitaminé en vente libre » dans le constructeur de
    protocole, sans valeur par défaut, avec les situations désignées par leur
    code seul ;
  - un bloc « Courrier au médecin avant un complément ciblé » dans la
    sous-vue Diffusion : motif, destinataire prérempli et bouton « Préparer
    le courrier au médecin ».
- Gardes :
  - les deux émetteurs sont nommés dans
    `courriersComplementRemises.guard.test.ts` ;
  - la garde du complément est inscrite parmi les lecteurs de la fiche
    physiologique (D-345 §3 amende D-335 §8) ;
  - `docs/FEATURE_FLAGS.md` porte quatre conditions d'ouverture :
    - l'écran du portail (lot 4) ;
    - un passage de bout en bout sur un dossier de test ;
    - `WN_FICHES_ASSIETTE` ouvert ;
    - `WN_PHYSIO_TRAITEMENTS` ouvert.
- Bancs :
  - unitaires : liste, générateur, entrées, aperçu, remise ;
  - routes : clic de diffusion, générateur, et versions sur les deux champs
    du lot 1 ;
  - constructeur ;
  - **sur un vrai Postgres**, `courrierComplement.pg.test.ts` (ligne de CI
    neuve) :
    - parité de la liste TypeScript avec le trigger, ingrédient compris, et
      sa contre-épreuve ;
    - les deux ou rien ;
    - rejeu sans erreur ;
    - remise de bout en bout par les vraies lectures de la garde ;
    - transaction annulée sur refus du trigger ;
    - collation en casse mélangée ;
    - référence catalogue nulle.
- Revue Codex (P0), deux P1 corrigés :
  - la consignation relit la date de naissance sous le verrou du patient et
    refuse un dossier devenu mineur, ou sans date, avant toute insertion
    (bancs route et Postgres, contre-épreuve comprise) ;
  - le libellé du destinataire de D-345 §7 ne s'affiche que pour la
    grossesse, plus pour un allaitement seul (arbitrage du responsable).
- Revue `wn-reviewer` : GO sous conditions, aucun P0.
  - Les deux P1 sont corrigés :
    - clôture posée ;
    - dépendance à `WN_PHYSIO_TRAITEMENTS` documentée.
  - Les P2 suivants sont corrigés :
    - le GET se dégrade au lieu de tomber ;
    - la clé est présente dès le premier protocole ;
    - l'état est remis à zéro sur un échec de lecture ;
    - un dossier bloqué est refusé ;
    - la lecture est inchangée drapeau fermé ;
    - le banc Postgres est complété.
  - Trois P2 sont écartés avec motif ou routés :
    - écrivains non sérialisés avec le clic (fenêtre étroite) ;
    - `courrierComplementRemis` à faux sur « déjà remis » ;
    - motif `terme_prescriptif` général, patron du courrier biologie.
