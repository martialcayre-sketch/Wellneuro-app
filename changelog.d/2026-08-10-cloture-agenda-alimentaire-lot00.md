### L'agenda alimentaire entre au dossier — la clôture existe, et elle ne cote rien (LOT-00, D-039)

Le premier maillon de la chaîne alimentaire est soudé :
`agenda-alimentaire/cloture.ts`, calqué pièce par pièce sur le jumeau sommeil,
transforme un recueil en `QuestionnaireReponse` **standard** — l'agenda devient
lisible de la fiche, de l'inbox et de la synthèse IA, sans qu'aucun de ces
lecteurs ne change.

**Transmettre n'est pas coter (D-039).** La réponse porte la totalité des
agrégats calculés (23 pseudo-items `AGA_*`, dénominateurs compris), dérivés de
l'objet du domaine — jamais recopiés — et reste `scored:false` : aucun score
principal, aucune interprétation fabriquée. Le banc épingle la liste à la
main ; une curation silencieuse rend 3 rouges (mutation jouée, témoin vert).

**Deux gardes propres au domaine, absents du jumeau.** La clôture refuse un
recueil portant des lignes en quarantaine — en les nommant — plutôt que de
transmettre des agrégats calculés sur un recueil amputé ; et une journée
corrigée (`supersedesJourId`) ne compte qu'une fois.

**La route praticien ne porte aucune garde de drapeau, et c'est écrit** : même
arbitrage que le lecteur (LOT-05 de la campagne agenda) — le drapeau gouverne
la collecte, jamais la consolidation d'un recueil déjà collecté. Le cas
« patient qui ne revient plus » est précisément celui du drapeau éteint.

Résidus nommés : le bouton « Clôturer » du lecteur praticien (l'API existe),
et la clôture automatique côté portail à la fin des 21 jours.
