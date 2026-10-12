# Contre-revue adverse — la fiche d'assiette, de la validation à la lecture patient (D-251, 2026-09-29)

*Prompt unique, à coller dans l'extension Codex. Sa cible n'est pas un diff :
ce sont **dix-neuf affirmations absolues** sur la chaîne `D-251` (lots 1 à 11),
écrites par l'auteur du code. Tu cherches à les **réfuter**. Une affirmation
qui résiste n'a pas besoin de commentaire ; une affirmation réfutée est ce
qu'on attend de toi.*

> **Statut : rédigé, PAS ENCORE JOUÉ.** La passe se lance manuellement par le
> responsable, jamais par un agent. Le résultat viendra dans
> `REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_<date>.md`.
>
> **Pourquoi maintenant.** L'espace de lecture patient a été ouvert en
> production le 2026-09-29 à 20:40 UTC, **avant** cette contre-revue (décision
> datée du responsable, amendement « soir » de `D-251`). Sept fiches sont
> validées ; aucune n'a encore été remise. Ce que tu réfutes aujourd'hui se
> corrige avant la première remise réelle.

---

## 0. Ce que tu fais

Chaque affirmation peut être fausse de quatre façons :

1. **le fait** — le code ne fait pas ce qui est affirmé ;
2. **la portée** — vrai sur un chemin, faux sur un autre (une route, un état
   de drapeau, une course, une panne) ;
3. **la preuve** — le code le fait, mais aucun banc ne rougirait si on le
   défaisait ;
4. **la base** — l'application le garantit, mais la base ne le refuse pas (ou
   l'inverse), et un autre écrivain passerait.

Et une cinquième, la seule que l'auteur ne peut pas produire : **ce qui
manque** (§5).

**Ce qui réfute** : le code lu à la ligne citée, une commande exécutée dont tu
donnes la sortie, une décision du dépôt citée (`D-xxx`, ligne).
**Ce qui ne réfute rien** : une préférence de style, un refactoring, un « ce
serait plus propre si », une gravité sans scénario.

---

## 1. Règles d'engagement — non négociables

- **Lecture seule.** Aucune PR, aucun commit, aucun push, aucune migration.
  Commandes admises : `grep`, `sed`, `find`, `git log`, `git show`, et, si tu
  les annonces, `npm run check` et `npx vitest run <fichier>` depuis `web/`.
  **Seule exception, pour éprouver un banc** : une mutation, et uniquement
  dans un **worktree jetable** (`git worktree add --detach <dossier> <commit>`),
  **propre à sa création** (`git status --porcelain` vide), jamais dans la
  copie où tu as été lancé. Tu y mutes, joues le banc, puis supprimes le
  worktree (`git worktree remove --force <dossier>`) — dis-le, et donne la
  sortie. Si tu ne peux pas créer ce worktree propre, **ne mute pas** : le
  banc reste `NON VÉRIFIABLE`, avec le motif.
- **Aucun accès à la production** : ni `scalingo`, ni base, ni URL de
  production.
- **Aucune identité patient réelle** dans ta sortie. Fixtures seules : Sophie
  Nicola, Jennifer Martin, Michel Dogné. Un dossier réel se désigne par son
  identifiant (`PAT0xx`), jamais par un nom.
- **Le dépôt est public, et le texte des fiches n'y est pas** : il vit en base
  HDS. Ne cherche pas à le reconstituer. Signale en revanche tout endroit du
  dépôt qui en contiendrait un fragment.
- **Réponds en français.**
- **Ne corrige rien.** Ta sortie est un verdict.

---

## 2. Périmètre

`main` à **`712a62bc`** ou postérieur (le code des lots 1 à 11 n'a pas bougé
depuis ; les commits suivants sont de la documentation).

