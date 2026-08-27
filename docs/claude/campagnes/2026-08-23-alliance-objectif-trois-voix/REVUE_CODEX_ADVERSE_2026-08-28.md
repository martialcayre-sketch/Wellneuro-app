# Contre-revue adverse — Alliance 6.0-B + LOT-05 + `D-113`

## Objet

Résultat de la passe énoncée par `PROMPT_CONTRE_REVUE_CODEX_2026-08-27.md`, à
lire à côté de lui : le verdict seul ne dit pas ce qui a été cherché.

Vingt-cinq affirmations à falsifier, hiérarchisées en trois niveaux. Passe
lancée manuellement par le responsable dans l'extension Codex, sur `main` au
2026-08-27/28.

**Compte final : 5 réfutées (dont 3 au niveau 1), 20 résistent, 0 non
vérifiable.**

`N3.3` était rendue `NON VÉRIFIABLE` par Codex — le contrat SQL exige un dépôt
Git complet, que sa copie de travail n'avait pas. Elle a été **fermée en local
le 2026-08-28** par deux mutations exécutées (§ `N3.3` ci-dessous).

## Tableau des verdicts

| ID | Énoncé court | Verdict | Suite |
|---|---|---|---|
| N1.1 | Deux cycles ne partagent jamais une ligne | **RÉFUTÉE** | corrigée — PR #810, puis #811 en base |
| N1.2 | Rideau `D-052` sur toute ancre | RÉSISTE | — |
| N1.3 | Trois gardes d'écriture uniques | RÉSISTE | — |
| N1.4 | Fenêtre calculée par le serveur | RÉSISTE | — |
| N1.5 | Toute ancre refusée comme jalon d'objectif | RÉSISTE | — |
| N1.6 | EVA absente `null`, jamais coercitive | RÉSISTE | — |
| N1.7 | Texte d'étape réellement obligatoire | **RÉFUTÉE** | corrigée — PR #809 |
| N1.8 | Auteur et date toujours posés serveur | **RÉFUTÉE** | corrigée — PR #810 |
| N1.9 | Réponse append-only sur version exacte | RÉSISTE | — |
| N2.1 | Proposition sans source inconstructible | RÉSISTE | — |
| N2.2 | Le moteur cite et n'invente jamais | **RÉFUTÉE** | corrigée — PR #812, `D-115` |
| N2.3 | La reprise cite sans réécrire | RÉSISTE | — |
| N2.4 | Drapeau absent ⇒ moteur éteint partout | RÉSISTE | — |
| N2.5 | Une ancre posée ne se déplace jamais | RÉSISTE | — |
| N2.6 | Ouvrir un cycle ne recalcule pas l'ancien | RÉSISTE | — |
| N2.7 | Discordance rang/date signalée | RÉSISTE | — |
| N2.8 | Texte patient absent des journaux | RÉSISTE | — |
| N2.9 | Aucune valence clinique patient | RÉSISTE | — |
| N3.1 | `estAncreDeCycle` prédicat unique | RÉSISTE | — |
| N3.2 | Aucune table totale par `JalonMomentum` | RÉSISTE | — |
| N3.3 | Les trois taxonomies divergent seulement en rouge | **RÉSISTE** | fermée en local, deux mutations |
| N3.4 | `targetAt` déterministe | RÉSISTE | — |
| N3.5 | Cadences et tolérance inchangées | RÉSISTE | — |
| N3.6 | Proposer une ouverture n'écrit rien | RÉSISTE | — |
| N3.7 | Les clés fortes ne reposent pas sur l'application | **RÉFUTÉE** | tranchée — PR #811, `D-114` |

## Ce que les cinq réfutations avaient en commun

Aucune n'était visible au type-check, aux tests ni à l'écran. Trois d'entre
elles vivaient **sous une réponse de succès** : `N1.1` perdait une écriture sous
`ok: true`, `N1.7` persistait une ligne sans contenu lisible, `N2.2` servait un
texte présenté comme signé. Une garde qui répond « c'est fait » quand elle n'a
rien fait est le défaut le plus coûteux à trouver, parce que rien ne le
signale.

Deux d'entre elles étaient **déjà décrites dans le code qui les portait** :
`N1.8` sous un commentaire disant « le dater à volonté, dans la seule ligne qui
en fera foi pour toujours », `N2.2` sous un commentaire disant que la route ne
pouvait pas confronter le SHA au registre. **Une garde qui documente le trou
qu'elle laisse reste un trou** — et c'est par ces deux-là que la contre-revue est
passée.

## `N1.1` — le correctif précédent avait déplacé le défaut

`D-113` avait fermé la collision inter-cycle en faisant porter le cycle à
l'identifiant des mesures. Codex a montré que la condition du défaut, elle,
restait ouverte : `ancreRecevable` raisonnait sur les NOMS, alors que l'`upsert`
de persistance est idempotent **sur son identifiant**. Un `T0` posté sous un
identifiant inconnu de la base créait un second cycle du même nom, dont les
`J21` réclamaient à nouveau la même clé primaire.

Deux corrections, à deux étages : la garde applicative exige que la
re-confirmation vise la ligne existante (#810), et la base tient l'unicité de
l'ancre pendant que la table est encore vide (#811, `D-114`).

## `N3.3` — fermée en local, avec les mutations que Codex ne pouvait pas jouer

Codex avait exécuté la mutation Vitest (ajout de `J120` à `JALONS_OBJECTIF` :
rouge) mais pas les mutations SQL, `test:worktree` exigeant un dépôt Git
complet. Les deux ont été jouées le 2026-08-28 :

| Mutation | Résultat | Ce qui l'a prise |
|---|---|---|
| `J21` → `J120` dans le CHECK | **rouge** | « une écriture VALIDE a été refusée (SQLSTATE 23514) — une contrainte est trop serrée » |
| **ajout** de `T0` à la taxonomie | **rouge** | « jalon T0 : l'ancre n'est pas une étape a été ACCEPTÉ alors qu'il doit être rejeté » |

L'élargissement était la direction qui comptait : c'est celle qu'un jeu de cas
négatifs peut manquer, puisqu'ils éprouvent des valeurs refusées et non la liste
admise. Ici un cas négatif la couvre, et le bloc d'inspection de la définition
la double.

**Verdict : `RÉSISTE`.**

## Une observation qui n'est pas un défaut

La troisième mutation de Codex — renommer `ANCRE_JALON` de `T0` en `T1` — laisse
les bancs verts, et il l'a jugé acceptable. Vérification faite : **la constante
n'est plus lue que par des tests**. `D-113` a remplacé tous ses usages de
production par `lireAncresPersistees`. Le vert est donc honnête, et la constante
est du code mort depuis `D-113` — nommé ici, pas retiré au passage.

## Ce que la passe ne couvre pas

Le prompt bornait le périmètre à une liste de chemins (déploiement,
`release-db`, migrations autres que les deux nommées, et « Doctrine exécutable »
explicitement hors sujet). Ce document ne dit donc rien de ces zones.

`N1.8` a été fermée par un **recoupement** de `decideLe` avec la confirmation de
l'épisode. Un épisode dont `confirmedAt` serait lui-même forgé reste cohérent
avec ses contournements : ancrer `confirmedAt` sur une preuve serveur est un
chantier distinct, ouvert.
