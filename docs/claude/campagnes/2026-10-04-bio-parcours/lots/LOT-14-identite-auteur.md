---
id: "LOT-14"
titre: "BP-14 — Identité d'auteur séparée du rôle"
statut: "en_cours (2026-11-07) — fiche et sept arbitrages du responsable ; D-459 acceptée, cinq arbitrages de forme ; migration seule à écrire"
dépend_de: "LOT-00"
---

# LOT-14 (BP-14) — Identité d'auteur séparée du rôle

> **Fiche proposée le 2026-11-07.** Elle consigne les arbitrages rendus le
> même jour par le responsable, sur questions à options (liste commune,
> `20261107-1921-c` à `-1925-c`, `-1931-c`, `-1932-c`). Le dépôt est public :
> cette fiche ne porte ni identité, ni adresse e-mail, ni identifiant de
> dossier.

## But

Fermer l'omission O1 du cadrage v3
(`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:99`, `:240`,
`:380`) : savoir **qui** a créé une version de protocole et **qui** l'a
approuvée pour diffusion. Le rôle (`approvedBy = 'practitioner'`) ne change
pas. BP-18a (prescription figée) et BP-24 (conformité) en dépendent
(`:394`, `:397`).

## Résultat observable

Une version de protocole créée au cockpit porte l'e-mail de session de son
auteur, posé côté serveur. Une approbation de diffusion porte celui de son
approbateur. Les lignes antérieures à la migration portent un auteur
déduit, sauf les brouillons JA non relus, qui restent nuls. La diffusion,
le portail, la vue patient et le calendrier lisent `approvedBy` comme avant.

## Ce que le code fait aujourd'hui (lu le 2026-11-07 sur `2e45dc0f`)

- **Rôle unique** : `web/src/lib/auth.ts` admet tout compte vérifié du
  domaine et expose `session.user.email`. Il ne connaît aucun rôle. BP-14
  ne le modifie pas.
- **`approvedBy` n'est pas sur `ProtocolDraft`**. Il est sur
  `ProtocolDiffusionApproval` (`web/prisma/schema.prisma:1521`, colonne
  `approved_by`, `TEXT NOT NULL DEFAULT 'practitioner'`, sans CHECK, depuis
  la migration `20260717130000_c2a_diffusion_v1`).
- **Écrivains de `approvedBy`**, toujours le littéral : la route de
  diffusion (`api/praticien/protocoles/diffusion/route.ts:325`, `:526`,
  `:630`, `:893`) ; un objet en mémoire dans
  `lib/trust/pauseEffetIndesirableServeur.ts:75`, sans écriture en base.
- **Lecteurs stricts** : `lib/protocol/diffusion.ts:34`,
  `lib/protocol/portailProtocol.ts:101`,
  `lib/clinical-engine/patientProtocolView.ts:36`,
  `lib/food-compass/contextual.ts:187`. Le type est littéral dans
  `lib/clinical-engine/types.ts:603`. La valeur transite par le calendrier
  (`lib/protocol/calendriersPersistes.ts:60`, `calendrierSuivi.ts:93`). Elle
  y est rangée sous le nom interne **`approuvePar`**, qui porte le rôle et
  non une identité : la nouvelle colonne ne peut pas prendre ce nom.
- **Créations de `ProtocolDraft`** :
  - `api/praticien/protocoles/versions/route.ts:666` (upsert), avec la
    session praticien disponible (`:120`) ;
  - `lib/food-observation/persistence.ts:208` (instantané JA, statut
    `draft`), appelé par la route praticien `ja/observations` **et** par la
    route du portail `ja/observations`, avec la session du patient. Le
    `payload` porte l'origine : `actor`, posé côté serveur (`'praticien'`
    par la route praticien, `:174` ; `'patient'` par le portail, `:171`) ;
  - `persistence.ts:555` (activation JA, statut `practitioner_reviewed`),
    appelé par la route praticien `ja/activation`. Elle refuse tout
    instantané dont l'`actor` n'est pas `'praticien'` (`:535`).
- **Approbations** : `diffusion/route.ts:519` (dans une transaction) et
  `:623`, avec la session praticien disponible (`:259`, `:748`).
- **Patron du dépôt** : l'e-mail de session est posé côté serveur, jamais
  transmis par l'écran (`schema.prisma:1117`, `:1262`, `:1352`). Une
  trentaine de tables l'appliquent déjà (`praticien_email`, `arbitre_par`,
  `constate_par`, `cree_par` de `PortailMagicLink`).
- **Contrats négatifs** : huit fichiers de `web/prisma/checks/` insèrent
  dans `protocol_drafts` avec une liste de colonnes. Une colonne facultative
  ne les casse pas, une colonne `NOT NULL` les casserait.
- **Aucune décision** de `docs/decisions/` ne traite de `creePar` ni
  d'`approvedBy`.

## Production (lecture seule, agrégats, 2026-11-07, one-off-5223)

- 13 versions de protocole : 10 `c1-protocol-draft-v4` relues, 3
  `ja-food-observation-v1` au statut `draft`, toutes trois d'`actor`
  `'patient'` (one-off-3000).
- 9 approbations de diffusion, toutes `practitioner`.
- Un seul e-mail praticien distinct, dans `patients` comme dans
  `decision_priority_selections`.

## Arbitrages (rendus par le responsable le 2026-11-07)

