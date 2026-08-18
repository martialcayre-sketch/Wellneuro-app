# Handoff — 2026-08-18 — Le courrier médecin est branché, la campagne T0 est close

- **État** : `feat/courrier-biologie-branchement`, depuis `origin/main` à
  `bb421e49`. T1 vert ; T3 rouge du SEUL blocage WebKit `D-049` (5 043 tests
  verts, 135 E2E, `migrate diff` propre). Aucune migration — celle de `D-073`
  est releasée et vérifiée en MCP.
- **Portée** : dernier appelant du Lot F (courrier), garde partagée des routes
  de la proposition, clôture de campagne (10/10, état machine `idle`).

## L'invariant du lot, et la trouvaille de la revue

Le texte consigné est celui que la garde non prescriptive a jugé — et la revue
a montré que ce couplage n'était qu'ACCIDENTEL : le générateur assemblait le
texte, le rendait, puis consignait la variable d'entrée. Un bloc devenu non
diffusable (régime, `contenu.medecin` perdu) aurait fait passer la garde à
vide sur un corps de repli. Le générateur refuse désormais (`bloc_non_diffuse`)
si le rendu médecin ne porte pas le texte — le couplage est structurel.

Les deux autres invariants tiennent par mutation : texte du client ignoré,
ancre relue dans la provenance du bloc RENDU (jamais reconstruite, jamais
reçue). Le SHA vivant est le bon terme — la revue a vérifié que la divergence
signature/vivant est inconstructible : le moteur refuse avant le générateur.

## Ce que la revue a encore changé

Consentement « partage médecin traitant » EXPOSÉ sur le formulaire (décision du
2026-07-22 — exposé, jamais opposé ; la surface sœur qui écrit la même table le
faisait déjà). Geste offert sur le MÊME prédicat que le générateur
(`STATUTS_PROPOSES` exporté — sinon un dossier tout documenté journalisait un
accès pour un 409). Verrou de re-consignation (un clic = une ligne ; correction
possible en changeant le destinataire). 409 pour les refus dont le serveur est
l'auteur, 201 à la création, `catch` de consignation qui ne journalise que le
nom de l'erreur (un `PrismaClientValidationError` porte ses arguments — texte
de la lettre compris).

## La mesure qui vaut d'être retenue

La borne des 8 000 caractères n'est PAS confortable par construction : au
catalogue réel, quinze panels font ~4 000 ; avec des libellés deux fois plus
longs, 8 272. Le banc est calibré aux dimensions réelles — allonger les
libellés du catalogue rapproche la borne, et le banc le dira.

## Dettes nommées (fragment + revue)

- **Ancrage en écriture seule** : rien ne lit `ancrage_sha256`/`ancrage_version`
  ni ne les compare à la table courante. Le fil de correspondance devra les
  afficher (« concordante / périmée ») — c'est ce qui fera des colonnes la
  garde promise par `D-073`.
- **Aucun E2E** sur la proposition ni le courrier, drapeau posé en production.
- Le courrier ne nomme jamais le patient dans son texte (seul `id_patient`
  relie la lettre au dossier) : minimisation à confirmer comme choix.
- La garde locale de `/api/praticien/correspondance-medecin` n'est pas unifiée
  sur `gardeProposition` (elle n'a pas de drapeau — assumé).

## Après merge

La campagne T0 est close (10/10). Preuve terminale toujours ouverte : ouvrir un
dossier réel et voir le panneau — et désormais le formulaire de courrier.
