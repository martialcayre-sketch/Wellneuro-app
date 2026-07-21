# Changelog

Toutes les évolutions notables du MVP Wellneuro NNPP2 doivent être documentées ici.

## Non publié

### R6 — les deux roadmaps, et le préfixe `R` qui en désigne trois (2026-07-21)

Réserve R6 de l'audit 5.0 : le lot D1-0 demandait de « clarifier la relation
(fusion ou dépréciation) » entre `ROADMAP_TECHNIQUE.md` et `ROADMAP_PRODUIT.md` ;
la clarification existait, mais **implicite et non réciproque** — chaque fichier
disait ce qu'il était, aucun ne nommait l'autre. Un lecteur ne pouvait donc pas
savoir qu'ils ne se recouvrent pas.

**Arbitrage : aucun des deux n'est déprécié.** Les périmètres sont disjoints —
consolidation technique (lots R0→R10, dette, build, tests) d'un côté, priorités
produit (séries D/R/E) de l'autre — et ni l'un ni l'autre ne fait foi sur l'état
courant, qui reste `PROJET_CONTEXTE.md`. La frontière est désormais écrite **en
tête des deux fichiers, chacun nommant l'autre**.

**Le vrai risque était ailleurs.** En vérifiant, le préfixe `R` s'est révélé
désigner **trois séries numérotées indépendamment** :

| Écriture | Sens | Exemple |
|---|---|---|
| `R<n>` technique | lot de consolidation | **R6** = stabilisation build/tests |
| `R<n>` produit | module fonctionnel | **R6** = workflow RDV complet |
| `R<n>` audit | réserve de l'audit 5.0 | **R6** = double source roadmap |

