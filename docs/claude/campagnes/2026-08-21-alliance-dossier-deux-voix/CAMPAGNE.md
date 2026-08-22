---
id: "2026-08-21-alliance-dossier-deux-voix"
titre: "Alliance 6.0-A — le dossier à deux voix"
statut: "terminée (2026-08-22 — six lots mergés ; gate D-092 constaté en production par conteneur : cinq tables et écrivain unique prouvés, zéro ratification)"
créée_le: "2026-08-21"
mise_à_jour: "2026-08-22"
lot_courant: "aucun"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Alliance 6.0-A — le dossier à deux voix

## Objectif

Donner au dossier les objets qui rendent la négociation clinique **visible** :
ce que le patient demande, ce que le praticien en comprend, ce qui est
priorisé, ce qui est assumé « non traité pour l'instant ». C'est la réponse
produit au trou Éducation thérapeutique de l'audit du 2026-08-21 (§8) —
toujours aucune occurrence ETP dans `web/src` au 2026-08-22.

Cette campagne se livre **AVANT** l'activation élargie du chemin
protocole→produits : `priorityRulesV1` est signée depuis le 2026-08-16, et la
ratification patient (l'objectif négocié) doit précéder toute recommandation
élargie qui s'en réclamerait. L'ordre est un gate, pas une préférence.

## Résultat observable

1. Un **objectif négocié** existe par dossier : énoncé patient, reformulation
   praticien, priorité clinique, « non traité pour l'instant » assumé et
   daté — append-only, jamais un score, ratifiable par le patient au portail.
2. Le patient dispose d'un champ « **ce qui compte pour moi aujourd'hui** »,
   horodaté, conservé — une trajectoire de sens à côté des scores, jamais
   résumée dans un score ; un champ vide est un silence, pas une réponse.
3. La synthèse « **ce que j'ai compris de vous** » se présente au patient par
   le circuit de textes gardés du Socle, avec un bouton « Ce n'est pas
   exactement ça » qui crée un **objet désaccord structuré** — visible, jamais
   écrasé ni moyenné — remplaçant le détournement du déverrouillage de
   questionnaire comme canal de contestation.
4. Une **EVA voie instrument cabinet** suit le cycle
   `brouillon → grille_a_relire → valide` existant, sans aucun seuil : elle
   pilote la conversation, elle ne classe pas.
5. L'écran portail « dossier à deux voix » assemble ces objets — première
   tranche du dashboard patient E4 — et la clôture de la campagne **constate
   le gate** : la ratification patient précède l'activation élargie.

## État réel au cadrage — 2026-08-22

Le brief (2026-08-21) a été re-mesuré constat par constat contre le dépôt
(leçon du Socle). Deux constats confirmés, trois **corrigés ou déplacés par ce
que le Socle a livré entre-temps** — le cadrage est écrit sur les mesures :

| Le brief disait | Mesuré le 2026-08-22 |
|---|---|
| « Les champs attentes/motif de l'anamnèse existent mais sont figés en JSON à la validation — aucune trajectoire, aucun désaccord possible » | **Confirmé.** Une seule colonne `anamnese Json?` (`web/prisma/schema.prisma:102` — la citation `:96` du cadrage était fausse, cette ligne est `consentementHorodatage` ; corrigé à l'exécution du LOT-02) ; champs `motif_principal` (seul requis — `consultation/anamnese.ts:44`), `objectif_prioritaire` (`:64`) et `attentes` (`:66`). Aucun objet de trajectoire. **Fait neuf** : depuis `D-054`, la tête du cockpit lit déjà une plainte dominante Q_MOD_03 (`clinical-engine/chaineC1.ts:172`) — l'ancrage du LOT-02 a donc **trois sources d'énoncé existantes** à l'anamnèse, plus la plainte Q_MOD_03, à afficher comme matériau, jamais à réécrire. **Mesuré au LOT-02** : la plainte Q_MOD_03 n'est produite que par le POST de confirmation d'épisode, jamais par une route de lecture — le LOT-02 ne la reprend donc pas et renvoie au bloc `D-054` du cockpit. |
| « Le seul canal de contestation patient est le déverrouillage de questionnaire — il rejoue une saisie, il n'exprime pas un désaccord » | **Confirmé.** Le déverrouillage vit côté soumission (`api/patient/submit/route.ts`) et agenda (`api/portail/agenda-alimentaire/route.ts`) ; aucun objet désaccord, aucune surface de contestation d'une compréhension (greps du 2026-08-22). |
| « Aucun objet EVA, aucun objectif négocié, aucun écran de synthèse de compréhension — à revérifier à l'ouverture » | **Revérifié, toujours vrai.** Greps du 2026-08-22 : aucune occurrence applicative d'« objectif négocié », de synthèse de compréhension ni d'EVA-instrument (les correspondances `EVA` trouvées sont fortuites). Aucune occurrence ETP. |
| « Patrons à réutiliser : journal append-only chaîné, versions hash-verrouillées façon `trust/contenus/registre.ts`, deux dates, garde par test » | **Corrigé et enrichi par le Socle.** Le patron trust n'a **ni deux dates ni chaîne de hash** (mesure du cadrage Socle — « chaîné » s'entend ici *par référence à l'entrée précédente*, jamais au sens hash-chain). Le patron canonique est désormais **`correspondance/registreGabarits.ts`** (Socle LOT-03, PR #741) : versions + hash (`canonicalSha256` réutilisable) + deux dates (`valideLe: null` tant que le responsable n'a pas validé) + écarts déclarés. Tout message patient neuf de cette campagne **s'ajoute au registre avec sa déclaration de conformité — plus jamais inline** (handoff du 2026-08-22 12:49). |
| « EVA — cycle brouillon → grille_a_relire → valide, comme les instruments existants » | **Précisé.** Ce cycle existe sur `CabinetInstrument` (`web/prisma/schema.prisma:1450`, mono-praticien, scoring au resolver commun `@/lib/instruments`). C'est la voie d'atterrissage naturelle de l'EVA — **peut-être sans migration** ; le LOT-05 tranche et ne dépend pas du LOT-01. |

