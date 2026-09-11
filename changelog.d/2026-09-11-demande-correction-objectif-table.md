### Objectif négocié — la table qui rendra sa porte au patient

Un patient qui a répondu « c'est bien ça » à son objectif garde aujourd'hui les
trois boutons sous les yeux. Le dossier PAT006 porte **deux ratifications
identiques à dix secondes d'écart** : quelqu'un a répondu, n'a rien vu changer
d'assez net, et a recommencé.

Le bloc de réponse se fermera donc après « c'est bien ça ». Et un bloc qui se
ferme sans rien ouvrir enfermerait le patient dans sa propre réponse — d'où
`demandes_correction_objectif`, **la table seule, sans son code** (`D-087`).

- **Le texte est facultatif.** Un clic suffit à lever la demande. Exiger qu'un
  patient sache formuler pour avoir le droit de demander lui poserait une
  condition d'expression sur sa propre parole. `NULL` (il n'a pas écrit) et `''`
  (un envoi perdu) restent distingués par contrainte.
- **Aucune colonne de clôture.** Pas de `statut`, pas de `close_le`. Une demande
  est en attente tant que l'objectif visé est une **tête active** ; la
  reformulation la referme. Un statut se coche sans rien faire — une
  reformulation ne se simule pas.
- **Aucune unicité.** Un patient qui redemande écrit une ligne de plus.

**L'homonyme est dans le même cockpit.** `Assignation.correction_commentaire`
s'appelle aussi « demande de correction », mais porte sur les **réponses de
questionnaire** et se *débloque*. Le suffixe `_objectif` reste dans tous les
libellés praticien : deux objets sous un même nom se confondraient au premier
coup d'œil.

Neuf mutations, neuf mutants tués — dont celle qui rend `texte` obligatoire, et
celle qui pose une unicité : l'une ferait taire les patients sans mots, l'autre
ferait échouer une redemande.
