---
id: "LOT-07"
titre: "Suivi longitudinal — UI jalons J21/J42/J90, re-passation ciblée, momentum par domaine"
statut: "termine"
dépend_de: "LOT-05"
---

# LOT-07 — Suivi longitudinal : jalons et momentum par domaine

## But

Rendre les jalons J21/J42/J90 atteignables depuis l'interface et donner au
praticien un momentum par domaine (digestif, alimentaire, mouvement, sommeil,
adaptation) au lieu du seul delta d'un scalaire agrégé.

## Résultat observable

La carte de Fil `jalon_j21` devient soluble depuis l'UI (confirmation d'un
épisode J21) ; au jalon, une re-passation ciblée est proposée (instruments visés
par le protocole, pas le pack entier) ; un J21 avec re-passation TFD seule
produit un momentum digestif sans prétendre mesurer le reste ; les deltas sous
la bande de bruit s'affichent « stable » ; le scalaire global reste en repère ;
les check-ins restent juxtaposés, jamais fusionnés.

## Périmètre

- UI de confirmation des jalons non-T0 : le back accepte déjà tout jalon
  (`runtimeFromPrisma.ts:13,60-62`) — paramétrer le jalon dans
  `ClinicalRuntimeSection` (aujourd'hui `T0` codé en dur) + panneau de
  confirmation par fenêtre ±8 j existante.
- Re-passation ciblée : proposition au jalon dérivée des `mesures[]` du
  protocole (LOT-05), via la file d'envoi existante — geste praticien, aucun
  envoi automatique.
- Momentum par domaine : lectures par besoin/source (digestif Q_GAS_01,
  alimentaire Q_ALI_01, mouvement sous-score Q_MOD_01, sommeil PSQI/indice
  agenda, adaptation Q_MOD_01) entre jalons du même cycle, avec bande de bruit
  par variable (seuils = question ouverte de campagne, arbitrage praticien) ;
  le scalaire `scoreGlobal` conservé comme repère.
- Restitution : fiche-trajectoire praticien + carte `jalon_j21` enrichie.
- **Rattaché ici (dette du LOT-02)** : l'E2E du **parcours nominal T0**, qui
  n'existe pas — `e2e/mode-consultation.spec.ts` asserte le refus, le nominal
  n'est couvert que par les bancs de route. Le lot rouvre déjà le parcours de
  confirmation d'épisode ; l'obstacle connu est le peuplement (les trois
  patients autorisés sont tous centraux — peupler l'un d'eux déplace
  `orientation-file-envoi`, `fiche-detail-reponses`, la capture pixel
  `web/e2e/visual.spec.ts:93` et `web/prisma/seedCertification.guard.test.ts`).

## Hors périmètre

- Multi-cycle T1/T2 (backlog nommé).
- Poids/tour de taille déclaratifs (backlog — exige une saisie nouvelle).
- Fusion des check-ins dans le momentum (doctrine conservée).
- Tout changement de `versionScore` ou des grilles.

## Fichiers probables

`web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx:198,234`,
`web/src/components/patient-cockpit/EpisodeConfirmationPanel.tsx`,
`web/src/app/api/praticien/cockpit/route.ts`,
`web/src/lib/equilibre/momentum.ts`, `depuisPrisma.ts`,
`web/src/lib/protocol/trajectoire.ts`, `resumeJ21.ts`,
`web/src/lib/fil/momentumJ21.ts`, `cartes.ts:273-302`,
`web/src/app/api/praticien/file-envoi/route.ts` (réutilisée).

## Interdits

- Aucun momentum entre cycles ou entre `versionScore` différents (gardes
  existantes préservées).
- Aucune interprétation clinique automatique d'un delta (pas de « amélioration
  significative » — tendance factuelle seulement).
- Pas de planification automatique d'assignations au jalon : proposition, geste
  praticien.

## Dépendances

LOT-05 (les `mesures[]` du protocole ciblent la re-passation). LOT-02
souhaitable (préconditions homogènes T0/J21). Parallélisable avec LOT-06.

## Étapes

1. Paramétrage du jalon dans le cockpit + UI de confirmation J21/J42/J90.
2. Re-passation ciblée branchée sur la file d'envoi.
3. Momentum par domaine (module pur + bandes de bruit) + tests.
4. Restitution trajectoire + carte de Fil.

## Tests

