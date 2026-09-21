# Handoff — 2026-09-21 — L'assiette indiquée devient une unité d'action (D-240)

## 1. Branche et état Git

- Branche : `wn-lot02-assiette-unite-action-2026-09-21`, partie d'`origin/main`
  à `cabb35b4` (D-239).
- Worktree : `.claude/worktrees/phases-hash-2026-09-16`.
- Aucune migration, aucun `schema.prisma` touché, aucun drapeau neuf.

## 2. Objectif de la session

Demande du responsable : « Go lot 02 b3 b4 », après son constat depuis l'écran
— « le cockpit praticien affiche les assiettes sans possibilité de sélection ni
de validation ». LOT-02 du cadrage Boussole/Assiette du 2026-09-16.

## 3. Ce que le lot livre

Le geste, en trois temps qu'aucun automatisme ne relie :

1. la carte des assiettes indiquées porte « Retenir pour le protocole » sur
   chaque ligne **indiquée** — jamais sur une non évaluée ;
2. le cockpit garde ce choix, et le constructeur l'insère sur un second clic en
   action `food` portant sa `RecommendedPlateRef` ;
3. le praticien enregistre la version, par la route qui existait déjà.

Trois portes gardent l'écriture : **contrat V4**, **action `food` seule**,
**axe d'indication**. La relecture d'un payload persisté, elle, ne vérifie que
la structure.

**Et deux murs de la même famille sont fermés en chemin** — tous deux à deux
clics du bouton que ce lot ajoute : la demande de contrat V4 (§8), et le
changement de type d'une action qui porte déjà une assiette. Le second retire la
référence **et le dit** : la garder ferait refuser l'enregistrement, la retirer
en silence perdrait le lien à la table signée sans l'apprendre au praticien.

## 4. LE FAIT QUI COMMANDE LE LOT — et il n'était écrit nulle part

**Le tableau d'arbitrages du cadrage faisait lire comme des questions deux
directions déjà rendues.** `D-213`, écrite le même jour que le cadrage, annonce
fermer « les quatre arbitrages B1→B4 » et les rend (§11 les familles, §12 la
Boussole). B1 et B2 y ont été barrés après leur décision propre ; B3 et B4 non,
faute de lot pour les porter — si bien que deux lignes non barrées se lisaient
« à décider ».

**MAIS LES DIRE « TRANCHÉS » SERAIT LA FAUTE SYMÉTRIQUE.** `D-213` dit
d'elle-même « elle grave, elle n'exécute pas », et **`D-239` a RENVERSÉ sa §9**
— §9 demandait de garder `attachFoodCompassRef` et de la recibler ; elle est
retirée. Une direction de `D-213` tombe quand le lot la met à l'épreuve. Ce lot
ne re-tranche donc rien : il corrige la forme du tableau et exécute `D-213` §10
(« seul cet axe peut porter une action »).

## 5. Décisions prises

- **`food` seule, pas `advice_sheet`** — le cadrage laissait le choix ; le
  verrou décide : `adviceSheetRef` est **fermé à l'écriture** depuis `D-200` §2.
- **V4, pas de V5** — V4 est le contrat courant, le seul demandable. Aucune
  empreinte persistée ne bouge (`canonicalJson` ignore les `undefined`).
- **La référence est RE-DÉRIVÉE, pas validée** — `assertRefAssietteDIndication`
  rend la copie du catalogue. Leçon de `D-239` §3 appliquée d'emblée.
- **La garde vit dans le MOTEUR, pas dans la route** — on ne recopie pas le
  détour C5 (la route démonte la référence avant `buildProtocolDraft` et la
  réinjecte après) : c'est ce détour qui a fabriqué le maillon faible de `D-239`.

## 6. Fichiers — dix-sept : quatorze modifiés, trois créés

