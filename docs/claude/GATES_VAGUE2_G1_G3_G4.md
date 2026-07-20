# Dossier des gates de la Vague 2 — G1, G3, G4

> Rédigé le 2026-07-20, en clôture de la Vague 2. **Aucun de ces gates n'est
> appliqué.** Ce dossier réunit ce qu'il faut avoir sous les yeux pour les
> appliquer en une session courte : où ça s'ancre dans le code existant, ce que
> la migration ajoute, ce qui reste à arbitrer, et ce que merger déclenche.
>
> Modèle : `campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/GATE_G2_IDENTITE_CYCLE.md`,
> le dossier du gate G2, appliqué le 2026-07-20 (#155).

## Pourquoi ils n'ont pas été appliqués

Les trois gates modifient `web/prisma/schema.prisma` et
`web/prisma/migrations/`, protégés par `.claude/hooks/protect-wellneuro-files.mjs`.
La levée demande une session lancée avec `WN_ALLOW_PROTECTED_WRITE=1` :

```bash
cd .claude/worktrees/vague2-cloture && WN_ALLOW_PROTECTED_WRITE=1 claude
```

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

Le seul couplage réel au jeton est **côté navigateur**, dans des brouillons
locaux clés par le jeton d'URL :

- brouillons d'assistant fiche et anamnèse — `wellneuro:wizard-draft:{…}:${token}`
  (`app/portail/[token]/page.tsx`), conservés 30 jours ;
- brouillon du Journal Alimentaire — `wellneuro:ja5-02:patient:${token}`, et
  l'épisode local construit avec `patientId: token`, `episodeId: 'ja_' + token`
  (`components/food-observation/PatientFoodObservationPanel.tsx:41-46`).

**Ce couplage ne touche aucune donnée persistée.** Vérification faite : le
panneau patient du Journal Alimentaire ne fait qu'un appel réseau, un `GET` de
`/api/portail/ja/decision` ; il n'envoie jamais son épisode. Les instantanés JA
persistés passent par `/api/praticien/ja/observations`, côté praticien, où
`saveJaObservationSnapshot` **rejette tout épisode dont le `patientId` ne
correspond pas à l'`idPatient`** (`lib/food-observation/persistence.ts:109`).
Le jeton n'entre donc jamais en base par cette voie.

Conséquence : faire tourner le jeton ferait perdre des **brouillons locaux**,
pas des données. C'est réel, mais borné — et **réparable sans migration**, en
clé sur l'`idPatient` de la session plutôt que sur le jeton d'URL. Autant le
faire avant le gate.

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

### Ce qui reste à arbitrer

- **Durée de validité** du lien et **durée de la session** qu'il ouvre.
- **Que faire du rejeu** : refus silencieux ou message explicite au patient ?
  Un refus muet est incompréhensible pour la personne ; un message trop précis
  renseigne un attaquant.
- **Reprise à plusieurs mois** : c'est le besoin de SP-SPI. Un lien à expiration
  courte suppose un moyen d'en redemander un — donc un canal (e-mail) et une
  politique anti-énumération.

### Pourquoi SP-SPI attend

La campagne SP-SPI pose elle-même la dépendance : « sans elle, la reprise à
plusieurs mois repose sur un lien permanent, **ce que la campagne refuse** »
(`campagnes/2026-07-19-sp-spi-ma-spirale-patient/CAMPAGNE.md`). Livrer SP-SPI
avant G4 reviendrait à construire l'écran de reprise sur le mécanisme que la
campagne a explicitement écarté.

---

## Ordre recommandé

1. **G1 voie (b), partie migration-free** — donner une clé stable aux cartes.
   Sans gate, testable immédiatement.
2. **G3** — le plus simple des trois, aucun arbitrage ouvert, et il complète
   SP-TT dont le LOT-01 est déjà en production.
3. **G1, partie migration** — table, route, geste de refus.
4. **G4** — après revue de sécurité, en préproduction.
5. **SP-SPI** — une fois G4 disponible.

## Raccordement

- Gate appliqué en exemple : `campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/GATE_G2_IDENTITE_CYCLE.md`.
- Gate TRUST bloquant pour l'activation réelle :
  `campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`.
- Registre : `docs/claude/REGISTRE_FRONTIERES.md`.
