# Registre des décisions Wellneuro

> **Page fixe** ([[D-418]]) : aucune PR ne l'écrit. Une décision vit dans son
> propre fichier ; une PR qui écrit encore une décision ici est renvoyée
> (D-418 §6), et le garde de numérotation la refuse.

## Où vit le registre

- `docs/decisions/D-NNN.md` : une décision par fichier, nommé par son seul
  numéro (trois chiffres au moins). La première ligne est
  `# D-NNN — <titre>` ; suivent les rubriques habituelles (`- Date :`,
  `- Statut :`, `- Domaine :`, « Amende », « Ne touche pas », contexte,
  paragraphes).
- `docs/decisions/archivees/D-NNN.md` : une décision dépassée, déplacée avec
  son nom et sa première ligne inchangés. Un numéro ne se libère jamais.
- Le numéro se réserve à la rédaction :
  `node scripts/wn-reserver-decision.mjs` ([[D-370]]).
- Une PR qui ajoute une décision crée son fichier, et n'édite aucun fichier
  commun pour la référencer (D-418 §1).
- Un amendement s'écrit dans le fichier de la décision qu'il amende, en
  paragraphe daté ; une décision nouvelle qui en amende une ancienne garde sa
  ligne « Amende » (D-418 §2).
- Un numéro réservé puis abandonné se ferme par une pierre tombale :
  `docs/decisions/D-NNN.md`, première ligne `# D-NNN — Numéro non utilisé`,
  avec sa ligne « Date ».

Le garde `node scripts/lib/decisions-numerotation.mjs` tient la numérotation :
noms canoniques, titre accordé au nom, une décision par fichier, ni doublon ni
trou sans réservation sur une PR, et cette page sans titre de décision.

## Lire le registre

```bash
node scripts/wn-decisions.mjs              # tout, du plus récent au plus ancien
node scripts/wn-decisions.mjs D-418        # une décision par son numéro
node scripts/wn-decisions.mjs --titres     # les titres seuls, du plus récent au plus ancien
```

Aucun index n'est versionné : il redeviendrait le point de conflit que la
bascule a retiré (D-418 §4).

## Avant la bascule

Jusqu'au 2026-11-05, le registre tenait dans cette page, en un seul fichier
rangé du numéro le plus haut au plus bas. Les documents datés qui citent
`docs/DECISIONS.md` (handoffs, campagnes, fragments, journal) désignent cette
forme ; ils ne sont pas réécrits. Le texte de chaque décision a été repris à
l'identique dans son fichier par `scripts/wn-decisions-decouper.mjs`, à deux
exceptions près : le niveau du titre (`###` devenu `#`) et la cible des liens
écrits relativement au fichier, recalculée pour la profondeur du répertoire
(D-418 §3). Le registre unique se relit dans l'historique Git, au parent du
commit de bascule : `git log -1 --format=%h -- docs/DECISIONS.md` nomme ce
commit tant que la page n'a pas changé depuis, et
`git show <commit>^:docs/DECISIONS.md` rend le registre.

Les décisions anciennes sont aussi versionnées dans les entrées
`SESSION_LOG.md` (voir `docs/archive/sessions/`).
