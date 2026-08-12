### Ajouté

- **Le cockpit praticien sait rendre un constat de contradiction**, avec ce qui
  le rend défendable : l'action proposée, **les passations confrontées nommées
  et datées**, les hypothèses, les limites, les claims fondateurs, et le motif
  pour lequel il coexiste avec une suggestion d'instrument portant sur le même
  axe (`D-048`, LOT-01 étape 5).
- **La capacité est livrée, le câblage ne l'est pas** — et c'est dit plutôt que
  laissé croire : aucun site d'appel ne passe de constats au panneau. Le critère
  de sortie correspondant du LOT-01 n'est donc pas tenu ; il est nommé dans
  `D-048`.
- **La justification de recoupement cesse d'être une note de revue.** Le texte
  qui explique pourquoi C-STR et la suggestion PSS-10 de `R2-STR-01`
  apparaissent ensemble était écrit dans la table depuis son origine et n'était
  lu par personne. Sans lui, le praticien voit deux entrées voisines sans savoir
  qu'elles ne disent pas la même chose : l'une propose une mesure, l'autre nomme
  une contradiction entre deux mesures déjà faites (`DC-37`).

### Éteint — et c'est le point

- **Rien ne s'allume.** L'affichage passe par un double verrou fail-closed —
  drapeau d'environnement **et** signature clinique de la table —, au patron de
  `orientationActive()`. La table est livrée **non signée** : aucun constat
  n'atteint un praticien par ce lot, quel que soit le drapeau. Écrire une règle
  et la signer restent deux gestes distincts.
- Le verrou est appliqué **dans la conversion**, pas chez l'appelant : un
  composant qui recevrait des constats et déciderait lui-même de les taire
  finirait par les afficher le jour où quelqu'un oublie la condition.

### Détails de conception

- **La conversion ne va pas vers `DiscordanceFinding`, et c'est forcé.** `D-044`
  prévoyait que « l'injection cockpit convertit » ; sa mise en œuvre montre vers
  quoi elle ne peut pas convertir. `DiscordanceFinding` hérite de `confidence`,
  dont l'énumération ne propose que `solide`, `probable`, `fragile`,
  `à_documenter` — **aucune valeur ne dit « non applicable »**. Convertir un
  constat déterministe vers ce type obligerait à lui inventer un degré de
  certitude, c'est-à-dire à faire exactement ce que le garde non négociable de
  `D-041` interdit, et par le chemin que `D-044` avait justement identifié comme
  piégé. La conversion a donc lieu vers un modèle d'**affichage**, qui ne porte
  aucun champ de cette famille ; un banc l'épingle. `DiscordanceFinding` reste
  en place, inchangé.
- **Les passations sont nommées et datées, pas résumées par un delta.** Une
  première version ne rendait qu'un écart en jours sous l'intitulé
  « Ancienneté » : deux passations à 151 jours d'écart peuvent dater toutes deux
  de l'an dernier, et l'intitulé invitait à décoter le constat par sa vétusté —
  la lecture de fiabilité que `D-048` refuse, obtenue sans champ de fiabilité.
  L'écart subsiste **en complément** des dates, jamais seul, et sans aucun
  qualificatif : ni « ancien », ni « récent », qui supposeraient un seuil
  (`DC-19`).
- **L'écart se compte en jours CIVILS.** Un arrondi sur la durée brute faisait
  dire « le même jour » à deux passations séparées par minuit, à côté de deux
  dates différentes affichées juste au-dessus.
- **Les claims fondateurs suivent jusqu'à l'écran** : une contradiction sans
  source n'est pas remontable (`DC-01`, `DC-26`), et un constat clinique doit
  être ouvrable par les données qui l'ont produit (`DC-34`, `DC-35`).
- **Le paramètre est optionnel** : aucun appelant existant n'a à changer, et le
  reste du panneau ne dépend pas de lui.
