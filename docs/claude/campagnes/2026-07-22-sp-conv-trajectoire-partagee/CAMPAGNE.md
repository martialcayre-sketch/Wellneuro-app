---
id: "2026-07-22-sp-conv-trajectoire-partagee"
titre: "SP-CONV — Convergence Spirale 5.0 : la trajectoire partagée"
statut: "en_cours"
créée_le: "2026-07-22"
mise_à_jour: "2026-07-22"
lot_courant: "LOT-04"
---

# SP-CONV — Convergence Spirale 5.0 : la trajectoire partagée

> Cadrage ouvert le 2026-07-22, à partir de l'audit UX du même jour
> (`docs/ai/AUDIT_UX_CONVERGENCE_SPIRALE_5-0.md`) **confronté au code de
> `main` le soir même** — plusieurs constats de l'audit étaient déjà résolus
> ou périmés au moment de sa publication (V13, V14, gate G2). **Aucun code
> écrit à ce stade.** Ce document cadre et tranche les directions ; il ne
> spécifie pas.

## Pourquoi cette campagne

Le chantier visuel V1–V14 a livré la convergence graphique (clôture consignée
au `docs/design-system-d1.md` §10). Ce qui manque encore n'est pas visuel :
l'Observatoire et le Jardin ne regardent pas la même trajectoire au même
instant. Constats vérifiés dans le code le 2026-07-22 au soir :

- **La fiche praticien s'ouvre toujours sur « Décision »** —
  `useState<IdPhase>('decision')` en dur (`web/src/components/FichePatientPanel.tsx:251`),
  alors que `statutPhase` sait déjà qualifier chaque phase (renseignée /
  en attente / à ouvrir / indéterminée).
- **Deux navigations temporelles coexistent sans se voir** : le time-travel
  SP-TT est livré (`lib/praticien/lectureAsOf.ts`, panneau
  `LectureEtatPassePanel` du copilote), mais la Spirale de l'onglet
  Trajectoire reste décorative (`ui/SpiraleTrajectoire.tsx`, `aria-hidden`)
  et l'index de repères ne filtre rien
  (`patient-cockpit/TrajectoirePanel.tsx:30-31` : « aucun filtre de
  données »).
- **Le patient ne voit jamais l'avancement réel** : les étapes 5-6 du
  parcours (`patient/PatientJourneyProgress.tsx:5-7`) ne deviennent jamais
  actives « faute de signal serveur fiable » — or les signaux existent
  (`Consultation.statut` exposé par `api/portail/session`,
  `protocoleDiffuse`/`finDeCycle` par `api/portail/protocole`,
  `BookletEnvoi` en base, cycles persistés côté praticien).
- **« Mon équilibre » masque les nombres mais pas la quantification** :
  barres proportionnelles (`MonEquilibreAccueil.tsx:26`), « En baisse depuis
  votre dernier bilan » (l.12), « Vos priorités » calculées par tri de
  couverture (l.92-94) sans validation praticien.
- Résidus d'accessibilité : fermeture du tiroir d'instrument à 40 px
  (`FichePatientPanel.tsx:220-226`), fermeture de l'aperçu patient à 36 px
  (`PatientPreview.tsx:38-45`), radios d'anamnèse sous 44 px.
- L'action recommandée du portail questionnaires est réaffichée dans
  « À compléter » (SP-SPI a hiérarchisé sans dédoublonner,
  `app/portail/[token]/questionnaires/page.tsx:196-215`).

## Ce que la confrontation au code a corrigé dans l'audit

Consigné ici pour que la campagne n'hérite pas d'écarts fantômes :

| Constat d'audit | Réalité vérifiée le 2026-07-22 au soir |
|---|---|
| « Le time-travel 5.0 n'est pas livré » | SP-TT livrée le 21/07 (`asOf`, `relecture_notes`, panneau copilote). Il manque la **suture** avec l'index Spirale de la fiche, pas la construction |
| « Aucune clé de cycle, gate multi-cycles différé » | Gate **G2 confirmé le 2026-07-19** ; migration `20260719120000_c2b_cycle_identity_v1` (backfill 3 règles) ; `cycleId` + `versionScore` persistés (`schema.prisma:710-713`) et posés à l'écriture (`versioning.ts:116-131`). La proposition `2026-07-18-gate-modele-multi-cycles/` est **caduque** |
| « Métriques trop générales » | Métriques **supprimées de l'accueil** (V14, décision propriétaire — la référence est l'artifact « WellNeuro 5.0 — La Spirale »). `MetricsSection.tsx` est du code mort (référencé par son seul test) |
| « Le rail expose C3/C4/différé » | Rail réaligné par V14 : « Le Fil du jour » + compteur réel, groupes « La Spirale / Héritage 4.0 — inchangé / Réglages », tags « 4.0 » |
| « Cibles sous le minimum annoncé (48 px) » | Le référentiel opposable est **44 px** ; 48 px est un choix local patient |
| Variante `danger-text` de `PatientButton` | Composant disparu — constat périmé |

## Sources normatives (l'obsolète écarté)

