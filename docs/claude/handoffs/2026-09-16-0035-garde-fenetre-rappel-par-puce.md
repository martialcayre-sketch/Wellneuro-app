# Handoff — 2026-09-16 — Le garde de la fenêtre de rappel, refait par puce

## D'où ça vient

Passe Codex **rétroactive** sur la PR #1098, mergée le 2026-09-14 sans la passe
P0 que `POLITIQUE_REVUE.md` impose sur le clinique et la production LLM. La dette
a été tenue onze jours. Deux findings, les deux confirmés par exécution.

## Ce qui était faux

`promptFenetreRappel.guard.test.ts` cherchait chaque morceau de la clause dans
**toute** la consigne. Trois mutations, ré-ancrage des deux empreintes de prompt
compris — sans quoi on ne teste que l'ancre :

| Mutation | Avant | Après |
| --- | --- | --- |
| A — « sauf si elle est habituellement admise pour cette échelle » dans l'opérateur | **55/55 verts** | rouge |
| A-bis — la même exception en phrase SUIVANTE, opérateur intact | **verte** | rouge, **1 seul cas** |
| B — l'opérateur SEUL déplacé sous la première section topique | **55/55 verts** | rouge |

A écrit dans la consigne l'exact comportement qu'elle existe pour interdire.
B déplace l'interdit sous une section que la clause de primauté de
« Recommandation d'exploration déterministe » rend discutable, **sans changer un
caractère de son texte** — le test de position ne localisait que le constat.

A-bis n'est tuée que par l'empreinte de puce : c'est ce qui la justifie.

## Ce qui a changé

Un seul fichier de code — le banc. **La consigne est intacte, donc pas de bump de
`VERSION_PROMPT_SYNTHESE`.** Extraction de la puce markdown, opérateur épinglé
EN ENTIER, cinq composants exigés DANS la puce, empreinte de puce.

Pourquoi une empreinte de plus alors que deux gardes hachent le prompt entier :
celles-là bougent à chaque édition de n'importe quelle ligne, donc les ré-ancrer
est un geste de routine — et c'est par là que passe une clause affaiblie de bonne
foi. Celle-ci ne bouge que si cette clause-ci est touchée.

## Ce qui reste ouvert, et c'est plus grave

**Finding P0 non corrigé.** La clause est l'unique contrôle du contenu produit.
`analyserSortieSynthese` ne lit que la structure, et le dit avec sa raison
(« une violation qui citerait la valeur fautive exfiltrerait du contenu clinique
vers les logs »). Une sortie écrivant « habituellement évalué sur deux semaines »
passe le schéma, passe la relance unique, et se persiste sous `synthese-v30`.

Deux gestes possibles, aucun rendu :
1. **Mesurer** — lecture de production des synthèses `synthese-v30`, comme
   `D-183` l'a fait sur 32 synthèses `synthese-v29`. C'est la seule façon de
   savoir si la clause obéit.
2. **Filtrer avant persistance** — protégerait `DC-19`, mais un détecteur
   d'assertion temporelle censurerait les trois cas que la borne de la clause
   protège : l'agenda transmis, le déclaratif patient, la question d'entretien.
   Poser ce filtre sans l'avoir mesuré échangerait un défaut connu contre un
   défaut inconnu.

## Piège d'environnement rencontré

`src/generated/prisma/` est **vide dans un worktree neuf** — le client Prisma
n'est pas suivi. T1 rend alors 351 erreurs de type sur une centaine de fichiers
qu'on n'a pas touchés. `npm run prisma:generate` d'abord.

Et `npm run check | tail` rend le code de `tail` : T1 annonçait 0 en étant rouge.
Écrire dans un fichier, lire `T1-EXIT` là.
