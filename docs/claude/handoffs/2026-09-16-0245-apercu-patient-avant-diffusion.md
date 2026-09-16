# Handoff — 2026-09-16 — L'aperçu patient avant diffusion (dette 1 de D-200)

**Branche** : `apercu-patient-avant-diffusion`, partie de `origin/main` (`42e15be1`).
Worktree `.claude/worktrees/apercu-patient`. **Aucun numéro de décision pris** : ce lot
exécute une dette que `D-200` a déjà nommée et tranchée, il n'arbitre rien de neuf.

## Ce que la dette portait — deux défauts en un

`ProtocolConsultationPanel` recomposait à la main, depuis `ProtocolDraft`, ce que le
patient lit : hors contrat, et sans jamais lire `interventionStatus`. **Une intervention
suspendue s'y affichait comme un conseil ferme.** Sa liste de conditions de validation
était recopiée elle aussi, et ne comptait pas les actions — un protocole sans action
déverrouillait un aperçu vide.

Et cet aperçu était **le seul du cockpit**, `protocolDraft` étant forcé à `null` hors
fixture : sur un dossier réel, le praticien validait pour diffusion sans avoir jamais vu
une ligne de ce que son patient allait lire.

## Ce qui a été fait

**1. Le contenu patient est séparé de son attestation.** Nouveau module
`web/src/lib/clinical-engine/contenuPatientProtocole.ts` : gardes de cohérence
(bloqueurs, priorité, relecture, correspondance carte↔protocole) + projection du contenu
(actions, phrases d'attente, raison d'être, critère J21). `buildPatientProtocolView`
l'enveloppe et le signe pour la diffusion ; l'aperçu l'appelle nu.

**L'ordre des refus est préservé au caractère près** — cohérence, puis approbation, puis
contenu : c'est celui que les bancs de `patientProtocolView.test.ts` épinglent. Et le
module **n'importe pas `canonical.ts`** : il tourne dans le navigateur sur le chemin
fixture, qui ne peut pas tirer `node:crypto`.

**Aucune approbation n'est fabriquée pour afficher un aperçu.** C'était l'autre voie
possible — construire une `ProtocolDiffusionApproval` de circonstance et appeler le
contrat complet. Écartée : un aperçu n'atteste rien, et un objet portant
`diffusionStatus: 'approved_for_diffusion'` sans geste praticien est exactement ce que ce
dépôt refuse.

**2. Le miroir de diffusion sert l'aperçu.** `GET /api/praticien/protocoles/diffusion`
rend `apercu` — sur la **version active**, celle que le bouton validerait, et non sur celle
déjà approuvée. `servieAuPatient` dit ce qui est servi aujourd'hui ; l'aperçu dit ce qui le
sera après le geste. Le rejeu de la carte est mémoïsé : quand les deux versions sont la
même, il n'y a qu'une lecture.

Un refus porte son **motif** : `carte_non_rejouable`, `payload_illisible`, ou
`contrat_refuse` avec la phrase du contrat. Un aperçu vide aurait appris au praticien
qu'il n'a rien à montrer, jamais qu'il a quelque chose à lever.

**3. Le panneau de clôture ne promet plus un aperçu qu'il ne peut pas donner.** Hors
fixture il n'a jamais de protocole, et son état prudent disait « protocole relu et
validation pour diffusion requis » — deux gestes qui n'y auraient jamais rien fait
apparaître. Il renvoie désormais vers la sous-vue où l'aperçu vit.

**4. Un seul composant rend la vue patient** — `ApercuPatientProtocole`, monté par le
panneau fixture ET par le panneau de diffusion. Ses intitulés sont ceux de l'écran patient
(`PatientCompanionHome`), à la lettre.

## Fichiers

| Fichier | Nature |
|---|---|
| `web/src/lib/clinical-engine/contenuPatientProtocole.ts` (+ banc) | **neuf** — la projection du contenu patient |
| `web/src/lib/clinical-engine/patientProtocolView.ts` | l'attestation seule, composée sur le module ci-dessus |
| `web/src/app/api/praticien/protocoles/diffusion/route.ts` (+ banc) | `apercu` servi au GET, rejeu mémoïsé |
| `web/src/components/patient-cockpit/ApercuPatientProtocole.tsx` (+ banc) | **neuf** — le rendu, partagé |
| `web/src/components/patient-cockpit/ProtocolConsultationPanel.tsx` (+ banc) | aperçu et éligibilité passent par le contrat |
| `web/src/components/patient-cockpit/ProtocolDiffusionPanel.tsx` (+ banc) | l'aperçu sous la main, avant le geste |
| `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` | `apercu` lu et transmis |
| `docs/DECISIONS.md` | ancre réparée : le refus sécurité n'est plus recopié dans l'écran |
| `docs/claude/MATRICE_CONSOMMATION.md` | régénéré (une surface indirecte de plus) |

## Bancs — ce qu'ils attrapent

- **`ApercuPatientProtocole.test.tsx`** épingle la liste des champs du contenu : un champ
  ajouté au contrat et rendu par personne rougit. C'est la classe de défaut de
  `followUpCriterion`, qui a voyagé des mois sans écran.
- **`contenuPatientProtocole.test.ts`** compare champ pour champ l'aperçu et la vue
  diffusée : les deux ne peuvent plus diverger en silence.
- Les deux panneaux ont chacun un cas d'intervention suspendue, et un cas de refus.

## Ce qui reste ouvert

- **`limitations` n'est rendu par aucun écran** — dette 4 de `D-200`. Il est **nommé** dans
  le banc qui l'écarte, pas masqué par lui : le jour où le portail le rend, la liste
  bouge.
- **Dettes 2, 3 et 5 de `D-200`** : `projeterSurLeFil` sans banc, le statut `active` posé
  en silence, l'hydratation du constructeur. Intactes.
- **L'aperçu n'existe que dans la sous-vue « diffusion »**, pas pendant la composition.
  Choix borné : c'est là qu'est le geste.

## Prochaine action

PR sur `main`, diff d'une seule finalité. Puis — et c'est le point — **faire passer un
dossier réel dans le constructeur** : l'usage est mesuré à zéro depuis la clôture de la
campagne « 5. Actions », et cet aperçu est la pièce qui manquait sur ce chemin.
