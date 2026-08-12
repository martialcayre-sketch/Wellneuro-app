### Ajouté

- **Un constat de contradiction dit désormais QUAND ses passations ont eu
  lieu.** Chaque source d'instrument porte sa date, et le constat porte l'écart
  en jours entre la plus ancienne et la plus récente. Une discordance entre deux
  instruments ne se lit pas de la même façon selon qu'ils ont été remplis le
  même jour ou à des mois d'intervalle — et C-STR nomme elle-même cette lecture
  dans sa troisième hypothèse explicative, sans qu'aucun chiffre ne permette de
  la trancher (`D-048`, LOT-01 étape 5).
- **La justification de recoupement rejoint le constat.** `recoupementJustifie`
  existait dans la table depuis son écriture et n'était lu par personne. Il
  accompagne maintenant le constat jusqu'à sa restitution, pour que la
  coexistence à l'écran de C-STR et de la suggestion PSS-10 de `R2-STR-01` soit
  défendable devant le praticien — ce que le commentaire du champ exigeait déjà
  (`DC-37`).

### Décidé — ce qui n'a pas été ajouté

- **Aucun seuil temporel.** Le constat est produit quel que soit l'écart : il le
  porte, il ne s'en sert pas pour se taire. Aucune source publiée ne donne de
  durée de validité croisée entre `Q_MOD_01` et le DASS-21 (`DC-19`, qui nomme
  explicitement les « fenêtres temporelles »), et `DC-30` interdit de supprimer
  une discordance en silence.

### Corrigé

- **Un banc figeait 40 jours d'écart entre deux passations, par accident.** Le
  cas qui documente la limite de la garde de complétude comparait un `Q_MOD_01`
  du 2026-07-01 à un DASS-21 du 2026-08-10 — un écart qu'aucun commentaire
  n'expliquait et que ce banc ne teste pas, mais qui a été lu comme la preuve
  qu'un constat entre passations éloignées était voulu. Les deux dates sont
  ramenées au même jour, et la temporalité a désormais ses propres cas.

### Détails de conception

- **L'écart compte les passations DISTINCTES, pas les sources.** C-STR
  interroge `Q_STR_04` deux fois (axes D et S) : trois sources, deux passations.
  Compter les sources rendrait `0` là où il n'y a rien à comparer.
- **`null` en dessous de deux passations distinctes**, jamais `0` : `DC-24`, une
  donnée absente n'est ni zéro ni normale, et `0` dirait à tort « les deux
  passations sont du même jour ». Un banc distingue les deux cas.
- **Ce n'est pas un degré de vérité**, et le garde non négociable de `D-041` en
  dépend : deux passations rapprochées ne rendent pas la contradiction plus
  certaine. Un banc vérifie qu'à scores identiques et écarts opposés, le verdict
  ne bouge pas — si un seuil s'introduisait un jour, ici ou dans un tri en aval,
  il rougirait.
- **La clé `recoupementJustifie` est absente** quand la règle n'en porte pas :
  une clé vide dirait « non renseigné » plutôt que « aucun recoupement ».