0. **File** : la file C porte BP-14, comme premier maillon de la place 8.
   La session suit la migration jusqu'à son constat (D-373 §1). Le tableau
   du rang 5 du plan passe de B à C.
1. **Périmètre** : `creePar` sur `ProtocolDraft` **et** approbateur
   nominatif sur `ProtocolDiffusionApproval`, dans un champ distinct.
   `approvedBy` ne change pas. Un brouillon JA déposé depuis le portail
   garde un auteur nul.
2. **Historique** : les lignes existantes sont remplies par la migration
   (option non recommandée par la session, retenue par le responsable).
   L'auteur se déduit de `patients.praticien_email`, par jointure SQL, sans
   e-mail écrit au dépôt.
   - **Brouillons JA au statut `draft`** : laissés nuls. Seules les lignes
     qu'une route praticien a forcément créées sont remplies : versions
     relues et approbations. *Correction du 2026-11-07, après la revue :*
     la question posée disait que l'origine d'un brouillon JA ne se lisait
     pas sur la ligne. C'était inexact, car le `payload` porte `actor`.
     Les trois brouillons de production sont d'`actor` `'patient'` : ils
     restent nuls par la règle du périmètre (arbitrage 1), et la décision
     ne change pas.
   - **Provenance** : par la date, dans la D-xxx. Toute ligne antérieure à
     l'application de la migration porte un auteur déduit. Aucune colonne
     de provenance n'est ajoutée. La date seuil n'est connue qu'au constat
     de la release-db : la D-xxx fixe la règle, et l'horodatage constaté
     (sentinelle) s'inscrit au journal de F10 puis dans la D-xxx, avant
     que BP-18a ou BP-24 lisent ces colonnes.
   - **Praticien du dossier ≠ auteur de l'acte** : la jointure donne le
     praticien rattaché au dossier au moment de la migration, pas
     forcément celui qui a agi. Un seul praticien distinct existe en
     production. La D-xxx dit comment la migration s'en assure au moment
     de s'appliquer, et ce qu'elle fait sinon.
3. **Release-db** : dès que la migration est prête. La condition « après
   BP-12b » de F10 est remplie par la release-db de `positions_expert_v1`,
   verte le 2026-11-05. BP-15 a la sienne, constatée le 2026-10-22. Aucune
   PR ouverte ne porte de migration, et la sonde rend 0 le 2026-11-07. Les
   release-db restent une à la fois (D-248).
4. **D-xxx d'identité d'auteur** : rédigée par la session sur ces
   arbitrages, dans une PR de décision seule, acceptée par le responsable
   avant la migration.

## Arbitrages de forme (rendus le 2026-11-07, portés par D-459)

Rendus sur l'option recommandée (liste commune, `20261107-2112-c` à
`-2116-c`) :

5. **Nom de l'approbateur** : `validePar` (colonne `valide_par`).
6. **Plus d'un praticien** : la migration refuse de s'appliquer, sans rien
   écrire. Elle compte les e-mails distincts de `patients` et de
   `journal_acces_dossiers`.
7. **Registre RGPD** : une phrase dans la ligne « Santé (art. 9) ».
8. **Affichage** : aucun écran, aucun drapeau.
9. **Effacement** : code inchangé ; un banc le tient dans la PR de code.

## Ordre des PR proposé

1. **D-459, identité d'auteur** : `docs/decisions/D-459.md`, acceptée le
   2026-11-07. Elle fixe :
   - le nom des deux colonnes : `creePar` comme le cadrage, et un nom
     distinct de `approuvePar` pour l'approbateur ;
   - leur caractère facultatif ;
   - la règle de reprise : quelles lignes sont remplies, la jointure, la
     date qui sépare un auteur déduit d'un auteur consigné ;
   - l'écriture côté serveur seule ;
   - le cas du portail (auteur nul) ;
   - l'effet sur l'effacement (`patient/effacement.ts`) ;
   - la ligne au registre RGPD si elle est due (e-mail du praticien versé
     dans deux tables de plus) ;
   - le drapeau éventuel de l'affichage (le cadrage dit « éteint »).
2. **Migration seule** (D-266 §11) : deux colonnes facultatives, la reprise
   bornée par l'arbitrage 2, le contrat négatif en CI et le bloc
   `schema.prisma`. Aucun code consommateur.
3. **Release-db** approuvée par le responsable, sentinelle, puis constat
   par conteneur (porte 9). La reprise se relit en agrégats.
4. **Code** : l'e-mail de session posé aux trois créations praticien et aux
   deux approbations, un auteur nul depuis le portail. Banc nominatif (la
   ligne neuve porte l'auteur de la session). Banc historique (une ligne
   nulle ou déduite ne casse aucun lecteur). Lecteurs de `approvedBy`
   inchangés.

## Critère de fin (F10)

Release-db constatée ; bancs nominatif et historique verts ; aucun lecteur
existant cassé.

## Interdits

- Aucune modification de `auth.ts` ni des rôles. Une évolution de
  l'authentification relève de l'exception D-373 et d'un arbitrage
  distinct.
- Aucun e-mail ni identifiant de dossier au dépôt, ni dans la migration.
- Rien sous `web/src/lib/clinical/`.
- Pas de `schema.prisma` ni de migration hors de la PR 2. Production en
  lecture seule, hors la release-db approuvée.
