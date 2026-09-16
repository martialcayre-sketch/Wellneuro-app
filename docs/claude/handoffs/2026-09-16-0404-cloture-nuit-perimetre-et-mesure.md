# Handoff — 2026-09-16 — La nuit du périmètre : quatre décisions, et ce qui a été refusé

## Les lots

| PR | Décision | Objet |
| --- | --- | --- |
| #1129 | `D-201` | la clause `DC-19` se garde par sa PUCE, pas par son vocabulaire |
| #1125 | `D-202` | le périmètre du classement est attesté, et l'attestation sait se périmer |
| #1133 | `D-203` | la primauté de la plainte dominante est arbitrée |
| #1139 | `D-204` | la clause mesurée en production, le filtre de sortie écarté |

`D-204` seule est encore ouverte — verte et `CLEAN`.

## Le motif qui revient, nommé six fois en deux jours

**Une garde qui NOMME ce qu'elle interdit sans pouvoir le VOIR.**

- la liste blanche de colonnes qui citait « un instant » parmi les interdits et
  laissait passer un `TIMESTAMP` ;
- l'écran qui déduisait la provenance d'une **égalité de libellé**, alors que le
  contrat du champ voisin l'interdisait en toutes lettres ;
- l'écran qui lisait le seul `relu` d'une attestation, sans sa date ni son sha ;
- le banc `DC-19` qui vérifiait des **fragments indépendants**, jamais une clause
  cohérente ;
- le banc de l'écran qui branchait sur `relu` et rougissait pour la mauvaise
  raison sous une signature périmée.

**Trois fois sur six, la réponse était déjà écrite dans le dépôt** — dans le
contrat d'un champ voisin, dans un commentaire de `types.ts`, dans le document de
relecture lui-même. Le défaut n'est pas de ne pas savoir, c'est de ne pas lire ce
qu'on a sous la main avant d'écrire.

## Ce qui a été REFUSÉ, et c'est le plus utile à transmettre

**Le filtre de sortie LLM.** Codex le demandait. La mesure dit pourquoi non :
« 14 nuits » de l'agenda et « 14 nuits » du seuil sont **la même chaîne servie
pour deux raisons**. Aucun détecteur lexical ne les sépare — il aurait censuré
six occurrences légitimes pour zéro fabriquée.

**La priorité intrinsèque en tête.** Arbitrage d'abord rendu dans ce sens, puis
retiré : les quatre priorités étant distinctes, l'égalité qui donnerait la parole
à la plainte ne se produit jamais. L'option ne la reléguait pas, elle la
supprimait.

**Le blacklistage de « sauf si »** dans le banc `DC-19` — c'eût été refaire le
motif ci-dessus.

## Le mécanisme de signature, éprouvé pour de bon

Trois signatures posées, **deux périmées par le verrou lui-même** : la première
en bornant sa portée, la seconde en inscrivant l'arbitrage du signataire. À
chaque fois la règle s'est appliquée à son auteur — *on n'élargit pas après coup
ce qui a été relu, même pour le restreindre, même pour y ajouter une décision du
signataire.*

**Aucune n'a été déduite.** « Relu », « attestation relue », « je signe en
l'état » : la question a été reposée en toutes lettres à chaque fois. La première
fois, la réponse fut « j'ai lu, et j'ai des réserves » — et la réserve était
fondée.

## Frictions, pour ne pas les repayer

- **Quatorze collisions de numéro**, dont quatre sur la même entrée (`D-198` →
  `D-202`). La campagne voisine fusionne plus vite qu'un CI ne rend.
- **`wn-attendre-ci` enchaîné à un push juge la tête précédente** — vérifié deux
  fois cette nuit. Comparer le `head=` du SNAPSHOT à la tête réelle, toujours.
- **`npm run check | tail` rend le code de `tail`** : T1 s'annonçait vert en
  étant rouge sur 351 erreurs.
- **Un worktree neuf a `src/generated/prisma/` VIDE** — `npm run prisma:generate`
  avant toute lecture de T1.
- **Renuméroter au `sed` global casse les entrées des sessions voisines** :
  le SESSION_LOG en porte plusieurs, édition ligne à ligne.

## Ouvert

`analyserSortieSynthese` ne lit que la **structure** — choix assumé (`D-204`),
pas un oubli. Le contenu LLM est surveillé par la mesure, rejouée, et par rien
d'autre. Six synthèses ne prouvent pas un comportement, et une seule dimension a
été mesurée.
