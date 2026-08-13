### Ajouté — protocole structuré et compléments avant biologie (LOT-05, `D-056`)

- **Fait qui a décidé de la forme du lot, relu en production avant d'écrire une
  ligne** : la couche *matière* du catalogue C4 est peuplée (3 444 ingrédients,
  140 148 produits) et la couche *décision* est **entièrement vide** —
  `clinical_rules`, `clinical_intent_tags`, `supplement_source_references`,
  `supplement_safety_alerts`, `ingredient_functional_thresholds`,
  `functional_categories` : zéro ligne, aucun seed. La condition « règle C4
  validée » de la spec est donc **insatisfiable**, et ses conditions négatives
  seraient **vraies par vacuité** — quatrième exemplaire du motif corrigé par
  `D-052` (le `VALID` tautologique), `D-053`/`D-055` (le `group_majority`
  muet) et #482/#489 (`[]` ≠ `null`). Le lot livre donc **le moteur, pas la
  permission** : la règle est écrite, testée, branchée, et refuse en production
  avec motif jusqu'à publication du catalogue. Peupler celui-ci est un travail
  de contenu clinique sourcé, nommé comme dette, hors de ce lot.
- **Contrat de protocole V4** (`c1-protocol-draft-v4`, payload JSON, aucune
  migration) : types d'action `observation` et `medical_referral`, statut
  d'intervention à cinq valeurs, `waitFor` biologique, phases V1. **Le statut ne
  se devine jamais** — requis sur chaque action V4, interdit avant, sans repli
  sur « active » : la valeur la plus engageante des cinq ne peut pas être ce que
  rend une absence (`DC-24`). `waitFor` est requis si et seulement si le statut
  vaut `conditionnelle_biologie`. **Les empreintes des payloads V1 à V3 déjà
  persistés ne bougent pas** : la clé `phases` n'existe qu'en V4, et les deux
  empreintes ont été mesurées des deux côtés du changement puis figées dans la
  matrice d'acceptation. Les phases citent des `actionId` au lieu de recopier
  les actions — une action ne peut pas diverger d'elle-même.
- **Règle de décision « compléments avant biologie »**, module pur rendant un
  verdict motivé plutôt qu'un booléen. Les conditions négatives passent en
  fail-closed, à deux niveaux distincts parce que les deux tables ne se lisent
  pas de la même manière : les **alertes** au niveau du *catalogue* — qu'un
  ingrédient n'en porte aucune est le cas normal et ne prouve rien, ce qui fait
  preuve c'est que le catalogue existe — et les **seuils** au niveau de
  l'*ingrédient*, sans lequel la borne de dose de la règle n'est comparable à
  rien. Une `conditionSupplementaire` illisible est un refus, jamais une règle
  inconditionnelle : s'y tromper ferait naître « active » une intention que sa
  règle voulait suspendre. Le déclencheur reste le tableau clinique — un axe
  DNST ne comble aucun de ses éléments, seul ou ajouté à un tableau incomplet
  (`DC-27`, `DC-28`), **test négatif dédié sur tyrosine et mélatonine**.
  `sentinelleADeQuoiConclure` sert de porte d'entrée plutôt qu'une seconde
  primitive ; son noyau pur est extrait pour qu'un module de décision ne tire
  pas Prisma par transitivité, et son commentaire est remis à l'état réel — il
  affirmait que la table des intentions était peuplée.
- **Garde de restitution étendue aux compléments** : un nom du catalogue cité
  en **formulation prescriptive** sans intention déterministe qui le porte. Ce
  qui est mesuré est le conseil, pas le nom — « carence en fer », « statut en
  zinc » sont de la biologie légitime, et un garde qui les accuse crie tout le
  temps, donc ne se lit plus. Recherche par **mot entier** : le catalogue
  contient « fer », qu'une recherche par sous-chaîne trouverait dans
  « ferritine ». Contrôle **séparé** du garde d'orientation, qui ne tourne que
  sur bloc injecté — le lancer sans bloc avec une liste blanche vide accusait
  tout pack cité dans la prose, régression attrapée par un test existant. En
  synthèse la liste autorisée est toujours vide : la synthèse précède la carte
  de décision dans la chaîne. Journalisé, jamais censuré.
- **Rendu patient** : une intervention non ferme le dit, en français non
  anxiogène — « en attente de confirmation par votre bilan ». La phrase n'est
  pas dérivée de `waitFor.cible` : « ferritine » est le mot du praticien, et le
  recopier servirait au patient un jargon, parfois une inquiétude gratuite. Une
  intervention active ne porte aucune mention ; un statut inconnu est un refus.
  Côté praticien, le statut s'affiche en **lecture seule** — il est posé par la
  règle, jamais saisi à la main, sans quoi une intention pourrait naître
  « active » sans règle derrière.
- **Dettes nommées, non résolues ici** : le peuplement du catalogue de décision
  C4 ; `DC-39` (interventions compatibles simultanément vs à tester
  séquentiellement), arbitrage clinique à instruire depuis des sources et non à
  déduire (`DC-19`) ; l'injection des vigilances de discordance, moitié non
  livrée de l'étape 5 du LOT-01, renvoyée à une PR séparée d'une seule finalité
  — la fusion existe déjà, seule la source manque.
