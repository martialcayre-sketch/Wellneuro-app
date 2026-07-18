# Dossier d'audit — C3 LOT-00 : existant documentaire & inventaire des blocs

> Produit le 2026-07-18 (exécution LOT-00). **Documentaire — aucun code, aucune
> migration.** Vérifie l'existant réel du dépôt (branche de vérité `origin/main`)
> pour que C3 **compose** au lieu de recréer (principe « auditer avant de créer,
> ne pas empiler »). Ancre les décisions de LOT-01→04.

## 1. Cartographie de l'existant réutilisable

### 1.1 Rendu HTML documentaire (pivot de réemploi)

- `buildBookletHTML` — `web/src/app/api/praticien/booklet/route.ts:197`. Fonction
  **pure, module-privée** : `(patientNom: string, dateDocument: string,
  s: SyntheseSchema, notesPraticien: string) => string`. Construit un document HTML
  autonome (CSS **inline** dans `<head>`, look de marque Georgia/vert `#2d6a4f`),
  sections conditionnelles : narratif patient, axes prioritaires (badge de
  priorité), points de vigilance, questions entretien, note praticien, footer
  disclaimer IA. Chaque valeur dynamique passe par `escapeHtml`.
- `escapeHtml` — `web/src/lib/html.ts` (fichier entier, 8 lignes). Primitive unique
  d'échappement HTML du dépôt, null-safe (`unknown`).
- **Gap** : `buildBookletHTML` n'est pas exporté. Étant pure et sans I/O, son
  **extraction** vers `web/src/lib/documents/` (ou `web/src/lib/`) est propre et
  nécessaire pour un rendu paramétré par destinataire (LOT-03).

### 1.2 Aperçu / envoi

- **GET** `booklet/route.ts:17` : renvoie `{ html, patientNom, patientEmail,
  idPatient, dateDocument, dejaEnvoye, … }` après gate de statut
  (`Validee_Praticien`|`Corrigee_Praticien`, sinon 422).
- **POST** `booklet/route.ts:76` : exige `relectureConfirmee === true` (sinon 422),
  garde de renvoi (`forceSend`), envoi nodemailer, audit `BookletEnvoi`.
- **Email** : **aucun helper partagé**. `nodemailer.createTransport(process.env.
  SMTP_URL)` est inliné dans 3 routes (`booklet`, `patient/submit`,
  `praticien/assignations`). `from: '"Wellneuro" <noreply@wellneuro.fr>'`. Mock de
  test de référence : `assignations/route.test.ts:15` + `SMTP_URL='smtp://test'`.
- **Audit d'envoi** : modèle `BookletEnvoi` (`schema.prisma`), `statut`/`operation`
  en `String` libre, email **masqué** seulement (`maskEmail`), écriture non
  bloquante (`logBookletEnvoi`).

### 1.3 Composant praticien existant

