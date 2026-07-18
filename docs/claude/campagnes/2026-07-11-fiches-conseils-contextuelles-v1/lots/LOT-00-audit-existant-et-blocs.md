---
id: "LOT-00"
titre: "Audit de l'existant documentaire et inventaire des blocs"
statut: "livré"
dépend_de: "aucun"
---

# LOT-00 — Audit de l'existant documentaire et inventaire des blocs

> Compilé le 2026-07-18 depuis `../CAMPAGNE.md` (cadrage 2026-07-12, esquisse de
> lots) et le registre **A2** (frontière C3). **Documentaire — audit, aucun code,
> aucune migration.** Principe directeur : **auditer avant de créer, ne pas
> empiler** — C3 est l'évolution du booklet existant, pas une pile parallèle.

## But

Établir l'état réel de l'existant réutilisable et l'inventaire des **blocs
sources validés** disponibles à la fin de C1/C2, pour que C3 **compose** au lieu
de recréer. Trancher la question fondatrice de périmètre V1 : **versionnage de
documents composites avec ou sans persistance** (donc avec ou sans gate
migration).

## Résultat observable

Un dossier d'audit qui liste, pour chaque brique : ce qui existe, où, ce qui est
réutilisable tel quel, ce qui doit être étendu, et le gap. Plus une **matrice
bloc → destinataire** (patient / médecin / praticien) et une décision explicite
sur la persistance V1.

## Périmètre

- **Booklet existant** : `web/src/app/api/praticien/booklet/route.ts` (GET aperçu
  HTML, POST envoi nodemailer, `buildBookletHTML`), modèle `BookletEnvoi`
  (`web/prisma/schema.prisma`, audit trail des envois), composant
  `web/src/components/SynthesePanel.tsx`.
- **Mécanisme `PrévisualisationPatient` (HC-F)** :
  `web/src/components/PatientPreview.tsx` + route patient-safe
  `web/src/app/api/praticien/apercu-patient/reponses/route.ts` (select strict
  `titre`/`dateReponse` ; jamais `scoresJson`/`scorePrincipal`/`interpretation`).
- **Synthèse IA** : modèle `SyntheseIA` (statuts `Brouillon_IA` /
  `Validee_Praticien` / `Corrigee_Praticien` / `Rejetee`, `dateValidation`,
  `notesPraticien`, `versionPrompt`) et
  `web/src/app/api/praticien/synthese/route.ts` (POST génération, PATCH
  valider/rejeter/annoter). Contrat `SyntheseSchema` (`web/src/lib/anthropic/`).
- **Infra d'envoi** : nodemailer/`SMTP_URL` (booklet, assignations, tokens) ;
  liens portail patient (`idAssignation`, cookie de session portail).
- **Blocs sources** à composer : C1 via `GET /api/praticien/cockpit`
  (snapshot / review / decisionCard, **recalculables** en mémoire) ; C2 via
  `ProtocolDraft`, `ProtocolDiffusionApproval`, `ProtocolCheckin`, et
  `GET /api/praticien/trajectoire`.
- **Versionnage / impression** : versionnage append-only protocole
  (`supersedesDraftId`) et diffusion (`supersedesApprovalId`,
  `web/src/lib/protocol/versioning.ts`) ; impression **HTML** via
  `buildBookletHTML` (CSS inline, `escapeHtml`) ; **PDF absent**.

## Arbitrage compilé (exigé par la campagne)

- **Réutilise, n'empile pas** : C3 étend le pipeline synthèse→booklet vers un
  **moteur de composition multi-destinataires**, en réutilisant l'infra email, le
  mécanisme `PrévisualisationPatient` et la validation praticien de `SyntheseIA`.
- **Question persistance V1 à trancher ici** : le cadrage attribue à C3
  « versionnage et comparaison de versions ». Les blocs C1 (snapshot/décision)
  sont *recalculables* ; les documents *composites* ne sont persistés nulle part.
  Deux options :
  - **(a) sans persistance** : le document est recomposé à la demande depuis les
    blocs déjà persistés (C1/C2) + `SyntheseIA` ; le versionnage s'appuie sur les
    hash/versions existants (`inputHash`, `versionPrompt`, `supersedesDraftId`).
  - **(b) avec persistance** : une table de bundle documentaire versionné →
    **migration Prisma sous gate `bloqué_confirmation`** (jamais sans
    confirmation humaine explicite et distincte).
  - **Recommandation d'audit** : viser **(a) V1 sans persistance** (impression
    HTML + provenance recalculable), et n'ouvrir le gate (b) que si un besoin
    d'historique immuable de documents composites est confirmé. Décision figée en
    LOT-01.