Fait neuf transverse (Socle LOT-02) : les fichiers cliniques s'écrivent au
niveau « demande » du hook. Toute table clinique que cette campagne créerait
naît sous cette discipline ; aucun candidat pressenti au cadrage — les objets
de l'alliance sont relationnels, pas des tables de règles.

## Les lots

| Lot | Titre | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | La migration du dossier à deux voix — **CONFIRMATION OBLIGATOIRE** | terminé (2026-08-22 — mergé #748, migration constatée en production : 58 migrations up to date, contrat `alli_` vert au conteneur) | — |
| LOT-02 | L'objectif négocié v1 — énoncé, reformulation, priorité, « non traité » assumé | terminé (2026-08-22 — mergé #754 ; six gardes vues rouges ; ratification lue, jamais écrite ; aucune migration) | LOT-01 (migration constatée par conteneur) |
| LOT-03 | « Ce qui compte pour moi aujourd'hui » — la trajectoire de sens au portail | terminé (2026-08-22 — mergé #755 ; cinq gardes vues rouges ; drapeau neuf et éteint `WN_CE_QUI_COMPTE` ; aucune migration) | LOT-01 (migration constatée par conteneur) |
| LOT-04 | « Ce que j'ai compris de vous » — synthèse gardée et désaccord structuré | terminé (2026-08-22 — mergé #757, `D-090` ; `WN_COMPREHENSION` posé en production le 2026-08-22 ; accusé de lecture sans colonne neuve ; aucune migration) | LOT-01 ; Socle (livré) |
| LOT-05 | L'EVA voie instrument cabinet — piloter sans classer | terminé (2026-08-22 — mergé #750, `D-088`) | — (indépendant du LOT-01, cf. cadrage) |
| LOT-06 | L'écran « dossier à deux voix » au portail — ratification et constat du gate | terminé (2026-08-22 — mergé #760 ; écran d'assemblage, ratification append-only, drapeau neuf et éteint `WN_DOSSIER_DEUX_VOIX`, gate `D-092` constaté en production ; aucune migration) | LOT-02, LOT-03, LOT-04 |

Correspondance avec les quatre lots esquissés du brief : 1 → LOT-02, 2 →
LOT-03, 3 → LOT-04, 4 → LOT-05 ; le LOT-01 isole la migration (confirmation
obligatoire), le LOT-06 porte la surface portail (tranche E4) et la
ratification — le « lot 3 derrière le Socle » du brief est le LOT-04.

## Gates

- **Sortie de campagne = préalable à l'activation élargie protocole→produits** :
  aucune recommandation élargie se réclamant de `priorityRulesV1` avant que la
  ratification patient existe et soit constatée.
- **LOT-04 et LOT-06 derrière le circuit du Socle** : tout texte
  praticien→patient passe par les gabarits au registre
  (`correspondance/registreGabarits.ts`) et les gardes de restitution avant
  d'être montré ; un message neuf s'ajoute au registre, déclaration de
  conformité comprise.
- **LOT-01 gaté par confirmation explicite** : la migration ne s'écrit
  qu'après accord dans la conversation, seule dans sa PR ; son application en
  production (au merge, `D-086`) se **constate par conteneur** avant tout
  code qui en dépend.