| Zone | Chemins |
|---|---|
| Modules | `web/src/lib/fiches-assiette/*.ts` (dont `remise.ts`, `apercuRemise.ts`, `servicePatient.ts`, `ficheServie.ts`, `controle.ts`, `etat.ts`, `annonce.ts`, `drapeau.ts`, `ingestion.ts`) |
| Routes praticien | `web/src/app/api/praticien/fiches-assiette/{route,version/route,actes/route}.ts`, `web/src/app/api/praticien/protocoles/diffusion/route.ts` |
| Route interne | `web/src/app/api/internal/fiches-assiette/ingest/route.ts` |
| Routes portail | `web/src/app/api/portail/fiches-assiette/route.ts`, `web/src/app/api/portail/lectures/route.ts` |
| Écrans | `web/src/app/portail/[token]/fiches/**`, `web/src/components/patient/fiches-assiette/*`, `web/src/components/patient-companion/LienFichesRemises.tsx`, `web/src/components/patient/ConsignerLecturePortail.tsx`, `web/src/components/patient-cockpit/{ProtocolDiffusionPanel,ClinicalRuntimeSection}.tsx`, `web/src/components/fiches-assiette/*` |
| Fil du jour | `web/src/lib/portail/{lecturesAttendues,filDuJour}.ts`, `web/src/components/patient/MonParcoursAccueil.tsx` |
| Canal | `web/src/lib/consultation/email.ts`, `web/src/lib/correspondance/{registreGabarits,patient}.ts` |
| Base | `web/prisma/migrations/20260926150000_fiches_assiette_catalogue_v1/`, `web/prisma/migrations/20260927190000_fiches_assiette_remises_v1/`, `web/prisma/checks/fiches_assiette_*_negatif.sql`, `web/src/lib/patient/effacement.ts` |
| Doctrine | `docs/DECISIONS.md` (`D-251` et ses amendements), `docs/FEATURE_FLAGS.md`, `docs/DOSSIER_RGPD.md` |

Hors sujet : le moteur clinique, le contenu clinique des fiches, `release-db`,
la CI, `archive/` — **sauf pour A1**, qui porte sur tout le dépôt, `archive/`
comprise.

**Deux drapeaux**, tous deux ouverts en production : `WN_FICHES_ASSIETTE`
(émission : aperçu et remise au clic) et `WN_FICHES_ASSIETTE_LECTURE` (lecture :
route, pages, fil du jour, lien, e-mail). Raisonne dans les **quatre**
combinaisons, et au basculement.

**Limite déclarée** : l'auteur de ces affirmations est l'auteur du code et de
ses bancs. C'est ton meilleur angle.

---

## 3. Méthode

Chaque affirmation reçoit **exactement un** verdict :

| Verdict | Signification |
|---|---|
| **`RÉFUTÉE`** | contre-exemple recevable, avec `fichier:ligne` et le chemin complet de l'entrée à l'effet |
| **`AFFAIBLIE`** | le fond tient, une branche est fausse — dis laquelle |
| **`RÉSISTE`** | aucun contre-exemple trouvé — une ligne suffit |
| **`NON VÉRIFIABLE`** | un élément manquait — nomme lequel |

Chaque trouvaille est **`CONFIRMÉE`** (chemin lu ou commande exécutée de bout
en bout) ou **`PLAUSIBLE`** (nomme le maillon supposé). Une commande annoncée
est une commande exécutée, sortie à l'appui ; sinon `NON VÉRIFIABLE`.

**Pour les bancs** : ne dis pas « le test couvre X ». Donne **la mutation** qui
devrait le faire rougir, joue-la dans le worktree jetable du §1, et dis s'il
rougit.

---

## 4. Les affirmations

### A — Rien d'une fiche ne quitte la base par un autre chemin que la page du patient

- **A1.** Aucun texte de Fiche MY ni brouillon IA n'est présent dans le dépôt :
  code, fixtures, bancs, docs, `archive/`, historique Git. Les bancs n'emploient que du
  texte synthétique.
- **A2.** Aucun journal applicatif du chantier (`console.*`, `logger.*`) ne
  porte un texte de fiche, un libellé d'assiette rattaché à un patient, ou le
  `message` brut d'une erreur — seulement sa classe (`err.name`) ou un message
  passé par `sanitizeError` / `sanitizeAuditError`.
- **A3.** L'e-mail envoyé au patient (`document_remis@1`) ne nomme ni assiette,
  ni fiche, ni axe, ne porte aucun lien secret, et **aucune** de ses variables
  ne peut véhiculer une donnée de santé.

### B — L'émission : on ne remet que ce qui a été vu, validé, et contrôlé

- **B1.** Le clic « Valider pour diffusion » ne remet jamais une fiche que le
  praticien n'a pas vue : l'aperçu est recalculé **sous verrou**, dans la
  transaction, et comparé au jeton ; sinon 409 et rien n'est écrit.
- **B2.** Aucune fiche non validée, retirée, ou dont la version de référence
  échoue aux contrôles rejoués ne peut être remise — ni par la route, **ni par
  un autre écrivain** (le trigger `fiches_assiette_remises_avant_insertion` le
  refuse).
- **B3.** Deux clics concurrents ne créent ni deux têtes de chaîne
  d'approbations, ni deux remises identiques, ni deux e-mails.
- **B4.** Drapeau d'émission fermé, la route de diffusion lit et écrit
  **exactement** ce qu'elle faisait avant le lot 8.
