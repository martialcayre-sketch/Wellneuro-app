### IDP2 LOT-03c-trace — une connexion Google laisse désormais une trace en base (2026-07-22)

La revue adversariale du LOT-03c avait posé un **NO-GO à l'activation** : le lien
magique écrit `consomme_le`/`rejeux_refuses`, le chemin Google n'écrivait rien.
Trois mois après, « qui a ouvert ce dossier, quand, par quel chemin » n'aurait
plus de réponse — un log Vercel se purge. Ce lot lève ce NO-GO.

- **Une table, `portail_connexions_google`.** Une ligne par tentative parvenue au
  bout : `id_patient` (l'identifiant synthétique, déjà partout ailleurs),
  l'instant, l'issue (`consomme`/`refuse`), et pour un refus sa catégorie
  interne. **Jamais l'adresse, jamais une empreinte, jamais le jeton** — même
  sobriété que `DossierEfface`. `id_patient` est nullable : un refus sur une
  adresse inconnue n'a pas de patient à nommer.
- **Écrite seulement après la vérification du `state`.** Un retour forgé, qui n'a
  pas franchi la garde anti-CSRF, n'écrit aucune ligne — sans quoi marteler la
  route gonflerait la table sans borne.
- **Nominative même sur un refus révoqué**, côté serveur seulement : l'écran, lui,
  reste l'unique écran de refus. La trace sait qu'un dossier révoqué a été
  sollicité ; le navigateur n'apprend rien.
- **Fail-open.** L'échec d'écriture de la trace n'enferme pas dehors le patient
  dont l'accès venait d'être prouvé : on journalise et on continue.
- **Sans clé étrangère vers `patients`, et sans purge automatique** : une trace
  d'accès doit survivre à l'effacement du dossier, et durer est son objet. La
  durée de conservation est une décision de conformité, pas une constante de code.

Migration **additive** (`20260722100000_idp2_g5_trace_connexions_google`), RLS
deny-all comme les autres tables portail. Merger n'active rien : le chemin Google
reste derrière `WN_G5_GOOGLE_PATIENT`, absent de la production, et la table reste
vide jusqu'à l'activation (LOT-03d).
