### Modifié

- **La consigne système de synthèse ne revendique plus la validation
  psychométrique des questionnaires** (`synthese-v18` → `synthese-v19`). Elle
  disait « organiser les résultats de questionnaires **validés** » — la seule
  surface du **runtime** à l'affirmer, et la plus lourde de conséquences
  puisqu'elle fabrique le texte clinique lu par le praticien puis remis au
  patient, pendant que le registre porte `cosmin: inconnu` pour les
  65 instruments. Son cadre déontologique porte désormais l'énoncé exact :
  ces questionnaires servent au **repérage et à la préparation**, **WellNeuro
  n'a évalué la validité psychométrique d'aucun instrument qu'il sert et ne s'en
  réclame pas**, aucun score n'est une mesure validée, aucune norme de
  population n'est invocable.
- **Ce que la décision ne dit pas.** Elle ne nie pas la validité des
  instruments : le catalogue sert l'EORTC QLQ-C30, le PSQI, la HAD, l'Epworth,
  validés par ailleurs. Une première rédaction de la consigne interdisait de les
  « présenter comme validés » — un faux clinique, dans le texte même qui va au
  patient. Refusé en revue, corrigé avant merge : l'interdit porte sur **notre
  revendication**, jamais sur la nature de l'instrument.

### Ajouté

- **D-034** — la validation psychométrique **n'entre pas au programme**. C'est un
  non assumé qui **ferme** la dette 2 de la campagne de clôture 5.0, au lieu de
  la laisser ouverte indéfiniment. `docs/claude/corpus/README.md` définit
  désormais ce que « certifié » veut dire — *le code reproduit la règle
  enregistrée*, rien de plus — là où le mot s'emploie.
- Un garde de banc (`promptAlimentaire.guard.test.ts`) refuse le retour de la
  revendication **et** exige la présence du démenti. Les quatre assertions sont
  nécessaires : l'absence seule serait satisfaite par une consigne muette, où le
  modèle réinventerait la formulation qu'on lui retire — classe de défaut que ce
  fichier documentait déjà deux fois.

### Non modifié, et c'est le point

Ce que le produit dit au patient : il n'a jamais revendiqué la validation
(`registre.ts` écrit déjà « relève du bien-être et du suivi ; n'établit pas de
diagnostic médical »). La décision aligne l'interne sur l'externe, pas l'inverse.