- **B5.** Un dossier clos (inactif ou suivi clôturé) ne reçoit aucune fiche,
  même si la clôture arrive pendant le clic.

### C — La lecture : un patient ne lit que ce qui lui est servi, à lui

- **C1.** Aucune route ni page du portail ne sert une remise d'un autre dossier,
  même avec un identifiant de remise forgé dans l'URL ou le corps.
- **C2.** Seule la remise **en cours** de chaque fiche est servie ; une version
  remplacée ne réapparaît jamais sans un nouveau clic du praticien.
- **C3.** Une fiche retirée ne sert jamais son texte ni le motif du retrait ;
  une version qui échoue aux contrôles rejoués au moment de servir n'est pas
  servie (« indisponible »), et cette panne ne retient pas les autres fiches.
- **C4.** Refermer `WN_FICHES_ASSIETTE_LECTURE` coupe les **cinq** surfaces à la
  fois (route, deux pages, lectures du fil, lien « Autres espaces », e-mail) :
  aucune ne révèle alors l'existence d'une remise.
- **C5.** L'accusé de lecture n'est consigné que pour une fiche servie à **ce**
  patient, et seulement une fois son texte affiché ; le serveur le revérifie
  (`D-164`).
- **C6.** Le texte d'une fiche est rendu comme texte, jamais interprété comme
  HTML, sur tout le chemin patient.

### D — L'e-mail : un par clic qui remet, tracé, jamais bloquant

- **D1.** Un clic produit **au plus un** e-mail, et seulement s'il a remis au
  moins une fiche, espace de lecture ouvert, **après** le commit.
- **D2.** Aucun e-mail ne part sans trace au registre des correspondances : la
  trace naît `Non_envoye` dans la transaction, puis est mise à jour. Aucune
  panne postérieure au commit ne transforme le clic en erreur.
- **D3.** Un portail fermé (compte désactivé, accès révoqué) ne reçoit jamais
  l'e-mail.

### E — La base et le droit

- **E1.** Versions, actes et remises sont append-only et sous RLS ; l'effacement
  d'un dossier supprime ses remises et ses lectures **malgré** l'append-only,
  sans orphelin ni échec. `FicheAssietteRemise` est déclarée en article 9 au
  dossier RGPD, et ce dossier dit vrai aujourd'hui.
- **E2.** Une version ne devient « validée » que par un acte humain distinct
  (validateur, relecture intégrale), jamais par l'ingestion (`DC-16`) : la
  route d'ingestion ne peut créer aucun acte, et le texte servi a l'empreinte
  exacte de l'acte validé.

---

## 5. Ce qui manque

Au-delà des dix-neuf : **qu'est-ce qu'un patient, un praticien ou un tiers
peut obtenir que ces affirmations ne couvrent pas ?** Pistes, non limitatives :
le mode `?interrupteur=1`, le masquage des chemins (`masquageChemin.ts`)
appliqué aux deux pages, l'impression d'une fiche, les caches HTTP ou Next
d'une réponse portail, l'ordre verrou de chaîne / verrous de fiche, un double
onglet praticien, une fiche retirée entre l'aperçu et le clic, le basculement
d'un drapeau pendant une requête.

---

## 6. Ce qu'il ne faut PAS demander

Ce sont des décisions datées du responsable. Tu vérifies qu'elles sont
**implémentées telles qu'énoncées**, jamais qu'elles sont bonnes :

- l'ouverture des deux drapeaux **avant** cette contre-revue et le document
  TRUST sur l'IA ;
- un e-mail par clic, seulement espace de lecture ouvert, sans relance
  automatique ;
- une assiette reste « actuelle » tant qu'une action la conseille (ferme,
  suspendue, différée) ; la mention « ne fait plus partie de votre protocole
  actuel » ;
- le texte exact du gabarit (validé le 2026-09-29) ;
- le contenu clinique des fiches, les claims cités, les bornes et
  précautions ;
- la phase « Actions » du cockpit (chantier distinct).

---

## 7. Format de sortie

1. **Tableau** : une ligne par affirmation — identifiant, verdict, preuve
   (`fichier:ligne` ou commande + sortie), une phrase.
2. **Trouvailles neuves** (§5), classées **P0** (fuite, patient servi à tort,
   remise non vue) / **P1** (garantie qui ne tient que dans l'application, banc
   qui ne mord pas sur un invariant) / **P2**, chacune `CONFIRMÉE` ou
   `PLAUSIBLE`, avec un scénario concret.
3. **Mutations jouées** : fichier, mutation, banc, résultat (rouge / vert).
4. Ce que tu n'as pas pu vérifier, et pourquoi.

Sois bref sur ce qui résiste ; sois précis sur ce qui tombe.
