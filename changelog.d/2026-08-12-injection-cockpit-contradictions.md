### Ajouté

- **Le cockpit praticien sait afficher un constat de contradiction**, avec ce
  qui le rend défendable : l'action proposée, l'ancienneté relative des deux
  passations, les hypothèses, les limites, et le motif pour lequel il coexiste
  avec une suggestion d'instrument portant sur le même axe (`D-048`, LOT-01
  étape 5).
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
- **La phrase d'ancienneté est construite côté clinique, pas côté composant** :
  un composant ne doit pas avoir à décider comment on dit « 151 jours ». Elle ne
  porte **aucun qualificatif** — ni « ancien », ni « récent » : ces mots
  supposeraient un seuil que `D-048` refuse d'inventer (`DC-19`).
- **Écart `null` ⇒ aucune ligne d'ancienneté**, alors qu'un écart de `0` affiche
  « les deux passations datent du même jour ». Le premier veut dire « moins de
  deux passations distinctes » ; afficher « 0 jour » dirait à tort qu'elles sont
  du même jour (`DC-24`).
- **Le paramètre est optionnel** : aucun appelant existant n'a à changer, et le
  reste du panneau ne dépend pas de lui.
