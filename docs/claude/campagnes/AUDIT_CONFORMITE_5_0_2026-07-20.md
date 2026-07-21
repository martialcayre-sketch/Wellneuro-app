# Audit de conformité 5.0 — code, campagnes à venir, intégration UX

Date : 2026-07-20 (soir, après l'atterrissage des gates G1/G3/G4)
Ancre : `main` @ **6bfbfa4** (#177). Constats établis à `1773c4d` (#176) ;
`git diff 1773c4d main` = `docs/claude/SESSION_LOG.md | 24 +`, aucun code,
aucune migration — tous les constats de code valent identiquement aux deux SHA.
Branche d'audit : `audit/conformite-5-0-2026-07-20` (worktree isolé).
Périmètre : **élargi** — code applicatif, campagnes à venir, gates, cohérence
documentaire et accessibilité. Étalon de conformité inchangé : SP-RUN.

**Succède à** `AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`, dont il reprend le
gabarit et **continue la numérotation des écarts** (E1–E6 conservés avec leur
numéro, nouveaux constats à partir de E7).

> Aucun code, schéma, SQL, flag, seuil clinique ni `.wn/state.json` n'est
> modifié par cet audit. Les écarts sont **signalés, pas corrigés**.

**Verdict global** : les invariants *cliniques* du paradigme 5.0 tiennent — pas
d'envoi automatique, `versionScore` figé, abstention honnête, copilote sourcé,
chaîne Relu → Validé → Envoyé appliquée en dur. La disposition A6-R1 est
réellement livrée côté praticien. Trois familles d'écarts sérieux subsistent,
et elles ne sont pas de même nature que celles du 2026-07-18 : **l'isolation
multi-praticien est incomplète sur six routes** (dont une qui lève une
révocation d'accès et déclenche un e-mail), **un score chiffré est affiché au
patient sur les deux surfaces**, et **la documentation d'état a décroché du
code en une journée** — les trois sources de pilotage les plus consultées
décrivent encore comme bloqué ce qui est en production.

## Méthode

Neuf dimensions auditées en parallèle (garde-fous transverses, UX praticien,
portail patient, patient legacy + coexistence, cadrage des campagnes,
cohérence documentaire, gates et sécurité, fraîcheur d'état, accessibilité),
puis **vérification adversariale indépendante de chaque écart** : un second
relecteur, à qui il était demandé de *réfuter*, a relu la preuve et son
contexte. 66 agents, 139 constats, dont 49 écarts confirmés, 7 réfutés
(non publiés comme écarts, listés au §7) et 1 plausible (versé en réserve).

Règle de preuve appliquée : tout écart cite `fichier:ligne`. Un constat sans
preuve localisée est versé en réserve, jamais numéroté. Les faux positifs
prévisibles ont été **classés** et non publiés : la liste de proscription de
`web/src/lib/documents/vocabulaire.ts` (les mots y figurent pour être
interdits), les documents normatifs qui citent le vocabulaire proscrit, le
scoring praticien légitime, les hex de `globals.css` (les tokens sont des hex
par nature).

Deux relectures indépendantes de la dimension UX praticien ont divergé sur la
typographie ; l'arbitrage a été fait à la main (§6, E16) et la divergence est
signalée plutôt que masquée.

## 1. Sources normatives et ordre de préséance

1. `docs/claude/REGISTRE_FRONTIERES.md` (invariants §1, décisions A1–A8) et
   `docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md`.
2. `docs/design-system-d1.md` (tokens, contraste) et les invariants
   d'accessibilité (§1 du registre).
3. `CAMPAGNE.md` de chaque campagne et ses lots.
4. Propositions promues (`propositions/2026-07-18-refonte-ux-5-0/`).
5. `.wn/state.json` (état machine) et `ACTIVE_CAMPAIGN.md` (vue générée).

Cet audit constate que les niveaux 5 et, par endroits, 3 ne sont plus fiables
(E19–E27) : la chaîne d'autorité est rompue à ses deux derniers maillons.

## 2. Sort des écarts E1–E6 de l'audit du 2026-07-18

| # | Objet | Sort au 2026-07-20 | Preuve |
|---|---|---|---|
| **E1** | Fraîcheur main↔branches | **clos**, et re-vérifié : aucune branche ne porte de travail en vol — les 13 branches citées sont intégralement contenues dans `main`. Mue en dette d'hygiène (réserve R8) | `git branch -a`, comparaisons `main..<branche>` |
| **E2** | 7 campagnes UX sans `CAMPAGNE.md` | **partiellement résorbé** : 5 dossiers créés le 2026-07-19 (SP-TT, SP-COP, IDP, SP-SPI, SP-MET) ; SP-CAB et SP-AMB restent sans dossier, ce qui est **conforme** au programme (« à cadrer »). Mais les dossiers créés ne tiennent pas leurs statuts → E19 | `docs/claude/campagnes/2026-07-19-*/CAMPAGNE.md` |
| **E3** | SP-AMB, gate CNIL/RGPD | **persistant et conforme** : gate non instruit, aucune ligne de code d'écoute ambiante | aucun dossier, aucun code |
| **E4** | TRUST, NO-GO activation | **persistant et respecté** : 0 des 7 exigences satisfaite, NO-GO visible ; mais son exigence 3 est fausse dans le sens optimiste → E9 | `CHECKLIST_ACTIVATION_G_TRUST_04.md` |
| **E5** | `design-system-d1.md` en « deep teal + champagne gold » | **résolu** : l'en-tête qualifie désormais cette palette « d'origine D1 », « caduque depuis A5-R1 » | `docs/design-system-d1.md:8-10` |
| **E6** | Dette d'expérience | **majoritairement résorbé** : cockpit borné (`lg:h-[min(80vh,700px)]`), navigation par 7 phases, métriques actives (4/4 avec `href`), palette portail tokenisée, `ReadingComfortControl` monté côté patient. **Restent ouverts** : typographie praticien (E16) et hub empilé (E11) | `FichePatientPanel.tsx:820`, `MetricsSection.tsx:74-81` |

## 3. Ce qui est conforme (vérifié, pas supposé)

Les invariants les plus structurants du paradigme tiennent au niveau du code :

- **Jamais d'envoi automatique.** `web/src/lib/documents/document.ts:59` refuse
  le franchissement de `valide` sans `parActionPraticien: true`, et l'option
  n'a pas de défaut permissif — un appelant qui l'oublie échoue fermé.
  `api/praticien/documents/route.ts:22` n'exporte que `GET`.
  `protocoles/diffusion/route.ts:17` acte en commentaire qu'aucun envoi n'est
  déclenché. L'envoi du booklet exige une synthèse validée et une confirmation
  explicite au renvoi (`booklet/route.ts:119-136`).
- **Vocabulaire réglementaire.** 71 occurrences des racines proscrites, dont
  **0 chaîne prescriptive affichée au patient** : 38 en garde et tests, 22 hors
  surface patient, 11 patient-facing qui sont toutes des *dénégations*
  (`portail/layout.tsx:22` « ne constitue pas un diagnostic médical »).
- **A8-3.** `versionScore` est figé à la confirmation par un upsert
  `update: {}` ; la garde « non comparable » entre deux versions est réellement
  déclenchable (l'objet du gate G2, fermé ce matin).
- **Gates G1/G3/G4, mécaniquement solides.** G1 et G3 sont append-only avec
  horodatage posé par la base (`relecture-notes/route.ts:202-207` : `creeLe`
  n'est pas transmis, un `?asOf=` en écriture est refusé en 400). G4 ne stocke
  qu'une empreinte HMAC (`lienMagique.ts:83-87`), expire à 24 h, consomme
  atomiquement (`updateMany` filtré sur `consommeLe: null`), trace le rejeu en
  base et rabat tous les refus sur un écran indistinguable.
- **Drapeaux fail-closed** : les trois (`WN_G4_LIEN_MAGIQUE`, `WN_C5_ENABLED`,
  corpus clinique) n'activent que sur égalité stricte.
- **Auth praticien** : domaine `wellneuro.fr` et scope `openid email profile`
  toujours effectifs (`auth.ts:5,17,23-30`).
- **Disposition A6-R1 praticien** : cockpit borné à l'écran, 7 phases en rail
  vertical, zone focale unique, instruments en tiroir Radix **au clic**
  (aucun `onMouseEnter` déclencheur), canvas A5-R2 exact
  (`#d3d8e6`/`#ffffff` praticien, `#eae0cc`/`#fffdf9` patient), rail nuit
  structurel à 4 groupes.
- **Contraste** : les 48 paires de tokens recalculées passent AA dans les deux
  thèmes ; la règle de relief solaire est tenue par l'encre dédiée
  `--solar-ink` (5,86:1 contre 2,16:1 pour le solaire plein).
- **Anomalie `_prisma_migrations`** : constat annulé et documenté — le dossier
  de migration existe, la base ne ment pas.

## 4. Écarts — sécurité et gates

| # | Écart | Sév. | Preuve |
|---|---|---|---|
| **E7** | **Isolation multi-praticien incomplète : 6 routes sur 33 non gardées.** Trois prouvées : `GET /api/praticien/besoins` renvoie identité + couvertures de besoins pour tout `?idPatient=` ; `GET /api/praticien/consultations` liste sans filtre praticien ; `GET /api/praticien/patients` renvoie **tous** les patients de la base avec e-mail et téléphone, et ses `PATCH`/`DELETE` mutent sans scope. La garde existe pourtant, factorisée et appliquée ailleurs (24 routes l'importent) | **forte** | `besoins/route.ts:35-56` (`findUnique` après un simple `if (!session)`) ; `patients/route.ts:118-119,136-138,341` ; garde : `lib/praticien/appartenance.ts:27` |
| **E8** | **`POST /api/praticien/consultations` lève une révocation d'accès et envoie un e-mail, sans garde.** Pour un `idPatient` arbitraire, la route crée un `accessToken` s'il manque, remet `accessTokenRevoked: false` — **annulant une décision de sécurité prise auparavant** — puis envoie le lien du portail au patient. C'est le seul cas où l'absence de garde produit un effet vers l'extérieur | **forte** | `consultations/route.ts:100-113` (`accessTokenRevoked: false`) et `:130` (`sendPortailLinkEmail`) |
| **E9** | **La checklist G-TRUST-04 est fausse dans le sens optimiste** sur son exigence 3 : elle annonce « 13 routes sur 31 » et **classe `consultations` et `patients` parmi les routes gardées**, alors qu'elles ne le sont pas, et range `besoins` en « sans objet » alors qu'elle lit un dossier patient. Dénominateur réel : 33 | moyenne | `CHECKLIST_ACTIVATION_G_TRUST_04.md` exigence 3 vs les routes citées en E7 |

## 5. Écarts — paradigme patient

| # | Écart | Sév. | Preuve |
|---|---|---|---|
| **E10** | **Un score chiffré est affiché au patient**, en jauge radiale recharts avec la valeur en 24 px gras, sur **les deux** surfaces patient. A6-R1 dit « la Spirale montrée comme construction, jamais un tableau de bord ni un score » ; les garde-fous 5.0 disent « pas de score de risque chiffré ». *Circonstance datée* : le composant est du 2026-07-07, **antérieur au paradigme 5.0** — c'est une survivance non reprise, pas une régression introduite par une campagne 5.0 | **forte** | `components/ui/ScoreGauge.tsx:41` (`{value}` en `text-2xl`) ; monté par `MonEquilibreAccueil.tsx:102`, lui-même monté sur `portail/[token]/questionnaires/[idAssignation]/page.tsx:122` **et** `patient/[idAssignation]/page.tsx:289` |
| **E11** | **Hub empilé sur les deux surfaces patient**, contre A6-R1 « une étape à la fois (séquentiel, pas de hub empilé) ». Portail : la page d'atterrissage empile ~9 blocs autonomes. Legacy : `QuestionnairesEnAttentePanel` est concaténé **sous cinq étapes** du parcours au lieu d'être un accès secondaire. Atténuations réelles côté portail (une seule action mise en avant, sections repliées sous `<details>`). Le registre rattache lui-même la résorption aux Vagues 2+ (SP-SPI) : **dette planifiée, pas régression** | moyenne | `portail/[token]/questionnaires/page.tsx:202-343` ; `patient/[idAssignation]/page.tsx:213,266,281,317,338` |
| **E12** | **Vocabulaire interne et chiffre de charge exposés au patient** dans la spirale alimentaire : « Jalon {milestone} · charge perçue {n} · budget global {n} » — un entier brut sans échelle ni légende — et un sous-titre « Version locale de travail JA5-02 », identifiant de lot | moyenne | `components/food-observation/PatientFoodObservationPanel.tsx:343` et `:325`, monté par `portail/[token]/alimentation/page.tsx:19` |

## 6. Écarts — accessibilité et UX

| # | Écart | Sév. | Preuve |
|---|---|---|---|
| **E13** | **« Mes 12 besoins » : la seule interaction *hover-only* du dépôt, et elle est côté patient.** La correspondance point↔besoin n'existe qu'au survol souris, sur un `<li>` non focusable, avec l'instruction « Survolez un besoin » affichée à l'écran — inaccessible au clavier et au tactile. Aggravant : la couverture d'un besoin n'est encodée que par **l'opacité de la couleur**, sans équivalent textuel nulle part dans l'écran. Deux invariants §1 touchés (fonction critique au seul survol ; état clinique par la seule couleur) | **forte** | `patient/MonEquilibreDetail.tsx:73,95-96` ; `ui/CerclesConcentriques.tsx:35-38,91` |
| **E14** | **Cibles tactiles sous 44 px.** Le bouton commun du portail patient fait ~40 px (`py-2.5`/`text-sm`) et 36 px en variante neutre, sans `min-h`, sur 116 usages ; le lien « Ouvrir » du hub legacy ~28 px ; le déclencheur de `ReadingComfortControl` ~28 px — l'affordance d'accessibilité elle-même. Le front praticien, lui, applique `min-h-11` partout | moyenne | `patient/ui/PatientButton.tsx:5-10` ; `patient/[idAssignation]/page.tsx:175` ; `ReadingComfortControl.tsx:93` |
| **E15** | **La garde de vocabulaire prescriptif n'est appelée par aucun code de production.** `assertRenduMedecinNonPrescriptif` n'a qu'un appelant hors de son module : un test. Sa docstring dit pourtant « à appeler sur les contenus médecin avant diffusion (garde en code) ». La conformité repose aujourd'hui sur le prompt et la relecture humaine — pas sur la garde | moyenne | `lib/documents/vocabulaire.ts:24,26` ; unique appelant `lib/documents/rendu.test.ts:50` |
| **E16** | **Typographie praticien en deçà d'A6-R1** (« corps 16px, display ≥ 28px »). Aucune règle ne rabaisse la base — mais les surfaces praticien comptent **147 `text-sm` et 60 `text-xs` contre 2 `text-base`** : le corps effectif est à 14 px. Le display plafonne à 24 px partout sauf l'accueil (30 px). *Note de méthode* : deux relectures indépendantes ont divergé ici (l'une lisant la base, l'autre l'usage) ; l'arbitrage retenu est l'usage effectif | moyenne | comptage sur `FichePatientPanel.tsx`, `patient-cockpit/`, `app/dashboard/` ; `FichePatientPanel.tsx:721` (`text-2xl`) |
| **E17** | **`ReadingComfortControl` absent du front praticien.** Deux sources normatives divergent et l'audit ne les arbitre pas : le registre écrit « monté sur les deux fronts », la proposition source écrit « monté *aussi* sur `/patient` », et le code assume explicitement la restriction | faible | `globals.css:191-195` (« Portée volontairement restreinte au portail ») vs `REGISTRE_FRONTIERES.md:218-220` |
| **E18** | **Couleurs Tailwind brutes hors tokens** dans des surfaces praticien (`bg-orange-50`/`text-orange-800`, `bg-slate-900`), court-circuitant les tokens `--color-status-*` disponibles : elles ne suivront ni un ajustement du canvas ni une révision de la matrice de contraste | faible | `FichePatientPanel.tsx:631,633,773,788,960` ; `patient-cockpit/DocumentComposer.tsx:123,140` |

## 7. Écarts — campagnes et gouvernance

| # | Écart | Sév. | Preuve |
|---|---|---|---|
| **E19** | **Trois campagnes se déclarent « cadrée / à_faire » alors que leur code est livré et, pour deux, migré en production.** SP-TT (LOT-01 par #158, LOT-02/G3 par #163), IDP (LOT-01/G4 par #172), SP-MET (domaine, panneau et tests présents) | **forte** | `2026-07-19-sp-tt-.../CAMPAGNE.md:4,7,64-65` ; `...-idp-.../CAMPAGNE.md:4,7,70` ; `...-sp-met-.../CAMPAGNE.md:4,7,65` vs migrations `20260720120000_*`, `20260720200000_*` |
| **E20** | **C5 : quatre sources divergentes** sur l'avancement — dossier « terminée 8/8, activation demandée » contre README, PROGRAMME et REGISTRE qui décrivent tous trois un état antérieur (2/8, gates non levés, campagne inactive) | **forte** | `2026-07-11-boussole-.../CAMPAGNE.md:4,50-57` vs `campagnes/README.md:22` et `PROGRAMME_WELLNEURO_5_0.md:78-84` |
| **E21** | **C3 : contradiction interne au même fichier** — frontmatter « terminée, LOT-00 à LOT-05 en prod », tableau de lots resté à « à_faire » sur les cinq lignes | moyenne | `2026-07-11-fiches-conseils-.../CAMPAGNE.md:4,7` vs `:90-94` |
| **E22** | **SP-COP : livrée au dossier et à l'état machine, « cadrée » au README et au registre.** Le PROGRAMME, lui, ne porte aucun statut pour cette ligne | moyenne | `...-sp-cop-.../CAMPAGNE.md:4,65-66` + `.wn/state.json` vs `campagnes/README.md:25` |
| **E23** | **SP-MET : dépendance divergente** — le PROGRAMME conditionne la campagne à « C2A + JA », la campagne se déclare livrable sur « C2A seul » et a de fait livré sans JA (encore « en cours »). **Cité sans arbitrage** : c'est une décision de programme | moyenne | `PROGRAMME_WELLNEURO_5_0.md:62` vs `...-sp-met-.../CAMPAGNE.md:57-59` |
| **E24** | **`AUDIT_REGLES_CAMPAGNES.md` est un instantané du 2026-07-16** (14 campagnes) qui ne couvre aucun des cinq dossiers du 2026-07-19 : le contrôle mécanique ne peut structurellement pas détecter E19–E22 | moyenne | `AUDIT_REGLES_CAMPAGNES.md:3-4,26-39` |
| **E25** | **Coexistence des deux surfaces patient : normative actée, trajectoire absente.** D-002 établit `/portail/[token]` comme flux principal et le legacy comme compatibilité non augmentée — la question « laquelle est normative » n'est donc pas ouverte. Ce qui manque : quatre documents désignent le décommissionnement comme souhaitable **en l'excluant chacun de son périmètre**, et le programme 5.0 ne le mentionne pas | moyenne | `docs/DECISIONS.md:16-22` ; absence dans `PROGRAMME_WELLNEURO_5_0.md` |

## 8. Écarts — fraîcheur et cohérence documentaire

| # | Écart | Sév. | Preuve |
|---|---|---|---|
| **E26** | **`.wn/state.json`, « unique autorité machine », est périmé de ~5 h sur les faits** : `updated_at` 13:40 UTC contre migrations appliquées à 17:34 / 17:47 / 18:39 UTC. Il déclare les trois gates **bloqués**, et prescrit comme condition de déblocage `WN_ALLOW_PROTECTED_WRITE=1` — **une variable que `CLAUDE.md` déclare supprimée**. Son compte d'isolation (25/31) est doublement faux | **forte** | `.wn/state.json:28,30,33,37` vs `CLAUDE.md:85` et les trois migrations |
| **E27** | **`GATES_VAGUE2_G1_G3_G4.md` déclare encore G4 « non appliqué »** et sa liste « migrations vérifiées en base » n'en cite que deux. Chronologie : #172 mergé à 20:38:55, le correctif du dossier #171 mergé **40 secondes plus tard** sans intégrer G4 | **forte** | `GATES_VAGUE2_G1_G3_G4.md:17,19-21,372` vs `20260720200000_g4_portail_magic_links_v1` |
| **E28** | **`PROJET_CONTEXTE.md`, qui « gagne sur l'état courant », arrête l'inventaire du schéma à 6 modèles sur 39** — il ignore C2A/C2B, les tables Trust, le référentiel Ciqual et les trois tables des gates du jour | moyenne | `PROJET_CONTEXTE.md:36` vs `grep -c '^model ' web/prisma/schema.prisma` |
| **E29** | **`PROPOSITION_REFONTE_UX_5_0.md` §10 affirme encore « actés en documentation mais pas appliqués au code »** alors que la Vague 1 est livrée. Aggravant : le document **a été retouché après coup** (rectification datée au §9) — le §10 est resté | moyenne | `PROPOSITION_REFONTE_UX_5_0.md:116` vs `CHANGELOG.md:463,472` |
| **E30** | **Collision du sigle « R8 »** : authentification patient (roadmap produit, référencée par le PROGRAMME pour IDP) et filet CI/Vitest/Playwright (roadmap technique, « ✅ Livré 2026-07-11 »). Un lecteur croisant les deux conclut que la fondation IDP est livrée depuis le 11 | moyenne | `ROADMAP_PRODUIT.md:161` ; `ROADMAP_TECHNIQUE.md:55` ; `PROGRAMME_WELLNEURO_5_0.md:59` |
| **E31** | **Le miroir `wellneuro_wn_campaigns/` se déclare « copie synchronisée » et est figé au 2026-07-16** : 14 dossiers contre 19, les 5 campagnes du 2026-07-19 absentes, un PROGRAMME antérieur au recadrage (JA « inchangée », SP-* « à cadrer »). 257 fichiers git-tracés. Il désigne lui-même l'autorité ailleurs | moyenne | `wellneuro_wn_campaigns/.../README.md:3,8,14` ; dernier commit `f00a6b3` |
| **E32** | `ACTIVE_CAMPAIGN.md` a deux jours de retard et ignore toute la Vague 2. Il délègue l'autorité à `.wn/state.json`, lui-même périmé (E26) : **les deux maillons de la chaîne sont en retard simultanément** | faible | `ACTIVE_CAMPAIGN.md:5-10,12` |
| **E33** | **Contradiction interne au registre** : le titre d'A7 annonce « deux régimes », le corps et la fiche de possession en décrivent **trois**, comme le PROGRAMME | faible | `REGISTRE_FRONTIERES.md:227` vs `:230,518` |
| **E34** | **Nombre de tests E2E** : 34 dans trois documents humains, 45 dans `.wn/state.json`, pour la même commande | faible | `CLAUDE.md:143`, `ROLES_MACHINES.md:99`, `web/e2e/README.md:100` vs `.wn/state.json:22` |
| **E35** | Le legacy est décrit « gelé, styles non tokenisés » alors qu'il a reçu les apports de la Vague 1 par partage de composants — à lire soit comme amélioration incidente, soit comme tension avec D-002 (« non augmenté ») | faible | `2026-07-15-trust-.../AUDIT_ETAT_REEL_TRUST.md:11-13` vs le code |

## 9. Constats réfutés en vérification (non publiés comme écarts)

La relecture adversariale a écarté sept constats. Ils sont listés pour que
personne ne les redécouvre comme neufs :

- **SP-TT LOT-02 et IDP LOT-02 sans fichier de lot** — réfutés : la doctrine de
  compilation N+1 (A3) autorise l'absence de fichier pour un lot non compilé ;
  IDP LOT-02 est explicitement « option, différable ».
- **`PatientJourneyProgress` absent du legacy** — réfuté : A6-R1 ne le nomme
  pas ; écart d'expérience entre surfaces, pas violation d'invariant.
- **Couche TRUST absente du legacy** — réfuté : la campagne TRUST V1 exclut
  explicitement et par écrit la surface legacy de son périmètre.
- **`FoodObservationJourney` monté nulle part** — réfuté sur la qualification.
- **Canal de redemande de lien inatteignable** — réfuté : chemin existant.
- **Branches mortes** — réfuté comme écart, versé en réserve d'hygiène.

## 10. Réserves et limites

Constats non tranchables statiquement, ou dont la qualification appartient au
propriétaire du registre :

- **R1** — `POST /api/patient/submit` renvoie au navigateur patient l'objet
  `scores` complet (total et libellé d'interprétation), sans l'afficher.
  Donnée transmise mais non rendue : à arbitrer (`submit/route.ts:165`).
- **R2** — Barre « X % complété » dans `GenericQuestionnaire` et compteurs
  « X/Y transmis » : dénombrements factuels sans cible ni récompense — relèvent
  ou non de la gamification proscrite selon la lecture retenue.
- **R3** — Le pré-vol du copilote date et source chaque fait mais **ne porte
  pas de `versionScore`**, là où l'invariant demande « instrument, date,
  version » (`lib/copilote/prevol.ts:28-34`).
- **R4** — Le jeton permanent `patients.access_token` reste **en clair** en
  base ; coexistence conforme à la décision actée, mais G4 n'est pas encore le
  seul chemin d'accès.
- **R5** — L'état réel de `WN_G4_LIEN_MAGIQUE` et `WN_C5_ENABLED` en production
  n'est pas observable depuis le dépôt.
- **R6** — Double source roadmap : seul constat resté **PLAUSIBLE** après
  vérification — le lot D1-0 demandait « clarifier la relation (fusion ou
  dépréciation) » et la clarification existe ; l'absence de dépréciation
  formelle relève du jugement.
- **R7** — `auth.ts:24-30` ne vérifie ni `email_verified` ni le champ `hd` du
  compte Google : le domaine est dérivé du texte de l'e-mail.
- **R8** — 27 références de branches, **zéro travail en vol** : dette
  d'hygiène, pas de risque de contenu.
- **R9** — Menthe `--viz-corps` à 2,63:1 sur canvas ardoise ; icônes Lucide
  sans `aria-hidden` explicite ; `prefers-reduced-motion` non relayé.

**Limites de méthode.** Cet audit est statique. Il ne prouve pas : les hauteurs
effectives après cascade, le contraste réel sur fonds composés, la navigation
clavier réelle (ordre de tabulation, pièges de focus Radix), la restitution par
lecteur d'écran, ni l'état des variables d'environnement en production. Aucune
suite de tests n'a été exécutée : le vert cité est celui de `.wn/state.json`
au 2026-07-20 11:00 UTC — lui-même antérieur aux livraisons du soir.

## 11. Verdicts

| Axe | Verdict |
|---|---|
| **Invariants cliniques** (envoi, versions, abstention, vocabulaire) | **GO** — aucun violé |
| **Disposition A6-R1 praticien** | **GO**, sauf typographie (E16) |
| **Mécanique des gates G1/G3/G4** | **GO** — append-only, haché, fail-closed |
| **Sécurité / isolation multi-praticien** | **NO-GO** — E7, E8 ; et la checklist qui devait le mesurer se trompe en sa faveur (E9) |
| **Paradigme patient** | **NO-GO** — un score chiffré est affiché (E10) |
| **Accessibilité** | **NO-GO** — E13 (hover-only côté patient), E14 |
| **Gouvernance et documentation d'état** | **NO-GO** — E19–E32 ; la chaîne d'autorité est rompue à ses deux derniers maillons |

## 12. Recommandations (non contraignantes, hors périmètre de correction)

Par ordre de gravité, pas de coût :

1. **E8 puis E7** — fermer `consultations` (POST lève une révocation et envoie
   un e-mail), puis `patients` et `besoins`. La garde existe et est appliquée
   sur 24 routes : le correctif est mécanique. **E9 dans le même mouvement** —
   une checklist de sécurité fausse dans le sens optimiste est pire que pas de
   checklist.
2. **E10** — arbitrer le score patient. Le composant est antérieur à la 5.0 :
   soit il est hors paradigme et se retire, soit le registre acte l'exception.
   Aujourd'hui les deux surfaces l'affichent sans que personne ne l'ait décidé.
3. **E13** — donner un équivalent clavier/tactile à « Mes 12 besoins » et
   doubler l'opacité d'un libellé. C'est la seule interaction hover-only du
   dépôt et elle est côté patient.
4. **E26, E27** — réaligner `.wn/state.json` et le dossier des gates. Ces deux
   fichiers pilotent les reprises de session : tant qu'ils décrivent G1/G3/G4
   comme bloqués, une session repartira sur un travail déjà fait — ce qui
   s'est déjà produit ce matin.
5. **E19–E24** — tenue des statuts de campagne, et rafraîchir
   `AUDIT_REGLES_CAMPAGNES.md` pour que le contrôle mécanique couvre les cinq
   dossiers du 2026-07-19.
6. **E16, E11** — rattacher à la Vague 2 (SP-SPI pour le hub, polissage
   praticien pour la typo), sans les improviser.
7. **E28–E35** — passe de cohérence documentaire : miroir (le supprimer ou le
   régénérer, mais ne pas le laisser se déclarer synchronisé), sigle R8,
   titre A7, compte des E2E.

*Fin de l'audit. Aucun fichier applicatif, schéma, flag ni état machine
modifié — le présent rapport est le seul fichier ajouté.*
