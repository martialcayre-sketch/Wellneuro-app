---
id: "LOT-03"
statut: "terminé (2026-08-22) — huit gabarits au registre (version, hash, deux dates, écarts déclarés), sept appelants migrés au caractère près (272 tests des surfaces verts sans modification), mutation vue rouge"
dépend_de: "LOT-01 ou LOT-02 (l'un des deux livré)"
---

# LOT-03 — Le registre de gabarits de messages patient (DC-26)

## But

À la fin de ce lot, les gabarits de messages sortants vers le patient vivent
dans un **registre versionné, hash-verrouillé et gardé par test** — `DC-26` :
les règles vivent dans le registre, jamais seulement dans le code. Aujourd'hui
huit gabarits sont dispersés, cinq **inline dans des handlers de route**, sans
version, sans date, sans contrainte opposable.

## L'inventaire mesuré (2026-08-22) — les huit gabarits du registre

| # | Gabarit | Où il vit |
|---|---|---|
| 1 | Lien magique | `consultation/email.ts:65` (module, corps inline) |
| 2 | Accès portail | `consultation/email.ts:108` |
| 3 | Relance agenda sommeil | `agenda-sommeil/relanceEmail.ts:38` — **le seul avec banc de contenu** |
| 4 | Assignation d'un questionnaire | `api/praticien/assignations/route.ts:307` (inline) |
| 5 | Assignation d'un pack | `api/praticien/packs/assign/route.ts:300` (inline) |
| 6 | File d'envoi groupée | `api/praticien/file-envoi/envoyer/route.ts:227` (inline) |
| 7 | Accusé de réception | `api/patient/submit/route.ts:355` (inline) |
| 8 | Envoi du bilan (booklet) | `api/praticien/booklet/route.ts:268` (inline, seul à double corps text+html et à échec bruyant) |

Hors périmètre patient : `trust/notification.ts` (destinataire **praticien**,
`:18`) — classé à part, pas dans ce registre.

## Le patron, et les deux écarts à ne pas recopier

Patron : `trust/contenus/registre.ts` + sa garde `registre.test.ts` — objet
version immuable, `canonicalSha256` (`clinical-engine/canonical.ts:50`,
réutilisable tel quel), `Object.freeze`, garde en trois volets (hash-lock,
liste figée, lexique interdit). Le patron a servi deux fois (v2 confidentialité
publiée le 2026-08-22) : mécanisme prouvé en usage. **Mais** :

- il porte **une seule date** (`publieLe` — types.ts:50) : « rédaction +
  validation » est un **ajout** de ce lot, pas une reprise ;
- il n'a **aucun chaînage cryptographique** — append-only par convention +
  test de liste figée. Ne pas écrire « chaîne » au sens hash-chain.

Et la forme diffère : un gabarit de message a sujet, corps, variables
d'interpolation, canal — sans équivalent dans `VersionDocumentTrust`. Le
registre s'adosse à la taxonomie d'envoi existante
(`TYPES_CORRESPONDANCE_PATIENT` / `journaliserCorrespondancePatient`, imposée
par `correspondance/patient.guard.test.ts:29-41` à tout fichier qui
`sendMail(`).

## La contrainte de contenu — déclarée, pas imposée

Le banc de `relanceEmail` (« aucune donnée de santé : ni instrument, ni
“sommeil”, ni chiffre ») est la **référence à généraliser, pas un état** :
quatre gabarits embarquent aujourd'hui le titre de l'instrument
(`assignations:342`, `submit:383`, `packs:334`, `file-envoi:270`), deux une
note libre praticien. Le registre rend l'écart **déclaré par gabarit**
(conforme / écart nommé) — le corriger est une décision praticien hors
campagne (précédent : l'audit HDS du 2026-07-24 a retiré le motif de
consultation de l'email portail). Le registre **accueille les gabarits
existants tels quels** : il n'écrit ni ne réécrit aucun contenu (`DC-19`,
`DC-20`).

## Périmètre

- Le registre (nouveau module, patron trust adapté) + sa garde structurelle.
- Le raccordement des huit gabarits : chaque texte déménage dans le registre,
  l'appelant le lit par accesseur — **texte inchangé au caractère près**
  (prouvé par les bancs d'email existants qui ne bougent pas).
- Conserver la raison d'être du module séparé de `relanceEmail`
  (`relanceEmail.ts:1-7`) : un banc qui coexisterait avec un autre `sendMail(`
  passerait au vert sans rien prouver.

## Interdits

- **Aucun contenu de message modifié, inventé ou « amélioré »** — le lot
  déménage, il ne rédige pas.
- Aucune migration Prisma ; le registre vit dans le code, gardé par test,
  comme le registre trust.
- Ne pas toucher `trust/contenus/registre.ts` ni sa garde.
- Pas de donnée patient réelle dans les bancs — fixtures uniquement.

## Dépendances

LOT-01 ou LOT-02 livré (l'un des deux) — le registre arrive sur un socle où
la couverture des chemins ou la protection des tables est déjà prouvée ; les
deux premiers lots restent indépendants entre eux.

## Tests

- Garde du registre : hash-lock (toute modification de texte sans nouvelle
  version casse), liste figée des `gabarit@version`, déclaration d'écart
  présente pour chacun des huit.
- Bancs d'email existants **inchangés et verts** — la preuve que le
  déménagement n'a pas altéré un caractère.
- Mutation : modifier un texte du registre sans créer de version → rouge.
- T2 avant commit.

## Critères de done

- [ ] Les huit gabarits vivent au registre, versionnés, hashés, deux dates.
- [ ] Chaque gabarit porte sa déclaration de conformité « aucune donnée de
      santé » (conforme / écart nommé) — aucun contenu modifié.
- [ ] La garde structurelle rougit sur mutation ; vue rouge, vue verte.
- [ ] Bancs existants intacts ; `relanceEmail` garde son module et son banc.
- [ ] T2 vert ; fragment `changelog.d/` écrit.