1. `docs/claude/REGISTRE_FRONTIERES.md` + `PROGRAMME_WELLNEURO_5_0.md`.
2. `docs/design-system-d1.md` §8–10 et clôture V12 ; invariants 44 px / AA.
3. **`docs/claude/propositions/2026-07-15-wellneuro-5-0-spirale/maquette-artifact-reference.html`**
   — référence propriétaire depuis V14 ; puis `BRAINSTORM_SPIRALE.md` +
   `ARBITRAGES_QUESTIONS_OUVERTES.md` (même dossier) et
   `2026-07-18-refonte-ux-5-0/` pour les patrons du cockpit (bandeau,
   7 phases, zone focale, tiroirs) qui restent valables.
4. Rectification du 2026-07-19 (PROPOSITION §9) : chaque campagne produit
   **ses propres maquettes** avant d'implémenter — c'est le rôle du LOT-00.

Obsolètes, à ne plus citer comme prescription :
`propositions/2026-07-14-cockpit-praticien/`, `2026-07-15-wellneuro-4-0/`,
`wn-ultimate-v2/` (absorbé), **`2026-07-18-gate-modele-multi-cycles/`**
(résolu par G2 — à annoter en LOT-00).

## Décisions actées (2026-07-22, arbitrages utilisateur)

| # | Décision | Motif |
|---|---|---|
| D1 | **Le contrat d'épisode partagé se construit en code**, sur les cycles G2 déjà persistés. Aucune migration attendue ; si un champ manquant apparaît, lot migration séparé sous gate — jamais improvisé | L'utilisateur a choisi le « contrat complet » ; la confrontation montre que la persistance existe déjà, le manque est un module de dérivation à deux lectures |
| D2 | **Parcours patient : les 6 étapes HC-F sont conservées** et les étapes 5-6 synchronisées par le contrat | Les 5 étapes de la maquette cible étaient une démo (rectification du 19/07) ; le contrat HC-F LOT-04 est documenté et en production |
| D3 | **Réouverture d'A7** : « Spirale » est réservée à la trajectoire globale ; le module alimentaire est renommé (proposition d'adaptation + amendement daté du registre, sur place, modèle `12_CONTREPOINT_ET_ADAPTATION.md`) | La marque la plus forte du produit ne peut pas appartenir à un sous-module ; arbitrage utilisateur du 2026-07-22 |
| D4 | **Réouverture de la dérogation V12** : baselines visuelles sur environnement Linux de référence, patient de capture isolé par worker, premières captures du portail | Arbitrage utilisateur du 2026-07-22 ; la dérogation constatait une contrainte, elle ne l'a pas levée |
| D5 | **Phase initiale du cockpit calculée** : premier bloqueur de sécurité > première action exigible > première phase en attente > dernière phase consultée ; état de chargement d'`etatRuntime` géré | La maquette allume la phase due ; l'ouverture doit y atterrir au lieu de l'ignorer |
| D6 | **La Spirale de l'onglet Trajectoire devient l'index temporel réel**, câblée sur `asOf` (SP-TT), bannière datée + « Retour au présent », lecture seule stricte | « Cliquer un tour recharge la fiche telle qu'elle était à cette date » (BRAINSTORM l.13) — promis, construit par SP-TT, jamais suturé |
| D7 | **Vocabulaire patient des états** : « Vos éléments ont été transmis » / « Votre praticien les prépare » / « Votre restitution est disponible ». Jamais de score, jamais de délai promis, garde `lib/gamification-patient.guard.test.ts` respectée | Doctrine « construction, jamais dégradation » ; frontière R2 déjà arbitrée |
| D8 | **Exécution en PR successives directes vers `main`** (exception Vague 2 reconduite, gardien = CI `verify`), merges par Copilot | Précédent g-trust-04 et Vague 2 (décision utilisateur du 2026-07-19) |
| D9 | **Le module alimentaire s'appelle « Mon carnet alimentaire »** (casse de surface alignée sur « Mon équilibre » / « Mon parcours ») | Décision utilisateur du 2026-07-22 (« Mon Carnet Alimentaire ») ; clôt la question de nom ouverte par D3 |
| D10 | **Fiche en plein écran réel** : la page devient une colonne pleine hauteur, chrome condensé (en-tête + onglets sur une ligne), le cockpit prend l'espace restant au lieu de `min(80vh, 700px)` — zéro scroll de page | Décision utilisateur du 2026-07-22 ; tient la promesse « on navigue par phase, jamais par défilement » sur tout écran ; clôt le reliquat V13 |
| D11 | **Les quatre statuts D7 sont montrables au patient** avant la revue G-TRUST-04 du 2026-10-21 : ils dérivent exclusivement de données que le portail sert déjà — aucune nouvelle catégorie de donnée n'atteint le patient | Décision utilisateur du 2026-07-22 ; le périmètre de la dérogation d'hébergement est inchangé |

## Questions ouvertes — à trancher avant le lot concerné

1. ~~**Nom du module alimentaire** (LOT-05) : « Mon carnet alimentaire »
   proposé.~~ **Close le 2026-07-22 — tranchée par D9.**
