# Contre-revue adverse — BIO-INGEST, du dépôt du compte rendu au résultat validé (2026-10-10)

*Prompt unique, à coller dans l'extension Codex. Sa cible n'est pas un diff :
ce sont **vingt et une affirmations absolues** sur la campagne BIO-INGEST
(lots 00 à 11, sauf le LOT-05), écrites par l'auteur du code. Tu cherches à
les **réfuter**. Une affirmation qui résiste n'a pas besoin de commentaire ;
une affirmation réfutée est ce qu'on attend de toi.*

> **Statut : rédigé, PAS ENCORE JOUÉ.** La passe se lance manuellement par le
> responsable, jamais par un agent. Le résultat viendra dans
> `REVUE_CODEX_ADVERSE_2026-10-10.md`, dans ce dossier.
>
> **Pourquoi maintenant.** Tous les lots sont livrés, sauf le LOT-05,
> transféré. Le lot de clôture va graver l'état final dans la documentation
> canonique et le dossier RGPD. Une garantie inscrite comme tenue alors que son
> banc ne mord pas y serait gravée comme fermée. Les trois drapeaux
> `WN_BIO_*_ENABLED` sont ouverts en production. Au 2026-10-10, aucun patient
> n'a encore transmis de compte rendu. Ce que tu réfutes aujourd'hui se
> corrige avant la première transmission.
>
> **Seconde passe, indépendante** : les mutations des bancs,
> `PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-10-10.md`. Les deux passes peuvent
> être lancées dans n'importe quel ordre.

---

## 0. Ce que tu fais

Chaque affirmation peut être fausse de quatre façons :

1. **le fait** : le code ne fait pas ce qui est affirmé ;
2. **la portée** : vrai sur un chemin, faux sur un autre (une des trois voies
   de saisie, une route, un état de drapeau, une course, une panne, le cron) ;
3. **la preuve** : le code le fait, mais aucun banc ne rougirait si on le
   défaisait ;
4. **la base** : l'application le garantit, mais la base ne le refuse pas (ou
   l'inverse), et un autre écrivain passerait. Ne compte **pas** comme
   réfutation ce que le §6 range expressément dans le code.

Et une cinquième, la seule que l'auteur ne peut pas produire : **ce qui
manque** (§5).

**Ce qui réfute** : le code lu à la ligne citée, une commande exécutée dont tu
donnes la sortie, une décision du dépôt citée (`D-xxx`, ligne).
**Ce qui ne réfute rien** : une préférence de style, un refactoring, un « ce
serait plus propre si », une gravité sans scénario.

---

## 1. Règles d'engagement, non négociables

- **Lecture seule.** Aucune PR, aucun commit, aucun push, aucune migration.
  Commandes admises : `grep`, `sed`, `find`, `git log`, `git show`, et, si tu
  les annonces, `npm run check` et `npx vitest run <fichier>` depuis `web/`.
  **Seule exception, pour éprouver un banc** : une mutation, et uniquement
  dans un **worktree jetable** (`git worktree add --detach <dossier> <commit>`),
  **propre à sa création** (`git status --porcelain` vide), jamais dans la
  copie où tu as été lancé. Tu y mutes, joues le banc, puis supprimes le
  worktree (`git worktree remove --force <dossier>`). Dis-le, et donne la
  sortie. Si tu ne peux pas créer ce worktree propre, **ne mute pas** : le
  banc reste `NON VÉRIFIABLE`, avec le motif.
- **Aucun accès à la production** : ni `scalingo`, ni base, ni URL de
  production. **Aucun appel à l'API Anthropic** : l'extraction se juge sur
  lecture et sur ses bancs (client simulé), jamais en l'appelant.
- **Aucune identité patient réelle** dans ta sortie. Fixtures seules : Sophie
  Nicola, Jennifer Martin, Michel Dogné. Un dossier réel se désigne par son
  identifiant, jamais par un nom.
