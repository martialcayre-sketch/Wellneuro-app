# Handoff — 2026-09-16 — LOT-01 : le sens se lit une seule fois, et l'accueil cesse de citer le dossier

Premier lot de la campagne **ouverture du rayon Correspondance**, cadrée le même jour. Il est
le préalable de tous les autres : on n'élargit pas une exposition qu'on ne journalise pas.
PR **#1146**, décision **D-208**.

> Ce handoff **remplace en substance** celui de 14 h 55, qui documentait l'ajout des fragments
> et non le lot. Le dernier handoff au tri fait foi ; il fallait qu'il parle du travail.

## Ce que le cadrage avait trouvé, et que ce lot ferme

| Défaut | État |
|---|---|
| `sens` non contraint, **deux lecteurs repliant en sens inverse** | **fermé** |
| L'accueil récite 120 caractères de texte consigné, hors journal d'accès | **fermé** |
| Le badge du rail fait résoudre 5 noms de patients pour afficher un entier | **fermé** |
| `/recentes` nomme cinq dossiers sans écrire au journal d'accès | **ouvert, et nommé en D-208 §3** |

## Le défaut principal, et pourquoi il ne se corrigeait pas « du bon côté »

`correspondances_medecin.sens` n'a aucun CHECK. Chaque écran s'était donc écrit son repli — et
ils repliaient **en sens opposés** : `recentes/route.ts` rendait `'sortant'`,
`CorrespondanceMedecinPanel` rendait « Réponse transcrite ». La même ligne se lisait « envoi »
à l'accueil et « réponse » sur la fiche, l'accueil accompagnant en plus son libellé faux d'un
extrait du texte.

**Départager les deux écrans revenait à choisir laquelle des deux erreurs garder.**
`libelleSens` et `sensExpose` vivent maintenant dans le domaine, seuls lecteurs : les deux sens
connus gardent leurs libellés, tout le reste rend « Échange consigné » — vrai des deux sens — et
le contrat expose `null`. C'est `DC-24`, le patron qui empêche déjà `sans_ancrage` de se
présenter comme `perimee`.

**Le CHECK en base a été écarté, et la réserve est écrite.** Il aurait coûté une migration seule
et son gate `release-db` pour une colonne dont les deux écrivains applicatifs n'écrivent déjà que
des valeurs valides. Le défaut était **en lecture** ; il se corrige en lecture. Le CHECK ira avec
la migration `supersedes_*`, qui a d'autres motifs — et qui reste, elle, un arbitrage ouvert.

## L'arbitrage du responsable, et ce qu'il a déplacé

Question posée : journaliser `/recentes`, ou réduire ce qu'elle expose. Réponse rendue :
**séparer les consommateurs et retirer l'extrait**, sur un fait découvert en cours de lot — le
rail appelait `/recentes` et **jetait les lignes**, ne gardant que `nbRecentes7j`.

Deux conséquences, plus fortes que l'énoncé de départ :

1. **La colonne `texte` n'est plus sélectionnée.** Un extrait retiré du rendu mais toujours
   chargé serait resté à un `console.log` de distance. La garantie est de forme, pas de
   discipline.
2. **`recentes/compteur` ne traverse aucune table d'identité.** Sa réponse ne peut pas porter de
   donnée patient — là encore une garantie de forme.

## Validation

- **T1 vert**, rejoué après rebase sur `origin/main`.
- **61 bancs** sur le domaine, dont **16 neufs**.
- **Mutation** : réintroduire le repli `l.sens === 'entrant' ? … : 'sortant'` fait rougir le banc
  qui exige `null`, sur cette assertion et elle seule. Restauré par `cp` — jamais par
  `git checkout --`, qui aurait effacé l'édition et fabriqué un faux « mutant tué ».
- **T2 rouge sur la seule signature `D-049`** : `portail-dossier-deux-voix`, iPhone 13 / WebKit,
  navigation expirée **sans aucune requête de page émise**. `wn-diagnostic-e2e` le classe.
  Aucun fichier du diff n'est atteignable depuis le portail patient. Par `D-049`, le CI fait
  autorité sur ce palier — **et il est vert**, sur la tête réelle de la PR (`head=` du SNAPSHOT
  confronté à `headRefOid`).

## Deux frictions rencontrées, pour mémoire

**Le numéro s'est pris au merge, comme prévu.** `D-207` a été mergé par une autre session pendant
le lot ; rebase sur `origin/main`, conflit de `DECISIONS.md` résolu en plaçant l'entrée en
**D-208**, et **sujet du commit amendé** — le squash prend le sujet du commit, pas le titre de la
PR.

**La clôture a été écrite après l'ouverture de la PR**, ce que la règle interdit : Copilot a dû
pousser les fragments manquants, ce qui a changé la tête et remis le merge en `BLOCKED` le temps
d'un second `verify`. À l'avenir : `/wn-finish` puis le handoff **avant** `gh pr create`.

## Prochaine action

**LOT-00** — la page `/dashboard/correspondance` monte le fil transversal, la promesse de pièces
jointes disparaît (D-122 l'interdit), les liens gagnent `?onglet=correspondance`. Un arbitrage y
reste ouvert : le badge du rail compte les gestes du praticien lui-même et retombe à zéro tout
seul au huitième jour — le **nommer**, ou le **requalifier** en attente réelle.

Suivi de campagne : `~/Developer/suivi-rayon-correspondance.html`, tenu à jour à chaque PR.
