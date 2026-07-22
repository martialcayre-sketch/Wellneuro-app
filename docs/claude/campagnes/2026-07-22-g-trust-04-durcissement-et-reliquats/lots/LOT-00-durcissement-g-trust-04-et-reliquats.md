---
id: "LOT-00"
titre: "Durcissement G-TRUST-04 et reliquats d'audit"
statut: "en_cours"
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

- [ ] PR-1 campagne (ce document).
- [ ] PR-2 migration `journal_acces_dossiers` + effacement + garde
      structurelle verte (T3 ; revue wn-reviewer ; execute_sql post-merge).
- [ ] PR-3 Next 14.2.35 (T3).
- [ ] PR-4 code mort (T2).
- [ ] PR-5 `@ts-nocheck` vague 1 (mesure consignée ici + certif + T2).
- [ ] PR-6 exercice sur table (docs).
- [ ] PR-7 helper + garde + routes A/B (T2 ; mocks `journalAccesDossier`
      ajoutés aux tests de routes).
- [ ] PR-8 `@ts-nocheck` vague 2.
- [ ] PR-9 routes C/D (T2).
- [ ] PR-10 `@ts-nocheck` vague 3 ou borne.
- [ ] PR-11 clôture (checklist, requalifications, state, SESSION_LOG).

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
