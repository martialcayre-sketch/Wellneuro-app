---
id: "LOT-00"
titre: "Durcissement G-TRUST-04 et reliquats d'audit"
statut: "livré"
dépend_de: "aucun"
---

# LOT-00 — Durcissement G-TRUST-04 et reliquats d'audit

> Lot unique de la campagne, exécuté en ~11 PR successives vers `main`.
> Décisions GD-1 à GD-6 dans `../CAMPAGNE.md`. Ce fichier consigne le
> périmètre exact, le branchement route par route du journal d'accès, et les
> verdicts au fil de l'eau.

## But

Que la dérogation G-TRUST-04 (bornée au 2026-10-21) soit la plus défendable
possible à sa date de revue : piste d'audit persistée (exigence 5), procédure
de violation exercée (exigence 6), dépendances à jour, catalogue clinique
typé, plus aucun item de backlog non qualifié.

## Chantier 1 — journal des accès praticien (exigence 5)

### Table `journal_acces_dossiers` (PR-2, migration seule)

Patron migration G5 : additive, SQL brut commenté, **sans FK** vers
`patients` (comme `audit_syntheses`, `portail_connexions_google`), RLS
deny-all sans policy. Colonnes : `id`, `id_patient` (**NOT NULL** — on
n'écrit qu'après appartenance établie), `praticien_email`, `route` (gabarit
littéral, jamais l'URL), `methode`, `cree_le` (posé par la base). Index
`(id_patient, cree_le)` + `(cree_le)`. **Jamais** de payload, d'IP, de
user-agent, de donnée clinique.

Modèle Prisma `JournalAccesDossier` obligatoire (pas `tables.external` :
la garde structurelle d'`effacement.test.ts` ne lit que `schema.prisma`) ;
`effacerDossier` efface la table nommément **dans la même PR** (section 1,
tables sans FK).

### Écriture (PR-7) — `web/src/lib/praticien/journalAcces.ts`

`journaliserAccesDossier({ idPatient, praticienEmail, route, methode })` :
awaitée, fail-open (patron `tracer()` G5 — un seul try/catch, pas de
`.catch()` local sur la purge), purge opportuniste
`RETENTION_JOURNAL_ACCES_MS = 365 j` à l'écriture, échec sous code
`PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC`. Aucun log console de succès (la table
est le journal). Garde étendue :
`verifierAppartenancePatient(idPatient, email, acces?)` — journalise si et
seulement si le verdict est `accessible` et `acces` fourni ; les 15 appels
existants compilent inchangés.

### Branchement — 22 routes GET « dossier nommé » (PR-7 puis PR-9)

**A. Garde factorisée, 3ᵉ argument (PR-7)** : `copilote/prevol`,
`copilote/cloture`, `reperes`, `trajectoire`, `protocoles/checkins`,
`correspondance-medecin` (via son `garder()`, GET seul),
`relecture-notes` (idem).

**B. Inline → ralliées à la garde (PR-7)** : `boussole`, `ja/activation`,
`ja/observations`, `protocoles/diffusion`, `protocoles/versions` — réponses
403 existantes préservées à l'octet (les deux verdicts non-`accessible`
mappent sur le 403 actuel), leurs `route.test.ts` sont les juges ; seuls les
GET passent `acces`.

**C. Requête scopée, appel direct après succès (PR-9)** : `besoins`,
`cockpit`, `equilibre`, `synthese`, `consultations`, `protocoles` — jamais
converties à la garde (leurs sémantiques 404/liste-vide sont des choix
anti-oracle). Limite documentée : dossier possédé sans donnée (p.ex. sans
synthèse) = non journalisé.

**D. Identifiant indirect, appel après résolution scopée (PR-9)** :
`apercu-patient/reponses` (idAssignation), `booklet` (idSynthese),
`documents` (idSynthese), `reponses` (email → idPatient).

**Exclues, motivées (GD-1)** : `patients`, `patients-pg`, `fil`, `trust`
(listes de portefeuille) ; `metrics` (agrégats) ; `packs`, `questionnaires`,
`questionnaires/registry` (catalogues sans donnée patient) ; toutes les
écritures ; le RSC `dashboard/copilote/page.tsx` (prénom/nom d'en-tête
seuls) ; le versant patient (déjà tracé : `portail_connexions_google`,
`portail_magic_links.consomme_le`).

### Requête de consultation type (GD-3, pas d'écran)

```sql
SELECT cree_le, praticien_email, methode, route, id_patient
FROM journal_acces_dossiers
WHERE id_patient = 'PAT_...'
ORDER BY cree_le DESC LIMIT 100;
```

## Chantier 2 — exercice sur table (exigence 6, PR-6)

`EXERCICE_SUR_TABLE_VIOLATION_2026-07-22.md` dans cette campagne : scénario
fictif (lien portail de Michel Dogné transféré à un tiers), déroulé §2→§8 de
`docs/PROCEDURE_VIOLATION_DONNEES.md`, fiche modèle remplie (n° fictif),
constats et écarts ; amendements éventuels de la procédure dans la même PR ;
§8.4 réécrit « exercé le 2026-07-22 ». La confirmation juridique reste une
dette humaine (D-TRUST-02).

## Chantier 3 — Next 14.2.5 → 14.2.35 (PR-3)

`web/package.json` + lockfile, rien d'autre. Aucun middleware dans le projet
(CVE-2025-29927 sans objet) ; l'intervalle contient cache poisoning
(corrigé 14.2.10) et bypass pathname (corrigé 14.2.15). T3 complet avant PR.

## Chantier 4 — code mort (PR-4)

Supprimés (zéro référence, tests compris) :
`web/src/components/ui/ScoreThreshold.tsx`, `ScoreSparkline.tsx`,
`ScoreBarChart.tsx`. **Qualifiés non morts, conservés** :
`web/src/lib/trust/gouvernance.ts` (livrable TRUST LOT-01, référencé par
`dashboard/parametres`), `FoodObservationJourney` (harnais dev délibéré,
page gardée `dev/validation-ja`).

## Chantier 5 — `@ts-nocheck` (PR-5, PR-8, PR-10)

17 fichiers, 5 286 lignes, catalogue clinique certifié. Mesure d'abord
(`tsc --noEmit` sans pragmas, chiffres consignés ici), puis vagues :

1. `shared.ts`, `index.ts`, cardiologie, pneumologie, urologie,
   fibromyalgie, intestin-gastro, cancerologie, mode-de-vie, alimentaire ;
2. pediatrie, tabacologie, sommeil, stress, gerontologie, neuropsychologie ;
3. `questions.ts` seul — ou borne documentée (GD-5) si disproportionné.

Invariant : types seuls, zéro changement d'émission JS ; juges =
certification 63 questionnaires + tests scoring + T1 à chaque fichier.

## Chantier 6 — reliquats documentaires (PR-11, clôture)

- « Onboarding cassé » : requalification (E2E `portail-parcours` + verdict).
- Previews Vercel : GD-6 consignée (règle « jamais de drapeau `WN_*` sur
  Preview ») dans la checklist G-TRUST-04.
- `CHECKLIST_ACTIVATION_G_TRUST_04.md` : exigence 5 → « améliorée » avec
  preuves ; exigence 6 → « exercée » ; item 4 de la liste à faire barré-daté.
- Lot `livré` + campagne `livrée` même commit ; `.wn/state.json` ;
  `SESSION_LOG.md`.

## Interdits

- Pas de secret ; pas de donnée patient réelle (Sophie Nicola, Jennifer
  Martin, Michel Dogné seuls).
- Pas de changement de logique clinique ni de seuil (chantier 5 : types
  seuls).
- Migration : PR seule, revue `wn-reviewer` avant merge, `execute_sql`
  après ; aucune autre écriture base.
- Pas d'écran ni de route de lecture du journal (GD-3).
- Pas de refactor hors périmètre (catégorie C jamais convertie à la garde).

## Étapes

- [x] PR-1 campagne (ce document) — #272, mergée le 2026-07-22.
- [x] PR-2 migration `journal_acces_dossiers` + effacement + garde
      structurelle verte (T3 ; revue wn-reviewer ; execute_sql post-merge) —
      #273, mergée le 2026-07-22.
- [x] PR-3 Next 14.2.35 (T3) — #275, mergée le 2026-07-22.
- [x] PR-4 code mort (T2) — #276, mergée le 2026-07-22.
- [x] PR-5 `@ts-nocheck` vague 1 (mesure consignée ici + certif + T2) — PR de
      clôture (2026-07-23).
- [x] PR-6 exercice sur table (docs) — #281, mergée le 2026-07-22.
- [x] PR-7 helper + garde + routes A/B (T2 ; mocks `journalAccesDossier`
      ajoutés aux tests de routes) — #278, mergée le 2026-07-22.
- [x] PR-8 `@ts-nocheck` vague 2 — PR de clôture (2026-07-23).
- [x] PR-9 routes C/D (T2) — PR de clôture (2026-07-23).
- [x] PR-10 `@ts-nocheck` vague 3 — PR de clôture (2026-07-23) : 17/17 levés,
      juge de certification transpilé (décision utilisateur, pas de borne).
- [x] PR-11 clôture (checklist, requalifications, state, SESSION_LOG) — PR de
      clôture (2026-07-23). PR-5 à PR-11 regroupées en une PR unique sur
      décision utilisateur du 2026-07-23 (« on enchaîne tout, 1 seule PR »).

## Tests

- `journalAcces.test.ts` : ligne exacte écrite ; purge 365 j ; fail-open
  (rejet Prisma → aucune exception, `logger.error` avec le code dédié).
- `appartenance.test.ts` : journalise sur `accessible`+`acces` ; pas sur
  `introuvable`/`autre_praticien` ; pas sans `acces`.
- Routes : 403 inchangés (B) ; 1 `create` sur GET accessible ; 0 `create`
  sur POST et sur refus.
- Garde structurelle `effacement.test.ts` couvre la nouvelle table.
- Certification questionnaires + scoring à chaque vague du chantier 5.

## Critères de done

- « Qui a lu quel dossier, quand » : réponse par `execute_sql` sur tout accès
  praticien à dossier nommé.
- Aucune lecture légitime ne peut échouer à cause du journal (fail-open
  testé).
- Exercice sur table consigné, constats listés.
- Next 14.2.35 en prod ; 3 composants morts supprimés ; `@ts-nocheck` levé
  (ou borné avec chiffres).
- Checklist G-TRUST-04 à jour, CI verte partout.

## Résultats

À compléter au fil des PR.

### PR-6 — exercice sur table (2026-07-22)

- `EXERCICE_SUR_TABLE_VIOLATION_2026-07-22.md` : scénario fictif (lien
  portail de Michel Dogné transféré à un proche), déroulé §2→§8, fiche
  2026-EX1 remplie, chronologie jouée (prise de connaissance → CNIL en
  ~25 h < 72 h). Verdict : exécutable en 72 h par une seule personne.
- 3 constats : **EX-1** RUNBOOK « Révocation accès patient » inexécutable
  (`portailToken` inexistant, route `DELETE /api/praticien/token` — trois
  portes, une transaction — ignorée), **corrigé dans la même PR** ;
  **EX-2** détection passive (les événements SECURITY sont des logs, pas des
  alertes — hors périmètre du lot) ; **EX-3** existence physique du registre
  hors dépôt à confirmer par le responsable (action humaine).
- `PROCEDURE_VIOLATION_DONNEES.md` §8.4 réécrit « exercée le 2026-07-22 » ;
  la confirmation juridique reste due (D-TRUST-02). Checklist G-TRUST-04
  inchangée (réservée PR-11).

### PR-7 — helper + garde + routes A/B (2026-07-22)

- `web/src/lib/praticien/journalAcces.ts` : `journaliserAccesDossier` awaitée
  fail-open (patron `tracer()` G5, un seul try/catch, create avant purge),
  `RETENTION_JOURNAL_ACCES_MS = 365 j`, code `PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC`
  ajouté à `eventCodes.ts`. Contexte de log sans Request fabriqué à la main
  (précédent `instrumentation.ts`), `route`/`method` = gabarit littéral.
- Garde `verifierAppartenancePatient(idPatient, email, acces?)` : journalise
  ssi verdict `accessible` et `acces` fourni ; les appels à 2 arguments
  compilent inchangés.
- 7 routes A branchées (3ᵉ argument, GET seul ; `garder()` de
  correspondance-medecin et relecture-notes reçoit un `acces?` transmis par le
  GET seul). 5 routes B ralliées à la garde (`introuvable` et
  `autre_praticien` → le 403 historique, corps vérifié à l'octet par les
  tests ; POST ralliés sans `acces`). `ensurePractitionerScope` de
  ja/activation devenu adaptateur de la garde.
- Tests : `journalAcces.test.ts` (ligne exacte, purge 365 j, ordre
  create→purge, fail-open écriture et purge), `appartenance.test.ts` (6 cas),
  10 `route.test.ts` enrichis (1 create sur GET accessible au gabarit exact,
  0 sur refus et sur POST, corps 403 verrouillés), 2 `route.test.ts` créés
  (cloture, reperes — routes sans juge sinon). T1 vert (298 tests).

### PR-9 — routes C/D + correctif booklet (2026-07-23, PR de clôture)

- **Correctif d'autorisation trouvé au branchement** : le GET `booklet`
  (prévisualisation praticien) lisait la synthèse par `findUnique(idSynthese)`
  sans clause d'appartenance — tout praticien authentifié pouvait prévisualiser
  n'importe quel booklet (nom patient, synthèse, e-mail). Rallié au scoping du
  POST (`findFirst` + `filtrePatientsDuPraticien`), 404 anti-oracle conservé.
- 6 routes C (besoins, cockpit, equilibre, synthese, consultations,
  protocoles) : appel direct après preuve d'appartenance, jamais la garde ;
  routes liste journalisées sur résultat non vide seulement — **limite
  assumée : dossier possédé sans donnée non journalisé**. cockpit : appel dans
  le handler GET, jamais dans `loadRuntimeInputs` (partagé POST, GD-1).
- 4 routes D (apercu-patient/reponses, booklet, documents, reponses) :
  idPatient issu de la ligne résolue, jamais du paramètre ; booklet et
  documents journalisent avant leur 422 (la synthèse a été lue), apercu avant
  son second 404.
- Tests : 4 créés (booklet, equilibre, synthese, apercu, reponses — 5 en
  comptant booklet), 3 enrichis ; 1 create au gabarit littéral sur accessible,
  0 sur refus/POST/liste vide. Le test cockpit « aucune écriture Prisma »
  devient « …clinique » (le journal est une écriture d'audit).

### Chantier 5 — `@ts-nocheck` levé 17/17 (2026-07-23, PR de clôture)

**Mesure préalable (GD-5)**, pragmas retirés sur les 17 fichiers :
**1 560 erreurs tsc**. Par fichier : questions 493, neuropsychologie 274,
pediatrie 146, stress 130, gerontologie 96, sommeil 92, tabacologie 64,
cancerologie 51, mode-de-vie 46, fibromyalgie 38, alimentaire 38,
intestin-gastro 36, cardiologie 16, shared 15, urologie 14, pneumologie 11,
index 0. Par nature : 1 425 TS2554 (« Expected 4 arguments » — le `meta` non
typé des fabriques était obligatoire), 102 TS7006, 17 TS7005, 7 TS7053,
2 TS1117 (les doublons Q_NEU), résidu divers. Hors TS2554, tout se
concentrait dans questions.ts (120) et shared.ts (15).

**Décision utilisateur du 2026-07-23** : moderniser le juge plutôt que
borner — `check_questionnaire_certification.js` transpile chaque fichier
(`ts.transpileModule`) avant son eval, dédoublonnage des helpers sur la
source brute (l'émetteur re-imprime les one-liners), prouvé neutre sur
catalogue inchangé (même verdict avant/après).

**Vagues** : (1) fabriques `q/qn/qs` typées dans shared.ts, 10 fichiers levés
sans une annotation de données ; (2) 6 fichiers levés, `Question.groupe`
ajouté au type (25 items ECAB, scorings `group_majority`) ; (3) questions.ts —
doublons Q_NEU_04/Q_NEU_08 supprimés en conservant le gagnant runtime,
`QuestionOption.v` élargi à `number|string` (dépistages digestifs 'oui'/'non',
héritage GAS), catalogue laissé à l'inférence (l'annotation `Record`
explosait le moteur à 272 erreurs), moteur de scoring en **51 `any`
explicites** — les juges du comportement restent la certification des
63 questionnaires et les tests de scoring. Écart à la spéc : shared.ts était
prévu en vague 1 avec les données ; il a été typé (pas seulement levé), et
aucune borne n'a été nécessaire. Zéro valeur, seuil ou ordre d'évaluation
modifié ; tsc 0 erreur ; certification et T1 verts à chaque vague.

### Requalification « onboarding cassé » (2026-07-23)

Item de backlog non qualifié (audit 5.0 du 2026-07-22, détail perdu à la
compaction du journal). **Verdict : l'onboarding fonctionne, item périmé.**
Preuve : E2E `web/e2e/portail-parcours.spec.ts` — parcours complet gate →
écrans TRUST → consentement → fiche → anamnèse → **onboarding (« Accéder à
mon parcours » → hub)** → questionnaire → verrouillage → correction →
re-soumission, joué en serial sur Michel Dogné (PAT_SEED_03) sur 2 projets
(Chromium bureau + iPhone 13), vert au T3 de la PR de clôture.

### Clôture (2026-07-23)

- Checklist G-TRUST-04 : exigence 5 → « amélioré les 2026-07-22/23 » avec
  preuves et limites ; exigence 6 → « exercée » ; item 4 barré-daté ; règle
  GD-6 (« jamais de drapeau `WN_*` sur Preview ») consignée.
- Reste humain (hors lot) : preuve fonctionnelle du journal au premier
  dossier ouvert en prod (requête GD-3), confirmation juridique D-TRUST-02,
  registre physique des violations (EX-3), dérogation G-TRUST-04 à réexaminer
  au 2026-10-21.
