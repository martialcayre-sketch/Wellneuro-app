# Handoff — 2026-09-12 — Le Fil apprend à lire une carte (D-171)

## Branche et état Git

Cinq PR fusionnées : **#1030** (table `fil_card_lectures` — migration seule),
**#1032** (la dérivation `partagerParLecture`), **#1034** (route de lecture, et
le GET qui sert les lues à part), **#1036** (lien profond et enregistrement à
l'atterrissage), **#1038** (l'écran : la trace du jour et « Remettre »).

Deux PR fusionnées hors chantier le même jour : **#1028** (§B.3 de
`FEATURE_FLAGS.md` — la mise en service du quatrième verbe, constatée), **#1029**
(l'homonymie « demande de correction »), **#1031** et **#1037** (cadrage puis
arbitrages de la campagne portail patient).

**Une PR ouverte** : la doctrine (`D-171`, fragment de changelog, SESSION_LOG,
ce handoff).

`main` **local** reste détenu par le worktree `courrier-corps-null`. `gh pr merge
--delete-branch` affiche donc une erreur de checkout après chaque fusion —
**cosmétique** : le merge passe, la branche distante est supprimée. Rien n'a été
forcé.

## Migration

`20260912100000_fil_lecture_carte_geste_objectif_v1`, partie **seule**
([[D-087]]), release-db approuvée et **constatée par conteneur** : appliquée en
une tentative, sept colonnes exactes, deux CHECK de non-vacuité, FK `suppr=r`
vers `patients`, RLS active sans policy, zéro ligne.

**Pas de colonne `carte_cle`** — délibéré, et gardé par la liste blanche de
colonnes du contrat SQL négatif. **Pas d'unicité** — « Remettre » est une
seconde ligne.

## Ce qui a décidé le chantier

Une **observation du responsable**, pas une intuition : « deux entrées restent
pour le dossier PAT006, cliquer ne valide rien et n'amène pas sur un choix
nouveau ». Les deux moitiés sont vraies et n'ont pas la même cause — le seul
geste qui retirait une carte était un **refus**, et le lien menait à la fiche
nue.

Les deux cartes de PAT006 sont celles de `D-170` : deux ratifications identiques
à dix secondes d'écart, le 2026-09-11 à 18:14.

## Les quatre arbitrages du responsable

1. **Périmètre : « geste objectif » seul.** Une carte qui appelle un geste
   ailleurs ne se règle pas en la lisant.
2. **Nouvelle table de lecture** (migration), et non la table des refus.
3. **La lecture couvre tous les gestes antérieurs de ce patient** — ancrage sur
   (dossier, type), jamais sur la carte.
4. **Une trace annulable, comme un refus.**

## Ce que j'ai tranché sans demander, et qui mérite relecture

- **La trace est bornée par le JOUR CIVIL DE PARIS.** Pas un seuil neuf : le
  cadre que le Fil se donne déjà (`bornesJourParis`). Coût assumé — la fenêtre de
  réparation dure un jour.
- **L'URL se nettoie de son marqueur après l'envoi**, calculée au serveur
  (`useSearchParams` forcerait la fiche dans une frontière Suspense).
- **Un échec réseau ne dit rien à l'écran** : sans lecture consignée, la carte
  reste au Fil — l'état d'avant le chantier, pas une perte.
- **Les traces sont rendues EN BAS de la timeline**, pas à la place de leur
  carte : une lecture s'est produite ailleurs, sur la fiche.
- **Une garde retirée** du constructeur de lien — elle ne pouvait jamais rendre
  un verdict différent de la table des destinations. Un banc tient l'invariant.

## Preuves

- **Quarante-sept mutations jouées sur les quatre lots de code, quarante-sept
  mutants tués** — onze pour la dérivation, onze pour la route, treize pour
  l'atterrissage, douze pour l'écran.
- **Sept promesses** tenues par contrat SQL négatif
  (`fil_lecture_carte_v1_negatif.sql`, 214 lignes), enregistré comme étape CI.
- **Trois trous trouvés par un mutant survivant**, dont la portée de la requête
  de lectures : sans son `where`, elle lisait la trace d'audit d'un autre
  cabinet — effet visible nul, donc invisible autrement.

## Pièges rencontrés, et comment ils se rattrapent

- **Un octet NUL** (`\0`) écrit dans un gabarit de clé : invisible en diff,
  quatre bancs rouges avec « expected undefined ». Trouvé en forçant la clé dans
  un message d'assertion. Remplacé par un `|` visible.
- **Deux bancs vides livrés puis corrigés** : un `rerender` à props égales ne
  rejoue pas un effet (il fallait `StrictMode`), et une mutation formulée de
  façon neutre ne prouve rien (rejouée sous un autre angle).
- **T2 rouge deux fois en local sur `D-049`** au lot 5 — navigation expirée à
  2,0 min, aucune requête de page, surface non touchée, et un test DIFFÉRENT à
  chaque rejeu. Le CI est vert. La séquence locale, elle, est restée rouge : elle
  n'a jamais été présentée comme verte.
- **La notification de tâche de fond annonce `exit code 0`** pour le `echo` final
  de la commande, pas pour le script. Lire le code dans le TEXTE du fichier.

## Ce qui reste ouvert

- **Campagne « vie du portail patient »** — cadrée (#1031), arbitrée (#1037),
  prête pour son LOT-01 (la dérivation du journal). Son LOT-02 porte la seule
  migration de la campagne : le repère de fraîcheur.
- **Non remarqué, et c'est une question ouverte** : faut-il dire à PAT006 que son
  écran a changé ?
- Hors chantier, inchangé : la lettre DPA à Anthropic et les trois trous du §7
  RGPD.
