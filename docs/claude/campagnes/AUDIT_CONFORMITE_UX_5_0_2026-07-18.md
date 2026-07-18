# Audit de conformité UX 5.0 — front praticien & patient

Date : 2026-07-18
Branche d'audit : `audit-refonte/ux-5-0` (worktree isolé, basé sur `main` @ `4e6fddc`)
Périmètre : toutes les campagnes du Programme 5.0 touchant l'UX praticien ou patient.
Étalon de conformité : **SP-RUN « Cockpit vivant »**.

Verdict global : **le front UX est conforme au paradigme 5.0 dans ses contrats** ; les écarts sont de deux natures — (1) **fraîcheur documentaire** (main en retard sur des branches en vol) et **cadrage manquant** (7 campagnes UX sans `CAMPAGNE.md`) ; (2) **dette d'expérience** (le prod ne reproduit pas encore le concept : cockpit à long-scroll, portail patient à palette legacy, métriques passives, typographie petite). Le premier relève de la gouvernance, le second motive le livrable de refonte (`propositions/2026-07-18-refonte-ux-5-0/`).

> Aucun code, schéma, SQL, flag, seuil clinique ni `.wn/state.json` n'est modifié par cet audit. Les écarts sont **signalés**, pas corrigés.

## Sources normatives et ordre de préséance

1. `docs/claude/REGISTRE_FRONTIERES.md` (source normative unique) et `docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md`.
2. `docs/design-system-d1.md` (tokens, contraste) et les invariants d'accessibilité (§1 registre).
3. `CAMPAGNE.md` de chaque campagne + ses lots.
4. Arbitrages (A1–A7 du registre) et propositions promues.
5. `.wn/state.json` (état machine) et `ACTIVE_CAMPAIGN.md` (vue générée).
6. Brainstorms, maquettes et `sources/` — matériau historique.

## 1. L'étalon — SP-RUN « Cockpit vivant »