Trois « R6 » sans aucun rapport — et « R3 » désigne aussi bien le registre
relationnel que les fiches conseils. La règle est donc de **toujours qualifier la
série** (« R6 technique », « R6 produit », « R6 de l'audit 5.0 ») ; un `R6` nu
est ambigu et doit être corrigé, pas deviné. Rappelée dans `CLAUDE.md`, qui est
le fichier lu à chaque session.

Documentation seule — aucun code, aucun fichier supprimé ni fusionné.

### Le chemin retour du pack de réévaluation — migration seule (SP-SPI, 2026-07-21)

Migration **seule**, sans écran : SP-SPI LOT-01 exigeait un pack « proposé et
refusable » et s'interdisait dans le même document toute écriture. Les deux ne
tiennent pas ensemble — un refus qu'on ne persiste pas revient à chaque visite,
et une proposition qui revient **est** une relance, ce que la campagne
s'interdit. Arbitré le 2026-07-21 : le refus est persisté, et sa migration passe
avant l'écran, dans sa propre PR.

- **`pack_propositions`** — append-only chaînée (`supersedes_proposition_id`),
  comme `trust_choice_events` et `fil_card_rejections` : répondre crée une
  seconde ligne qui supplante la première, laquelle reste lisible. Donc **aucune
  contrainte d'unicité** sur `(id_patient, id_pack)` — elle rendrait la réponse
  impossible.
- **`id_pack` n'est pas une clé étrangère** vers `packs` : la ligne consigne ce
  qui a été proposé au moment où ça l'a été, et doit survivre à la désactivation
  du pack. Même principe que `version_score` figée à la mesure ; une clé
  étrangère ferait dépendre une trace passée d'un référentiel présent.
- **`acteur_role` n'est jamais déduit de `statut`** : qui écrit et ce qui est
  écrit restent deux choses.
- **RLS deny-all** activée, cohérente avec `trust_v1` et les tables C2A.
- **L'effacement suit** (`lib/patient/effacement.ts`) : la clé étrangère est en
  `RESTRICT`, une table fille oubliée aurait fait échouer le droit à
  l'effacement sur tout dossier ayant reçu une proposition. La garde structurelle
  du dépôt — celle qui dérive la liste des tables du schéma plutôt que d'une
  mémoire — le nomme quand on l'omet ; vérifié en la falsifiant.

Additive uniquement : une table nouvelle, aucun backfill, aucune table existante
modifiée. Rollback = abandon de la table. **Aucun écran, aucune route** : rien ne
lit ni n'écrit encore cette table.

### Trois réserves de l'audit 5.0 fermées — R1, R3, E17 (2026-07-21)

Les trois constats de l'audit qui ne demandaient aucun arbitrage produit, traités
ensemble parce qu'ils n'ont en commun que d'être mécaniques.

- **R1 — le score ne descend plus au navigateur patient.**
  `POST /api/patient/submit` renvoyait l'objet `scores` complet, total et
  libellé d'interprétation compris. Aucun client ne le lisait :
  `GenericQuestionnaire` et `PlaintesForm` ne consultent que `data.ok`. Une
  donnée transmise mais non affichée reste une donnée transmise — elle est dans
  la réponse HTTP, lisible dans l'onglet réseau. Le calcul et la persistance ne
  bougent pas : c'est la seule réponse qui maigrit. Une garde
  (`api/patient/submit/route.test.ts`) échoue si un score y réapparaît, quel que
  soit le nom de la clé.
- **R3 — le pré-vol du copilote porte sa version.** L'invariant demande
  « instrument, date, version » ; `FaitPreVol` s'arrêtait aux deux premiers. Le
  champ `version` existe désormais sur chaque fait, alimenté par
  `assessment_episodes.version_score` (figée à la mesure, A8-3) pour les épisodes
  confirmés, et **`null` partout ailleurs** : aucune source ne fige de version
  pour une réponse de questionnaire ou un point d'étape, et rien ne se
  reconstitue après coup. L'écran n'affiche la mention que si elle existe —
  l'absence de version se lit comme une absence, jamais comme « v1 ».
- **E17 — deux textes faux dans deux sens opposés.** Le registre écrivait
  `ReadingComfortControl` « monté sur les deux fronts » (compris : praticien +
  patient) ; le commentaire de `globals.css` le disait « restreint au portail »
  alors que le legacy `/patient` le monte aussi. Le code, lui, n'a jamais varié :
  les **deux surfaces patient**, jamais le praticien. Les deux textes s'alignent
  sur ce que fait le code ; rien n'est monté ni démonté.

Aucune migration, aucun changement de schéma, aucun texte visible modifié côté
patient.

### E20 — C5 réalignée sur ce qui a été livré (2026-07-21)

Quatre sources décrivaient l'avancement de C5, trois se contredisaient avec la
quatrième. Vérification faite, le dossier de campagne était le seul à dire vrai :
les **huit lots** sont mergés sur `main` depuis le 2026-07-18 (PR #95,
#117→#121, #126, #129, #132, #136, #137), la migration
`20260718100010_c5_ciqual_reference_v1` est appliquée en production en une
tentative, `ciqual_nutrient_values` porte 55 744 lignes, et `WN_C5_ENABLED` est
**actif** — mesuré, pas déduit : la route praticien vérifie le drapeau avant
l'authentification, et la production répond 401 là où un drapeau éteint rendrait
404.

`campagnes/README.md`, `PROGRAMME_WELLNEURO_5_0.md` et `REGISTRE_FRONTIERES.md`
décrivaient tous trois l'état du **cadrage du 2026-07-18 au matin** et n'avaient
jamais été relus après les livraisons du même jour. Ce n'était pas un désaccord
sur les faits : un retard d'écriture à trois endroits, porté trois jours par des
documents qui pilotent les reprises de session. Les trois sont réalignés, chacun
portant sa rectification datée.

Documentation seule — aucun code, aucun schéma, aucun drapeau modifié.

### Révoquer un accès ferme tout, et le dit (IDP2, LOT-02c, 2026-07-21)

Deux écarts entre ce que le code faisait et ce qu'il disait.

- **Les liens à usage unique en vol survivaient à une révocation.** Émis avant
  elle, ils n'étaient gardés que par `accessTokenRevoked` : réémettre l'accès les
  rendait exploitables, jusqu'à 24 h après. `DELETE /api/praticien/token` les date
  désormais, **dans la même transaction** que la révocation — fermer le jeton sans
  fermer les liens laissait exactement ce trou. Aucune migration : `etatLien`
  refuse déjà sur cette date, et le patient lit le message unique.
- **« Révoquer l'accès » partait sur un clic**, sans question, alors qu'elle coupe
  désormais une session en cours. Le panneau énonçait pourtant la règle qu'il
  violait — « toute action qui change ce à quoi le patient a accès passe par un
  dialogue ». Confirmation simple, sans saisie (l'action est réversible), qui
  énonce les trois effets et précise que **rouvrir l'accès ne rend pas les
  sessions coupées**. L'échec s'affiche dans le dialogue, pas derrière l'overlay.

### Couleurs de statut — E18 clos sur tout le front praticien (2026-07-21)

Le lot « Patient & accessibilité » du jour a corrigé E18 **sur les lignes citées
par l'audit** (`FichePatientPanel`, `DocumentComposer`, `DocumentsPanel`). Le
défaut, lui, était une classe entière : 81 classes Tailwind brutes subsistaient
dans 13 fichiers praticien, et le LOT-01b (#194) en a réintroduit deux dans des
composants neufs, le lendemain de la correction. D'où une passe complète plus
une garde, plutôt qu'une seconde liste de lignes.

- **Retokenisation des 13 fichiers.** Messages de retour
  (`text-green-600`/`text-red-400` → `text-status-success`/`text-status-danger`),
  encarts d'alerte (`bg-orange-50`/`text-orange-800` →
  `bg-status-warning/10`/`text-status-warning`), badges de statut et de priorité
  de `SynthesePanel`, boutons de validation et d'envoi
  (`bg-green-600`/`bg-emerald-700` → `bg-status-success`), variante `danger` du
  `Button` partagé, item destructeur de `MenuActions`, encart d'erreur de
  `DossierConfirmDialog`, encadré Boussole de `ProtocolMiniBuilder`
  (`slate-*` → `border`/`muted`/`foreground`).
- **Le contraste y gagne, ce n'est pas qu'une question de cohérence** : les
  messages d'erreur passent de `text-red-400` (2,8:1 sur blanc, sous le seuil
  AA) à `text-status-danger` (6,5:1) ; les boutons pleins de validation, de
  `bg-green-600` + texte blanc (3,3:1) à `bg-status-success` (5,0:1).
- **`--color-status-info` gagne son jumeau RGB**, comme les trois autres
  statuts, seule façon d'obtenir le fond teinté à 10 % du badge « Corrigée »
  plutôt qu'un aplat plein.
- **Garde en test** (`lib/tokens-couleur.guard.test.ts`) : toute échelle
  Tailwind brute réintroduite dans `web/src` fait échouer T1, en nommant le
  fichier et les classes. Les échelles redéfinies dans `tailwind.config.ts`
  (palette de marque : `teal-*`, `gold-*`, `night-*`, `indigo-600`…) restent
  autorisées — elles pointent déjà sur une variable CSS.

Aucune migration, aucun changement de schéma, aucun texte visible modifié.

### La session patient devient une session de compte (IDP2, LOT-02b, 2026-07-21)

Le cookie du portail scellait l'empreinte du **jeton permanent** : la session
n'appartenait pas au patient, elle appartenait au secret qui l'avait ouverte.
Réémettre un lien d'accès déconnectait, et la révocation n'existait que par
`patients.access_token` — colonne que le LOT-04 doit retirer.

- **Migration additive** `sessions_invalides_avant` sur `patients` (nullable).
  Une session porte sa date d'émission ; elle est refusée si cette colonne lui
  est postérieure. Coupe-circuit propre au compte, qui survivra au retrait du
  jeton permanent. Le backfill **transporte l'état de révocation existant, il
  n'en crée aucun** : `access_token_created_at` reproduit à l'identique la
  coupure qu'opérait la rotation du jeton, et les dossiers déjà révoqués le
  restent quand la colonne `access_token` disparaîtra.
- **`isPatientSessionBoundToToken` → `isSessionValideForPatient`.** La session
  est validée contre le compte (identité, e-mail, activité, date de
  révocation), plus contre un jeton. Réémettre un accès ne déconnecte donc
  plus ; révoquer coupe toujours.
- **Les cookies déjà émis restent valides.** La vérification accepte les deux
  formats de charge : l'ancienne, sans date d'émission, voit la sienne
  reconstruite depuis son expiration (la durée de vie est fixe). Aucun des
  accès portail ouverts n'est rompu par le déploiement.
- **« Révoquer l'accès » écrit désormais deux champs** : `accessTokenRevoked`
  pour le chemin par jeton, `sessionsInvalidesAvant` pour les sessions déjà
  ouvertes. Une réémission d'accès ne défait que le premier — une révocation ne
  se défait plus par effet de bord.

Vérifié : T3 complet (981 tests unitaires, 55 E2E, `migrate deploy` sur base
éphémère, aucune dérive schéma ↔ migrations), `next lint` sans erreur, revue
indépendante — dont les deux conditions de merge (le backfill ci-dessus) sont
levées.

### Cycle de vie du dossier — la surface (IDP2, LOT-01b, 2026-07-21)

Le socle livré par le LOT-01a (#189) était complet et **inatteignable** : aucun
appel à `/api/praticien/patients/cycle-de-vie` n'existait dans l'interface. Le
praticien ne pouvait donc ni clôturer un suivi, ni exécuter l'effacement que
l'application promet au patient en production.

- **Menu « Gérer le dossier » par ligne du tableau patients**, remplaçant les
  cinq boutons d'accès de la carte du haut. Deux groupes séparés visuellement :
  accès au portail, et fin de parcours. Composant maison
  (`components/ui/MenuActions.tsx`) plutôt que `@radix-ui/react-dropdown-menu` :
  les menus Radix se testent mal en jsdom, or ce menu ouvre la seule action
  irréversible de l'application. Clavier complet, `role="menu"`, `Échap` rendant
  le focus au déclencheur, cibles ≥ 44×44 px.
- **Confirmations asymétriques** (`components/ui/DossierConfirmDialog.tsx`).
  Clôture : simple, énonçant ce qui s'arrête et ce qui reste. Effacement : elle
  **nomme le patient**, liste ce qui est détruit **et** ce qui subsiste, dit que
  l'e-mail ne subsiste pas même sous forme d'empreinte, et exige la saisie du
  mot `EFFACER` — la valeur exacte que la route exige déjà côté serveur, pour
  que l'écran reflète le contrat au lieu d'en créer un second.
- **Le bouton « Supprimer » disparaît de l'écran.** Il appelait `DELETE` et
  écrivait `actif: false` : le mot désignait une désactivation. L'action rejoint
  le menu sous son vrai nom, « Désactiver le dossier », réversible dans le même
  menu. La route `DELETE` est **supprimée** : sans appelant, et surtout portant
  un verbe destructif sur une opération qui ne détruit rien, désormais voisine
  d'un effacement qui détruit vraiment. Désactiver passe par
  `PATCH { actif: 'NON' }`, effacer par `POST …/cycle-de-vie`.
- **Statut à trois états, jamais par la seule couleur** : `Actif`,
  `Suivi clôturé`, `Inactif`, dérivés de `phaseDossier` déjà testé.
- **Les actions d'accès restent ouvertes sur un dossier clos**, délibérément :
  la clôture interdit les assignations et les envois de suivi, pas la lecture.
  Le libellé du refus le dit maintenant — il promettait « aucun document
  envoyé », ce qui contredisait la lecture des archives que la clôture garantit
  par ailleurs : un patient ayant perdu son e-mail n'aurait plus eu de porte.
  `MESSAGE_DOSSIER_CLOS` borne son refus aux « documents de suivi » et ne promet
  rien sur l'accès : partagé par quatre routes, il sort aussi sur un dossier clos
  **puis** désactivé, où le portail refuse déjà l'entrée. La nuance est portée là
  où l'état est connu — le dialogue de clôture et le message de confirmation
  branchent tous deux sur `actif` et annoncent le lien renvoyable, ou son
  absence. Comportement inchangé, promesse tenable.
- **Le DTO patient expose `suiviClotureLe`** — sans quoi l'écran ne pouvait pas
  distinguer un dossier clos d'un dossier désactivé.
- **Correction** : `PATCH /api/praticien/patients` validait l'identifiant par
  `/^PAT\d+$/` et rejetait donc `PAT_SEED_03` — « Modifier » était inopérant sur
  le dossier de seed. Forme alignée sur `DELETE` et `cycle-de-vie` ;
  l'appartenance au praticien reste vérifiée, inchangée.

Corrigé après revue indépendante, avant toute mise en production :

- **Le menu était rogné** par le `overflow-x-auto` du tableau et le
  `overflow-hidden` de la carte : sur les dernières lignes, « Clôturer le
  suivi » et « Effacer définitivement » passaient sous le bord et devenaient
  inatteignables. Le panneau est monté sur `document.body` en `position: fixed`,
  se retourne vers le haut quand le bas manque, et borne sa hauteur à l'espace
  libre — sur écran court il défile au lieu de sortir de la fenêtre. Aucun test
  unitaire ne pouvait l'attraper : jsdom ne calcule pas de géométrie. Un E2E
  vérifie désormais que le dernier item du menu de la dernière ligne est
  réellement dans le viewport, sans rien effacer.
- **L'échec d'une action irréversible était muet.** Le message partait dans la
  carte du haut, hors du dialogue : derrière l'overlay Radix, souvent hors
  écran, et sous `aria-hidden` — donc invisible à un lecteur d'écran. Il
  s'affiche maintenant **dans** le dialogue, en `role="alert"`.
- **La désactivation avait perdu sa confirmation.** Elle coupe l'accès au
  portail et demandait auparavant deux gestes ; la renommer ne justifiait pas de
  la lui retirer. Elle passe par le dialogue, comme ses voisines.
- **Le badge mentait sur un dossier clos ET désactivé** : il affichait « Suivi
  clôturé » seul, laissant croire que le patient consultait encore ses archives.
  Les deux états s'affichent désormais, et la confirmation de clôture ne promet
  plus la lecture quand le dossier est désactivé.
- **`POST /api/praticien/consultations` ne testait que `actif`** : sur un
  dossier clôturé, la route créait la consultation, **réactivait un jeton
  révoqué** et envoyait l'e-mail — en contradiction avec le message de clôture.
  Garde manquant ajouté (409 `dossier_cloture`), comme l'avaient déjà
  assignation, pack et envoi de booklet. Le sélecteur de consultation signale
  aussi les dossiers clos.
- Menus : `Tab` rend le focus au déclencheur au lieu de le perdre sur `body`,
  `Échap` est écouté au niveau du document (un tap ne pose pas le focus sur
  WebKit mobile), un item désactivé reste navigable en `aria-disabled` — motif
  ARIA menu. Les actions d'accès sont neutralisées pendant un envoi en vol,
  garde que portaient les boutons remplacés.
- La saisie réelle de l'utilisateur remonte jusqu'au corps de la requête, au
  lieu d'une constante `'EFFACER'` recopiée : une régression sur l'activation du
  bouton ne deviendrait pas un effacement.

Vérifié : T2 complet — 943 tests unitaires (dont 50 ajoutés), 55 E2E, aucune
dérive schéma ↔ migrations. **Aucun E2E n'efface** : la suite s'exécute contre
une base partagée et réinitialise `PAT_SEED_03` ; un parcours qui effacerait
réellement ce dossier détruirait la fixture des autres postes. Le parcours
d'effacement s'arrête à la confirmation inerte.

### Hébergement HDS — question instruite, et dérogation datée (2026-07-21)

Aucun code. Ce qui change est l'état de la connaissance et une décision du
responsable du traitement.

- **L'exigence 1 de G-TRUST-04 n'est plus « à vérifier », elle est établie — et
  négative.** Supabase et Vercel sont **absents de l'annuaire ANS des
  hébergeurs certifiés HDS** (404 hébergeurs). La question posée publiquement à
  Supabase le 2024-11-29 est **toujours sans réponse** vingt mois plus tard,
  malgré cinq relances. Vercel est certifié SOC 2 Type II, ISO 27001:2022,
  HIPAA et PCI DSS — aucun de ces cadres ne se substitue au HDS.
- **Le référentiel HDS v2.0 est en vigueur depuis le 2026-05-16**, avec une
  exigence de souveraineté restreignant le stockage à l'EEE. La base est à
  Francfort : la localisation est acquise, la certification non.
- **Un déplacement est techniquement peu coûteux.** Inventaire du dépôt :
  aucune dépendance bloquante à Vercel (pas de `vercel.json`, `@vercel/*`, Edge
  Runtime, middleware, Cron, ISR ; pas d'import de `next/image` dans le code
  applicatif), aucun SDK `@supabase/*` au runtime. Le poste lourd est le
  transfert de la base, pas le code. Équivalents certifiés sur les six
  activités : Scalingo, Clever Cloud.
- **Dérogation du responsable du traitement, datée du 2026-07-21 et bornée au
  2026-10-21** : phase de test avec des personnes réelles, nouveaux dossiers
  compris, malgré l'écart. Motifs invoqués : phase pré-opérationnelle,
  information des participants, gratuité du service.
- **Ce n'est pas une mise en conformité, et c'est écrit comme tel.** La
  gratuité n'exonère pas de L1111-8 ; l'information des participants ne
  décharge pas d'une obligation qui pèse sur le responsable et l'hébergeur.
  L'invariant du registre « HDS obligatoire » n'est pas abrogé : il est
  **suspendu, sciemment, pour un temps compté**. Sans reconduction écrite au
  2026-10-21, il reprend son plein effet.
- **Canal public de redemande ouvert** (`WN_G4_REDEMANDE_PATIENT`), ses deux
  résidus ayant été fermés le jour même.
- **Correction de fait au registre** : la mention « livrable en préproduction »
  supposait une préproduction qui n'existe pas.

### Gouvernance et cohérence documentaire — audit de conformité 5.0 (2026-07-21)

Documentaire uniquement. Aucun code, schéma, migration ni flag modifié.
Corrige E19, E21, C3 (table de lots), E22, E24, E26, E28, E29, E30, E31, E33,
E34, E35 relevés par l'audit du 2026-07-20.

- **Statuts de campagne réalignés sur le réel** : SP-TT et SP-MET passent
  `cadrée` → `livrée` (code shipé, lots marqués `livré`) ; la table de lots de
  C3 (5 lignes `à_faire` alors que le frontmatter dit « en prod ») réalignée,
  LOT-05 ajouté ; `campagnes/README.md` corrigé pour SP-COP/SP-TT/SP-MET.
- **`.wn/state.json`** (E26) : `updated_at` rafraîchi, `WN_ALLOW_PROTECTED_WRITE`
  (variable supprimée) retiré, G1/G3 marqués appliqués, isolation alignée sur
  30/33 (#181), compte E2E corrigé. G4/G-TRUST-04 volontairement **non
  arbitrés ici** — en évolution active dans une autre session ; le fichier
  renvoie vers `CHECKLIST_ACTIVATION_G_TRUST_04.md`/`ACTIVATION_RUNBOOK_G4.md`
  comme source à jour plutôt que d'asserter un statut.
- **Vues régénérées** via leurs générateurs (jamais éditées à la main) :
  `ACTIVE_CAMPAIGN.md` (`wn-campaign.mjs sync`) et
  `AUDIT_REGLES_CAMPAGNES.md` (`wn-campaign-audit.mjs --write`), tous deux
  après correction des sources qu'ils dérivent.
- **Miroir `wellneuro_wn_campaigns/` supprimé** (257 fichiers) : copie figée au
  2026-07-16 se déclarant « synchronisée », sans aucun générateur, absente des
  5 campagnes de Vague 2 ; récupérable via l'historique git si besoin.
- **Comptage E2E corrigé** (E34) : 34/45 → **26 tests source** (2 projets, 52
  exécutions Playwright) dans `CLAUDE.md`, `ROLES_MACHINES.md`,
  `web/e2e/README.md`, `.wn/state.json`.
- **Petites incohérences** : titre A7 « deux régimes » → « trois régimes »
  (contredisait son propre corps) ; inventaire de schéma de
  `PROJET_CONTEXTE.md` reformulé sans énumération périssable ; collision de
  sigle « R8 » entre les deux roadmaps désambiguïsée par note croisée ; §10 de
  la proposition UX 5.0 et note TRUST sur le legacy rectifiées par blockquote
  daté, dans le style déjà en usage dans ces documents.

### Patient & accessibilité — six écarts de l'audit de conformité 5.0 (2026-07-21)

Aucune migration, aucun changement de schéma. Corrige E10, E12, E13, E14, E15,
E18 relevés par l'audit du 2026-07-20.

- **E10 — plus de score chiffré affiché au patient.** `ScoreGauge` gagne
  `showValue` (défaut `true`) ; le montage patient (`MonEquilibreAccueil`)
  passe `showValue={false}` — la bande visuelle reste, le nombre disparaît.
  Le montage praticien (`FichePatientPanel`) est inchangé. *Décision utilisateur
  du 2026-07-21 : masquer le chiffre plutôt qu'acter une exception au registre.*
- **E12** — le sous-titre « Version locale de travail JA5-02 » et la ligne
  « Jalon · charge perçue · budget global » (identifiants et chiffres internes)
  ne s'affichent plus dans la spirale alimentaire patient ; seul
  `feedbackPatient`, écrit pour le patient, reste.
- **E13** — « Mes 12 besoins » n'est plus la seule interaction *hover-only* du
  dépôt : chaque besoin est désormais un bouton focusable (clavier/tactile), et
  porte un libellé texte de couverture (« Bien couvert » / « Couverture
  partielle » / « Peu couvert ») en plus de l'opacité de couleur.
  Instruction reformulée en conséquence.
- **E14** — cibles tactiles du portail patient relevées à 44 px minimum
  (`PatientButton`, `ReadingComfortControl`, lien « Ouvrir » du hub legacy).
- **E15** — la garde `assertRenduMedecinNonPrescriptif`, restée sans appelant en
  production, est désormais posée dans `renderDocumentHtml` sur le rendu
  médecin ; `DocumentsPanel` capture une éventuelle violation pour un message
  actionnable plutôt qu'un aperçu qui plante.
- **E18** — couleurs Tailwind brutes hors tokens retokenisées :
  `FichePatientPanel` (`orange-*` → `status-warning`), `DocumentComposer` et
  `DocumentsPanel` (`slate-*`/`white` → `foreground`/`surface`/`muted`).

### Gate G4 — les deux résidus du canal de redemande (IDP LOT-02, 2026-07-21)

Migration confirmée explicitement par l'utilisateur le 2026-07-21. **Migration
additive** : une table nouvelle, aucune table existante touchée. Rollback =
abandon de la table. Le canal reste **fermé** — `WN_G4_REDEMANDE_PATIENT` absent
de la production.

- **Le temps de réponse ne dit plus rien.** Corps, code et en-têtes étaient déjà
  identiques ; restait la durée — une adresse connue coûte une écriture et une
  poignée SMTP, une adresse inconnue ne coûte rien, et l'écart se mesure. Toutes
  les sorties indifférenciées passent désormais par un plancher commun (1,5 s),
  appliqué sur un chemin de sortie unique pour qu'aucune branche ne lui échappe,
  **pas même la panne**. Au-delà du plancher, le temps observable est arrondi au
  palier de 500 ms : un envoi SMTP anormalement lent ne se lit plus comme une
  mesure continue.
- **Les tentatives sont plafonnées par origine réseau**, 20 par heure glissante,
  comptées **en base** (`portail_demande_tentatives`). Le plafond par patient
  (3/heure) ne bornait pas l'énumération : essayer mille adresses inconnues
  n'atteint le plafond d'aucun patient, puisqu'il n'en touche aucun. Et
  `portail_magic_links` ne pouvait pas tenir ce rôle — une adresse inconnue n'y
  crée aucune ligne, or c'est exactement la tentative à compter.
- **L'adresse IP n'est pas stockée**, seulement son empreinte HMAC (préfixe de
  domaine distinct de celui des jetons). La table n'a **aucune relation vers
  `patients`** : aucune jointure ne peut relier une origine réseau à un dossier.
  Les lignes se purgent au-delà de 24 h — passé la fenêtre de comptage, elles ne
  seraient plus qu'une trace d'origine réseau conservée sans usage.
- **Le seuil est à 20, pas à 3** : une sortie réseau est partagée — un foyer, un
  cabinet, un opérateur mobile. Il doit gêner l'énumération, jamais la deuxième
  tentative d'un patient qui a mal recopié son adresse.
- **Fermer les résidus ne lève pas la décision.** L'obstacle technique tombe ;
  ouvrir une surface publique sur des adresses de personnes réelles reste une
  décision distincte, à consigner avec sa date et son périmètre.

### Sécurité — isolation multi-praticien, trois routes fermées (2026-07-21)

Aucune migration. Corrige trois écarts (E7, E8, E9) relevés par l'audit de
conformité 5.0 du 2026-07-20. Garde réutilisée, déjà factorisée et appliquée
ailleurs : `web/src/lib/praticien/appartenance.ts`.

- **`POST /api/praticien/consultations` était le trou le plus grave** :
  n'importe quel `idPatient` acceptait qu'on lève une révocation d'accès
  existante et qu'on envoie le lien du portail au patient — sans vérifier
  qu'il appartenait au praticien de la session. Guardé désormais comme
  `token/route.ts`, avec un 404/403 distinct. Le `GET` (historique des
  consultations) est scopé de même.
- **`GET/PATCH/DELETE /api/praticien/patients`** renvoyaient, mutaient ou
  désactivaient n'importe quel patient de la base, avec e-mail et téléphone.
  Les quatre méthodes sont désormais scopées au praticien de la session
  (paginé et non paginé).
- **`GET /api/praticien/besoins`** renvoyait identité et couverture des besoins
  pour tout `idPatient` fourni. Scopé (404 uniforme, pas de fuite d'existence).
- **`CHECKLIST_ACTIVATION_G_TRUST_04.md`** corrigée : son exigence 3 annonçait
  « 13 routes sur 31 » et classait à tort `consultations`/`patients` parmi les
  gardées et `besoins` en « sans objet ». État réel documenté : 30 routes sur
  33 portant de la donnée patient sont gardées ; 3 sont des catalogues globaux
  sans objet. Le gate G-TRUST-04 reste non levé — l'isolation applicative ne
  suffit pas à elle seule (pas de test d'isolation réel, pas de contrainte au
  niveau base).

### Gate G4 — activé en production (2026-07-21)

Aucun code, aucune migration : bascule de drapeau et traçabilité.

- **`WN_G4_LIEN_MAGIQUE=true`, Production seule**, sur le déploiement `092197a`.
  Le lien magique — haché en base, 24 h, usage unique, rejeu refusé et tracé —
  est actif ; le lien permanent continue de fonctionner, aucun patient n'a perdu
  son accès.
- **Vérifié sans toucher un dossier** : `/portail/lien/<jeton>` passe de 404 à
  307 vers l'écran unique ; cet écran ne contient aucune occurrence de
  « expiré », « consommé », « inconnu » ou « introuvable » ; le canal public de
  redemande répond 404 ; `portail_magic_links` reste vide.
- **Essai de bout en bout concluant** (`PAT006`, adresse du praticien) : un lien
  émis, **le jeton absent de la base** (empreinte de 43 caractères seule),
  consommé une fois, **5 rejeux refusés et tracés**, validité 24,00 h, origine
  `praticien:…` enregistrée. Les sept invariants du gate tiennent en production.
- **Runbook corrigé après cet essai** : il imposait la fixture `PAT_SEED_03`.
  Or `michel.dogne@fictif.wellneuro.fr` **n'existe pas** — l'essai aurait validé
  la route sans jamais tester l'envoi d'e-mail, soit la moitié de la chaîne. La
  règle devient « une adresse relevant du praticien », jamais « la boîte d'un
  tiers ».
- **Le canal public de redemande reste fermé** (`WN_G4_REDEMANDE_PATIENT` non
  posé) tant que le temps de réponse n'est pas égalisé et qu'aucune limitation
  par IP n'existe.
- **Corrigé pendant l'activation** : le drapeau avait d'abord été posé sur
  **Preview et Production**. Les déploiements Preview lisant la base de
  production — un seul projet Supabase, aucune préproduction —, des liens
  magiques auraient pu être émis vers de vrais dossiers depuis n'importe quelle
  URL de prévisualisation.
- **Checklist G-TRUST-04 mise à jour** : la base de production contient des
  dossiers de **personnes réelles** ayant consenti à une phase de test. Ce
  consentement est une pièce du dossier RGPD ; il **ne satisfait pas
  l'exigence 1** (hébergement HDS), qui reste ouverte. L'exigence 4 passe de
  « partiel » à « partiel, amélioré ». **Le gate n'est pas levé.**

### Gate G4 — surface d'émission, et scission du drapeau (2026-07-20)

Aucune migration. Prépare l'activation de G4, qui reste **éteint**.

- **Le praticien peut enfin émettre un lien magique** : bouton « Envoyer un lien
  à usage unique (24 h) » dans `PatientsPanel`, à côté des trois actions du
  jeton permanent, visible seulement drapeau allumé. L'action d'API existait
  depuis #172 **sans aucune surface** — allumer le drapeau n'aurait rien ouvert
  d'utilisable, et la page de redemande patient serait restée inatteignable.
- **Deux drapeaux au lieu d'un.** `WN_G4_REDEMANDE_PATIENT` commande désormais
  le canal **public** `POST /api/portail/lien/demande`, séparément de l'entrée
  par lien magique. Sa réponse est indifférenciée, mais deux résidus subsistent —
  temps de réponse non égalisé, pas de limitation par IP. La base de production
  contenant des dossiers de **personnes réelles**, ces résidus portent sur de
  vraies adresses : le canal reste fermé jusqu'à ce qu'ils soient traités. La
  coexistence des deux chemins le permet — un patient dont le lien magique
  expire garde son lien permanent.
- **Le message de refus reste unique.** Seule l'action proposée change quand le
  canal est fermé (« demandez un nouveau lien à votre praticien ») ; jamais la
  raison du refus.
- **Un portail révoqué ne se présente plus comme un patient introuvable** :
  motif `portal_revoked` distinct, en 409. Les confondre envoyait le praticien
  chercher le mauvais problème — un portail révoqué se réactive, un patient
  introuvable non.
- **Runbook d'activation** (`ACTIVATION_RUNBOOK_G4.md`) : essai sur la seule
  fixture `PAT_SEED_03`, contrôle en base, rollback non destructif. Il rappelle
  qu'il **ne lève pas G-TRUST-04**, dont le point bloquant est l'hébergement HDS.

### Gate G4 — lien magique d'accès patient (IDP LOT-01, 2026-07-20)

Gate confirmé explicitement par l'utilisateur le 2026-07-20. **Migration
additive** : une table nouvelle, `patients.access_token` conservé intact.
Rollback = abandon de la table.

**Merger n'active rien** : tout est derrière `WN_G4_LIEN_MAGIQUE`, absent de
l'environnement de production. Livrable de préproduction ; l'activation avec des
données réelles reste une décision distincte, aujourd'hui **NO-GO** (gate TRUST).

- **`portail_magic_links`** (`20260720200000_g4_portail_magic_links_v1`) — le
  jeton **n'est pas en base** : seule son empreinte HMAC-SHA256 l'est
  (`NEXTAUTH_SECRET`, préfixe de domaine). Un dump ne permet pas d'ouvrir un
  espace. 24 h, usage unique, RLS deny-all.
- **Consommation atomique** : `updateMany` filtré sur `consommeLe: null` — la
  vérification et l'écriture sont une seule opération. Un `update` précédé d'une
  lecture laisserait deux requêtes concurrentes consommer le même lien.
- **Rejeu refusé et tracé en base** (`rejeux_refuses`,
  `derniere_tentative_le`), pas seulement en log : un log Vercel est purgé, et
  une trace purgée ne prouve plus rien le jour où on la cherche.
- **Un seul message, un seul écran** pour consommé, expiré, inconnu et portail
  révoqué — même URL, même code HTTP. Un test vérifie que les quatre refus
  atterrissent au même endroit.
- **Canal de redemande** `POST /api/portail/lien/demande` : réponse
  rigoureusement identique — code, corps, en-têtes — que l'adresse existe ou
  non, **y compris en panne**. Cadence bornée **en base** (3/h/patient) : un
  compteur en mémoire ne borne rien en serverless.
- **Le jeton ne part pas dans les logs.** `sanitizeUrl` conserve le chemin, et
  ici le chemin *est* le jeton : la route journalise le gabarit
  `/portail/lien/[jeton]`, jamais l'URL réelle. Un test garde cette
  substitution.
- **Coexistence** : le jeton permanent reste la clé de l'URL du portail et
  l'ancrage du cookie de session — `isPatientSessionBoundToToken` et les routes
  qui l'appellent ne changent pas, toutes les propriétés de révocation sont
  préservées. Le parcours E2E existant n'est pas touché.
- **`api/praticien/token` reçoit enfin sa garde d'appartenance**, sur le POST
  comme sur le DELETE. C'était la dernière route praticien non gardée, laissée
  à ce gate en #167 : émettre un lien d'accès — ou révoquer celui — du patient
  d'un autre praticien était le pire trou restant de la surface.
- **Le lien magique saute le gate e-mail** : recevoir le lien *dans* la boîte
  prouve le contrôle de la boîte, ce que saisir l'adresse ne prouvait pas. Le
  facteur est déplacé, pas supprimé.
- **Tests** (20 unitaires + 3 E2E) : usage unique, atomicité, indistinction des
  refus, absence du jeton dans les journaux et dans la réponse, drapeau éteint
  ⇒ 404.

### Gate G1 — refus persisté des cartes du Fil (SP-FIL, 2026-07-20)

Gate confirmé explicitement par l'utilisateur le 2026-07-20. **Migration
additive** : une table nouvelle, aucun backfill. Rollback = abandon de la table.

Le garde-fou 5.0 exige qu'une carte du Fil soit refusable, que le refus
**persiste** et qu'il reste **réversible**. Aucun des trois n'était tenu.

- **Prérequis livré à part** (migration-free) : une identité stable pour chaque
  carte, ancrée sur sa ligne source. Voie (b) du dossier des gates, arbitrée
  avec l'utilisateur — la clé composite `type + patient + date` aurait laissé
  sans clé toute carte non datée et confondu deux cartes jumelles.
- **`fil_card_rejections`** (`20260720130000_g1_fil_card_rejections_v1`) —
  append-only chaîné : annuler un refus n'efface ni ne réécrit rien, c'est une
  nouvelle ligne (`refusee = false`) qui supplante la précédente. RLS deny-all.
- **Écart assumé au dossier** : celui-ci demandait à la fois une unicité
  `(id_patient, carte_cle)` et un chaînage append-only. Les deux sont
  incompatibles — une annulation est une seconde ligne sur la même clé, et
  l'unicité la rendrait impossible. L'append-only l'emporte : c'est lui qui
  porte la réversibilité exigée. L'index reste, la contrainte non.
- **Route `POST /api/praticien/fil/refus`** — garde d'appartenance, idempotente,
  aucun `UPDATE` ni `DELETE`. Une clé reçue d'un client n'est pas crue sur
  parole : elle doit porter le préfixe d'un type de carte connu.
- **Filtrage en un seul point de passage**, après `construireFil`, sur les
  cartes déjà construites — jamais dans les 5 fonctions de production, ce
  seraient 5 endroits à garder cohérents.
- **Surface** : bouton « Écarter » par carte (cible ≥ 44 px) et **annulation
  immédiate sans quitter l'écran**. Le serveur fait foi — une carte n'est
  écartée à l'écran qu'une fois le refus accepté, sinon le praticien croirait
  avoir écarté une carte qui reviendra.

### Gate G3 — notes de relecture (SP-TT LOT-02, 2026-07-20)

Gate confirmé explicitement par l'utilisateur le 2026-07-20. **Migration
additive** : une table nouvelle, aucune table existante modifiée, aucun
backfill. Rollback = abandon de la table, rien d'existant n'en dépend.

Depuis la lecture d'un état passé (LOT-01, livré en #158), le praticien dépose
une note sur ce qu'il vient de relire.

- **`relecture_notes`** (`20260720120000_sptt_relecture_notes_v1`) — deux dates
  qui ne doivent jamais être confondues : `instant_relu` est une **donnée** (ce
  que la note commente), `cree_le` est le moment de l'écriture, **posé par la
  base** (`DEFAULT CURRENT_TIMESTAMP`), jamais par l'application. Append-only
  chaîné (`supersedes_note_id`) : corriger crée une ligne, la précédente reste
  lisible. RLS deny-all, comme les tables C2A.
- **Route dédiée `/api/praticien/relecture-notes`** (GET + POST) plutôt qu'un
  POST sur `/cockpit`. Le refus d'écriture du cockpit en présence d'un `asOf`
  n'est **pas assoupli** — il protège la confirmation d'épisode, qui ne doit
  jamais partir d'un état périmé. La note reçoit l'instant relu **dans son
  corps, comme une donnée** ; la route refuse d'ailleurs explicitement un
  `?asOf=`. On n'écrit pas *dans* le passé, on écrit *aujourd'hui, à propos* du
  passé.
- L'instant relu est validé par `resoudreAsOf`, **la même règle que la
  lecture** : une note ne peut commenter que ce qui est relisible, et une date
  arbitraire reste refusée — sonder l'historique par tâtonnement n'est pas plus
  permis en écriture qu'en lecture. Garde d'appartenance praticien appliquée.
- **Surface** : `LectureEtatPassePanel` gagne le dépôt de note. Le texte
  « lecture seule, aucune action possible » devient exact plutôt que faux dans
  l'autre sens : l'état relu reste intouchable, la note est datée du jour.
- **Tests** (28) : l'invariant du gate a le sien — ce qui part en base ne porte
  aucune date d'écriture ; correction = nouvelle ligne, la précédente reste
  lisible par sa chaîne ; garde structurelle « aucune surface patient ne lit
  cette table ».

### Vague 2 — les traces locales du portail suivent le patient, plus le lien (2026-07-20)

Aucune migration. Préalable au gate **G4** (identité patient durable), livré à part.

- **Trois traces du navigateur étaient nommées d'après le jeton d'URL** : les
  brouillons du wizard fiche/anamnèse (`sessionStorage`), le brouillon du
  Journal Alimentaire (`sessionStorage`), et l'instantané « depuis la dernière
  visite » du hub (`localStorage`). Toutes portent désormais l'`idPatient` de la
  session vérifiée.
- **Le dossier des gates n'en recensait que deux.** La troisième —
  `wellneuro:portail:derniere-visite:${token}` — est la plus exposée : en
  `localStorage`, elle survit à la fermeture de l'onglet et gardait donc un
  **secret d'accès à demeure** dans le navigateur.
- **Deux raisons, dont une qui n'est pas cosmétique** : le jeton est un secret
  d'accès et n'a rien à faire dans une clé de stockage ; et il est appelé à
  changer (lien magique à consommation unique, G4) — une trace indexée dessus
  devient introuvable au lien suivant, alors que la personne n'a pas changé.
  C'est exactement la reprise à plusieurs mois qu'attend SP-SPI.
- **`/api/portail/session` et `/api/portail/assignations` renvoient
  l'`idPatient`** de la session. Aucune route portail n'accepte un `idPatient`
  venu du client : elles le lisent toutes du cookie signé.
- **La page `/portail/[token]/alimentation` résout l'identité côté serveur**,
  depuis le cookie — le jeton ne descend plus jusqu'au panneau du Journal
  Alimentaire, qui ne peut donc plus le réintroduire dans une clé.
- **Pas d'identité, pas de trace** : sans session vérifiée, rien n'est lu ni
  écrit — un compartiment commun mélangerait deux patients d'un même appareil.
  Le panneau du Journal Alimentaire **le dit à l'écran** au lieu de laisser
  croire à une sauvegarde.
- **Garde structurelle** (`lib/portail-identite-locale.guard.test.ts`) : une
  régression se réintroduirait par un `${token}` recopié, pas par une logique
  fautive — le test lit donc les sources.

### Vague 2 — isolation multi-praticien : 12 routes fermées (2026-07-20)

Aucune migration. Exigence 3 du gate **G-TRUST-04**.

- **12 routes praticien** appliquent désormais la garde d'appartenance
  (`lib/praticien/appartenance.ts`, posée en #156) : `apercu-patient/reponses`,
  `assignations` (POST et PATCH), `booklet` (GET et POST), `documents`,
  `equilibre`, `packs/assign`, `patients-pg`, `protocoles` (GET et POST),
  `protocoles/checkins`, `reponses`, `synthese` (GET et POST), `trust`
  (GET et PATCH). Le compte passe de **13 routes gardées sur 31 à 25**.
- **Trois routes agissaient sur le monde extérieur sans garde** :
  `booklet` POST **envoie un document au patient par e-mail**, `assignations` et
  `packs/assign` **déclenchent un e-mail d'assignation**, et `synthese` POST
  **transmet les réponses d'un patient à l'API Anthropic**. La garde y est posée
  **avant** l'effet, pas après.
- **Le patient d'un autre praticien est traité comme introuvable**, jamais comme
  interdit : un 403 confirmerait son existence. Même choix que `cockpit`.
- **`trust` PATCH passe de `update` à `updateMany`** : `update` exige une clé
  unique seule et n'accepte pas de filtre sur la relation patient. Le compte de
  lignes touchées vaut garde — zéro se présente comme un signalement introuvable.
- **`trust` GET filtre avant le `take: 100`**, sinon les signalements d'un autre
  praticien pourraient évincer ceux du praticien connecté.
- **Reste non gardée, volontairement** : `praticien/token`, laissée au gate
  **G4** dont elle est un fichier cœur — la toucher ici créerait un conflit avec
  la session qui applique les migrations. Les catalogues (`besoins`, `packs`,
  `questionnaires`, `questionnaires/registry`) n'ont pas d'objet : aucune donnée
  patient.
- Sans effet en production — les 17 patients appartiennent au même praticien.

### Vague 2 — clôture : ce qui reste, et pourquoi (2026-07-20)

Documentation seule, aucun code.

- **Dossier des gates G1 / G3 / G4** (`docs/claude/GATES_VAGUE2_G1_G3_G4.md`) —
  points d'ancrage vérifiés dans le code, migration envisagée, réversibilité et
  arbitrages ouverts, pour que la session de levée soit courte. Deux constats
  qui changent le coût :
  - **G1** : une carte du Fil **n'a aucune identité**. Persister un refus
    suppose d'abord de décider ce qui identifie une carte ; la clé composite
    « type + patient + date » est fragile (la carte `reprise` est agrégée et sa
    date peut être nulle). Remonter l'identifiant de la ligne source est
    **migration-free** et peut être fait avant le gate.
  - **G4** : le seul couplage au jeton permanent est **côté navigateur**
    (brouillons locaux clés par le jeton). Vérifié : le panneau patient du
    Journal Alimentaire ne persiste rien, et la route praticien rejette tout
    épisode dont le `patientId` ne correspond pas à l'`idPatient`. Le jeton
    n'entre jamais en base par cette voie. Reclé sur l'`idPatient` de session =
    **migration-free**, à faire avant le gate.
- **Checklist d'activation G-TRUST-04**
  (`campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`)
  — les sept exigences, une par une, avec leur état réel. **Aucune n'est
  satisfaite** : le gate ne peut pas être levé par arbitrage partiel. Point
  bloquant à instruire en premier : la **certification HDS** de l'hébergement,
  à vérifier auprès des fournisseurs. Mesure de l'isolation multi-praticien :
  **13 routes gardées sur 31**.
- **Reliquat C3 — fil de correspondance médecin** : constat d'exécution ajouté
  au cadrage. Le **volet sortant est déjà livré et déjà sans pièces jointes par
  construction** — `ContenuBloc` ne porte que du texte, il n'existe aucun champ
  de pièce jointe dans le modèle documentaire. La garantie technique demandée
  en question ouverte Q2 est donc acquise pour le sortant. **Le fil entrant
  reste ouvert** : il demande une migration ET un arbitrage humain sur
  l'identité du médecin et la conservation des échanges — décider ces points
  « au fil de l'implémentation » reviendrait à les trancher sans le dire.

### Vague 2 — SP-COP LOT-02, la minute d'après (2026-07-20)

- **Écran de clôture de consultation** sur `/dashboard/copilote` : l'état de la
  chaîne **Relu → Validé pour diffusion → Envoyé** pour le protocole de la
  consultation qu'on vient de terminer, et ce qui la bloque. **Aucune migration.**
- **Cet écran n'envoie rien et n'enregistre rien.** Il ne franchit aucune des
  trois étapes : chacune se pose là où elle vit déjà
  (`/api/praticien/protocoles`, `.../diffusion`). Dupliquer ces chemins d'écriture
  ferait diverger deux vérités sur le même invariant. `pretPourDiffusion` est un
  **constat**, jamais un déclencheur — un test vérifie que l'écran ne rend aucun
  bouton ni formulaire, même chaîne complète.
- **Une approbation ancrée sur une version supplantée est `caduque`, pas
  absente** : l'étape a bien été franchie, mais le contenu a changé depuis. La
  distinction est clinique — on ne redemande pas la même chose.
- **Aucune étape n'est supposée franchie** : un statut `practitioner_reviewed`
  sans date de relecture, une date illisible, ou une synthèse validée sans date
  de validation ne valent pas franchissement. Un brouillon IA ou une synthèse
  rejetée ne rend pas un document diffusable (garde de régime C3).
- **Sans protocole enregistré**, les trois étapes sont `indisponible` et non
  « à faire » : les afficher à faire laisserait croire qu'il suffit de cocher.
- **Un échec de lecture n'est jamais présenté comme « tout est prêt »** — ce
  serait une autorisation implicite à diffuser.
- **Le chaînage append-only n'est pas réimplémenté** : la tête de fil des
  versions et la tête de chaîne des approbations viennent de C2A
  (`resolveActiveVersion`, `resolveActiveApproval`).
- **Correction de périmètre (LOT-01)** : la page `/dashboard/copilote` listait
  **tous** les patients actifs sans filtrer sur le praticien connecté. Elle
  applique désormais `filtrePatientsDuPraticien`, comme les routes gardées en
  #156, et la sélection d'un patient d'un autre praticien ne rend plus de fiche.

### Vague 2 — SP-TT LOT-01, lecture d'un état passé (2026-07-20)

- **La fiche peut être relue à une date passée.** L'état est **recalculé** à
  partir des données brutes tronquées à cette date — **jamais relu depuis un
  enregistrement**, conformément au refus doctrinal de persister
  snapshot / review / decision-card (C2A). **Aucune migration.**
- **La date n'est pas libre** : elle doit correspondre à un **repère réel** du
  patient — épisode confirmé ou réponse reçue (`GET /api/praticien/reperes`).
  C'est une navigation entre événements datés, pas un curseur temporel (A6), et
  cela ferme la porte au sondage de l'historique par tâtonnement.
- **Une date inconnue est refusée** (400), jamais ramenée au présent en
  silence : la lecture serait alors présentée comme passée tout en étant
  actuelle.
- **Aucune écriture en mode passé** : `POST /api/praticien/cockpit` refuse dès
  qu'un `asOf` est transmis, **avant toute lecture**. La garantie est portée par
  le serveur, pas par l'écran.
- **Comportement présent strictement inchangé** : sans `asOf`, la route se
  comporte exactement comme avant et ne lit même pas les épisodes.
- **Bandeau non ambigu** côté praticien (« vous lisez l'état du … — ce n'est pas
  l'état actuel du patient ») et retour au présent en un geste, sur la page
  Consultation copilote.
- 18 tests ajoutés (13 domaine, 5 route) + 1 parcours E2E vérifiant qu'aucune
  requête mutante n'est émise.

### Vague 2 — gardes d'appartenance praticien (2026-07-20)

- **Constat initial rectifié.** Il avait été noté que `fil` et `metrics` ne
  filtraient pas sur `praticienEmail` « contrairement à `patients` ». C'est
  inexact : le **GET** de `patients` ne filtre pas non plus. L'état réel est une
  **incohérence** — cinq routes appliquent une garde d'appartenance
  (`boussole`, `ja/activation`, `ja/observations`, `protocoles/versions`,
  `protocoles/diffusion`, 403 si le patient n'est pas celui du praticien), six
  ne l'appliquaient pas (`fil`, `metrics`, `cockpit`, `trajectoire`,
  `copilote/prevol`, `protocoles/checkins`).
- **Vérification en base avant correctif** : les 17 patients de production
  portent tous le même `praticienEmail`. Le filtrage est donc un **no-op strict
  aujourd'hui** — aucun risque de vider le Fil ou les métriques — et rend les
  routes sûres par construction si un second compte praticien apparaît.
- **Garde factorisée** (`lib/praticien/appartenance.ts`) et appliquée :
  - `fil` : le scope passe par la résolution des patients, qui borne déjà toutes
    les cartes — une ligne suffit à borner tout le Fil ;
  - `metrics` : les quatre compteurs sont scopés, via la relation `patient` pour
    les tables filles (et via `synthese` pour `booklet_envois`, qui n'a pas de
    relation directe) ;
  - `cockpit` : le scope est posé dans le chargeur d'entrées, point de passage
    unique du GET et du POST — un patient d'un autre praticien est traité comme
    **introuvable**, sans révéler son existence ;
  - `trajectoire` et `copilote/prevol` : **403** distinct du **404**, chaque
    route conservant les codes HTTP qu'elle exposait déjà.
- Comparaison **insensible à la casse** : `praticienEmail` est normalisé à la
  création, rien ne le garantit pour une ligne héritée.
- Aucune migration. Tests ajoutés sur les deux chemins 403.

### Vague 2 — gate G2 : identité de cycle des épisodes (C2B, 2026-07-20)

- **Migration additive** `20260719120000_c2b_cycle_identity_v1` : deux colonnes
  **nullables** sur `assessment_episodes` (`cycle_id`, `version_score`) et un
  index `c2b_episode_cycle_idx`. Aucun DROP, aucun renommage, aucune colonne
  existante modifiée. Backfill : `version_score = 'v1'` (seule version jamais
  émise, et la table lui est postérieure), un T0 ouvre son propre cycle, un
  jalon postérieur rejoint le dernier T0 du **même** patient antérieur ou égal à
  sa confirmation — une ligne sans T0 antérieur reste `NULL`, jamais devinée.
- **La garde clinique A8-3 devient déclenchable.** Le `versionScore` était
  recalculé à la lecture depuis la constante courante : `versions.size > 1` ne
  pouvait jamais être vrai, donc « jamais de comparaison hors version
  identique » ne protégeait rien. La version est désormais **figée à la
  confirmation** et lue telle quelle ; une version nulle n'est **jamais**
  assimilée à la version courante (nouvelle raison `version_inconnue`, bloc
  « non comparable » dédié, et « version de score : inconnue » à l'affichage).
- Les épisodes portent une **clé de cycle stockée** : elle prime sur le
  rattachement par date, qui reste le repli pour les lignes qui n'en ont pas.
- **Écarté** : la colonne `instrument_id`. Le score « Mon équilibre » est un
  composite pondéré par strate, pas un instrument parmi d'autres — la colonne
  n'aurait rien à contenir et aurait donné l'illusion d'une garde. Le vrai
  risque de comparabilité (couvertures de questionnaires différentes entre
  cycles) se calcule à la lecture et ne demande aucune migration.
- Vérifié par `npm run test:worktree -- --fast` : migration appliquée sur
  PostgreSQL éphémère, aucune dérive schéma ↔ migrations, 41 E2E verts.

### Vague 2 — dette de tests du Fil du jour (SP-FIL, 2026-07-19)

- **`FilDuJour` n'avait aucun test** alors qu'il est l'accueil praticien depuis
  SP-FIL LOT-01. Ses quatre états de rendu (chargement, indisponible, vide,
  liste) partagent le même `data-testid` : 6 tests les distinguent désormais par
  leur **contenu**, dont la confusion à éviter — un échec de lecture annoncé
  comme un fil vide (« rien à traiter » alors qu'on n'a rien pu lire).
- **`GET /api/praticien/fil` n'avait aucun test** non plus : 5 tests couvrent la
  session absente (401 + `unavailable`, jamais un fil vide silencieux), le fil
  légitimement vide, l'exclusion des patients inactifs, la carte sourcée
  (« pourquoi maintenant » + action), et la panne de lecture annoncée.
- **E2E durci** : `dashboard-praticien.spec.ts` se contentait de la présence du
  `data-testid`, si bien qu'il **passait aussi sur un Fil en erreur ou bloqué en
  chargement**. Il exige désormais un état résolu — cartes ou état vide
  explicite — et l'absence du message d'indisponibilité.
- **Code mort retiré** : `PatientsATraiter.tsx`, sans import depuis SP-FIL
  LOT-01 (son périmètre est absorbé par les cartes retards/réponses).
- Aucune modification de comportement : tests, durcissement E2E et suppression
  de code mort uniquement. La mise en conformité du garde-fou « chaque
  automatisme reste refusable » relève du **gate G1** (migration), toujours
  ouvert.

### Vague 2 — SP-COP LOT-01, pré-vol T-10 min (2026-07-19)

- **La surface « Consultation copilote » existe.** L'entrée de rail était
  réservée par la maquette 5.0 sur un lien mort ; elle mène désormais à un
  écran réel (`/dashboard/copilote`). Sans patient sélectionné, la page propose
  la liste des patients actifs — elle ne devine pas de qui il s'agit.
- **Ce qui a changé depuis la dernière consultation validée**, chaque élément
  daté et rattaché à sa source : réponses reçues, points d'étape, épisodes
  confirmés, versions de protocole relues, validations pour diffusion, demandes
  de correction du patient, signalements en attente. Sans consultation validée,
  l'ancre le dit et tout l'historique est présenté — on ne suppose pas ce que le
  praticien a déjà vu.
- **Questions suggérées adossées aux faits** : chacune reformule un élément
  présent dans la liste (tolérance « Difficilement », adhésion « Pas encore »,
  demande de correction, signalement). **Aucune ne se déclenche sur une
  absence** — ne pas savoir n'autorise pas à supposer. Un check-in au JSON
  illisible ne produit donc aucune question.
- **Lecture seule de bout en bout** : aucune écriture, aucune persistance, aucun
  snapshot (refus doctrinal C2A) — la vue se reconstruit à chaque ouverture.
  Vérifié en E2E par l'absence de toute requête mutante.
- **Les discordances ne sont pas dupliquées** : elles restent lues au poste de
  pilotage (phase Compréhension), avec un lien depuis le pré-vol. Une seconde
  copie pourrait diverger de la première ; l'arbitrage est consigné dans le lot.
- **Aucune écoute ambiante, aucun audio, aucune transcription** (SP-AMB reste
  bloquée par son gate CNIL/RGPD).
- 20 tests ajoutés (12 domaine, 8 route) + 2 parcours E2E. Aucune migration,
  aucune logique clinique, aucun seuil.

### Vague 2 — cadrage des campagnes (2026-07-19)

- **Cinq `CAMPAGNE.md` créés**, fermant l'écart **E2** de l'audit de conformité
  UX 5.0 (campagnes inscrites au Programme sans cadrage) : **SP-COP** (copilote
  pré-vol & minute d'après), **SP-TT** (time-travel & note de relecture),
  **SP-MET** (météo d'adhésion), **IDP** (identité patient durable), **SP-SPI**
  (« Ma spirale » et reprise patient). Chacune fige objectif, frontières
  (possède / consomme / ne possède pas), décisions actées, dépendances et lots.
- **Fiches de frontières** correspondantes ajoutées au registre normatif
  (`REGISTRE_FRONTIERES.md` §3). L'entrée différée « Auth patient
  inter-assignations » sort des différés au profit de la campagne IDP.
- **Gates identifiés et nommés** : G1 (refus persisté des cartes du Fil),
  G2 (identité de cycle des épisodes), G3 (`relecture_notes`), G4 (identité
  patient durable) — chacun exigeant une confirmation explicite distincte.
  SP-MET et SP-TT-01 sont livrables **sans migration**.
- **Deux rectifications doc↔code** :
  1. la maquette cible ne badge que **deux** éléments (`SP-COP`, `C3`), tous
     deux côté praticien, et non « les couches futures » — les six autres
     lignes de la table « Vagues 2+ » n'ont aucune trace visuelle ; chaque
     campagne devra produire ses propres maquettes ;
  2. le Fil du jour **n'a aucune carte refusable** dans le code livré,
     contrairement à ce qu'affirmait l'audit — le garde-fou 5.0 « chaque
     automatisme reste refusable » n'est pas tenu sur cette surface, sa mise en
     conformité est portée par le polissage SP-FIL (gate G1).
- Documentation seule : **aucun code applicatif, aucun schéma, aucune migration,
  aucun flag, aucun seuil clinique modifié**.

### Vague 2 — Spirale navigable et comparateur réel (C2B, 2026-07-19)

- **L'index de la Spirale devient navigable.** `trajectoire.index` était calculé
  depuis C2B LOT-09 (`lib/protocol/trajectoire.ts`) et **n'était rendu nulle
  part** : conséquence, les épisodes J21/J42/J90 confirmés n'apparaissaient dans
  aucun écran. Le panneau affiche désormais la liste des repères datés sous
  forme de boutons ; sélectionner un repère met en avant le cycle qu'il
  documente — **navigation, jamais un graphe** (A6).
- **Rattachement honnête** (`rattacherReperesAuxCycles`, module de domaine pur) :
  un repère est rattaché au **dernier T0 antérieur ou égal**, jamais à un cycle
  postérieur. Un repère antérieur à tout T0 confirmé, ou dont la date est
  illisible, reste **explicitement non rattaché** — il n'est pas rangé de force
  dans le premier cycle.
- **Le comparateur multi-épisodes devient une vraie grille.** Il n'affichait
  qu'une phrase (« repères présentés côte à côte ci-dessus ») alors que le rendu
  restait une pile verticale. Une table lignes = jalons / colonnes = cycles
  présente les **valeurs** mesurées ; une case sans mesure affiche « jalon non
  mesuré », jamais un 0 (A8-2). **Aucun écart inter-cycles n'est calculé** et le
  panneau le déclare : ce serait une mesure dérivée nouvelle et non sourcée. La
  garde A8-3 est inchangée — versions différentes ⇒ bloc « non comparable »,
  aucune grille.
- **Accessibilité** : repères en cibles ≥ 44 px, focus visible, `aria-pressed`
  sur la sélection, `aria-current` sur le cycle mis en avant, mise en avant
  **écrite en toutes lettres** (jamais la couleur seule) ; la grille défile dans
  son conteneur, jamais la page.
- **Première couverture E2E de la fiche-trajectoire** (`e2e/fiche-trajectoire.spec.ts`) :
  l'onglet « Trajectoire » et la phase « Réévaluation » n'étaient joués par
  aucun test de bout en bout. Les deux chemins vérifient que l'état vide est
  rattaché à l'absence d'épisode et n'est jamais confondu avec un échec de
  lecture. 10 tests unitaires ajoutés (rattachement des repères, grille du
  comparateur, sélection/désélection).
- Lecture seule : aucun contrat d'API, aucune route, aucune migration, aucune
  logique clinique ni seuil modifiés.

### Vague 2 — SP-MET, météo d'adhésion (2026-07-19)

- **Signal d'adhésion à trois états** — régulière / fragile / interrompue —
  dérivé **à la lecture** des points d'étape J7/J14/J21 déjà collectés
  (`ProtocolCheckin.reponses`). Module de domaine **pur**
  (`web/src/lib/protocol/adhesion.ts`), **aucune migration, aucun agrégat
  persisté** : le schéma interdit doctrinalement d'en faire un score ou un jalon
  (arbitrage A1).
- **Règle explicite et exhaustive** : l'état vient de la réponse d'adhésion du
  check-in **le plus récent** (tête de chaîne append-only — une correction du
  patient remplace sa réponse, elle ne s'y ajoute pas). Une valeur d'adhésion
  inconnue **abstient** au lieu de deviner.
- **Abstention honnête** : sans point d'étape exploitable, l'état est
  « indéterminée », et le panneau écrit qu'une absence de réponse **n'est pas
  comptée comme une interruption**. Jamais « interrompue » par défaut.
- **Cause observable citée, jamais interprétée** : les réponses du patient sont
  rapportées verbatim, avec leur point d'étape et leur date. La tolérance est
  rapportée quand elle n'est pas « Bien » — elle **éclaire sans pondérer**,
  l'état ne change pas.
- **Praticien seul** (A8-4, A7-6) : affiché en phase **Suivi** du poste de
  pilotage, jamais côté patient. Un test structurel parcourt les surfaces
  patient (`app/api/patient`, `app/api/portail`, `app/patient`, `app/portail`,
  `components/patient*`) et échoue si le module ou le panneau y est importé un
  jour.
- **Ni score, ni pourcentage d'observance, ni classement** ; statut jamais porté
  par la seule couleur (mot + symbole). La route praticien renvoyait déjà les
  check-ins, le cockpit les ignorait : **aucun changement de contrat d'API**.
- 17 tests ajoutés (11 domaine, 6 présentation).

### Lot Vague 1 — application UX 5.0 au code (2026-07-19)

- **Portail patient legacy → tokens Jardin** (PR 1) : flux `/patient` migré des
  couleurs en dur (bleu/gris) vers les tokens sémantiques, `ReadingComfortControl`
  monté, hub « questionnaires en attente » rétrogradé sous le contenu d'étape,
  `PlaintesForm` paginé (4 + 3 curseurs) — contrat de soumission inchangé.
- **Shell praticien** (PR 2) : métriques du cabinet rendues actives (chaque carte
  est un point d'accès vers `/dashboard/patients` ou `/dashboard/synthese`),
  typographie remontée (nav 11→13 px, titres de section en `font-display`, titre
  d'accueil `text-3xl`, en-tête patient `text-2xl`), **canvas mid-tone A5-R2**
  appliqué à `globals.css` (praticien `#D3D8E6`, patient `#EAE0CC` ; cartes
  inchangées), tokens de l'Observatory C5 réalignés (slate/red → rail/status).
- **Poste de pilotage** (PR 3) : `FichePatientPanel` réorganisé en cockpit borné
  à la hauteur d'écran (bandeau patient + rail des 7 phases du cycle clinique +
  zone focale unique + instruments à tiroir), onglets in-fiche
  (poste de pilotage / 12 besoins / alimentation / trajectoire) remplaçant la
  navigation par scroll et les sous-vues en page pleine, trois instruments
  denses (12 besoins, objets cliniques & momentum, détail des réponses) déplacés
  en tiroir Radix ouvert **au clic** (patron `PatientPreview`) ; le runtime
  clinique n'est que **filtré par phase** (`ClinicalRuntimeSection` : prop
  `phase` additive, défaut `tout` inchangé). Aucun instrument n'a disparu.
  Rail des phases **et** onglets in-fiche navigables au clavier (flèches /
  Origine / Fin, `tabindex` roving). Le `ProtocolMiniBuilder` et la boussole
  alimentaire restent montés (masqués via `hidden`, jamais démontés) : la
  saisie de protocole en cours et l'aliment sélectionné sont **préservés** en
  changeant de phase. Statuts du rail dérivés de l'état réel : réponses reçues,
  demande de correction en attente, épisode confirmé, versions ; Réévaluation
  « renseignée » **uniquement si un jalon post-T0 (J21/J42/J90) a réellement
  été mesuré** (booléens `mesure` de la trajectoire — un T0 confirmé seul ne
  suffit pas) ; runtime en chargement/erreur ou trajectoire illisible → statut
  « **indéterminée** », jamais une affirmation par défaut. Une **demande de
  correction patient** est signalée en permanence dans le bandeau, quelle que
  soit la phase. Erreurs du runtime (dont session expirée) **hors filtre de
  phase** ; états vides explicites en Suivi / Réévaluation sans épisode ; un
  **échec de lecture de la trajectoire** est distingué d'une absence d'épisode
  (message + « Réessayer ») sur les **deux chemins d'affichage** — onglet
  Trajectoire et phase Réévaluation du cockpit — sans jamais afficher
  « aucun épisode » sur une erreur. La **requête en vol** est elle aussi un état
  « chargement » explicite sur les deux chemins : pendant la lecture, ni le
  panneau (« aucun épisode ») ni le rail (« à ouvrir ») n'affirment quoi que ce
  soit — statut « indéterminée » jusqu'à résolution.
  Routes pleine page `.../besoins` et `.../alimentation` **conservées**
  (accès direct par URL), l'accès principal passant désormais par les onglets.
- **Finitions poste de pilotage** (PR 4, suivi de revue) : (1) l'état vide de la
  phase Réévaluation est reformulé de façon **structurelle** — l'absence de cycle
  est rattachée à l'absence d'épisode confirmé, jamais présentée comme un
  « résultat de lecture » de la trajectoire (qui n'est pas lue tant qu'aucun
  épisode n'est confirmé) ; (2) le **signal de demande de correction** (B2) est
  hissé au niveau de la fiche : il reste visible depuis **tous les onglets**
  (« 12 besoins », « Alimentation », « Trajectoire »…), plus seulement le cockpit,
  et son raccourci ramène au cockpit sur la phase Patient ; (3) **renforts de
  couverture** — clavier des onglets (focus réel via `activeElement`, Origine/Fin,
  bouclage), état Réévaluation sous erreur runtime (aucun état vide affirmé),
  `index` de trajectoire réaliste dans le stub, assertions de statut durcies.
  Pure présentation : aucune route, aucun contrat d'API, aucune logique clinique.
- Aucune logique clinique, aucun seuil, aucune migration Prisma ; garde-fous 5.0
  respectés (statut jamais par la seule couleur, aucun score patient).

### Direction UX 5.0 « poste de pilotage » + canvas mid-tone A5-R2 (2026-07-18)

- Registre : arbitrages **A5-R2** (canvas mid-tone « ardoise & sable » —
  praticien `#D3D8E6` / cartes blanches, patient `#EAE0CC` / cartes crème ;
  structure A5 conservée, aucun toggle) et **A6-R1** (poste de pilotage :
  cockpit borné à l'écran, cycle clinique en colonne vertébrale, instruments
  à tiroir, métriques actives, patient séquentiel, typographie remontée).
- `design-system-d1.md` §9 : tokens v3 + matrice de contraste A5-R2
  (AA/AAA re-vérifié ; vigilance texte muted ~4,6:1).
- Audit de conformité UX 5.0 du front praticien/patient :
  `docs/claude/campagnes/AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`.
- Proposition + maquette autonome :
  `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`.
- Alignement additif de la direction dans les `CAMPAGNE.md` du front UX
  (section « Direction UX 5.0 »).
- **Aucun changement clinique, aucun seuil, aucun code applicatif** :
  A5-R2/A6-R1 sont actés en documentation, non appliqués à `globals.css` ;
  l'implémentation est livrée par campagnes (Vague 1 sans migration).

### C5 LOT-07 — Validation, conformité et handoff (2026-07-18)

- Clôture de la tranche C5 « Boussole alimentaire » à `8/8`. Dossier de preuves
  produit : `MATRICE_CONFORMITE_ET_TESTS_C5.md`, `VALIDATION_FINALE_C5.md`,
  `DETTE_C5.md`, `HANDOFF_C5.md`, `ACTIVATION_RUNBOOK_C5.md`.
- **Trois verdicts go/no-go indépendants** : C5A GO, C5B praticien GO, C5B patient
  GO conditionnel (dettes humaines ouvertes : accessibilité, E2E boussole des trois
  fixtures, vocabulaire, revue visuelle). Aucun verdict ne masque un volet en échec.
- Matrice technique verte (type-check, lint, **573 tests**, scoring-check, prisma
  validate) ; advisors Supabase sécurité/performance sans alerte bloquante (INFO) ;
  gardes routes flag→404, ownership→403, isolation patient→404 testées.
- **Aucun changement de code, aucune migration** : LOT-07 = validation + preuves.
  Activation en production demandée par le responsable ; mécanique documentée :
  `WN_C5_ENABLED=true` dans Vercel Production + redéploiement. Rollback = flag
  `false` (non destructif, aucun DROP/DELETE).
- **Activation confirmée le 2026-07-18** : `WN_C5_ENABLED=true` défini en Vercel
  Production et redéployé (déploiement aliasé `app.wellneuro.fr`). Smoke test :
  la route boussole non authentifiée passe de `404` (flag off) à `401` (flag on)
  ⇒ C5 active en production, avec les dettes du volet patient ouvertes.

### C5 LOT-06 — Assiettes, substitutions et pont JA (2026-07-18)

- Transfert de la propriété des assiettes recommandées vers un catalogue C5B
  versionné et scellé (`c5b-plate-catalog-v1`, hashes par assiette). Aucune
  composition inventée ; `RecommendedPlateRef` optionnelle sur `TrialAction`
  (un épisode JA V1 reste lisible sans elle).
- Substitutions bornées aux familles cliniques validées avec justification
  praticien ; « aucune assiette proposée » est le défaut et la référence n'est
  jointe qu'à l'activation praticien explicite. Aucune substitution automatique.
- Pont JA en lecture seule via un contrat de faisabilité factuel
  (`ja-action-feasibility-v1`) : comptes d'observations praticien-validés,
  exposés séparément et sans altérer le profil intrinsèque C5A — aucun score,
  percentile ni recommandation. Aucun seuil de scoring modifié.
- Aucune migration Prisma ni changement de schéma (lecture du `ProtocolDraft`
  `practitioner_reviewed` existant, avec vérification d'intégrité). C5 reste
  inactive.

### C5 LOT-05 — UX patient « Jardin » (2026-07-18)

- Ajout d'une restitution Boussole strictement qualitative dans le protocole
  actif et l'espace alimentation, avec zoom profond sans nouvelle navigation.
- L'accès exige un portail authentifié, un suivi actif, la dernière version V2
  relue puis approuvée et une action alimentaire correspondant à la référence
  reconstruite depuis Ciqual. Les accès absents, caducs, révoqués ou
  inter-patient répondent par le même 404.
- La sortie patient exclut scores, percentiles, classements, poids, PRAL, hashes
  et versions internes. Les profils partiels ne sont pas diffusés, les doublons
  sont supprimés et aucune alternative n'est inventée.
- Durcissement associé de l'ownership des approbations de diffusion et de la
  détection des protocoles devenus caducs. C5 passe à 6/8 mais reste désactivée.

### C5 LOT-04 — UX praticien « Observatoire » (2026-07-18)

- Ajout d'une Boussole en lecture seule dans le cockpit praticien, sans nouvelle
  navigation : profil intrinsèque chiffré et tabulaire, PRAL, poids nominaux,
  complétude, provenance, versions, limites et manifeste des 12 vedettes hashé.
- La lecture contextuelle est bornée au fil de protocole affiché et expose la
  priorité ainsi que la version source avant toute préparation d'insertion.
- L'insertion reste doublement explicite et manuelle. La référence est
  reconstruite côté serveur depuis Ciqual 2025 et le protocole actif ; les
  références forgées, caduques, incomplètes ou liées à une autre priorité sont
  rejetées, puis le protocole V2 final est revalidé.
- Ajout des contrôles d'ownership sur la lecture et l'écriture de l'historique
  des versions de protocole. Aucune diffusion patient automatique, migration,
  import ou activation ; C5 passe à 5/8 et reste désactivée.

### C5 LOT-03 — moteurs et contrats versionnés (2026-07-18)

- Ajout des contrats C5A/C5B déterministes : profil intrinsèque chiffré,
  lecture contextuelle, référence d'action, vue patient qualitative et
  référence d'assiette, tous versionnés et hashés.
- Application du mapping clinique signé `equilibre_assiette`, du PRAL
  Remer–Manz et de la pondération 90/10 sans imputation. La distribution est
  scellée sur Ciqual 2025 V1 ; un contrôle depuis les XML officiels reproduit
  les 12 fixtures praticien signées.
- Ajout du payload protocole V2 pour les références C5, avec compatibilité V1,
  ancrage sur l'identifiant et l'empreinte du protocole source, retour en
  brouillon à chaque modification et invalidation des approbations antérieures.
- La vue patient exige un V2 réellement relu et approuvé, refuse les profils
  partiels et ne contient aucun score, pourcentage ou classement. C5 reste
  désactivée par défaut via `WN_C5_ENABLED=false` et passe à 4/8.

### C5 LOT-02 — migration du référentiel Ciqual (2026-07-18)

- Ajout du modèle PostgreSQL/Prisma `CiqualNutrientValue`, versionné par
  dataset, aliment et constituant, avec valeur exacte décimale nullable,
  statut explicite, unité, provenance et empreinte source.
- Contraintes SQL fermées pour les statuts et unités, cohérence
  valeur/statut, valeurs non négatives et unicité composite.
- Identité clinique `NeuroAxis` rendue append-only par
  `axisCode + versionMapping`; les poids se rattachent désormais à cette même
  identité versionnée.
- RLS deny-all activée sur la nouvelle table, sans policy ni privilège Data
  API pour `anon` ou `authenticated`.
- Migration confirmée sous la référence
  `C5-LOT02-MIGRATION-MC-2026-07-18-v1`, rejouée sur PostgreSQL éphémère avec
  dérive Prisma nulle, puis appliquée en production par le pipeline Vercel au
  commit `3c0019989cae3ed2b76d8b57de1a61a5a2348374`. Préflight réussi, migration
  Prisma confirmée et smoke test HTTP 200. Aucun import Ciqual ni activation C5
  dans cette étape.
- Ajout de l'importeur transactionnel Ciqual, dry-run par défaut et fail-closed,
  confirmé sous `C5-LOT02-IMPORT-MC-2026-07-18-v1`. Le dry-run officiel et le
  replay PostgreSQL éphémère produisent 55 744 lignes pour 3 484 aliments et
  16 constituants ; une seconde exécution est un no-op et une cible partielle
  est refusée. Import Production exécuté au commit
  `3de796d6996cf2278d061fb90a0bfa126e434a65` après advisors sans anomalie :
  55 744 lignes, 3 484 aliments, 16 constituants et un hash source ; RLS active,
  zéro policy et zéro grant Data API. Le déclencheur temporaire a été retiré,
  LOT-02 est terminé et C5 passe à 3/8 en restant inactive.

### C5 LOT-01 — seconde passe documentaire clinique (2026-07-18)

- Calcul reproductible du PRAL Remer–Manz sur Ciqual 2025 V1 : 2 347/3 484
  aliments complets, `p5 = -8,70089` et `p95 = 14,69258 mEq/100 g`, sans
  imputation des absences, traces ou valeurs sous limite.
- Production des vecteurs pondérés attendus de la cohorte pilote des 12
  aliments sous la référence `C5-LOT01-VECTEURS-2026-07-18-v1` : 12 noyaux
  obligatoires complets, deux profils complets et dix profils partiels.
- Sources primaires, limites d'interprétation et niveau de preuve WellNeuro B
  rattachés aux liaisons du mapping `equilibre_assiette`.
- Résultats signés le 2026-07-18 par Martial CAYRE sous la référence
  `C5-LOT01-VECTEURS-2026-07-18-v1`, identifiée par
  `fb138bd784431713c26d0e4d93053189c3359d99`. LOT-01 est terminé et C5 passe
  à 2/8 tout en restant inactive ; aucun code, score patient, migration, import
  ou activation n'est introduit.

### TRUST V1 — information patient, consentements et sécurité relationnelle (2026-07-16)

- Campagne TRUST exécutée de bout en bout (LOT-00 → LOT-07) : documents
  d'information versionnés à hash verrouillé (le consentement est enfin lié
  à son texte), séquence « Avant de commencer » (4 écrans, accusé de
  lecture distinct de toute autorisation), centre permanent « Informations,
  confidentialité et droits » accessible de toutes les pages, choix
  facultatifs append-only avec retrait aussi simple que l'accord,
  signalements structurés (effet indésirable, incident de confidentialité,
  demandes de droits), file praticien « Confiance & droits » + cartes en
  tête du Fil, notifications externes génériques.
- Migration additive `trust_v1` (5 tables append-only, RLS deny-all),
  appliquée par l'utilisateur après confirmation explicite.
- **Aucun scoring ni seuil clinique modifié.** Nouvelle règle versionnée
  `orientation-effet-indesirable v1` : aiguillage déterministe d'un message
  d'orientation sur la sévérité déclarée par le patient (aucun calcul,
  aucune causalité) — validée par le praticien en relecture de PR.
- Gates non levés documentés (juridique externe, hébergement/sécurité,
  panel humain) : `GATES_GO_NO_GO.md`, dettes datées dans `DETTE_TRUST.md`.

### Typographie display appliquée + programme « disposition 5.0 » (2026-07-15)

- Correctif A5-R1 : la classe `font-display` (Sora praticien / Bricolage
  Grotesque patient) est désormais appliquée aux titres (pages dashboard,
  fiche patient, login, portail patient) — elle était mappée mais consommée
  nulle part. Wordmark login passé de l'accent solaire (2,03:1, interdit en
  texte par la règle de relief) au primaire indigo.
- Gouvernance : décision A6 au registre — la disposition « la Spirale » 5.0
  devient la cible UX des deux fronts, livrée par campagnes
  (`docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md`) ; les cinq questions
  ouvertes du brainstorm sont arbitrées
  (`ARBITRAGES_QUESTIONS_OUVERTES.md`). Aucun changement clinique.

### DA « la Spirale » — adoption dans le design system (2026-07-15)

- Révision A5-R1 actée au registre : structure A5 conservée (tout clair,
  rail sombre signature, patient clair fixe), teintes et typographies
  évoluées. Praticien « Nuit spectrale » (indigo/menthe/solaire, Sora +
  Instrument Sans + IBM Plex Mono) ; patient « Forêt & cuivre » (forêt/
  cuivre/ivoire, Bricolage Grotesque + Albert Sans). Tokens sémantiques
  uniquement — aucun composant re-écrit pour la bascule de teintes.
- Trio catégoriel Corps/Ancrage/Esprit remappé vers menthe/indigo/solaire
  (validé accessibilité), consommé via les nouveaux tokens `--viz-*`.
- Présentation des sous-scores : nouveau composant `ScoreZones` (point sur
  zones de seuil, valeur T0 en point creux). **La logique clinique, les
  scorings et les seuils sont strictement inchangés** — les zones sont
  dérivées des bornes d'interprétation existantes, jamais ré-encodées.

### C1 — Décision clinique 21 jours V1 (2026-07-14)

- Ajout des contrats purs et versionnés `AssessmentEpisode`,
  `ClinicalSnapshot`, `ClinicalReview`, `DecisionCard`, `ProtocolDraft` et
  `PatientProtocolView`, sans persistance ni activation runtime.
- Le cockpit praticien distingue données manquantes, décision, brouillon de
  protocole, revue et validation locale pour diffusion. La charge reste
  déclarée par le praticien et n’est jamais calculée.
- La projection patient est construite par liste blanche et demeure
  `not_transmitted`. Aucun détail praticien, appel IA, API de diffusion ou
  changement de scoring n’est ajouté.
- Le verdict de campagne sépare validation technique, validation ergonomique
  humaine et capacité runtime d’activation/diffusion.

### Architecture clinique 3.2 — réconciliation WN Ultimate v2 (2026-07-13)

- Promotion documentaire des contrats `AssessmentEpisode`,
  `ClinicalSnapshot`, `DecisionCard` et `ProtocolDraft`, sans code clinique ni
  migration.
- Frontières réconciliées : C1 prépare les brouillons, C2 possède
  persistance/activation/longitudinal, JA possède le journal alimentaire,
  C5A devient intrinsèque et C5B contextuel.
- Ajout d'un registre sanitaire expurgé de 391 sources : droits à vérifier,
  revue clinique non effectuée, aucun hash ni localisateur Drive versionné,
  activation runtime interdite.
- `.wn/state.json` devient l'autorité machine des campagnes ;
  `ACTIVE_CAMPAIGN.md` est généré et aucune campagne, y compris `_prepared`,
  n'est sélectionnée implicitement.
- Aucun changement du scoring Mon équilibre, des questionnaires ou du schéma
  Prisma.

### Cache documentaire clinique V1 — préparation technique (2026-07-10)

- Découpage du prompt système de synthèse en blocs stables explicites
  (gouvernance + contrat JSON), avec versionnement applicatif explicite :
  `VERSION_PROMPT_SYNTHESE`, `VERSION_SCHEMA_SYNTHESE`, `VERSION_CORPUS_SYNTHESE`.
- Ajout d'un snapshot applicatif `corpus-clinique-v1` avec empreinte
  `SHA-256` pour traçabilité d'audit (`web/src/lib/clinical/corpusSyntheseV1.ts`).
- Garde-fou d'activation : le corpus clinique reste désactivé tant que la
  validation clinique externe n'est pas confirmée, même si le flag runtime
  d'activation est présent.
- Route synthèse enrichie sans migration Prisma : persistance des métadonnées
  prompt/corpus et des métriques cache Anthropic non sensibles dans
  `donneesEntree` (`input_tokens`, `output_tokens`,
  `cache_creation_input_tokens`, `cache_read_input_tokens`).
- Alignement UI gouvernance : la page paramètres affiche désormais la version
  de prompt réellement utilisée par la route de synthèse.
- Ajout du script `npm run prompt-cache-check` (endpoint Anthropic token
  counting) pour vérifier le seuil du modèle réel et l'état de préparation du
  préfixe stable avant activation.

### R2 — Pack « Base de consultation » finalisé + lisibilité patient (2026-07-10)

- **Constat** : le pack de base (`Pack.parDefaut`) était déjà complété en prod (2026-07-09, via l'UI praticien `PacksPanel`) avec les 4 questionnaires cibles documentés depuis le 2026-07-08 — `Q_MOD_03` (Plaintes, 5 min), `Q_MOD_01` (Mode de vie SIIN, 10 min), `Q_ALI_01` (Alimentaire SIIN, 15 min), `Q_INF_03` (DNSM, 15 min), soit ≈45 min. Anti-doublon anamnèse garanti par conception (anamnèse volontairement resserrée pour ne pas recouper ces 4 thèmes). Aucune écriture en base n'a été nécessaire pour ce lot — seule la documentation (`SESSION_LOG.md`/`roadmap.md`) était en retard sur l'état réel.
- **Ordre d'affichage déterministe** : les questionnaires d'un même pack partageaient une `dateAssignation` identique (assignation en boucle avec un seul horodatage figé dans `assignBasePack.ts`), rendant leur ordre d'affichage non garanti dans le hub. Ajout d'un tri secondaire `createdAt asc` (qui croît naturellement dans l'ordre de la boucle d'assignation) dans `api/portail/assignations` et `api/patient/assignations` — aucun changement côté assignation.
- **Durée estimée côté patient** : `AssignationPatient` expose désormais `duree` (résolue depuis `lib/questionnaires-catalog.ts`, jusqu'ici réservé au praticien). Affichée par questionnaire dans le hub, et en total pour la section « À compléter ».
- **Lisibilité mobile** : le titre de carte questionnaire (`truncate` une ligne) passe en `line-clamp-2` dans le hub — le titre DNSM (61 caractères) ne se coupe plus.
- Vérifié : `type-check` propre, `check_no_secrets` OK. Aucune migration Prisma/SQL, aucune modification de scoring clinique.

### Synthèse IA du premier bilan — enrichissement par le contexte anamnestique (2026-07-08)

- **Objectif** : la synthèse IA (`api/praticien/synthese`) ne s'appuyait que sur les scores de questionnaires. Elle exploite désormais la **fiche signalétique** et l'**anamnèse** déjà saisies via le portail patient (blobs JSON sur `Consultation`, jusqu'ici jamais relus) pour produire une synthèse mieux contextualisée. **Purement additif : aucune migration Prisma, aucune UI nouvelle.**
- **Nouveau module déterministe** `lib/consultation/contexteClinique.ts` (dans l'esprit de `lib/scoring/miniSynthese.ts`, aucune logique clinique nouvelle) :
  - `buildContexteClinique(fiche, anamnese)` → bloc texte français lisible du **cœur clinique** (motif & attentes, histoire des troubles, antécédents, IMC calculé, contexte de vie : sommeil/activité/alimentation/profession). Écarte le bruit administratif (composition du foyer, nombre d'enfants).
  - `extraireVigilanceDeterministe(anamnese)` → points de vigilance **garantis** (signaux d'alerte médicaux cochés, traitements/automédication/compléments en cours), indépendants du LLM.
- **Garde-fous cliniques** (approche déterministe + IA) : les signaux d'alerte et traitements sont fusionnés **en tête de `points_de_vigilance`** même si le LLM les omet. Le contexte est aussi injecté dans le prompt pour enrichir le raisonnement.
- **System prompt v2** (`SYSTEM_PROMPT_SYNTHESE`) : nouvelle section « Contexte anamnestique et signalétique » (motif/attentes cadrent les axes ; histoire/antécédents/contexte de vie nuancent ; signaux d'alerte → vigilance + avis médical ; médicaments/compléments → vigilance interaction **sans dosage, ajout ni arrêt**). Garde-fous déontologiques conservés. `versionPrompt`/`_schema_version` passent à `v2` ; `donneesEntree` trace désormais le contexte clinique (traçabilité).
- **Rattachement** : une seule anamnèse par patient → récupérée par `idPatient` (consultation portant `anamnese != null`, la plus récente). Dégradation gracieuse : la synthèse fonctionne avec les questionnaires seuls si aucun contexte n'est renseigné.
- **Format de sortie JSON inchangé** (`SyntheseSchema`) → `SynthesePanel` et la route booklet restent compatibles, aucune modif front. Périmètre hors lot (phase 2) : compte rendu de fin de consultation (synthèse longitudinale).

### Portail patient — token d'accès permanent & onboarding consultation (2026-07-07)

- **Objectif** : le praticien envoie au patient un lien d'accès **permanent** (révocable) ouvrant un onboarding structuré — consentement → fiche signalétique → anamnèse hiérarchisée (portant le **motif de consultation**) — au terme duquel le **pack de base par défaut** est assigné automatiquement. Reconnexion via l'email pré-enregistré par le praticien (second facteur). Aucune session NextAuth côté patient.
- **Pack de base** : le pack « Base de consultation » (prod) est marqué `par_defaut=true` ; le résolveur de `valider` prend `parDefaut` actif en priorité (repli sur le nom). *Note : ce pack ne contient que 3 questionnaires en prod à ce jour — à compléter côté praticien pour atteindre le périmètre visé.*
- **Schéma** (migration `20260707160000_patient_portail_consultations`, **appliquée en prod Supabase** + local) :
  - `Patient` : `access_token` (unique), `access_token_revoked`, `access_token_created_at` (token portail permanent, révocable).
  - `Pack` : `par_defaut` (désigne le pack de base ; un seul actif à la fois, garanti applicativement).
  - Nouveau modèle `Consultation` (`consultations`, RLS deny-all cohérent avec `enable_rls_security`) : historisable, porte statut (`creee`→`en_cours`→`validee`), motif, consentement + horodatage/version, `fiche_signaletique` (JSON), `anamnese` (JSON), `date_validation`, `id_pack_assigne`.
- **Fondations** (`lib/consultation/`) : `motifs.ts` (liste enrichable des grandes catégories d'intervention), `fiche.ts` / `anamnese.ts` (structures + normalisation défensive), `portail.ts` (résolution token+email partagée, `CONSENTEMENT_VERSION`), `email.ts` (lien portail best-effort SMTP), `assignBasePack.ts` (fan-out pack → assignations avec consentement pré-donné). `createPublicId` accepte `'CONS'` et `'TOK'`.
- **Anamnèse resserrée** (adaptée neuronutrition) : volontairement non redondante avec le pack de base (qui score déjà plaintes/douleurs, mode de vie, alimentaire, DNSM). Ne garde que repères corporels, motif & attentes, histoire des troubles, signaux d'alerte, antécédents, et **traitements/compléments en saisie répétable** (plusieurs médicaments/compléments). Champs `text`/`textarea`/`radio`/`checkbox-multi` + groupes répétables. L'exploitation praticien (axes, biologie, phases 21 j) reste hors périmètre patient.
- **API praticien** : `api/praticien/token` (POST émettre/renvoyer, DELETE révoquer), `api/praticien/consultations` (POST créer une consultation + assurer le token + envoyer le lien, GET historique) ; `api/praticien/packs` PATCH accepte `parDefaut` (démarque les autres).
- **API portail** (token+email, sans session) : `api/portail/{session,consentement,fiche,valider}`. `valider` enregistre l'anamnèse, résout le pack de base (`parDefaut` actif, repli sur le nom « BASE DE CONSULTATION ») et assigne le pack.
- **UI** : nouvelle route `portail/[token]` (state machine gate→consent→fiche→anamnèse→terminé, formulaires dédiés) + `portail/layout.tsx`. Côté praticien, `PatientsPanel` gagne une carte « Consultation & accès patient » (créer/envoyer, renvoyer, révoquer) ; `PacksPanel` un bouton « Définir par défaut » + badge « Pack de base ». Le flux `/patient/[idAssignation]` existant est inchangé.
- Vérifié : `type-check` propre (périmètre feature), routes compilées, endpoints portail/praticien testés au runtime (validation, auth token+email, résolution DB). Parcours « happy-path » (création des assignations) non rejoué en base partagée pour ne pas écrire de données ni toucher le pack de base réel — logique factorisée depuis `packs/assign` déjà éprouvé.

### Refonte UX praticien — lots A→D (2026-07-07)

- **Lot A — Dashboard (`dashboard/page.tsx`)** : suppression du bloc statique « Feuille de route migration » (Lot 0→C5, tout coché, devenu mort) ; ajout de « Accès rapides » (cartes-liens vers Patients / Synthèse IA / Paramètres) et « Patients à traiter » (liste courte des questionnaires en attente, statut ≠ « Complété », dérivée de l'API `praticien/patients` — nouveau composant client `PatientsATraiter`). Aucun changement d'API ni de schéma.
- **Lot B — Filtre catégorie à l'assignation (`PatientsPanel.tsx`)** : `<select>` « catégorie » (valeurs distinctes de `questionnaires[].categorie`, tri FR) devant le sélecteur de questionnaire du formulaire « Nouvelle assignation ». Filtrage côté client ; « Toutes les catégories » par défaut ; réinitialisation du questionnaire sélectionné au changement de catégorie.
- **Lot C — Vue d'ensemble équilibre sur la fiche patient (`FichePatientPanel.tsx`)** : section « Vue d'ensemble de l'équilibre » rendant `CerclesConcentriques` (3 anneaux Corps/Ancrage/Esprit) à partir des 12 besoins déjà chargés. La route `api/praticien/equilibre` expose désormais `strate` sur `PrioriteBesoin` (dérivée de `BESOINS`, aucun calcul/seuil clinique modifié) — évite un second appel réseau. Les 5 objets cliniques restent en place.
- **Lot D — Packs de questionnaires éditables** : portage du modèle « Packs » du GAS legacy vers Next.js/Prisma.
  - Nouveau modèle Prisma `Pack` (`id_pack`, `nom`, `thematique`, `description`, `qids String[]`, `actif`, timestamps) + migration `20260707150000_add_pack_model` (table `packs` + RLS deny-all, cohérent avec `enable_rls_security`). **Migration appliquée en prod Supabase.**
  - Nouvelles routes API `api/praticien/packs` (CRUD : liste, création, mise à jour, désactivation soft `actif=false`) et `api/praticien/packs/assign` (assignation groupée : N assignations depuis un pack, statut « En attente », notes par défaut « Pack &lt;nom&gt; », + un seul email récapitulatif best-effort).
  - Nouveau composant `PacksPanel.tsx` (création avec sélection de questionnaires filtrée par catégorie, liste + désactivation, assignation à un patient) monté dans `PatientsPanel`. `createPublicId` accepte désormais le préfixe `'PACK'`.
- Livré en 4 PR séparées (#26–#29), mergées sur `main` et déployées en prod ; contrôle visuel praticien validé.

### Écran patient « Mon équilibre » (2026-07-07)

- Le portail patient (`patient/[idAssignation]`) gagne deux nouveaux écrans dans son parcours existant (pas de nouvelle authentification, pas de nouvelle route Next) : accessibles via un bouton "Voir Mon équilibre" depuis l'écran de consultation (réponses verrouillées).
  - **Mon équilibre** (`MonEquilibreAccueil.tsx`) : indicateur circulaire (indice global), tendance de momentum (hausse/stable/baisse — jamais le delta chiffré ni les niveaux de preuve, réservés praticien), frise de trajectoire, 2-3 priorités en langage patient (`libellePatient`, jamais de jargon clinique).
  - **Mes 12 besoins** (`MonEquilibreDetail.tsx`) : réutilise `CerclesConcentriques` en mode patient (légende simplifiée par strate, sans niveau de preuve).
- Nouvelle route API `api/patient/equilibre?id=&email=` (même vérification d'accès que `api/patient/reponses`) : expose uniquement des données patient-safe.
- Dette signalée, hors périmètre de ce lot : le reste du portail patient (`EmailGate`, `ConsentScreen`, `GenericQuestionnaire`) reste en Tailwind bleu en dur, pas encore migré vers les tokens D1 — ces deux nouveaux écrans sont les premiers du portail patient à les utiliser.

### Nettoyage dashboard praticien — D1 (2026-07-07)

- `dashboard/page.tsx` : suppression de la bannière "Migration en cours" (renvoyant vers l'app Apps Script décommissionnée le 2026-07-03) et de la checklist associée devenue obsolète ; "Lot C5 — Décommission Apps Script" passe à fait.
- `SynthesePanel.tsx` migré vers les tokens sémantiques du design system D1 (`bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`) — dernier composant praticien encore sur l'ancien theming Tailwind en dur.

### Détail des 12 besoins praticien (2026-07-07)

- Nouvelle route `dashboard/patients/[idPatient]/besoins`, liée depuis la fiche patient : radar de synthèse (`ScoreRadar`) et liste à plat des 12 besoins côte à côte (pas de drill-down), badge de niveau de preuve A/B/C/D ou "non mesuré", info-bulle listant les questionnaires sources. Classification domino non affichée (réservée au moteur de priorisation interne).
- Nouvelle route API `api/praticien/besoins?idPatient=`.
- Nouveau composant `CerclesConcentriques.tsx` (SVG, repli 2D des trois sphères prévues pour l'écran patient) : 3 anneaux colorés par strate (teal Corps, violet Ancrage, or Esprit), intensité de couleur = couverture, jamais de rouge/gris/noir. Pas encore consommé dans cette PR (préparatoire pour l'écran patient "Mon équilibre").
- Nouveau token de palette `--violet-600`/`--violet-300` (`globals.css`, `tailwind.config.ts`) pour la strate Ancrage — seule strate sans couleur dédiée jusqu'ici (teal/or déjà utilisés).
- Vérifié de bout en bout contre la base de dev locale (Sophie Nicola).

### Fiche patient praticien — Cartographie neuro-fonctionnelle (2026-07-07)

- Nouvelle route `dashboard/patients/[idPatient]` : fiche patient dédiée avec les 5 objets cliniques (indice global, stabilité métabolique, réserve d'adaptation, clarté, momentum) et la liste des priorités des 21 prochains jours (12 besoins triés par couverture croissante, badge de niveau de preuve A/B/C/D ou "non mesuré", légende).
- Nouvelle route API `api/praticien/equilibre?idPatient=` (authentifiée) exposant ces données, calculées via le moteur d'équilibre (Lots précédents) + l'adaptateur Prisma.
- Le bouton "Résultats" (panneau inline) de la liste patients est remplacé par un lien "Fiche patient" vers cette nouvelle page. Le tableau détaillé des réponses (certification, réponses manquantes/non applicables) et le déblocage des demandes de modification, auparavant inline dans `PatientsPanel`, sont déplacés tels quels dans la fiche patient — aucune fonctionnalité perdue.
- Vérifié de bout en bout contre la base de développement locale (patiente fictive Sophie Nicola, réponse de test ajoutée puis supprimée) : les questionnaires seedés sans `rawAnswers` restent non mesurés, comme attendu.

### Moteur équilibre — adaptateur Prisma (2026-07-07)

- `web/src/lib/equilibre/depuisPrisma.ts` : reconstruit les réponses par questionnaire d'un patient (`ReponsesParQuestionnaire`) à partir des lignes `QuestionnaireReponse` (Prisma), en dédoublonnant par `idQuestionnaire` (dernière réponse retenue) et en n'utilisant que les réponses brutes exploitables (`scoresJson.rawAnswers`, cf. `api/patient/submit`) — les réponses sans `rawAnswers` (données antérieures à ce chantier, déjà agrégées) sont ignorées plutôt que recalculées.
- `construireHistoriqueEquilibre` : historique borné aux 4 jalons T0/J21/J42/J90 pour le suivi momentum, consommable par `resoudreLectureJalon`/`calculerDeltaMomentum`. Convention actée pour `dateT0` (absente du schéma Prisma) : date de la toute première réponse du patient.
- `scripts/check_no_secrets.sh` : suppression du garde-fou "email non autorisé" — devenu obsolète depuis l'implémentation du passage en emails patients réels avec consentement (R8-lite). Les autres vérifications (clés API, secrets, SHEET_ID) restent inchangées.

### Lot 7 — Découpage du catalogue par domaine (2026-07-06)

- Amorce du refactor de `web/src/lib/questions.ts` : les jeux d'options standards (`O_*`) et les fabriques d'items (`q`/`qn`/`qs`) sont déplacés dans `web/src/lib/questionnaires/shared.ts` et importés par `questions.ts`.
- Extraction de la première catégorie complète, **Cancérologie**, dans `web/src/lib/questionnaires/cancerologie.ts` : `Q_CAN_01` (QLQ-C30) et `Q_CAN_02` (QLQ-BR23) sont désormais des `export const` référencés par le catalogue via l'import. `web/src/lib/questionnaires/index.ts` sert de point d'entrée par domaine.
- Aucune modification clinique : copie **byte-fidèle** des définitions (items, options, conditionnels, scoring `sum_items`, seuils, notes, métadonnées `certification`). `QUESTIONNAIRE_CATALOGUE` reste exporté à l'identique depuis `questions.ts` (mêmes 63 entrées, mêmes IDs, même ordre).
- `scripts/check_questionnaire_certification.js` : le loader « inline » désormais les imports relatifs locaux (`./questionnaires/*`) avant l'eval, pour continuer à valider le catalogue découpé sans dépendance à un bundler.
- Extension du Lot 7 à toutes les catégories : les 63 `Q_*` sont désormais extraits dans des modules de domaine (`web/src/lib/questionnaires/*.ts`) et `web/src/lib/questions.ts` ne conserve plus que l'assemblage du catalogue + le moteur de scoring.
- `web/src/lib/questionnaires/index.ts` centralise les réexports de tous les domaines, et `scripts/check_questionnaire_certification.js` suit aussi les `export ... from` locaux pour continuer à valider le catalogue modulaire sans régression.

### E0 — Route questionnaires sans Google Sheets (2026-07-06)

- `api/praticien/questionnaires` ne lit plus l'API Google Sheets (`Questionnaires!A:F` via `SHEET_ID` + token OAuth) : la liste est désormais servie depuis un catalogue statique en code, `web/src/lib/questionnaires-catalog.ts`.
- Le catalogue porte à l'identique les 59 entrées (58 actives, `Q_FIB_03` inactif) qui étaient écrites dans l'onglet Sheets par `initCatalogue()` du code GAS archivé : mêmes id, titres affichés, catégories, durées et ordre. Comportement du sélecteur praticien inchangé.
- Aucune modification clinique (ni scoring, ni seuils). Les entrées héritées `Q_SOM_08` et `Q_STR_07` (remplacées dans le catalogue de scoring par `Q_NEU_12` et `Q_NEU_11`) sont conservées telles quelles pour préserver la liste offerte ; leur recuration reste une tâche clinique séparée.

### Schéma V1 — Moteur d'intention clinique (2026-07-06)

- Ajout de 10 tables de référentiel clinique dans `schema.prisma` : `clinical_intent_tags`, `clinical_criteria`, `functional_categories`, `clinical_rules` (versionné, mapping direct 1 ingrédient), `ingredient_functional_thresholds`, `protocol_review_flags` (avec traçabilité d'override praticien), et le squelette minimal `supplement_ingredients`/`supplement_ingredient_formes`/`supplement_source_references`/`supplement_safety_alerts`.
- Aucune donnée de production affectée : migration purement additive (nouvelles tables), aucune table existante modifiée.
- Contexte, décisions d'audit (11 points) et périmètre V1/V2 documentés dans `docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md`.
- Pipeline de résolution des règles (parsing LLM, moteur de décision) non implémenté à ce stade — schéma de données uniquement.

### Certification questionnaires et scorings (2026-07-06)

- Passe Drive 2026-07-07 neuro-psychologie aidants : certification de `Q_NEU_09` Zarit ; alignement sur les 22 items Drive `Q001` à `Q022`, échelle 0-4 et seuils de fardeau 0-20 / 21-40 / 41-60 / 61-88.
- Passe Drive 2026-07-07 neuro-psychologie addictions : certification de `Q_NEU_07` AUDIT alcool ; alignement sur les IDs Drive `Q001` à `Q010`, options `0/2/4` pour Q009-Q010, score 0-40 et seuils différenciés femme/homme testés.
- Passe Drive 2026-07-07 stress complémentaire : certification de `Q_STR_06` Karasek et `Q_STR_08` WART ; alignement strict sur les IDs Drive `Q001`..., formules Karasek avec items inversés, Job strain/Isostrain, et seuils WART 25-54 / 55-69 / 70-100.
- Passe Drive 2026-07-07 catégorisation : suppression de la catégorie Inflammation au profit de Neuro-psychologie, maintien de Stress comme catégorie autonome (`Q_STR_*`), AUDIT alcool conservé uniquement en Neuro-psychologie (`Q_NEU_07`), et remplacement de `Q_MOD_03` par Plaintes actuelles / troubles ressentis depuis le MD Drive, avec scoring descriptif 7-70 et fixture certifiée.
- Passe Drive 2026-07-07 neuro-psychologie : certification de `Q_NEU_01` BDI et `Q_NEU_11` HAD ; alignement des libellés HAD divergents, métadonnées `certification` et fixtures min/max ajoutées, avec rattachement documenté du score BDI 0 au premier seuil Drive.
- Passe Drive 2026-07-07 neuro-psychologie complémentaire : certification de `Q_NEU_02` MADRS, `Q_NEU_05` UPPS, `Q_NEU_10` Dépendance à Internet et `Q_NEU_12` IDTAS-AE ; alignement strict sur les IDs Drive `Q001`..., seuils MADRS 0-6/8-18/20-35/36-60 (scores 7 et 19 non classés par la source), sous-échelles et items renversés UPPS conformes à la cotation professionnelle Drive (sans seuil clinique, absent de la source), et réordonnancement des items Poids/Appétit/Énergie de la partie 2 IDTAS-AE. Correction technique associée : les moteurs de scoring `upps` et `idtas_ae` ne propageaient pas les métadonnées `certification`/`note` vers le résultat, désormais alignés sur les autres types de scoring.
- Source de vérité de cette passe : fichiers `.md` du dossier Google Drive `QUESTIONNAIRES MD`, hors `00_index_*`. Les versions officielles externes ne priment pas sur Drive dans cette certification.
- Ajout de `docs/questionnaires-drive-mapping.md` : table de mapping `Q_*` ↔ MD Drive, avec statuts explicites pour les bonus, doublons, historiques ou absents Drive.
- `Q_NEU_03` : restauration du SIGH-SAD-SA Drive complet, 25 questions, groupes A/B et règle spéciale Q15-Q17. Ajout du moteur `sigh_sad_sa` avec score groupe A, score groupe B, total et note source.
- `Q_CAN_01` / `Q_CAN_02` : retour au scoring brut indiqué par les MD Drive (`sum_items`) au lieu de la transformation externe EORTC 0-100. Les seuils incohérents présents dans les MD restent documentés en note, sans correction clinique externe.
- `Q_CAN_02` : les conditionnels Drive Q005/Q016 sont retournés en `notApplicable` quand masqués, la source ne précisant pas de cotation stricte.
- `Q_PED_03` : alignement sur le MD Drive Conners 3 Parent, 108 items scorés cotés 0-3 et somme brute 0-324. Les deux questions ouvertes source restent documentées en note, non codées dans le catalogue faute de support UI texte.
- Ajout du moteur générique `sum_items` pour les sommes brutes sur sous-ensembles d'items, avec `missing`, `missingIds`, `notApplicable`, `note` et interprétation optionnelle.
- Enrichissement de la matrice `docs/questionnaires-drive-mapping.md` : statuts séparés items/options/conditionnels/scoring/interprétation/tests pour tous les `Q_*`.
- Ajout du contrat cible `ScoreResultBase` dans `web/src/lib/scoring/types.ts` et de métadonnées `certification` non cassantes sur les scores Drive fraîchement certifiés.
- Ajout de `npm run scoring-check` : vérification de couverture de la matrice, types de scoring connus et fixtures min/max/médian/conditionnels des questionnaires certifiés.
- Portail praticien : affichage non cassant des badges de certification, réponses manquantes, items non applicables et notes de scoring quand ces champs existent dans `scoresJson`.
- Lot 6 gouvernance : ajout de `docs/gouvernance-questionnaires-scoring.md` et durcissement des règles `AGENTS.md` pour imposer changelog + matrice + fixture lors des modifications cliniques.
- Lot 8 contrôles : `scoring-check` parse désormais la matrice, valide les statuts, impose les fixtures certifiées, vérifie les types de scoring connus et smoke-teste tout le catalogue contre les `NaN`/`Infinity`.
- `npm run setup:check` lance maintenant aussi `npm run scoring-check`.
- Passe Drive 2026-07-07 : certification sans changement de libellés ni seuils de `Q_STR_05`, `Q_NEU_04`, `Q_INF_01`, `Q_INF_02`, `Q_INF_03`, `Q_SOM_05`, `Q_PED_01` et `Q_GEO_02`; ajout des métadonnées `certification` et fixtures min/max associées.
- Passe Drive 2026-07-07 complémentaire : certification de `Q_INF_04`, `Q_INF_05` et `Q_NEU_08`; alignement des options auto-anxiété sur l'échelle Drive, des réponses ECAB sur `Faux`/`Vrai`, et du libellé complet HIT-6 Q2.
- Passe Drive 2026-07-07 tabacologie : certification de `Q_TAB_02` et `Q_TAB_05`; alignement Fagerström sur les libellés/options Drive et remise dans l'ordre Drive des items de manque Di Franza/HONC.
- Passe Drive 2026-07-07 tabacologie/pneumologie : certification de `Q_TAB_01` et `Q_PNE_01`; alignement motivation arrêt tabac sur Drive et remplacement du scoring BPCO à seuils locaux par les sous-scores Drive à suivre dans le temps.
- Passe Drive 2026-07-07 sommeil : certification de `Q_SOM_02` et `Q_SOM_06`; alignement Epworth/Pichot sur les libellés, options et seuils Drive, avec interprétation Epworth marquée ambiguë pour les scores non classés par la source.
- Passe Drive 2026-07-07 gastro-entérologie : certification de `Q_GAS_01` et `Q_GAS_02`; alignement TFD sur les 31 libellés/options Drive, correction du Score de Francis sur la formule Drive et maintien de l'ambiguïté TFD pour les seuils frontières non couverts par la source.
- Passe Drive 2026-07-07 fibromyalgie : certification ambiguë de `Q_FIB_02`; alignement QIF sur les sous-items/options Drive et conservation des ambiguïtés source sur le maximum 100/107 et la tranche 1-34 non interprétée.
- Passe Drive 2026-07-07 fibromyalgie complémentaire : certification de `Q_FIB_01` FiRST et documentation testée de l'ambiguïté `Q_FIB_03` ELFE, le catalogue local ne couvrant qu'un sous-ensemble de la fiche praticien Drive et aucun score automatique.
- Passe Drive 2026-07-07 urologie : certification ambiguë de `Q_URO_01` IPSS en conservant la cotation Drive atypique de Q002, et certification non scorée de `Q_URO_02` Catalogue mictionnel comme journal 3 jours.
- Passe Drive 2026-07-07 gérontologie : certification de `Q_GEO_01` Tinetti sur la source Drive présente, avec sous-scores équilibre /16 et marche /12, score total /28 et libellés d'observation alignés.
- Passe Drive 2026-07-07 stress : certification de `Q_STR_01`, `Q_STR_02` PSS, `Q_STR_03` Cungi et `Q_STR_04` DASS-21 ; alignement Stress SIIN sur les libellés Drive avec harmonisation documentée des seuils 4 et 15, alignement PSS sur la cotation Drive 1-5 / 5-1, alignement strict des libellés Cungi, retour DASS-21 aux IDs Drive `Q001` à `Q021` et aux sous-scores bruts 0-21, avec rattachement documenté des bornes très sévères non explicites.

### Lot C5 — Décommission GAS (2026-07-03)

- Migration historique des données Google Sheets → Supabase exécutée en production (patients, assignations, réponses).
- Suppression du déclencheur `sendReminders` et retrait du déploiement web côté Apps Script.
- Archivage de `src/gas/` dans `archive/gas-legacy/`, suppression des artefacts clasp restants (`deploy.sh`, `.clasp.json`).
- `app.wellneuro.fr` (Next.js) devient l'unique point d'entrée applicatif ; le MVP GAS est hors service.
- Dette technique restante documentée dans `docs/roadmap.md` : plusieurs routes praticien lisent/écrivent encore directement Google Sheets en parallèle de PostgreSQL.

### Phase 4 — Dashboard ops praticien (2026-06-28)

- Carte « Suivi opérationnel » dans la vue praticien avec compteurs : synthèses IA, validées/corrigées, booklets envoyés, erreurs audit.
- Dernière activité affichée (date dernière synthèse et dernier booklet).
- Tableau historique récent (20 derniers événements, triés par date).
- Filtre temporel : 7 jours, 30 jours, tout — met à jour compteurs et historique.
- Aucune modification de la logique clinique ou des seuils de scoring.

### Phase 3 — Booklet patient (2026-06-28)

- Génération du booklet HTML patient à partir d'une synthèse IA validée.
- Prévisualisation du booklet dans l'interface praticien (iframe).
- Impression / export PDF navigateur.
- Envoi manuel par email avec confirmation explicite de relecture.
- Protection anti-double envoi avec confirmation renforcée pour le renvoi.
- Audit des envois dans la feuille `Booklet_Envois` (email masqué, statut, opération).
- Validation de contenu minimum (narratif, axes ou points de vigilance) avant génération.
- Date du document basée sur la date de validation praticien.
- Ajout du prompt `prompts/generation_bilan_pdf.md` (cadre éditorial booklet).
- Ajout du mini-corpus `prompts/siin_mini_corpus.md`.

### Phase 2 — Synthèse IA praticien (2026-06-28)

- Génération de synthèse IA clinique via l'API Claude (UrlFetchApp).
- Stockage des synthèses dans `Syntheses_IA`, audit dans `Audit_Syntheses_IA`.
- Validation du schéma JSON avec valeurs par défaut pour les champs manquants.
- Détection de troncature (max_tokens) et erreurs API.
- Workflow praticien : générer, afficher, valider, rejeter, régénérer, noter.
- Sécurité : pas de log partiel de clé API, masquage emails/URLs/IDs dans l'audit.
- Protection XSS dans le rendu HTML (listes, questionnaires, résultats, synthèses).

### Phase 1 — MVP GAS (2026-06)

- Initialisation de la structure GitHub du MVP GAS.
- Ajout des fichiers de sécurité, documentation et workflow clasp.
- Catalogue de 50+ questionnaires SIIN.
- Système de packs et assignation par email.
- Moteur de questionnaires dynamiques avec scoring.
- Interface patient et praticien.
- Rappels pré-consultation automatiques.
- Migration emails vers wellneuro.fr.
