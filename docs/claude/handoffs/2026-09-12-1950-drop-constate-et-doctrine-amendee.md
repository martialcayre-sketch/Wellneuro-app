# Handoff — 2026-09-12 19:50 — Le repère est supprimé et constaté ; la doctrine dit enfin ce qui s'est passé

## Ce qu'il faut savoir avant tout le reste

La campagne `2026-09-12-vie-du-portail-patient` est **close côté code et côté
base**. Ce qui restait ce soir était le registre des décisions : il continuait
d'affirmer, en tête de sa section active, l'exact contraire de ce qui a été
livré. C'est fait (LOT-12).

**Ne pas rouvrir le débat du cadrage.** Il est tranché par le responsable, sur
pièce. L'erreur, ses causes et ce qu'elle a coûté sont écrits à trois endroits :
en tête de `CAMPAGNE.md`, en tête de `D-172`, et dans `D-175`.

## État Git

Fusionnées aujourd'hui, dans cet ordre — **et l'ordre était obligatoire** :

| PR | Contenu |
| --- | --- |
| **#1061** | Les lectures entrent au fil (table `portail_lectures_patient` + route + accusé) |
| **#1063** | Retrait du journal rétrospectif — **le code quitte la production AVANT le DROP** |
| **#1066** | La migration `DROP TABLE "portail_journal_reperes"` |

`release-db` sur #1066 : **onze étapes vertes**, `migrate deploy` inclus.

**Branche en cours : `doctrine-fil-du-jour`** (deux commits, documentation
seule). PR à ouvrir. T1 vert.

`main` **local** reste détenu par le worktree `courrier-corps-null` : `gh pr
merge --delete-branch` affiche « main is already used by worktree » après chaque
fusion — **cosmétique**, le merge passe et l'état de la PR fait foi. Vérifier
`gh pr view --json state`, ne jamais relancer le merge.

## La constatation, et pourquoi elle ne se déduit pas du workflow

Lu au conteneur (one-off-729), **pas** à la couleur de `release-db` :

| Lecture | Valeur |
| --- | --- |
| `portail_journal_reperes` — `information_schema.tables` | **0** |
| `portail_journal_reperes` — `pg_class` | **0** |
| `portail_lectures_patient` — table | **1** |
| `portail_lectures_patient` — lignes | **0** |
| `…_portail_journal_repere_drop` | fini `17:39:52 UTC`, `rollback=NULL` |

Les **deux** catalogues sont interrogés : une seule vue ne prouverait qu'une
moitié.

**La table des accusés est vide, et c'est une information.** En service depuis
`16:00:51 UTC`, aucun patient n'a ouvert un bilan ni une synthèse depuis. Le
chemin d'écriture n'a **jamais été emprunté en production** — il n'est tenu que
par ses bancs et un E2E. Ne pas prendre plus tard ce silence pour un usage.

## DEUX ERREURS DE MA PART, ÉCRITES ICI POUR QU'ELLES NE SE REJOUENT PAS

**1. J'ai annoncé un point d'arrêt qui n'existait pas.** J'avais dit au
responsable que `release-db` demanderait son approbation et que ce serait le
dernier moment pour dire non. L'environnement `release-db` ne porte qu'une
**minuterie de cinq minutes**, aucune porte de relecture : à 17:34:49 le run est
parti seul. Les trois minutes pendant lesquelles l'API répondait « no pending
deployment requests to approve or reject » n'étaient pas un refus de
permission — c'était l'API disant qu'il n'y avait **rien à approuver**. **Le
dernier point d'arrêt réel est le merge de la PR.** Le dire ainsi la prochaine
fois.

**2. La notification de tâche de fond a menti sur un code de sortie, deux fois
aujourd'hui.** Elle a annoncé « exit code 0 » alors que le fichier portait
`T1-EXIT=1`. Elle rapporte le code du `echo` final, jamais celui de la commande.
**Lire le texte du fichier, jamais le résumé.**

## Ce qui a été écrit ce soir (LOT-12, documentation seule)

- **`D-172` amendée EN TÊTE, avant ses métadonnées.** Son titre contient
  l'erreur (« consigner n'est pas assigner ») ; une note en pied n'aurait pas
  rattrapé un lecteur qui s'arrête au titre. Ses points 1 à 6 décrivent du code
  disparu et sont **conservés tels quels** — une décision se lit avec ce qu'elle
  a cru. Son point 7 a survécu dans `lecturesAttendues.ts`.
- **`D-175`** pose la règle unique du fil et consigne ce que la méthode n'a pas
  pu attraper : un banc dont le titre niait sa propre assertion, invisible à
  toute mutation, trouvé par un E2E de parcours.
- Le numéro `D-175` était libre à l'écriture ; **il se confirme au merge**.

## Reste ouvert

- **La route de clôture de l'agenda alimentaire** : `a_transmettre` n'a pas de
  CTA. Le patient ne peut pas fermer son recueil depuis le fil.
- **L'arbitrage du second `T0`**, hérité d'une autre session.
- **La lettre DPA à Anthropic** et les **trois trous du § 7 RGPD**.
- **Le drapeau `WN_PORTAIL_JOURNAL` a disparu** avec son code ; vérifier qu'il ne
  reste pas une variable d'environnement orpheline côté Scalingo.