- `web/src/components/SynthesePanel.tsx` (`/dashboard/synthese`) : sélection
  patient → synthèses → génération (POST) / valider·rejeter·annoter (PATCH) →
  prévisualisation booklet dans une `<iframe srcDoc sandbox>` → envoi patient (case
  « J'ai relu et validé »). C'est le **point de montage naturel** du moteur de
  composition C3 (LOT-02).

### 1.4 Frontière de données patient (mécanisme HC-F)

- `web/src/app/api/praticien/apercu-patient/reponses/route.ts` : route **mirror
  patient-safe**, `select: { titre: true, dateReponse: true }` **strict** (jamais
  `scoresJson`/`scorePrincipal`/`interpretation`). Invariant documenté en tête.
- `web/src/components/PatientPreview.tsx` : monte le **vrai** composant portail
  `ConsultationScreen` en `readOnlyPreview`, alimenté **uniquement** par la route
  mirror ci-dessus (« jamais l'API brute »). **Enforcement structurel** (route
  séparée + `select` étroit), pas un filtre runtime.

### 1.5 Versionnage append-only (modèle à transposer)

- `web/src/lib/protocol/versioning.ts` — **pur, sans I/O** : `deriveVersionId(id,
  hash) → ` + "`${id}#${hash}`" + `, `resolveActiveVersion<T>(rows)` (tête de chaîne
  via `supersedes…`, plus récent en cas d'égalité), `clinicalContentHash` (empreinte
  **sans timestamps** via `canonicalSha256`, `@/lib/clinical-engine/canonical`).
  C3 le transpose au **document composite** (version = tuple des versions/hash de
  ses blocs sources), **sans persistance** (option (a)).

## 2. Inventaire des blocs sources (déjà persistés / recalculables)

| Bloc source | Origine | Où | Persistance | Ancrage de provenance |
|---|---|---|---|---|
| Snapshot clinique | C1 | `POST /api/praticien/cockpit` | **recomposé en mémoire** | `snapshotInputHash` |
| Revue clinique | C1 | `POST /api/praticien/cockpit` | recomposé en mémoire | `reviewInputHash` |
| Carte de décision | C1 | `POST /api/praticien/cockpit` | recomposé en mémoire | `decisionCard.inputHash` |
| Protocole 21 j | C2 | `ProtocolDraft` (`schema.prisma:704`) | persisté (append-only) | `inputHash` + `supersedesDraftId` |
| Approbation diffusion | C2 | `ProtocolDiffusionApproval` (`:763`) | persisté (append-only) | `protocolDraftInputHash` + `supersedesApprovalId` |
| Check-ins J7/J14/J21 | C2 | `ProtocolCheckin` (`:736`) | persisté (append-only) | `supersedesCheckinId` |
| Trajectoire (Spirale) | C2B | `GET /api/praticien/trajectoire` | read-only, dérivé | `versionScore` |
| Synthèse IA | — | `SyntheseIA` (`schema.prisma:270`) | persisté | `versionPrompt` + `dateValidation` + `statut` |

- **Fait clé** : les blocs C1 sont **recomposés en mémoire, zéro persistance** ;
  `cockpit` et `trajectoire` sont read-only. → un moteur de composition **sans
  persistance de document** est cohérent avec l'existant (voir §4).

## 3. Matrice bloc → destinataire

Frontière A2 : C3 **filtre par champ, pas par ligne** (fait d'audit : la ligne
`SyntheseIA.syntheseJson` mélange `resume_praticien` **et** `narratif_patient`).

| Bloc | Patient | Médecin traitant | Praticien |
|---|---|---|---|
| Narratif synthèse (`narratif_patient`) | ✅ affiché, badgé « validé par votre praticien » | ✅ contexte | ✅ |
| Résumé praticien (`resume_praticien`) | ❌ **jamais** | ⚠️ reformulé « explorations à discuter », non prescriptif | ✅ brut |
| Axes prioritaires / niveaux | ❌ | ⚠️ « pistes à explorer », sans hiérarchie prescriptive | ✅ |
| Points de vigilance | ❌ | ⚠️ signaux à discuter | ✅ |
| Questions d'entretien | ❌ | ❌ (interne consultation) | ✅ |
| Décision validée (C1) | ✅ « votre priorité actuelle » (formulé) | ⚠️ exploration à discuter | ✅ |
| Actions 21 j (protocole C2) | ✅ « ce que vous allez essayer » | ⚠️ contexte non prescriptif | ✅ |
| `emailPatient`, scores bruts, `inputHash` | ❌ jamais | ❌ jamais | interne only |
| Provenance / hash / version | ❌ | ❌ | ✅ (colonne sources) |

Règles transverses : **régime IA** → un bloc généré IA n'est diffusable que si la
synthèse source est `Validee_Praticien`|`Corrigee_Praticien` (garde **en code** : le
modèle ne contraint pas `statut`). **Régime statique validé** vs **généré IA
validé** jamais mélangés dans un même rendu.

## 4. Décision de périmètre V1 — persistance : **option (a) SANS persistance** (figée)

- **Retenu (a)** : le document composite est **recomposé à la demande** depuis les
  blocs déjà persistés (C1 recalculable, C2 persisté, `SyntheseIA` persistée). Le
  **versionnage** = tuple des versions/hash existants (`inputHash`, `versionPrompt`,
  `supersedesDraftId`…) via le patron `versioning.ts`. → **aucune migration Prisma**.
- **Écarté en V1 (b)** : table de bundle documentaire versionné (historique immuable
  de documents composites). Resterait un **gate migration `bloqué_confirmation`**,
  non ouvert : n'à ouvrir que si un besoin d'historique immuable **distinct** des
  ancrages sources est confirmé. Confirmé par l'utilisateur le 2026-07-18.
- **Cohérence** : l'existant ne persiste aucun document rendu (booklet HTML est
  recomposé à chaque GET) ; (a) prolonge ce modèle sans dette de schéma.

## 5. Réutiliser / étendre / créer (par brique)

| Brique | Verdict | Détail |
|---|---|---|
| `buildBookletHTML` | **Étendre** (extraire + paramétrer par destinataire) | LOT-03 |
| `escapeHtml` (`lib/html`) | **Réutiliser** tel quel | — |
| Infra email nodemailer/SMTP_URL | **Réutiliser** le patron inline | LOT-03 |
| `BookletEnvoi` (audit envoi) | **Réutiliser** | LOT-03/04 |
| `PatientPreview` / route mirror `apercu-patient` | **Réutiliser** (instancier) | LOT-02 aperçu ; LOT-03 frontière |
| `versioning.ts` (pattern) | **Réutiliser** (transposer, pas importer les modèles C2) | LOT-01 |
| Blocs C1 `cockpit` / C2 `trajectoire`,`ProtocolDraft`… | **Réutiliser** (lecture) comme sources | LOT-01/02 |
| `SyntheseIA` + `synthese/route.ts` | **Réutiliser** (source + garde de statut) | LOT-01/03 |
| Domaine `web/src/lib/documents/` | **Créer** (inexistant) | LOT-01 |
| Composant de composition | **Créer** sous `web/src/components/patient-cockpit/` | LOT-02 |

## 6. Confrontation frontière `apercu-patient` ↔ besoins médecin

- La route mirror est **patient-safe** (`select {titre, dateReponse}`) : suffisante
  pour l'aperçu **patient** (LOT-02 colonne droite).
- Le **rendu médecin** a des besoins **différents** (contexte professionnel) mais
  **ne doit pas élargir** ce `select` ni réutiliser l'« API brute ». En V1, le rendu
  médecin est un **document sortant** dérivé des blocs validés, reformulé en
  vocabulaire non prescriptif — **pas** un accès élargi aux données patient. Aucune
  extension de la frontière de données n'est requise ni autorisée (LOT-03).

## 7. Gaps identifiés

1. `buildBookletHTML` non exporté → extraction requise (LOT-03).
2. `SyntheseIA.statut` non contraint (String libre, transitions non gardées par
   l'état) → **garde de statut en code** côté C3 (ne composer que
   `Validee_Praticien`|`Corrigee_Praticien`).
3. Pas d'`inputHash` sur `SyntheseIA` → provenance synthèse ancrée sur
   `versionPrompt`+`dateValidation`+`statut` (pas de nouvelle vérité).
4. `syntheseJson` mélange champs praticien/patient sur une ligne → **field-filter**
   obligatoire dans tout rendu patient/médecin (pas de row-filter).
5. Aucun helper email partagé → C3 suit le patron inline (pas de refactor hors lot).

## 8. Plan LOT-01 → LOT-04 (ancré)

- **LOT-01** : domaine pur `web/src/lib/documents/` (`types`, `bloc`, `modele`,
  `document`, `versioning`) + tests — contrat de bloc, provenance ancrée, machine
  d'états, garde de régime IA, version = tuple. Aucune UI, aucune migration.
- **LOT-02** : UI deux colonnes (sources ↔ aperçu `PrévisualisationPatient`) +
  machine d'états + badge, réemploi `buildBookletHTML` comme aperçu.
- **LOT-03** : rendus patient/médecin/praticien (field-filter + garde de statut +
  vocabulaire non prescriptif médecin + badge patient), impression HTML paramétrée
  (extraction `buildBookletHTML`), réemploi envoi. PDF différé.
- **LOT-04** : E2E V1, contrat d'extension bloc C4/C5 (documentaire), handoff
  (dettes : fil médecin 5.0, PDF, persistance), MAJ campagne/registre.

## 9. Risques / vigilance

- **Discordance 5.0 « fil de correspondance »** : le programme recadre le volet
  médecin en réponse **dans un fil** (sans pièces biologiques = sans HDS),
  postérieur au cadrage figé. **Décision** : C3 V1 livre le **rendu médecin
  sortant** ; le **fil bidirectionnel** (réception d'une réponse médecin) est
  **reporté au handoff LOT-04**, non improvisé.
- Ne jamais élargir le `select` patient-safe en adaptant au médecin (frontière A2).
- Ne pas laisser la persistance se glisser sans gate confirmé.
