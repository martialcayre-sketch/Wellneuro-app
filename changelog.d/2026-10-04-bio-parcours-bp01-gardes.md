### BIO-PARCOURS BP-01 — gardes avant toute surface neuve ([[D-266]]) (2026-10-04)

- Neuf gardes posées avant toute surface biologie neuve, chacune prouvée par
  une mutation qui la fait rougir :
  - les empreintes du chemin documentaire (épisode, snapshot, carte, protocole)
    ne bougent pas avec des résultats biologiques, et aucun module qui les
    calcule n'atteint la biologie ;
  - l'import de `biology-library` est limité à une liste nominative de
    26 fichiers ;
  - l'accès aux résultats biologiques est limité à 5 fichiers ;
  - le catalogue des conduites reste séparé du futur module « besoin 2 » ;
  - aucune phrase n'est admise dans une structure signée neuve, ni dans une
    structure livrée verrou éteint ;
  - tout appelant LLM de la biologie doit passer par le vérificateur DC-03
    (nouveau, pas encore branché : aucun n'existe). Il refuse tout
    identifiant ou nombre absent des sources, y compris une dose collée à son
    unité (« 500mg ») ;
  - les routes biologie ne journalisent plus le message d'une erreur ;
  - une sentinelle E2E garde le texte remis au patient.
- Le garde-fou d'écriture demande désormais une confirmation pour **toute**
  table signée, reconnue à son marqueur (14 aujourd'hui, au lieu de 6, et les
  tables futures dès leur création).
- Six routes biologie et le service des portes biologiques écrivaient
  `err.message` dans les journaux (risque d'y faire entrer une valeur du
  dossier) : ils écrivent désormais le nom et le code de l'erreur. Aucune
  réponse ne change.
- Aucune logique clinique, aucun drapeau, aucune migration.
