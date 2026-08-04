# `docs/claude/handoffs/` — un handoff par lot

Chaque clôture de lot pose **un fichier ici**, au lieu de réécrire un unique
`HANDOFF_CURRENT.md`. C'est la seule différence, et elle a une seule raison :
un fichier à créneau unique que deux branches réécrivent **entre en conflit à
tous les coups**. Pendant le seul lot du 2026-08-04, ce fichier a produit une PR
entière dont l'objet unique était de le rafraîchir après un merge (#563), et
**trois handoffs ont disparu en route** — celui du lot L3, écrit sur une branche
dont le squash n'a jamais embarqué le fichier, et les deux du LOT-07, écrasés
chacun par le suivant le même jour. Ce sont les trois fragments `0150`, `0743` et
`0931` restaurés ici. Un fichier par handoff, nommé de façon unique, supprime les
deux causes : deux lots ne touchent jamais le même chemin, et rien n'écrase rien.

Le modèle est `changelog.d/`, pour le même motif et avec le même effet.

## Écrire un handoff

Créer `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug-court.md`. La première ligne
est un titre `#` de la forme :

```markdown
# Handoff — 2026-08-04 — Agenda alimentaire : l'accès portail serveur (L4a)
```

Le contenu ne change pas : moins de 120 lignes, branche et état Git, objectif,
décisions prises, fichiers modifiés, validations exécutées, problèmes ouverts,
prochaine action exacte, interdits encore actifs. C'est `/wn-handoff write` qui
le produit — **invoqué à la main**, le skill portant `disable-model-invocation`.

Le plafond de 120 lignes vaut pour un handoff **écrit ici**. Il ne s'applique
pas aux fragments **restaurés** — ceux qu'on récupère d'une branche perdue ou
d'un `HANDOFF_CURRENT.md` d'avant cette convention : deux d'entre eux font 136
et 150 lignes. On ne réécrit pas un handoff historique pour le faire entrer dans
un format posé après lui ; le raccourcir serait réinterpréter ce qu'un lot passé
a dit.

**L'heure fait partie du nom, et ce n'est pas décoratif.** Le 2026-08-04 a porté
quatre handoffs ; sans elle, l'ordre des fichiers ne serait plus celui des lots
et la règle ci-dessous désignerait le mauvais.

**Le format est exigé, pas conseillé.** `scripts/wn-cycle.mjs` n'accepte comme
fragment que `AAAA-MM-JJ-HHMM-` suivi d'un slug et de `.md` : sans cette
contrainte, un `notes.md` déposé ici serait accepté comme handoff **et** désigné
comme le courant par la règle ci-dessous — en tri C, les lettres passent après
les chiffres. Un fichier mal nommé ne clôt donc aucun lot, et `wn-cycle.mjs` le
dit.

**Deux handoffs de la même minute** — deux sessions qui closent ensemble — se
départagent par leur **slug**, c'est-à-dire par l'ordre alphabétique de ce qui
suit l'heure. C'est arbitraire, et assumé : à cette granularité, aucun des deux
n'est « le suivant » de l'autre. Si l'ordre compte réellement, décaler l'un des
deux d'une minute plutôt que de s'en remettre au tri.

## Quel est le handoff courant

**Le fichier le plus récent du dossier**, c'est-à-dire le dernier au tri. La
commande s'ancre à la racine : tapée depuis `web/` — le répertoire courant
habituel des sessions —, elle ne rend rien.

```bash
cd "$(git rev-parse --show-toplevel)" && ls docs/claude/handoffs/*.md | grep -v README | tail -1
```

Il n'existe **aucun fichier « courant » généré et committé**. En poser un
recréerait exactement le créneau unique qu'on vient de supprimer : deux branches
le régénéreraient, et le conflit reviendrait par la porte de derrière. Le prix de
cette absence est une commande à taper ; le prix de sa présence était une PR de
réparation par lot.

## Ce que le cycle de lot vérifie

`scripts/wn-cycle.mjs` ne contrôle plus qu'un chemin littéral ait été touché,
mais qu'**un fragment ait été ajouté dans la branche courante**. La clôture reste
donc exigée avant la PR — le merge est un squash, ce qui s'écrit après lui ne
remonte plus vers `main` —, sans qu'aucun fichier partagé ne soit réécrit.

## Ce que ce répertoire ne garantit pas

Il supprime le conflit **de créneau**, pas l'oubli : un lot clos sans handoff
reste un lot clos sans handoff, et c'est `wn-cycle.mjs` qui le dit. Il ne purge
rien non plus — les handoffs anciens s'accumulent, et c'est voulu : ce sont eux
qui ont manqué le jour où l'on a voulu relire ce qu'un lot précédent avait
tranché.
