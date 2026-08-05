### Ajouté — Le pilote de l'agenda alimentaire démarre, un dossier de contrôle le consigne (lot LOT-05, temps A)

Le drapeau `WN_AGENDA_ALI` a été allumé en Production le 2026-08-05 et un
recueil pilote lancé sur un dossier de contrôle (`RUNBOOK-allumage-drapeau.md`) :
une assignation `Q_ALI_09` et une première journée notée le même jour, posant
l'ancre de la fenêtre de 21 jours.

Les trois assertions de données prescrites par le runbook ont été rejouées
contre la production. Deux mordent au premier niveau : aucune des sept clés
**de premier niveau** de la journée ne relève de la frontière interdite
(gramme, kcal, score, indice, quantité) — les objets de `prises` ne sont pas
traversés par la requête, la frontière n'y tient que par le code de saisie —,
et `contractVersion` est bien la seule version lue. La troisième — l'absence de
chaînage fautif — reste vacue : aucune ligne ne porte encore de
`supersedes_jour_id`, donc zéro ligne est éligible au contrôle. Elle redeviendra
mordante à la première correction notée, ou à la clôture des 21 jours.

`CAMPAGNE.md` et le runbook sont remis d'accord avec la base : la mention
« 0 ligne dans `agenda_alimentaire_jours` » était vraie quand elle a été
écrite et ne l'est plus. Le **barème** descend en `LOT-06`, sa condition de
déblocage (« un premier recueil réel ») étant désormais satisfaite — sans que
cela suffise à le calibrer, une seule journée ne calibrant rien.