- **Le dépôt est public, et aucun compte rendu réel n'y est.** Les comptes
  rendus vivent en base HDS, purgés. Ne cherche pas à en reconstituer un.
  Signale en revanche tout endroit du dépôt (fixtures, bancs, docs, historique
  Git) qui en contiendrait un fragment réel.
- **Réponds en français.**
- **Ne corrige rien.** Ta sortie est un verdict.

---

## 2. Périmètre

`main` à **`e78a9c6d`** ou postérieur. Le code de la campagne n'a pas bougé
depuis `2eb11f82` (LOT-11, #1380). Les commits suivants touchent une autre
campagne ou la documentation.

Préfixe `web/` sauf mention.

| Zone | Chemins |
|---|---|
| Modules | `src/lib/biology-library/import/*.ts` (dont `depot`, `extraction`, `lancerExtraction`, `decisions`, `garde`, `lecture`, `purge`, `retrait`, `ecart`, `transmission`, `transmissionStatut`, `valeurLue`, `verrou`, `resolverLibellesV1`, `lectureImport`, `acteLecture`) ; `src/lib/biology-library/{valeurDecimale,saisieMessages,featureFlag,gardeResultats}.ts` ; `src/lib/anthropic.ts` ; `src/lib/observability/classeEtCode.ts` |
| Routes praticien | `src/app/api/praticien/biologie/import/**/route.ts` (dépôt, extraction, décisions, lecture, écart, document, compte rendu) ; `src/app/api/praticien/biologie/resultats/route.ts` (saisie unitaire) ; `src/app/api/praticien/biologie/resultats/bilan/route.ts` (saisie groupée, LOT-01) ; `src/app/api/praticien/fil/route.ts` (carte du Fil) |
| Route portail | `src/app/api/portail/comptes-rendus/route.ts` (GET, POST) |
| Cron | `cron.json`, `scripts/purgeComptesRendusEcheance.ts` |
| Écrans | `src/components/patient-cockpit/{ImportCompteRenduPanel,SaisieBilan,FaitsDuLaboratoire,EstimeMesurePanel}.tsx`, `src/components/patient/biologie/TransmissionCompteRendu.tsx`, `src/app/portail/[token]/comptes-rendus/page.tsx` |
| Base | `prisma/migrations/2026100{1210000_bio_ingest_staging_v1,2200000_bio_ingest_purge_compte_rendu_v1,3150000_catalogue_biologie_compte_rendu_courant,3230000_catalogue_biologie_unites_imprimees,5150000_bio_ingest_faits_laboratoire_v1,5210000_bio_ingest_faits_non_transcrits_v1,6150000_lectures_imports_biologiques_v1,7100000_bio_ingest_transmission_patient_v1}/` ; `prisma/checks/bio_ingest_*_negatif.sql`, `prisma/checks/lectures_imports_biologiques_v1_negatif.sql`, `prisma/checks/cb_biologie_catalogue_v1_negatif.sql` ; `src/lib/patient/effacement.ts` |
| Bancs sur base réelle | `scripts/banc-ecart-validation-deux-sessions.test.mjs`, `scripts/banc-plafond-transmission-deux-depots.test.ts` |
| E2E | `e2e/portail-transmission-compte-rendu.spec.ts`, `e2e/sentinelle-marquage.spec.ts` |
| Doctrine | `docs/DECISIONS.md` (`D-256`, `D-258`, `D-259`, `D-261`, `D-263`, `D-264`, `D-266` §15, `D-267`, `D-269`), `docs/FEATURE_FLAGS.md`, `docs/DOSSIER_RGPD.md` §2 ter, `src/lib/trust/contenus/registre.ts` (`usage_ia`, `donnees_confidentialite`) ; fiches `docs/claude/campagnes/2026-09-30-bio-ingest/lots/` |

Hors sujet : le moteur clinique (qui ne lit pas `resultats_biologiques`,
`D-122`), le contenu clinique du catalogue, BIO-PARCOURS au-delà de l'acte de
lecture (BP-10), `release-db`, la CI, le LOT-05, `archive/`.

**Trois écrivains** de `resultats_biologiques` existent : la saisie unitaire,
la saisie groupée et la décision d'import. Les affirmations de §4-A portent sur
**les trois**, sauf mention. C'est la portée la plus facile à oublier, et ton
meilleur angle.

---

## 3. Méthode

Chaque affirmation reçoit **exactement un** verdict :

| Verdict | Signification |
|---|---|
| **`RÉFUTÉE`** | contre-exemple recevable, avec `fichier:ligne` et le chemin complet de l'entrée à l'effet |
| **`AFFAIBLIE`** | le fond tient, une branche est fausse : dis laquelle |
| **`RÉSISTE`** | aucun contre-exemple trouvé : une ligne suffit |
| **`NON VÉRIFIABLE`** | un élément manquait : nomme lequel |

Chaque trouvaille est **`CONFIRMÉE`** (chemin lu ou commande exécutée de bout
en bout) ou **`PLAUSIBLE`** (nomme le maillon supposé). Une commande annoncée
est une commande exécutée, sortie à l'appui ; sinon `NON VÉRIFIABLE`.

**Pour les bancs** : ne dis pas « le test couvre X ». Donne **la mutation** qui
devrait le faire rougir. Si tu la joues (worktree jetable, §1), dis s'il
rougit ; sinon, marque-la non jouée. Une mutation non jouée n'est jamais
`CONFIRMÉE`.

---

## 4. Les affirmations

### A — Rien n'entre dans `resultats_biologiques` sans un geste humain, et rien n'y entre altéré

- **A1.** Aucune ligne extraite ou transmise ne devient un résultat sans une
  décision du praticien, **ligne à ligne**, dans l'écran de validation. Ni
  l'extraction, ni la relance, ni le dépôt patient, ni le cron, ni l'écart
  n'écrivent dans `resultats_biologiques`. Le seul écrivain issu d'un import
  est `decisions.ts`, sous le verrou de l'import.
- **A2.** Une soumission de décisions est entière ou rien : une seule ligne
  invalide n'écrit aucune des autres. Une ligne ne se décide qu'**une** fois.
  Son « lu » (libellé, valeur, unité, date, heure, intervalle, marquage) ne se
  réécrit jamais. Cette règle tient **en base** (trigger de ligne), pas
  seulement dans l'application.
- **A3.** Le modèle ne choisit jamais l'analyte, et ne qualifie jamais une
  valeur. `analyte_propose` ne vient que du résolveur signé
  (`resolverLibellesV1`, `D-259`). Aucune sortie du modèle n'atteint le
  praticien comme jugement (bas, haut, pathologique). Le marquage affiché est
  le **fait imprimé du laboratoire**, verbatim, présenté comme tel (`D-267`).
- **A4.** Aucune conversion d'unité, sur aucune des trois voies : une unité
  qui diverge de celle du catalogue est refusée, jamais convertie (`D-157`).
- **A5.** Une valeur arrive exacte en base. Entre la saisie ou la lecture et la
  colonne `DECIMAL`, elle ne passe jamais par un `number` JavaScript, sur
  aucune des trois voies (LOT-10). Le praticien valide la valeur qui sera
  écrite, et non une valeur arrondie pour l'affichage.

### B — Le document : lu sur geste du praticien, borné, puis purgé

- **B1.** Un compte rendu ne part chez Anthropic que sur un geste du praticien
  (lire ou relancer), drapeau `WN_BIO_INGEST_ENABLED` ouvert. Il ne part
  jamais au dépôt du patient, ni au dépôt du praticien, ni depuis le cron.
  `extraction.ts` est le **seul** appelant du SDK dans le périmètre.
- **B2.** L'appel d'extraction est borné **en totalité**, flux compris
  (240 s, `AbortController`). Cette borne reste sous la péremption du verrou
  « en cours » (5 min). Un import ne reste donc jamais « en cours » au-delà
  de la péremption. Deux extractions du même document ne tournent jamais en
  même temps.
- **B3.** Le contenu d'un document est purgé (mis à `NULL`) dans trois cas :
  à la dernière décision de l'import courant, à l'écart, ou au plus tard
  30 jours après le dépôt, à une heure près (cron horaire, `D-258`). La base
  refuse toute autre écriture du contenu, et toute purge pendant une
  extraction en cours. Un document purgé ne peut plus être ni affiché, ni lu,
  ni relancé.
- **B4.** Les faits du laboratoire (intervalle et marquage imprimés) sont
  transcrits **verbatim** avant la purge et y survivent. Ils ne sont jamais
  copiés dans `resultats_biologiques`. Au-delà de 300 points de code pour
  l'intervalle, ou de 50 pour le marquage, la colonne reste `NULL` et le
  signal « non transcrit » est posé : il n'y a ni troncature ni échec
  d'import (`D-267` §10). La base refuse un signal posé à côté d'un fait
  présent.
- **B5.** Une image est réencodée, et perd ses métadonnées (EXIF, GPS), avant
  d'être consignée, **sur les deux voies** de dépôt (praticien et patient). Un
  fichier dont la signature d'octets ne correspond pas à un type admis est
  refusé, quel que soit le type annoncé par le client.
- **B6.** « Relancer la lecture » n'est jamais destructive. Elle est refusée
  dès qu'une ligne de l'import est validée, ou que le document est purgé. Elle
  ne réécrit aucun import antérieur : elle en crée un nouveau, et l'ancien
  devient non décidable (LOT-09).

### C — Le portail : le patient dépose et suit, chez lui seulement

- **C1.** Le patient ne dépose et ne lit que dans **son** dossier. Le dossier
  vient de la session `wn_portail`, jamais d'un identifiant envoyé par le
  client. La liste ne rend que la date et le statut de **ses**
  transmissions : ni valeur, ni libellé, ni identifiant, et rien d'un dépôt du
  praticien. **Même le refus d'un doublon** ne révèle pas qu'un praticien a
  déposé ce document.
- **C2.** Aucun dépôt sans l'accusé de la version **courante** de `usage_ia`
  (version **et** empreinte). Un dossier clos ne reçoit aucun dépôt, **même
  si la clôture arrive pendant l'envoi**.
- **C3.** Les deux plafonds (3 documents en attente ou reçus, 10 dépôts par
  24 h) tiennent en concurrence : deux onglets, deux requêtes simultanées. Pour
  un envoi refusé, aucun octet du corps n'est lu. Un `Content-Length` menteur
  ne fait jamais monter en mémoire plus de 10 Mo plus la marge multipart.
- **C4.** `WN_BIO_PORTAIL_ENABLED` fermé : la route, la page et le lien qui y
  mène se taisent. Aucun ne révèle alors l'existence d'une transmission.
- **C5.** L'écart, par le praticien, d'un document transmis et la validation
  d'une de ses lignes s'excluent **en base**, dans les deux ordres, même en
  concurrence. Un document écarté n'est jamais relu, et aucune de ses lignes
  n'est validée ensuite.
- **C6.** L'origine et l'auteur sont tenus en base : `origine = 'patient'` ⇔
  aucun e-mail de praticien. Aucun chemin de l'application ne retire (DELETE)
  un document d'origine patient, en dehors de l'effacement du dossier.

### D — Les données et le droit

- **D1.** Aucun journal du périmètre ne porte une valeur, un libellé, un fait
  du laboratoire, une empreinte de document, ni le `message` brut d'une
  erreur. Le seul contenu admis est la classe et le code (`classeEtCode`).
  Cela vaut **aussi** hors du dossier `import/` : route portail, cron de
  purge, saisies unitaire et groupée.
- **D2.** L'effacement d'un dossier supprime documents, imports, lignes,
  lectures et résultats, sans orphelin ni échec. Il le fait malgré les
  triggers d'append-only, de purge et d'écart, y compris pour un document
  purgé, écarté, ou dont l'import est « en cours ».
- **D3.** Le praticien ne voit un document que du dossier désigné, après la
  garde (session, appartenance, journal d'accès GD-1). Il n'est servi ni en
  cache, ni interprétable comme HTML. Une image est servie sous
  `sandbox`.
- **D4.** Chaque extraction enregistre le modèle et la version du procédé
  réellement employés. Le dossier RGPD (§2 ter) et les textes TRUST en vigueur
  (`usage_ia`, `donnees_confidentialite`) disent vrai **aujourd'hui** sur le
  sous-traitant, les données envoyées (le document entier) et la durée de
  conservation du document, sauvegardes comprises.

---

## 5. Ce qui manque

Au-delà des vingt et une : **qu'est-ce qu'un patient, un praticien ou un tiers
peut obtenir que ces affirmations ne couvrent pas ?** Pistes, non limitatives :

- un PDF hostile (JavaScript, formulaires, liens) servi sans `sandbox` au
  navigateur du praticien ;
- un PDF qui porte ses métadonnées (auteur, logiciel) jusqu'à Anthropic ;
- le compte rendu d'un tiers transmis par le patient, et lu avant d'être
  regardé ;
- un double onglet praticien qui décide le même import ;
- un import « en cours » abandonné par un conteneur tué, et ce que voient le
  cron et la relance ;
- l'expiration de la transaction des lignes (20 s) : sous quel motif est-elle
  rendue ?
- le `fetch` global de Next 15 dans `after()`, et la borne de B2 ;
- le basculement d'un drapeau pendant une requête ;
- les caches HTTP ou Next d'une réponse portail ;
- une carte du Fil qui nommerait ou compterait plus que nécessaire.

---

## 6. Ce qu'il ne faut PAS demander

Ce sont des décisions datées du responsable. Tu vérifies qu'elles sont
**implémentées telles qu'énoncées**, jamais qu'elles sont bonnes :

- le document conservé en base HDS (`bytea`), et l'usage de l'IA vision
  (`D-256` A2, A4) ;
- le compte rendu envoyé **entier**, sans masquage (amendement de `D-256`) ;
- les valeurs des plafonds (3 et 10 par 24 h), le dépôt patient sans appel à
  l'IA, la notification par la carte du Fil et non par e-mail (`D-269`) ;
- les bornes 300 et 50 des faits du laboratoire (`D-267` §10) ;
- la purge à 30 jours, et la survie du document dans les sauvegardes de
  l'hébergeur jusqu'à expiration de leur rétention (`D-258`) ;
- que la **base** tienne les plafonds, l'accusé `usage_ia`, le dossier ouvert
  et le refus du retrait d'un dépôt patient. Ces règles sont rangées dans le
  code, par décision consignée dans l'en-tête de la migration
  `20261007100000_bio_ingest_transmission_patient_v1`. Tu juges en revanche
  si le **code** les tient ;
- que l'E2E patient s'arrête au statut « En attente » : les statuts suivants
  supposent une lecture par l'IA, hors E2E (arbitrage du 2026-10-10, LOT-11) ;
- le contenu clinique du catalogue et des unités (`D-261`, `D-263`, `D-264`) ;
- le LOT-05 (adaptateur laboratoire), transféré hors campagne.

---

## 7. Format de sortie

1. **Tableau** : une ligne par affirmation, avec l'identifiant, le verdict,
   la preuve (`fichier:ligne` ou commande et sortie), et une phrase.
2. **Trouvailles neuves** (§5), classées **P0** (résultat écrit sans geste
   humain ou altéré, document ou donnée servi à un autre dossier, envoi chez
   Anthropic sans geste) / **P1** (garantie qui ne tient que par chance,
   banc qui ne mord pas sur un invariant, document qui dit faux) / **P2**.
   Chacune est `CONFIRMÉE` ou `PLAUSIBLE`, avec un scénario concret.
3. **Mutations jouées** : fichier, mutation, banc, résultat (rouge / vert).
4. Ce que tu n'as pas pu vérifier, et pourquoi.

Sois bref sur ce qui résiste ; sois précis sur ce qui tombe.
