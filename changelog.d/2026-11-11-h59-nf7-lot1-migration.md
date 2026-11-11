### J2-base : NF-7 lot 1, migration de la déclaration « question sur le suicide » des instruments du cabinet (H59, 2026-11-11)

Migration seule, file A, sur demande explicite du responsable. Aucun code ne
lit ni n'écrit ces colonnes avant le lot 2. Aucune D-xxx : les réponses aux
questions 20261111-0027-a à 0030-a font foi.

- `cabinet_instruments` reçoit la déclaration (vide = non déclarée) et la
  désignation de la question concernée, que la base n'accepte qu'entière et
  qu'avec un « oui ».
- `assignations` reçoit une copie de la déclaration, prise à l'envoi d'un
  instrument du cabinet, pour que l'écran d'une passation déjà transmise
  garde son encart même si l'instrument change ensuite. La base refuse cette
  copie sur un questionnaire du catalogue.
- Les instruments du cabinet encore publiés repassent en relecture : ils
  devront être redéclarés.
- Un contrat SQL en CI tient ces règles, et tient aussi que la règle
  « aucun instrument publié sans déclaration » n'est pas encore posée en base.