- La carte `jalon_j21` se résout par le parcours UI complet (fixture).
- Momentum digestif seul quand seule la re-passation TFD existe ; « stable »
  sous la bande de bruit ; aucun momentum si `versionScore` diffère.
- Non-régression : momentum scalaire existant inchangé pour les consommateurs
  actuels.
- T2 avant commit ; rejeu E2E des parcours praticien touchés.

## Done

- Critères du Lot H de `sources/02-spec-lots-parcours-t0.md` (périmètre réduit
  acté : poids déclaratif en backlog).
- Fragment `changelog.d/`.

## Doctrine à porter — `DC-41` (véhicule V4 de l'audit)

**Efficacité et tolérance sont deux axes distincts.** Le momentum par domaine
lit une trajectoire de score : c'est l'axe **efficacité**. Une intervention
efficace et mal tolérée produirait pourtant un momentum favorable et se lirait
comme un succès — alors que la conduite à tenir (ajuster, arrêter) est
l'inverse.

Le jalon doit donc porter les deux axes séparément, sans les composer en un
indice unique : la tolérance n'est pas un malus soustrait à l'efficacité, et
aucune moyenne des deux ne doit exister. La recueillir suppose une saisie qui
n'existe pas — ce lot peut donc s'arrêter à **réserver l'axe** et à interdire
la lecture d'un momentum favorable comme succès sans lui, en nommant l'écart.

Compatible avec l'interdit déjà posé ci-dessus (« aucune interprétation
clinique automatique d'un delta ») : c'en est le corollaire côté suivi.

Non couvert par le périmètre ci-dessus : la doctrine y a été inscrite après la
rédaction de la fiche (`docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md`,
section « Refermer les 18 »).

## Clôture (2026-08-14)

Livré sur `claude/lot-07-campagne-t0`, sous `D-058` (amendée le 2026-08-14) :
jalons J21/J42/J90 confirmables (jalon dû dérivé de la trajectoire, hors
fenêtre RIEN n'est proposé — panneau compris, et le panneau nomme son jalon) ;
momentum PAR BESOIN fail-closed (`BANDES_DE_BRUIT` vide, `publiee: false` —
aucun delta qualifié sans bande publiée), règle de nouveauté au grain du
besoin ; re-passation ciblée dérivée de `provenance.needIds` de la priorité
visée via `BESOIN_SOURCES` ; restitution avec jalons comparés, unités nommées
(couverture 0–1 vs indice 0–100) et motif toujours rendu.

**Écarts à la fiche, tous décidés** : la cible de re-passation vient de
`needIds`, pas des `mesures[]` (texte libre du LOT-05 — amendement `D-058`) ;
le momentum est par BESOIN, pas par « domaine » (les cinq noms de la fiche ne
sont pas une taxonomie — deux vivent dans le besoin 5 ; inventer un mapping
aurait créé une table clinique sans source, `DC-17`) ; « les deltas sous la
bande s'affichent stable » ne vaut que bande PUBLIÉE — il n'en existe aucune.

**Revue `wn-reviewer` NO-GO puis refermée** : B1 garde de version intra-cycle
retirée (elle éteignait tout stock antérieur au bump v14/v15 avec un motif
faux) ; B2 ancre UNIQUE des fenêtres (`confirmedAt` du T0 confirmé, partagée
cockpit/serveur, banc de contrat inter-couches) ; B3 re-passation atteignable
(repli priorité proposée) et POST au vrai contrat (`success`, motif de refus
affiché) ; M1–M5, Mo1–Mo4 refermés (panneau gaté, jeton d'obsolescence,
opt-in cabinet, rattachement `rattacherReperesAuxCycles`).

**Dettes** (nommées dans `D-058` amendée) : `DC-41` (axe tolérance) réservé
nulle part — non livré, non gardé ; producteur de `selectedMainPriority`
inexistant (re-passation inerte tant que la table des priorités n'est pas
signée) ; Q_SOM_09 proposable à J21 pour une mesure rendue vers J42 ; E2E du
parcours nominal T0 toujours absent (peuplement des fixtures). La carte de Fil
`jalon_j21` n'a pas été modifiée : elle lit les épisodes persistés, et le
parcours de confirmation la rend soluble sans enrichissement propre.

Production relue avant merge (2026-08-14) : `assessment_episodes` = 0 ligne —
aucun stock hérité, aucune bande publiée, effet immédiat limité aux jalons et
au momentum non qualifié.