- Toute décision clinique de la campagne = décision `D-xxx` + fragment
  `changelog.d/` (`DC-17`, `DC-18`).

### Constat de clôture — D-092

Constaté le 2026-08-22 depuis la production Scalingo, par conteneur one-off
`one-off-9402`, en lecture seule et sans lire aucune ligne patient :

1. les cinq tables de l'alliance existent et leurs contraintes ont été
   constatées au LOT-01 (`#748`, contrat `alli_` vert en production) ;
2. la route portail est l'unique écrivain de la ratification, invariant tenu
   par la garde structurelle du LOT-06, vue rouge par mutation (`#760`) ;
3. `ratifications_objectif` contient **zéro ligne** en production
   (`D092_RATIFICATIONS_COUNT=0`).

Le gate structurel est donc constaté. Il ne vaut ni constat d'usage réel ni
activation élargie protocole→produits. `WN_COMPREHENSION` est posé à `true` ;
`WN_CE_QUI_COMPTE` et `WN_DOSSIER_DEUX_VOIX` restent absents de la
configuration de production. Leur pose, avec un build qui les porte (`D-071`),
et toute activation élargie restent des gestes du responsable.

## Invariants de campagne (opposables aux six lots)

- **Append-only par référence** : rien ne s'écrase, un correctif est une
  nouvelle entrée qui référence l'ancienne ; une discordance reste visible,
  ne s'écrase et ne se moyenne jamais (`DC-30`).
- **Deux dates partout** : date de l'événement ≠ date d'enregistrement.
- **Jamais un score** : aucun champ de score sur un objectif négocié ni sur
  « ce qui compte » (`DC-19`, `DC-20` — voir la correction ci-dessous) ;
  aucun seuil, borne ou bande sur l'EVA
  (`DC-19`, `DC-20`) ; une reformulation praticien n'est jamais diagnostique
  (`DC-31`, `DC-32`).
> **Correction doctrinale (2026-08-22, relevée en revue du LOT-03)** : cet
> invariant citait `DC-27` pour l'interdit d'agrégation d'une parole de
> patient. `DC-27` dit « association ≠ causalité ; score ≠ diagnostic » — il ne
> porte pas cet interdit. Ce qui le porte, c'est **l'invariant de campagne
> lui-même**, adossé à `DC-19`/`DC-20` (aucun seuil, dose, poids ou borne
> inventé) : compter, moyenner ou noter une parole reviendrait à poser une
> borne clinique sans provenance. Le code des LOT-02 et LOT-03 cite désormais
> la bonne règle. **Les fichiers de lot écrits avant cette correction
> (LOT-02 § Périmètre, LOT-04, LOT-06) portent encore l'ancienne citation** :
> à corriger à l'ouverture de chacun, pas rétroactivement d'ici.

- **Garde structurelle par test** pour chaque interdit de forme (patron du
  banc `D-042`/`D-046`) — chaque garde doit être **vue rouge** quand on la
  débranche.
- **Une donnée absente n'est jamais zéro ni normale** (`DC-24`) : un champ
  « ce qui compte » vide est un silence, pas une réponse.
- Provenance certifiée pour toute règle affichée comme clinique (`DC-01`,
  `DC-02`) ; les règles vivent dans le registre, jamais seulement dans le code
  (`DC-26`).
- Toute table neuve arrive avec sa politique RLS (précédent biologie : plus
  aucune table de `public` sans RLS — on n'en réintroduit pas).
- Identités de fixture uniquement (Sophie Nicola, Jennifer Martin, Michel
  Dogné) ; aucune donnée patient réelle, aucun seed visant un dossier réel
  (`D-075`).
- Classe clinique : Opus, T3 avant PR migration/scoring/clinique, revue
  `wn-reviewer` avant de passer la main.

## Hors périmètre

- **Aucune extension du moteur clinique** : pas de nouvelle règle, pas de
  nouveau seuil, pas de lecture nouvelle des scores — les objets de
  l'alliance sont relationnels ; le P2 de la doctrine exécutable n'est pas
  violé.
- La réécriture de l'anamnèse existante : l'objectif négocié s'**ancre** sur
  `motif_principal`/`attentes` (matériau affiché), il ne les migre pas et ne
  les modifie pas.
- Le budget d'effort, « simplifier mon protocole », le mode « semaine
  compliquée » (6.0-B) ; la timeline racontée et les petites victoires
  (6.0-C) ; les représentations côte à côte (6.0-D).
- La correction du contenu des gabarits existants du registre et leurs
  `valideLe` — gestes du responsable, hors campagne.
- Toute activation élargie protocole→produits : c'est précisément ce que
  cette campagne gate.