SP-RUN (`2026-07-15-cockpit-vivant`, statut *terminé — SP-RUN-02 validé en CI*, PR #100) a branché le runtime clinique C1 dans le cockpit praticien. Elle est l'exemplaire de conformité 5.0 : chacun de ses choix matérialise un invariant du paradigme. Les **axes de conformité** qu'elle incarne servent de grille au reste de l'audit :

| Axe | Ce que SP-RUN fait | Invariant 5.0 servi |
|---|---|---|
| **Lecture seule d'abord** | Runtime calculé en mémoire par requête, aucune persistance | « la 5.0 est une couche d'interface et de mémoire » ; persistance = C2A (gate distinct) |
| **Gate d'entrée explicite** | Câblage interdit tant que la validation ergonomique C1 n'est pas levée par l'utilisateur | Gates hérités inchangés (A6) |
| **Abstention honnête** | Sans règle clinique validée, l'abstention reste `not_evaluated` ; aucune priorité proposée | Le noyau clinique reste souverain ; jamais de décision non fondée |
| **Confirmation T0 explicite** | Une proposition hashée doit être confirmée ; une proposition périmée est rechargée | Jamais d'automatisme non refusable |
| **Versions citées** | Le cockpit affiche les versions de scoring | Toute proposition sourcée (instrument, date, version) |
| **Discordances praticien seul** | `DiscordanceFinding.audience = practitioner_only` | Jamais de donnée anxiogène côté patient |
| **Zéro score patient** | Aucune diffusion patient (chaîne Relu→Validé→Envoyé = C3/SP-COP) | Pas de score chiffré patient |

## 2. Grille de conformité 5.0 (invariants opposables)

1. La Spirale est un objet de **navigation, jamais un graphe** (A6).
2. Le **noyau clinique 3.x reste souverain** ; la 5.0 est sa couche d'interface/mémoire ; contrats C1 inchangés.
3. **Jamais d'envoi automatique** : chaîne Relu → Validé → Envoyé ; chaque automatisme affiche « pourquoi maintenant » et reste refusable.
4. Côté patient : **pas de score chiffré, pas de gamification, pas de pronostic nominatif, pas de chatbot médicalisant**, jamais de statut par la seule couleur, construction jamais dégradation.
5. Toute proposition du copilote **cite instrument, date, version de scoring**.
6. **Vocabulaire réglementaire verrouillé** (« recommandation », « protocole personnalisé » ; jamais « prescription », « ordonnance », « diagnostic », « NeuroScore »).
7. **Gates fail-closed** : migration Prisma, activation, diffusion = confirmations explicites distinctes ; flags par défaut inactifs.
8. **DA « l'Observatoire & le Jardin »** (A5-R1) : tout clair, rail nuit signature praticien, patient clair fixe, **aucun toggle** ; règle de relief solaire ; trio d'entité Corps/Ancrage/Esprit fixe.
9. **Front correct** (praticien / patient / deux) selon le mapping du Programme.
10. **Écoute ambiante = gate CNIL/RGPD bloquant** avant tout développement (A6-3).
11. Accessibilité (§1) : contraste AA, cibles ≥ 44 px, focus visible, **aucune fonction critique au seul survol**.

## 3. Inventaire du front 5.0 touchant l'UX

| Campagne | Dossier | Front | Statut (main @ 4e6fddc) |
|---|---|---|---|
| **SP-FIL** — Le Fil du jour | `2026-07-15-fil-du-jour-v1` | praticien | terminée |
| **SP-RUN** — Cockpit vivant *(étalon)* | `2026-07-15-cockpit-vivant` | praticien | terminé |
| **HC-F** — Hybrid Clinical Foundation | `2026-07-12-hybrid-clinical-experience-questionnaires` | deux | terminée |
| **C1** — Décision clinique 21 j | `2026-07-11-decision-clinique-21-jours-v1` | praticien (+ aperçu patient) | terminée |
| **QX** — Expérience questionnaires | `2026-07-12-qx-experience-questionnaires` | patient | terminé |
| **C2** — Points d'étape & persistance | `2026-07-11-suivi-j7-j14-j21-et-persistance` | deux | **en_cours** (LOT-03, gate migration) |
| **C3** — Documents contextuels | `2026-07-11-fiches-conseils-contextuelles-v1` | praticien (+ patient destinataire) | cadrée |
| **C4** — Compléments clean label | `2026-07-11-complements-clean-label-v1` | praticien | cadrée |
| **C5** — Boussole alimentaire | `2026-07-11-boussole-alimentaire-slice-v1` | praticien + patient | **en_cours** (LOT-01) |
| **JA** — Ma spirale alimentaire | `2026-07-13-journal-alimentaire-21j-v1` | patient + praticien | **en cours** (LOT-05) |
| **TRUST** — Information patient & droits | `2026-07-15-trust-information-patient-droits-v1` | deux | terminée (NO-GO activation) |
| C0-UX — Refonte shell 3.0 | `2026-07-11-refonte-ux-shell-3-0` | praticien | terminé (superseded HC-F) |
| *À cadrer (sans `CAMPAGNE.md`)* | — | praticien/patient | SP-TT, SP-COP, IDP, SP-SPI, SP-MET, SP-CAB, SP-AMB |

## 4. Audit par campagne (verdicts)

### Livrées / terminées

- **SP-FIL** — *conforme*. Le Fil du jour comme accueil praticien (A6-4) sur données existantes, sans migration ; cartes « pourquoi maintenant » refusables. Réserve d'expérience : les métriques restent passives (cf. §6).
- **SP-RUN** — *conforme (étalon)*. Voir §1.
- **HC-F** — *conforme*. Socle DA (tout clair + rail sombre signature), mécanismes A2 (`ModeConsultation`, `PrévisualisationPatient`, double lecture), lexique et gouvernance. C'est la fondation que la refonte réemploie.
- **C1** — *conforme*. Contrats purs, provenance en niveaux de preuve A/B/C/D (pas de « score de confiance » continu), validation humaine systématique, protocole borné au brouillon. Souveraineté clinique respectée.
- **QX** — *conforme*. Rendu séquentiel/micro-lots, scoring sur `id`/`v` jamais la position, garde-fous psychométriques ; pilotes bornés aux familles auditées.
- **TRUST** — *conforme au cadrage, NO-GO activation*. Information à trois niveaux, consentement lié au hash de son texte, centre permanent des droits. Gates juridique/hébergement/panel non levés (documentés `DETTE_TRUST.md`) ; ne devient jamais automatiquement la campagne active.

### Active / en cours

- **C2** — *conforme, en vol*. A1 respecté (points d'étape ≠ jalons de mesure, jamais convertis en score) ; scission C2A (gate migration explicite) / C2B (après données réelles) ; différés fermes (score de décrochage, % d'observance patient). Sur `main`, LOT-03 en cours, gate migration à confirmer.
- **C5** — *conforme au cadrage, LOT-01 bloqué*. Instrument de la Spirale, jamais graphe ni score patient ; C5A intrinsèque sans donnée patient ; LOT-01 attend une validation clinique humaine. Lots UX « Observatoire » (LOT-04) et « Jardin » (LOT-05) cadrés, non exécutés.
- **JA** — *conforme au cadrage (A7)*. Instrument à trois régimes, quatre lectures jamais fusionnées, aucun score SIIN, aucune valeur nutritionnelle, faisabilité publiée sans altérer l'intrinsèque. Persistance gatée par C2A. LOT-05 (activation protocole) en cours sans migration.

### Cadrées non livrées

- **C3** — *conforme au cadrage*. Moteur de composition documentaire (aucun contenu clinique source), chaîne brouillon→relu→validé→envoyé, aperçu deux colonnes. Lots N+1.
- **C4** — *conforme au cadrage*. Pas de score global dominant, provenance et fraîcheur obligatoires, justification anti-perception commerciale. Lots N+1.

### Superseded

- **C0-UX** — *clos, direction remplacée par HC-F*. Socle technique conservé comme filet de non-régression ; ne pas rouvrir.

## 5. Comparaison à l'étalon SP-RUN

| Axe de l'étalon | SP-FIL | HC-F | C1 | C2 | C5 | JA | C3 | C4 | TRUST |
|---|---|---|---|---|---|---|---|---|---|
| Lecture seule / gate d'écriture explicite | ✓ | ✓ | ✓ | ✓ (gate migration) | ✓ (inactive) | ✓ (gate C2A) | ✓ | ✓ | ✓ (gates non levés) |
| Abstention / souveraineté clinique | n/a | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sources/versions citées | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Zéro score patient | ✓ | ✓ | ✓ (aperçu) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Navigation jamais graphe | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Aucune campagne du front ne diverge des axes de l'étalon **dans ses contrats**. La divergence est ailleurs — dans l'expérience livrée (§6).

## 6. Écarts détectés

| # | Écart | Nature | Sévérité | Référence |
|---|---|---|---|---|
| E1 | Sur `main`, `.wn/state.json`, `ACTIVE_CAMPAIGN.md` et la fiche C2 concordent (LOT-03) ; mais le travail C2B (LOT-07→09) est **en vol sur `feat/c2b-lot-09-trajectoire`, non mergé** → `main` documente un état antérieur à la réalité en cours. | Fraîcheur main↔branches | faible / informatif | A3 (compilation N+1) |
| E2 | **7 campagnes UX inscrites au Programme sans `CAMPAGNE.md`** : SP-TT, SP-COP, IDP, SP-SPI, SP-MET, SP-CAB, SP-AMB. Frontières non figées → risque de dérive. | Cadrage manquant | moyenne | A3 ; PROGRAMME §Séquence |
| E3 | **SP-AMB** (écoute ambiante) : gate CNIL/RGPD non instruit — doit rester **bloquant** avant tout développement. | Réglementaire (conforme tant que bloqué) | à surveiller | A6-3 |
| E4 | **TRUST** terminée mais **NO-GO activation données réelles** (gates juridique/hébergement/panel non levés) + dettes `DETTE_TRUST.md`. | Gate non levé (documenté) | moyenne | Fiche TRUST |
| E5 | **Divergence doc↔code** : `design-system-d1.md` (en-tête) décrit encore « deep teal + champagne gold » alors que `globals.css` est en A5-R1 (indigo/forêt). | Cohérence documentaire | faible | A5-R1 |
| E6 | **Dette d'expérience (le cœur du sujet)** : le cockpit praticien empile 14-16 sections (4-7 écrans de scroll) ; le portail patient conserve une palette bleu/gris legacy (`patient/layout.tsx` + 3 écrans inline) ; les métriques d'accueil sont **passives** ; la typo de corps est à 14px et `ReadingComfortControl` n'est pas monté sur `/patient`. Le prod **ne reproduit pas encore** la disposition 5.0 (A6). | Non-conformité d'expérience | **moyenne-forte** | A6 ; §1 accessibilité ; livrable B |

## 7. Verdicts

- **Contrats & frontières** : GO conformité pour tout le front (aucune violation d'invariant).
- **Expérience** : NON-CONFORME au cap A6 tant que la dette E6 n'est pas résorbée → traitée par la proposition de refonte (poste de pilotage + A5-R2).
- **Gouvernance** : à corriger — cadrer les 7 campagnes UX en attente (E2), maintenir le gate SP-AMB (E3), réconcilier `design-system-d1.md` (E5).

## 8. Recommandations (non contraignantes, hors périmètre de correction)

1. Résorber la dette d'expérience E6 via le livrable B (Vague 1 : achever la migration du portail patient, métriques actives, poste de pilotage borné, typo remontée).
2. Cadrer un `CAMPAGNE.md` pour chaque campagne UX en attente (E2), en priorité SP-COP et SP-SPI (fort impact UX).
3. Réconcilier l'en-tête de `design-system-d1.md` avec la palette A5-R1 réellement implémentée (E5).
4. Après merge de `feat/c2b-*`, resynchroniser `.wn/state.json` / `ACTIVE_CAMPAIGN.md` (E1) — confirmation distincte.

*Fin de l'audit. Aucun fichier applicatif, schéma, flag ni état machine modifié.*
