### Objectif négocié — la provenance se constate au serveur, elle ne se déclare pas

Les huit colonnes de provenance migrées le 2026-09-10 étaient en production
**sans que rien ne les écrive** : la marque « proposé par la machine » ne vivait
qu'à l'écran, le temps d'une session. `D-167` §6 dit pourtant que « la marque est
portée par la version ». Elle l'est désormais.

**Le serveur relit plutôt que de croire.** Aucun identifiant de source ne transite
par le corps de la requête, et la signature de `constaterProvenance` n'en accepte
aucun : elle prend les textes préparés, relit le dépôt, le `narratif_patient` et
les tirages, et ne pose une provenance que sur correspondance **exacte**.

C'est la leçon de `D-164` appliquée avant de rouvrir le trou qu'elle a fermé : la
route de proposition acceptait du navigateur un fragment de restitution dont elle
ne contrôlait que la forme, et le praticien lisait « Restitution publiée par… »
sous un texte que rien n'avait confronté. Ici, la conséquence porterait plus
loin — la priorité part dans le dossier à deux voix que le **patient** lit.

**La marque tombe par le même mécanisme.** Elle ne se retire pas : elle ne se
pose pas, faute de correspondance. Il n'existe donc aucun chemin où §6 tiendrait
à l'écran sans tenir en base.

**`trim` seulement, jamais de normalisation plus large.** Replier la casse ou les
espaces internes ferait passer pour « cité verbatim » un texte retouché — poser
la marque sur les mots du praticien, le faux symétrique de celui que §6 nomme. Un
espace de bord vient du champ, pas de la main.

**Le tirage se cherche par son TEXTE, pas par sa date.** Un praticien qui accepte
le tirage 2 après en avoir vu un troisième garde le rang 2 ; chercher « le
dernier » lui attribuerait celui qu'il a écarté, et fausserait la trace que la
réserve du §11 voulait précisément établir.

**Une lecture en échec ne perd pas l'objectif.** La constatation ne lève jamais :
provenance vide plutôt qu'écriture refusée. Perdre une trace est un moindre mal
que perdre les mots que le praticien vient d'écrire, et une trace absente se lit
comme absente.

Trois mutations vérifient les trois garanties : croire le navigateur, replier la
casse, prendre le dernier tirage — les trois rougissent.