## Hors périmètre

- Écrire un modèle ou une migration.
- Créer un composant de rendu (LOT-02/03).
- PDF (différé), signature électronique (différée), authentification médecin.

## Fichiers probables

- `web/src/app/api/praticien/booklet/route.ts` (lecture seule)
- `web/src/components/SynthesePanel.tsx`, `web/src/components/PatientPreview.tsx`
- `web/src/app/api/praticien/apercu-patient/reponses/route.ts` (lecture seule)
- `web/src/app/api/praticien/synthese/route.ts`, `web/src/lib/anthropic/**`
- `web/prisma/schema.prisma` (lecture seule)
- `web/src/lib/protocol/versioning.ts` (pattern de versionnage réutilisable)
- Routes `web/src/app/api/praticien/protocoles/**`, `.../trajectoire/route.ts`

## Interdits

- Pas de secret ; pas de donnée patient réelle (Sophie Nicola, Jennifer Martin,
  Michel Dogné uniquement).
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot ; ne pas dupliquer le booklet, l'auditer.

## Étapes

- [ ] Cartographier l'existant (booklet, synthèse, aperçu patient, email).
- [ ] Dresser la matrice **bloc → destinataire** (patient / médecin / praticien).
- [ ] Trancher persistance V1 (a) sans / (b) avec gate migration.
- [ ] Confronter la frontière de données `apercu-patient` aux besoins médecin.
- [ ] Documenter les gaps et le plan LOT-01→04.

## Tests

- Audit documentaire : aucune exécution de code. Revue croisée avec `../CAMPAGNE.md`
  et le registre A2.

## Critères de done

- [x] Matrice bloc → destinataire produite.
- [x] Décision persistance V1 figée (option (a) sans persistance ; gate (b) non ouvert).
- [x] Liste explicite « réutiliser / étendre / créer » par brique.

## Risques / points de vigilance

- **Discordance 5.0** : le programme recadre C3 en **« fil de correspondance »**
  (réponse du médecin dans le fil, sans pièces jointes biologiques = sans HDS) —
  postérieur au cadrage figé. À porter à l'arbitrage LOT-00/handoff : le rendu
  médecin est-il un **document sortant** (cadrage figé) ou un **fil bidirectionnel**
  (5.0) ? Impacte LOT-03.
- Ne pas élargir le select patient-safe de `apercu-patient` (frontière de données).

## Résultats

Livré le 2026-07-18. Dossier d'audit complet : [`../DOSSIER_AUDIT_LOT-00.md`](../DOSSIER_AUDIT_LOT-00.md).

- **Cartographie existant** : `buildBookletHTML` (pur, module-privé, à extraire),
  `escapeHtml` (`lib/html`), infra email inline nodemailer/`SMTP_URL` (pas de helper
  partagé), `BookletEnvoi` (audit envoi), `PatientPreview` + route mirror
  `apercu-patient` (frontière patient-safe structurelle), `versioning.ts` (patron
  append-only à transposer).
- **Inventaire des blocs** : C1 (snapshot/review/decisionCard) **recomposés en
  mémoire** ; C2 (`ProtocolDraft`/`Diffusion`/`Checkin`/`trajectoire`) persistés
  append-only ; `SyntheseIA` persistée. Provenance ancrée sur hash/versions existants.
- **Matrice bloc → destinataire** produite (patient/médecin/praticien), avec
  **field-filter** (pas row-filter, car `syntheseJson` mélange `resume_praticien` et
  `narratif_patient`).
- **Décision persistance V1 = option (a) sans persistance** figée (confirmée
  utilisateur 2026-07-18) → **aucune migration**. Gate (b) non ouvert.
- **Gaps** consignés (export `buildBookletHTML`, garde de statut en code, pas
  d'`inputHash` synthèse, field-filter, email inline).
- **Discordance 5.0** : rendu médecin **sortant** en V1 ; fil bidirectionnel reporté
  au handoff LOT-04.
