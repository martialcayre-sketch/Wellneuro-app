# `changelog.d/` — fragments de changelog

Chaque évolution notable pose **un fichier ici**, au lieu d'éditer le haut de
`CHANGELOG.md`. C'est la seule différence, et elle a une seule raison : deux PR
qui insèrent leur entrée sous `## Non publié` du même fichier **entrent en
conflit à chaque fois** — le `CHANGELOG.md` a produit un conflit de merge sur
chacune des cinq PR de l'audit 5.0 du 2026-07-21. Un fichier par entrée, nommé de
façon unique, supprime ce conflit : deux PR ne touchent jamais le même chemin.

Ce répertoire ne remplace pas `CHANGELOG.md` — il l'alimente. L'historique déjà
écrit y reste ; seules les entrées **à venir** passent par ici.

## Écrire un fragment

Créer `changelog.d/AAAA-MM-JJ-slug-court.md`. Son contenu est **exactement le
bloc** qui irait sous `## Non publié` : un titre `###` terminé par la date entre
parenthèses, puis le corps.

```markdown
### Titre de l'évolution (2026-07-22)

Ce qui change, pourquoi, et ce qui a été écarté. Même ton que les entrées
existantes de `CHANGELOG.md`.
```

Le nom de fichier n'apparaît nulle part dans le rendu final : il ne sert qu'à
éviter la collision et à ordonner (préfixe date). Choisir un `slug` distinctif
(la campagne, le lot, la réserve) rend une collision improbable même le même
jour.

## Replier les fragments dans `CHANGELOG.md`

Au moment de consolider (coupe de version, ou simple regroupement) :

```bash
node scripts/changelog-collate.mjs            # replie et supprime les fragments
node scripts/changelog-collate.mjs --dry-run  # montre le résultat sans rien écrire
```

Le script insère les fragments en tête de la section `## Non publié`, **le plus
récent d'abord** (ordre du préfixe date), puis supprime les fichiers repliés.
Rien d'autre n'est touché. Banc de test :
`node --test scripts/changelog-collate.test.mjs`.

## Ce que ce répertoire ne garantit pas

Il supprime le conflit **d'insertion** (deux entrées au même endroit), pas un
conflit réel où deux PR décrivent la même chose. Il ne parse ni ne valide le
contenu clinique : une modification de scoring ou de seuil reste à documenter
comme avant, ici plutôt que dans `CHANGELOG.md`, et la relecture humaine reste la
garantie.
