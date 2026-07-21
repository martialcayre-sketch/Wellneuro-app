# Dossier des gates de la Vague 2 — G1, G3, G4

> Rédigé le 2026-07-20, en clôture de la Vague 2, **avant** application. Mis à
> jour le même jour, après. Ce dossier réunit ce qu'il faut avoir sous les yeux
> pour appliquer un gate : où ça s'ancre dans le code existant, ce que la
> migration ajoute, ce qui reste à arbitrer, et ce que merger déclenche.
>
> Modèle : `campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/GATE_G2_IDENTITE_CYCLE.md`,
> le dossier du gate G2, appliqué le 2026-07-20 (#155).

## Où en sont les trois gates

| Gate | État | Livré par |
|---|---|---|
| **G1** | **appliqué** le 2026-07-20 | #166 (clé de carte, migration-free) puis #168 (table, route, geste) |
| **G3** | **appliqué** le 2026-07-20 | #163 |
| **G4** | **appliqué** le 2026-07-20, **activé en production** le 2026-07-21 | #169 (préalable, reclé des traces locales) puis #172 (lien magique) et #182 (canal de redemande) |

Migrations en production, vérifiées en base : `20260720120000_sptt_relecture_notes_v1`
(17:34 UTC), `20260720130000_g1_fil_card_rejections_v1` (17:47 UTC) et
`20260720200000_g4_portail_magic_links_v1`, aucune rollbackée.

G4 est livré **éteint** (drapeau `WN_G4_LIEN_MAGIQUE`), puis allumé en
Production le 2026-07-21 avec `WN_G4_REDEMANDE_PATIENT` — détail, essai réel et
rollback dans
`campagnes/2026-07-19-idp-identite-patient-durable/ACTIVATION_RUNBOOK_G4.md`.

Les sections G1 et G3 ci-dessous sont conservées **telles qu'elles ont servi**,
avec les écarts constatés à l'application signalés sur place. Elles valent
désormais comme trace de décision, pas comme plan.

## Ce que coûte l'ouverture d'un gate

Les trois gates modifient `web/prisma/schema.prisma` et
`web/prisma/migrations/`. Ces chemins sont en **« demande »** dans les hooks :
autorisation en un clic, dans la session, et c'est elle qui matérialise la
« confirmation explicite » exigée par `CLAUDE.md`.

> **Correctif 2026-07-20** — ce dossier indiquait de lancer la session avec
> `WN_ALLOW_PROTECTED_WRITE=1`. **Cette variable n'existe plus** : elle
> neutralisait le hook pour la session entière et non pour la migration qui
> l'avait motivée. Ne pas la chercher, ne pas la réintroduire.

Ce n'est pas une formalité. **Merger une PR de migration applique la migration
sur la base Supabase de production** : `web/scripts/vercel-build.sh` exécute
`prisma migrate deploy` au build Vercel de `main`. Le SQL doit donc être relu
avant merge, pas après.

## Vue d'ensemble

| Gate | Objet | Campagne / lot | Migration | Réversibilité | Arbitrage humain requis |
|---|---|---|---|---|---|
| **G1** | Refus persisté des cartes du Fil | SP-FIL | table additive | oui — abandon de la table | **oui** (clé de carte) |
| **G3** | `relecture_notes` — note horodatée au présent | SP-TT / LOT-02 | table additive | oui — abandon de la table | non |
| **G4** | Identité patient durable (lien magique) | IDP / LOT-01 | table additive | **non au sens fort** | **oui** (durées, revue de sécurité) |

G1 et G3 sont réversibles par simple abandon de la table : rien d'existant n'en
dépend. G4 ne l'est pas au même sens — dès qu'un patient entre par un lien
magique, retirer le mécanisme lui retire son accès.

---

## G1 — Refus persisté des cartes du Fil

> **Appliqué le 2026-07-20.** Voie **(b)** retenue, en deux temps : #166 donne
> aux cartes une clé ancrée sur leur ligne source, sans migration ; #168 ajoute
> la table, la route et le geste.

**Ce que le garde-fou 5.0 exige et qui n'est pas tenu** : une carte du Fil doit
être **refusable**, le refus doit **persister** (la carte ne revient pas le
lendemain) et rester **réversible**.

### État actuel

- `web/src/lib/fil/cartes.ts` — 5 types de cartes
  (`signalement_trust`, `synthese_a_valider`, `assignation_en_retard`,
  `reponse_recente`, `reprise`), produites par 5 fonctions pures orchestrées par
  `construireFil()`.
- `web/src/app/api/praticien/fil/route.ts` — 7 requêtes parallèles, filtrage par
  patient actif (déjà gardé sur `praticienEmail` depuis #156), puis
  `construireFil()`.
- `web/src/components/fil/FilDuJour.tsx` — **aucun geste de refus**, même non
  persisté : une carte affiche icône, texte et lien d'action.

### Le point dur : une carte n'a pas d'identité

`CarteFil` (`cartes.ts:16-26`) ne porte **aucun identifiant**. Les cartes sont
des projections recalculées à chaque ouverture, et les requêtes de la route ne
sélectionnent pas les identifiants de leurs lignes sources
(`TrustAdverseEffectReport.id`, `Assignation.idAssignation`,
`SyntheseIA.idSynthese`, …).

Persister un refus suppose de désigner **quoi** a été refusé. Deux voies, et
c'est l'arbitrage à rendre :

- **(a) Clé composite `type + idPatient + date`.** Aucun changement de requête.
  Mais la carte `reprise` est dérivée d'un `groupBy` — sa date est celle de la
  dernière réponse, et `CarteFil.date` est `string | null`. Une carte sans date
  n'aurait pas de clé, et deux cartes de même type au même instant seraient
  confondues. **Cette voie est fragile et il ne faut pas la choisir « parce
  qu'elle est plus simple » : elle échange une migration facile contre des refus
  qui sautent.**
- **(b) Remonter l'identifiant de la ligne source dans la carte.** Chaque
  requête sélectionne son `id`, `CarteFil` gagne un champ `cle` calculé dans le
  domaine pur (donc testable, sans migration). Pour `reprise`, seule carte
  agrégée, la clé reste `('reprise', idPatient, dateReference)`.

La voie (b) est la seule qui donne un refus stable. Elle a un coût : toucher les
5 fonctions de production et leurs tests. **Elle est migration-free** — elle
peut donc être livrée avant même l'ouverture du gate, ce qui réduirait la
session de migration au strict nécessaire (table + route + UI).

### Migration envisagée (additive)

Table `fil_card_rejections`, conventions du dépôt (snake_case `@map`, index
nommés, chaînage append-only à la manière de `ProtocolDiffusionApproval`) :

- `id` (cuid), `id_patient`, `carte_cle` (la clé arbitrée ci-dessus),
  `refuse_le`, `refuse_par` (e-mail praticien),
  `supersedes_rejection_id` (nullable — c'est ce qui rend le refus **réversible**
  sans jamais réécrire une ligne),
- index `(id_patient, refuse_le)`, unicité `(id_patient, carte_cle)` seulement si
  la voie (b) est retenue — en voie (a) l'unicité produirait des collisions.

**Aucun backfill** : l'absence de ligne signifie « non refusée », ce qui est
l'état actuel de toutes les cartes.

> **Correctif 2026-07-20 — ce dossier demandait deux choses incompatibles.**
> L'unicité `(id_patient, carte_cle)` et le chaînage append-only ne peuvent pas
> coexister : une annulation **est** une seconde ligne sur la même clé, et
> l'unicité la rendrait impossible.
>
> L'append-only l'emporte — c'est lui qui porte la **réversibilité** exigée par
> le garde-fou, qui dit « refusable », pas « supprimable ». La table livrée n'a
> donc **pas** de contrainte d'unicité ; l'index `(id_patient, carte_cle)`
> reste, pour la lecture. L'écart est documenté dans le SQL, dans
> `schema.prisma` et au CHANGELOG.
>
> Leçon pour le prochain dossier : « unicité » et « append-only » écrits dans la
> même liste de colonnes sont un signal, pas un détail de rédaction.

### Points d'ancrage applicatifs

- Filtre : **un seul point de passage**, après `construireFil()`
  (`fil/route.ts:90`), sur les cartes déjà construites. Ne pas filtrer dans les
  5 fonctions de production : ce serait 5 endroits à garder cohérents.
- Nouvelle route `POST /api/praticien/fil/refus`, gardée par
  `verifierAppartenancePatient`, écrivant une ligne de refus ou son annulation
  (nouvelle ligne chaînée, jamais un `DELETE`).
- `FilDuJour.tsx` : bouton de refus par carte, cible ≥ 44 px, **avec annulation
  immédiate** — le garde-fou dit « refusable », pas « supprimable ».

### Tests attendus

- Domaine : une carte refusée disparaît ; l'annulation la fait revenir ; le refus
  d'une carte n'affecte pas les autres.
- Route : le refus est bien porté par le praticien propriétaire du patient.
- Composant : le geste existe, il est annulable, et l'état n'est pas porté par la
  seule couleur.

---

## G3 — `relecture_notes`

> **Appliqué le 2026-07-20** (#163), conforme au dossier, sans écart. La route
> dédiée `/api/praticien/relecture-notes` refuse explicitement un `?asOf=` :
> l'instant relu se transmet dans le corps de la note.

**Objet** : depuis la lecture d'un état passé (SP-TT LOT-01, livré en #158), le
praticien dépose une note. Elle est **horodatée au présent**, jamais à la date
relue, append-only, et invisible du patient.

### État actuel

- `web/src/lib/praticien/lectureAsOf.ts` et
  `web/src/components/copilote/LectureEtatPassePanel.tsx` — la surface existe et
  connaît l'instant relu ; elle est en lecture seule.
- `web/src/app/api/praticien/cockpit/route.ts` — le POST **refuse toute écriture
  dès qu'un `asOf` est présent, avant même de lire le corps** :

  ```ts
  if (new URL(req.url).searchParams.get('asOf')) {
    return unavailable('invalid_payload', 'Aucune écriture possible en lecture d’un état passé.', 400);
  }
  ```

- **Aucune table de note n'existe.** Le seul champ de note praticien du dépôt est
  `SyntheseIA.notesPraticien` (`schema.prisma:282`) : il porte des annotations
  libres sur une synthèse IA, il est réécrit en place, et il n'a rien à voir avec
  une note de relecture. **Ne pas le détourner.**

### Le point à ne pas manquer

Une note de relecture est une **écriture faite depuis une lecture passée**. Elle
croise donc frontalement le garde-fou ci-dessus. La bonne façon de résoudre
n'est pas d'assouplir ce garde-fou — il protège la confirmation d'épisode, qui
ne doit jamais partir d'un état périmé — mais de passer par une **route dédiée**
qui reçoit l'instant relu **dans son corps**, comme une donnée de la note, et
non comme un mode de lecture.

Cette distinction est tout le sens du gate : on n'écrit pas *dans* le passé, on
écrit *aujourd'hui, à propos* du passé.

### Migration envisagée (additive)

Table `relecture_notes` :

- `id` (cuid), `id_patient`, `praticien_email`,
- `instant_relu` (l'instant que le praticien relisait — une donnée, pas une
  date d'écriture),
- `texte`,
- `cree_le` (`@default(now())` — **le présent**, toujours),
- `supersedes_note_id` (nullable, append-only : corriger = nouvelle ligne),
- index `(id_patient, cree_le)`.

**Aucun backfill.**

### Tests attendus

- `cree_le` est le présent même quand `instant_relu` est ancien — c'est
  l'invariant du gate, il mérite son test.
- Correction = nouvelle ligne ; la précédente reste lisible.
- La note n'apparaît sur aucune surface patient (garde structurelle, sur le
  modèle de `web/src/lib/protocol/adhesion.test.ts` livré en SP-MET).

---

## G4 — Identité patient durable (IDP)

**Objet** : remplacer progressivement le lien patient permanent par un lien
magique **haché en base, expirant, à consommation unique**, le rejeu étant
refusé et tracé.

C'est le gate le plus sensible du dépôt : il touche l'authentification patient.

### Le chemin d'accès actuel, de bout en bout

**Le jeton.** `POST /api/praticien/token` (`action: 'issue' | 'resend' | 'lien'`)
appelle `createPublicId('TOK')` et écrit le résultat **en clair** dans
`patients.access_token` (`schema.prisma:10-46`, unique, nullable). Trois colonnes
seulement : `access_token`, `access_token_revoked`, `access_token_created_at`.
**Aucune colonne d'expiration, aucune colonne de consommation** — le jeton est
valable indéfiniment et réutilisable sans limite. `access_token_created_at` est
un horodatage de création, jamais lu pour périmer quoi que ce soit.

**La session.** `POST /api/portail/session` résout le patient par
`findUnique({ accessToken })`, vérifie l'e-mail, la révocation et le champ
`actif`, puis pose le cookie `wn_portail` : payload JSON
`{ idPatient, email, accessTokenFingerprint, exp }` encodé base64url et signé
HMAC-SHA256, `httpOnly`, `sameSite: 'lax'`, `secure` en HTTPS, **12 h
glissantes** (`web/src/lib/patient-session.ts`). La vérification de signature est
en temps constant. Le cookie ne porte donc **pas** le jeton, seulement son
empreinte — ce qui est déjà la bonne propriété.

**Le chemin legacy e-mail.** Toujours actif sur `/api/patient/*`
(`assignations`, `questionnaire`, `consentement`, `submit`, `reponses`) : le
cookie est prioritaire, mais à défaut l'e-mail passé en paramètre suffit. Les
routes plus récentes (`/api/portail/*`, `/api/patient/protocole`,
`/api/patient/equilibre`) **excluent explicitement** ce repli.

### Ce qui casserait — vérifié, pas supposé

Le seul couplage réel au jeton est **côté navigateur**, dans des traces locales
clées par le jeton d'URL :

- brouillons d'assistant fiche et anamnèse — `wellneuro:wizard-draft:{…}:${token}`
  (`app/portail/[token]/page.tsx`), `sessionStorage` ;
- brouillon du Journal Alimentaire — `wellneuro:ja5-02:patient:${token}`, et
  l'épisode local construit avec `patientId: token`, `episodeId: 'ja_' + token`
  (`components/food-observation/PatientFoodObservationPanel.tsx`),
  `sessionStorage` ;
- **instantané « depuis la dernière visite »** du hub —
  `wellneuro:portail:derniere-visite:${token}` (`lib/portail-visite.ts`),
  **`localStorage`**.

> **Correctif 2026-07-20 — ce dossier n'en recensait que deux.** La troisième,
> l'instantané de visite, est **la plus exposée** : en `localStorage`, elle
> survit à la fermeture de l'onglet. Elle gardait donc un **secret d'accès à
> demeure** dans le navigateur du patient, là où les deux autres disparaissaient
> avec l'onglet. C'est aussi celle que la rotation du lien pénalisait le plus :
> « ce qui a changé depuis votre dernière visite » serait reparti de zéro à
> chaque nouveau lien — au moment précis où la reprise à plusieurs mois en a le
> plus besoin.
>
> L'inventaire initial avait été fait en cherchant les brouillons ; il fallait
> chercher **tout ce qui s'écrit dans le navigateur**. La requête juste est
> `localStorage|sessionStorage` sur `web/src`, pas « draft ».

**Ce couplage ne touche aucune donnée persistée.** Vérification faite : le
panneau patient du Journal Alimentaire ne fait qu'un appel réseau, un `GET` de
`/api/portail/ja/decision` ; il n'envoie jamais son épisode. Les instantanés JA
persistés passent par `/api/praticien/ja/observations`, côté praticien, où
`saveJaObservationSnapshot` **rejette tout épisode dont le `patientId` ne
correspond pas à l'`idPatient`** (`lib/food-observation/persistence.ts:109`).
Le jeton n'entre donc jamais en base par cette voie.

Conséquence : faire tourner le jeton ferait perdre des **traces locales**,
pas des données. C'est réel, mais borné — et **réparable sans migration**, en
clé sur l'`idPatient` de la session plutôt que sur le jeton d'URL. Autant le
faire avant le gate.

> **Fait le 2026-07-20** (#169), avant le gate. Les trois traces portent
> désormais l'`idPatient` de la session vérifiée. `/api/portail/session` et
> `/api/portail/assignations` renvoient cet `idPatient` ; la page
> `/portail/[token]/alimentation` le résout côté serveur depuis le cookie, si
> bien que le jeton **ne descend plus du tout** jusqu'au panneau du Journal
> Alimentaire. Sans session vérifiée, rien n'est lu ni écrit — et l'écran le
> dit. Une garde structurelle (`lib/portail-identite-locale.guard.test.ts`) lit
> les sources : la régression se réintroduirait par un `${token}` recopié, pas
> par une logique fautive.

Restent deux points d'attention hors navigateur :

- **Les E2E du portail** (`web/e2e/portail-parcours.spec.ts`) réutilisent le même
  jeton d'un bout à l'autre du parcours. Un jeton à consommation unique les
  casse ; ils devront consommer le lien une fois puis naviguer au cookie.
- **Le lien déjà envoyé par e-mail** est aujourd'hui valable indéfiniment.
  Introduire une expiration ne le périme pas rétroactivement — c'est justement
  ce que garantit la coexistence des deux chemins — mais il faudra décider quand
  ces liens permanents cessent d'être honorés, et ce n'est pas une décision
  technique.

### Décisions déjà actées (registre)

`docs/claude/REGISTRE_FRONTIERES.md:613-621` :

- migration **additive seule**, `patients.access_token` **conservé** ;
- **coexistence obligatoire** des deux chemins pendant la bascule ;
- jeton stocké **haché**, expiration courte, consommation unique, rejeu refusé
  et **tracé** ;
- **revue de sécurité obligatoire avant merge** ;
- **gate TRUST** : livrable en préproduction ; **activation avec données réelles
  = décision distincte, aujourd'hui NO-GO**.

### Arbitrages rendus le 2026-07-20

- **Durées** : lien valable **24 h**, à usage unique ; session portail
  **inchangée**, 12 h glissantes.
- **Rejeu** : **un message unique** pour lien consommé, expiré ou inconnu, avec
  une action « redemander un lien ». Rien ne s'apprend en sondant, et la
  personne comprend quoi faire.
- **Ordre** : reclé des traces locales **d'abord et à part** (fait, #169), pour
  que la PR du gate — qui touche l'authentification — reste au strict
  nécessaire.

### Ce qui reste à arbitrer

- **Quand les liens permanents déjà envoyés cessent d'être honorés.** Introduire
  une expiration ne les périme pas rétroactivement — c'est ce que garantit la
  coexistence des deux chemins — mais la date de bascule reste à fixer, et
  **ce n'est pas une décision technique**.

  **Le mécanisme, lui, est livré** (2026-07-21, réserve R4 de l'audit 5.0). La
  date se pose en variable d'environnement Vercel, **sans déploiement de code ni
  migration** :

  ```ini
  WN_PORTAIL_LIEN_PERMANENT_FIN = 2026-10-21
  ```

  - Absente — l'état actuel — **rien ne change** : les liens permanents restent
    honorés. La bascule est **fail-open**, à l'inverse des drapeaux de gate : un
    gate fermé par défaut cache une fonctionnalité, une bascule fermée par
    défaut met les patients dehors au premier déploiement où la variable
    manquerait. Une valeur illisible est traitée comme une absence, et
    journalisée (`PORTAIL_PATIENT.LIEN_PERMANENT.BASCULE_ILLISIBLE`).
  - Posée et atteinte, `POST /api/portail/session` répond **410** avec « Ce lien
    d'accès n'est plus valable. Demandez-en un nouveau… » et **sans lire la
    base** : après la bascule, aucune réponse ne distingue un jeton connu d'un
    jeton inconnu.
  - La bascule est **globale**. Fermer l'accès d'un seul dossier reste une
    révocation (`access_token_revoked`), qui existe déjà et n'est pas le sujet.

  Prérequis avant de poser la date : G4 actif (il l'est, mesuré le 2026-07-21),
  canal de redemande ouvert (idem), et les patients informés — la bascule coupe
  un accès en cours d'usage. Reste donc entière la seule question qui l'a
  toujours été : **quelle date**, et qui prévient.
- **La politique anti-énumération du canal de redemande.** Répondre la même
  chose que l'adresse existe ou non, et borner la cadence.

### Pourquoi SP-SPI attend

La campagne SP-SPI pose elle-même la dépendance : « sans elle, la reprise à
plusieurs mois repose sur un lien permanent, **ce que la campagne refuse** »
(`campagnes/2026-07-19-sp-spi-ma-spirale-patient/CAMPAGNE.md`). Livrer SP-SPI
avant G4 reviendrait à construire l'écran de reprise sur le mécanisme que la
campagne a explicitement écarté.

---

## Ordre — ce qui a été fait, ce qui reste

Le 2026-07-20, l'ordre effectif a été **G3, puis G1, puis le préalable de G4** :
G3 d'abord parce qu'il n'avait aucun arbitrage ouvert, et G1 seulement une fois
la clé de carte tranchée. Le découpage « partie migration-free d'abord » s'est
vérifié deux fois — sur G1 (#166 avant #168) comme sur G4 (#169) : il laisse une
PR de migration relisible pour ce qu'elle est.

1. ~~**G1 voie (b), partie migration-free**~~ — fait (#166).
2. ~~**G3**~~ — fait (#163).
3. ~~**G1, partie migration**~~ — fait (#168).
4. ~~**Préalable G4** — reclé des traces locales~~ — fait (#169).
5. ~~**G4** — lien haché en base, 24 h, consommation unique, rejeu refusé et
   tracé~~ — fait (#172), revue de sécurité passée, livré **éteint** puis
   **activé en production le 2026-07-21** (#182 pour le canal de redemande).
6. **SP-SPI** — **débloqué** : G4 est disponible et activé.

La casse annoncée à l'étape 5 a bien eu lieu et a été traitée :
`web/e2e/portail-parcours.spec.ts` réutilisait le même jeton d'un bout à l'autre
du parcours, ce que la consommation unique interdit. Le parcours consomme
désormais le lien une fois puis navigue au cookie, et un test dédié
`web/e2e/portail-lien-magique.spec.ts` couvre l'usage unique et le rejeu.

## Raccordement

- Gate appliqué en exemple : `campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/GATE_G2_IDENTITE_CYCLE.md`.
- Gate TRUST bloquant pour l'activation réelle :
  `campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`.
- Registre : `docs/claude/REGISTRE_FRONTIERES.md`.
