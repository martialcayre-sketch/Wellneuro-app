### Ajouté

- **Le référentiel d'ingrédients est peuplé en production** (C4) : **3 444
  ingrédients** et **665 formes d'apport**, tous de provenance `complalim`.
  Le pivot `supplement_ingredients` était vide depuis l'origine, et c'était le
  bloqueur unique du rayon compléments.

  Le compte mérite d'être dit : le référentiel officiel est **plus large que ce
  que le catalogue emploie** (~1 965 libellés distincts sur les 140 148 fiches).
  Il n'est aujourd'hui pas possible de le restreindre aux seuls ingrédients
  employés — cela demanderait les compositions, qui ne sont pas encore chargées.
  Et une règle clinique peut légitimement précéder le produit qui la porte.

  Vérifié sur la base : 3 444 codes distincts (aucune collision), 0 provenance
  incomplète, et **0 règle, 0 seuil, 0 alerte de sécurité** — le vocabulaire
  n'est pas le jugement.

  La relation ingrédient × forme suit bien la source : « Hydrogénosélénite de
  sodium » est rattachée **au sélénium ET au sodium**, « Iodure de potassium »
  à l'iode et au potassium, « D-pantothénate de calcium » à la vitamine B5 et
  au calcium. Une lecture du libellé n'aurait retenu que le second terme et
  perdu le nutriment. C'est aussi ce qui justifie l'index **non unique** côté
  forme.

### Corrigé

- **`ingest.mjs` — `slug()` tronquait après avoir retiré les tirets de bord.**
  Une troncature à 80 caractères pouvait donc retomber sur un tiret, que le
  service refuse. Deux noms officiels sur 3 444 tombaient dedans, et le refus
  n'est apparu qu'au **3ᵉ lot sur 9**, 800 ingrédients déjà écrits : une
  campagne à moitié faite. L'ordre est inversé, et **toute la projection est
  désormais validée avant le premier envoi** — une campagne s'arrête avant
  d'écrire, ou elle va au bout.

  L'idempotence annoncée a tenu à la reprise : les 800 ingrédients et 628 formes
  du premier passage sont revenus « inchangés », aucun doublon.

- **Le cache de moisson est ignoré par git.** Son contenu n'est publié sous
  aucune licence énoncée : le committer serait le rediffuser. Il est
  régénérable, et la reprise se fait déjà sur cache.