**Domaine et moteur (5)**
- `web/src/lib/food-compass/plates.ts` — `estAssietteDIndication`,
  `assertRefAssietteDIndication` (miroirs des jumelles d'observation).
- `web/src/lib/clinical-engine/types.ts` — `ProtocolAction.recommendedPlateRef?`.
- `web/src/lib/clinical-engine/protocolDraft.ts` — `normalizePlateRef`, appelée
  depuis `normalizeActions`.
- `web/src/lib/food-compass/refValidation.ts` —
  `assertProtocolDraftPlateStructure` (structure seule).
- `web/src/lib/protocol/fromPrisma.ts` — branchement à la relecture.

**Interface (3)**
- `web/src/components/patient-cockpit/AssiettesIndiqueesPanel.tsx` — prop
  optionnelle `onRetenirAssiette`, un bouton par ligne indiquée.
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` — l'état
  `assietteSelection`, entre la carte et le constructeur.
- `web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx` —
  `insertAssietteAction`, le bandeau, et **la demande de contrat V4**.

**Bancs (3)**
- `web/src/lib/clinical-engine/assietteSurAction.test.ts` — **créé**, 19 cas.
- `web/src/components/patient-cockpit/AssiettesIndiqueesPanel.test.tsx` — 23 cas.
- `web/src/components/patient-cockpit/ProtocolMiniBuilder.test.tsx` — 41 cas.

**Documents (6), ce handoff compris** — `docs/DECISIONS.md` (D-240),
`changelog.d/2026-09-21-assiette-unite-action.md` (créé), le cadrage,
`docs/FEATURE_FLAGS.md`, `docs/claude/MATRICE_CONSOMMATION.md` (régénérée),
`docs/claude/handoffs/2026-09-21-1910-assiette-unite-action.md` (créé).

Liste énumérée AVANT le total, et le total pris dessus : 5 + 3 + 3 + 6 = 17.

## 7. Validations exécutées

- **T1** `cd web && npm run check` — `T1-EXIT=0`, lu dans le fichier redirigé.
  1051 cas Vitest + 1623 du second projet (21 ignorés), 0 échec.
- **Huit mutations, huit rouges**, et cinq ne rougissent qu'un seul cas :
  retrait de `normalizePlateRef` (8 cas), garde d'axe neutralisée (2), fraîcheur
  branchée en lecture (3), `contratV4` ramené à `suspendues` (1), refus d'axe
  retiré de l'écran (1), bouton retiré (1), geste étendu aux non évaluées (1),
  retrait de l'assiette au changement de type neutralisé (1).
  Sauvegarde par `cp`, **mutation vérifiée appliquée** avant de jouer le banc,
  restauration par `cp` — jamais `git checkout --`.

## 8. Ce que le lot a trouvé au passage

**LA JOINTURE QUI AURAIT FAIT BUTER LE GESTE.** Le constructeur ne demandait le
contrat V4 **que** si une action était suspendue. Une assiette posée sur un
protocole sans suspension serait partie en V1 — refus du moteur, sur un geste
que l'écran venait de proposer. Le défaut ne vit ni dans le moteur ni dans la
carte : **entre les deux**, et aucun banc de module ne l'aurait vu.

**LE SECOND MUR, DE LA MÊME FAMILLE.** Changer le type d'une action qui porte
une assiette la faisait refuser au serveur (« exige une action alimentaire »),
deux clics après le geste proposé. Fermé à l'écran, avec la phrase qui dit la
perte — un retrait silencieux aurait coûté le lien à la table signée sans que
personne l'apprenne.

**`normalizeActions` ABANDONNE EN SILENCE un champ inconnu.** Elle reconstruit
chaque action depuis une liste blanche : ajouter le champ au type sans toucher à
cette liste aurait donné un système qui compile, des bancs verts, et une
référence qui disparaît à l'enregistrement. Un cas de banc garde ce point.

**La matrice de consommation a mesuré le lot** : la surface C5 passe de 12 à 13
surfaces indirectes, parce que le constructeur importe désormais `plates.ts`.
Régénérée, non éditée.

**`docs/FEATURE_FLAGS.md` était périmé sur ce drapeau même** : il décrivait
`WN_ASSIETTES_INDIQUEES` comme « neuf et éteint à la livraison » alors qu'il est
posé depuis le 2026-09-20 et constaté le 2026-09-21, et il affirmait « la carte
ne porte aucun bouton » — ce que ce lot rend faux. Les deux corrigés, avec
l'invariant qui, lui, n'a pas bougé.

## 9. Problèmes ouverts

**B3 — ce que ce lot lui coûte, et il faut que la prochaine session le sache.**
`D-216` §4 nomme trois préalables aux familles ; ce lot en fournit un
(« assiette prescrite » a un sens vérifiable) et en révèle un quatrième
(`decidePlateSubstitution` ne regarde pas l'`axe`, donc une famille non nulle
ouvrirait la substitution ENTRE les deux axes). **Et il renchérit le prix** :
jusqu'ici aucune référence des douze assiettes d'indication n'était persistable
— le seul porteur en base était l'épisode d'observation, réservé aux trois
repères — donc remplir une famille sur les douze ne périmait rien. Désormais
elle périmerait les protocoles qui les portent : `substitutionFamily` entre dans
le `contentHash` (vérifié par recalcul, pas sur la foi du commentaire).

**B4 — le vrai verrou de LOT-04, nommé pour la première fois.** Les contrats
**V2 et V4 sont mutuellement exclusifs** : `normalizeActions` refuse tout
`foodCompassRef` (le chemin V2 le réinjecte après coup),
`buildFoodCompassProtocolV2FromSource` n'accepte qu'une cible V1, et
`resolvePatientFoodCompassView` exige `draft.version === V2`. Un protocole ne
peut donc pas porter à la fois une assiette et la Boussole de son aliment.
C'est ce que LOT-04 devra réconcilier ; ce lot ne l'ouvre ni ne le contourne.

**Limite préexistante, atteignable par un second chemin.** Une fois un protocole
en V4, sa révision doit l'être aussi (409 sinon). Retirer l'assiette d'un
protocole V4 sans suspension fait retomber la demande en V1 et bute sur ce refus.
Le comportement existe depuis V4 et vaut déjà pour une suspension retirée.
Nommé, **non corrigé** : décider si V4 est collant est un arbitrage.

**Hérité, non traité** : `patientDiffusionAllowed: false` n'a aucun lecteur en
production — son nom ment sur son effet ; le motif affiché par la carte porte
encore des identifiants bruts (un libellé français est un champ neuf au périmètre
haché, donc une re-signature) ; `mentionne()` de `wn-matrice-consommation.mjs`
rapproche par sous-chaîne.

## 10. Prochaine action exacte

T2 (`npm run test:worktree -- --fast`) depuis la racine, sortie redirigée puis
relue ; PR `--base main` avec `--body-file` ; `node scripts/wn-attendre-ci.mjs
<N>` en un seul appel bloquant ; **lire la revue aux TROIS emplacements** avant
de merger (`pulls/<N>/comments`, `.reviews[].body`, bloc « Suppressed
comments ») ; `gh pr merge --squash --subject` avec le sujet qui nomme D-240.

**Le numéro D-240 se prend au MERGE** : le registre n'admet aucun trou et les
collisions sont documentées comme récurrentes.

## 11. Interdits encore actifs

- Aucune composition d'assiette inventée par l'outil.
- Aucun contenu clinique du corpus au dépôt — G6 fermée : une entrée DÉSIGNE sa
  source, elle ne la recopie jamais.
- Aucune signature clinique posée par l'outil ; le `shaPerimetre` de
  `INDICATIONS_ASSIETTES_V1` et `C5B_PLATE_CATALOG_HASH` sont intacts.
- Aucune famille de substitution déclarée.
