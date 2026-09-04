### Ajouté

- **Le document patient remis se relit.** `documents_patient_biologie` n'avait
  aucun lecteur : une pièce consignée n'existait qu'en base, et l'écran
  repartait vierge à chaque rechargement — le témoin « déjà consigné » vivait
  dans l'état de session. Un `GET` sur la route du document patient rend les
  pièces du dossier, la plus récente d'abord, **telles qu'elles sont parties
  au patient** : texte et ancre viennent de la LIGNE, jamais d'une nouvelle
  dérivation (même discipline que le verdict d'ancrage, `D-079`). Le panneau
  de proposition les liste avec leur date et leur empreinte ; relire un texte
  est un geste, pas un déversement. **La liste ne dépend pas de l'offre du
  geste d'établir** : quand tous les panels sont déclarés explorés, plus
  aucune ligne n'est proposée — et c'est précisément là qu'on cherche ce
  qu'on a remis. La lecture journalise l'accès (`GD-1`, 24ᵉ route GET du
  dossier RGPD) et se chaîne au RENDU du panneau — jamais à l'effet global,
  qui inscrirait au registre une lecture que personne n'a demandée. L'état
  vide ne s'affirme qu'après une lecture aboutie (`DC-24`) : sur panne,
  l'écran dit qu'il ne peut pas affirmer qu'aucun document n'a été remis, et
  offre de relire. La liste est bornée aux 20 remises les plus récentes, et
  l'écran le DIT quand il est au plafond — une liste coupée en silence se lit
  comme une liste complète.

### Corrigé

- **La double consignation d'un document patient ne passe plus en silence.**
  Le verrou vivait à l'écran seulement — deux onglets établissaient deux
  pièces identiques (défaut nommé le 2026-08-20 à la clôture de « Biologie
  consolidée », sans lot d'accueil jusqu'ici). Le serveur compare désormais
  le texte dérivé au **dernier** document consigné et refuse en 409
  `DOUBLON_DOCUMENT` — refus **confirmable** (`confirmerDoublonSha256`), car
  re-consigner reste légitime : le praticien peut remettre une seconde copie.
  La confirmation est liée au TEXTE, comme celle du registre anxiogène, et
  les deux jetons sont **séparés par domaine** : ce ne sont pas deux champs
  qui portent la même valeur, si bien que confirmer le doublon ne peut pas
  lever la garde du registre, même par recopie accidentelle. **Portée exacte,
  et elle est étroite** : une
  détection en lecture-puis-écriture ferme le cas séquentiel (deux gestes qui
  se suivent), pas la course vraie de deux requêtes simultanées — celle-ci
  exigerait une contrainte en base, donc une migration et son propre cycle.