2. ~~**Hauteur totale de la fiche > 900 px** (LOT-02) : compacter ou
   assumer ?~~ **Close le 2026-07-22 — tranchée par D10 (plein écran
   réel).**
3. ~~**Seuil de visibilité patient sous G-TRUST-04** (LOT-04).~~ **Close le
   2026-07-22 — tranchée par D11 (les quatre statuts D7).**

Aucune question ouverte ne subsiste au cadrage.

## Frontières

**Possède** — le contrat d'épisode partagé (module de dérivation, deux
formulations) ; la phase initiale et le bandeau du cockpit ; la suture
index Spirale ↔ `asOf` ; la synchronisation des étapes 5-6 du parcours
patient ; la dataviz qualitative de « Mon équilibre » ; le renommage A7 ;
les résidus a11y listés ; la preuve visuelle (baselines + portail).

**Consomme** — cycles persistés G2 (`construireTrajectoire`,
`lib/protocol/trajectoire.ts`) ; `lectureAsOf.ts` et les patterns de
`LectureEtatPassePanel` (SP-TT) ; `Consultation.statut`,
`protocoleDiffuse`/`finDeCycle`, `BookletEnvoi` (routes portail
existantes) ; le design system §10 ; l'artifact de référence V14.

**Ne possède pas** — la refusabilité des cartes du Fil (polissage SP-FIL,
gate G1) ; le repère cabinet `n ≥ 5` (SP-CAB) ; la Météo d'adhésion
(SP-MET, lot suivant annoncé en V14) ; l'écoute ambiante (SP-AMB, gate
CNIL/RGPD) ; la réconciliation estimé ↔ mesuré, la biologie réelle et les
pièces jointes (Phase C, HDS) ; le décommissionnement du flux legacy
`/patient/[idAssignation]` (suite d'IDP2 LOT-04, précondition de migration
des patients) ; la bande « confiance des observations » (aucun signal
agrégé dans le payload — la dérogation V12 reste valable sur ce point) ;
le moteur `lib/equilibre` (jamais réimplémenté) ; le badge compteur
Correspondance (écart V14 documenté, attend la donnée).

**Refuse** — tout score, pourcentage ou courbe côté patient ; toute
comparaison inter-cycles hors version identique (garde A8-3) ; toute
modification du passé en lecture datée (note de relecture horodatée au
présent uniquement, SP-TT) ; tout envoi automatique.

## Esquisse de lots

Du plus contraint au plus large ; chaque lot est livrable et réversible
seul. Détail : `lots/LOT-XX-*.md`.

| Lot | Objet | Dépend de |
|---|---|---|
| LOT-00 | Vérification registre ↔ état réel, annotation des documents périmés, maquettes propres de la campagne | — |
| LOT-01 | Contrat d'épisode partagé (lib, code seul, deux formulations) | LOT-00 |
| LOT-02 | Cockpit adaptatif : phase initiale calculée, bandeau d'épisode, hauteur de fiche | LOT-01 |
| LOT-03 | Suture time-travel : Spirale de la fiche = index temporel `asOf` | LOT-00 |
| LOT-04 | Parcours patient synchronisé (étapes 5-6, a11y, dédoublonnage CTA) | LOT-01 |
| LOT-05 | Jardin : renommage A7, « Mon équilibre » qualitatif, résidus a11y, TTL brouillons | LOT-00 |
| LOT-06 | Preuve visuelle : baselines Linux, isolation par worker, captures portail | LOT-02, LOT-04, LOT-05 |

## Vérification attendue

- Paliers T1 (`npm run check`) après chaque édition, T2
  (`test:worktree -- --fast`) avant tout commit UI, T3 (`test:worktree`)
  avant les PR touchant les parcours.
- Chaque lot UI se juge contre la **grille de conformité 5.0** (7 axes
  SP-RUN, 11 invariants opposables —
  `AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`).
- E2E mis à jour dans le même commit que chaque changement de parcours
  (précédent V14).
- Tests spécifiques attendus : garde « jamais de score patient » sur le
  contrat (LOT-01) ; garde « lecture seule en vue datée » (LOT-03) ;
  annonce lecteur d'écran des étapes terminées (LOT-04).

## Raccordement

- Campagne cadrée puis **activée en parallèle le 2026-07-22** (décision
  utilisateur : « green go » sur la PR de cadrage #280, puis lancement du
  LOT-00) — `2026-07-22-g-trust-04-durcissement-et-reliquats` reste la
  campagne active principale, SP-CONV est enregistrée dans
  `parallel_campaigns` de `.wn/state.json`. Périmètres orthogonaux —
  sécurité/dette vs UX ; seul point de contact : le code mort, borné à
  `ui/Score*` chez eux, `MetricsSection` ici.
- Hérite des constats de l'audit du 2026-07-22 **tels que rectifiés** par la
  table ci-dessus (équivalent « Dette héritée » de SP-SPI).
- Prépare SP-CAB (le bandeau d'épisode et le contrat partagé sont les
  surfaces où le repère cabinet s'affichera) sans l'absorber.
