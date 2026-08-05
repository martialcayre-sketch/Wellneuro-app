### Karasek — « situation équilibrée » ne se prononce plus sur ce qu'elle ignore

Arbitrage praticien du 2026-07-29, sur une réserve nommée le même jour à la
fermeture du lot précédent (#463).

**Ce que le moteur rendait** : un patient à demande psychologique basse, latitude
décisionnelle haute et **soutien social à 8 sur 32 pour un seuil à 24** ressortait
« Situation professionnelle équilibrée », en vert — à côté d'un axe que le moteur
lui-même déclarait `atRisk: true`. C'était le dernier verdict rassurant du
Karasek, et le seul qui contredisait encore son propre drapeau.

**La règle est écrite sur TOUS les axes émis, et non sur trois nommés**, et c'est
la revue de ce lot qui l'a imposé. Une première rédaction exigeait `DEM`, `LAT` et
`SOU` hors risque : elle fermait le cas qu'on venait de voir et laissait sortir le
vert sur une **reconnaissance au plus bas** — 12 sur 24, « on me traite
injustement » et « ma sécurité d'emploi est menacée » au maximum — et même sur une
section reconnaissance **entièrement vide**. Fermer un cas nommé laisse ses
voisins ; énoncer la règle les prend tous.

Deux conditions, qui ne portent pas sur les mêmes axes :

- **Tous les axes doivent être mesurés.** « Équilibrée » parle de la situation
  professionnelle entière : elle ne se prononce pas quand un quart de l'instrument
  n'a pas été rempli. C'est le contrat « non mesuré » appliqué à un **énoncé**
  plutôt qu'à une valeur.
- **Ceux qui publient un seuil doivent être établis hors risque.** `REC` n'en
  publie aucun : son `atRisk` vaut `false` par défaut et ne signifie rien —
  l'inclure au test de risque ferait passer une valeur vide pour un verdict.

La non-vacuité est exigée des deux côtés : `every` sur un tableau vide vaut
`true`, si bien qu'un instrument sans axe, ou sans axe à seuil, aurait conclu à
l'absence de risque du seul fait d'avoir été rempli.

**Pourquoi `SOU` doit y entrer alors qu'il n'entre pas dans le Job Strain.** Le
Job Strain est la conjonction demande × latitude ; le soutien ne pèse que dans
l'Iso-Strain. Mais « équilibrée » est le **seul énoncé du moteur qui conclue à
l'ABSENCE de risque** : une conjonction d'alerte se conclut sur ses propres
termes, une absence d'alerte se conclut sur tous.

**Impact sur les passations enregistrées : nul.** `Q_STR_06` ne porte ni
assignation ni réponse en base, et il n'y a pas de backfill — les scores sont
calculés une fois à la soumission puis stockés, et aucune vue ne les rejoue
(`Q_STR_06` n'est source d'aucun besoin de « Mon équilibre »).

**Ce que ce lot ne fait PAS**, nommé plutôt que passé sous silence :

- **Il ne donne pas de seuil à `REC`.** Une reconnaissance à 12 sur 24, mesurée,
  laisse toujours sortir le vert : ce qui manque n'est pas une mesure mais un
  seuil, et le fixer est une décision clinique. C'est la dernière porte de ce
  genre encore ouverte sur cet instrument.
- **Il ne crée pas la bande « job passif ».** Le quadrant demande basse × latitude
  basse reste sans verdict.
- **L'effet pratique du retrait est le SILENCE, pas un badge dégradé.** La fiche
  praticien ne rend ni `atRisk` ni `seuilLabel` — seulement les totaux et les
  interprétations, que les axes du Karasek ne portent pas. Sans verdict global,
  `buildMiniSynthese` rend une chaîne vide : le praticien voit « Soutien social
  16/32 » et rien d'autre. L'information survit dans la charge envoyée au modèle
  de synthèse, pas à l'écran déterministe. Afficher les drapeaux par axe est un
  lot d'affichage à part entière.
- **Le seuil `SOU < 24` suppose un collectif de travail.** Les huit items nomment
  tous « mon supérieur » ou « les collègues », sans modalité « sans objet » : un
  indépendant ou un isolé en télétravail est structurellement sous le seuil, donc
  désormais structurellement privé du verdict vert. Antérieur à ce lot pour
  l'Iso-Strain, étendu ici au verdict rassurant.

Trois tests neufs et **huit preuves par mutation**, dont celles qui retirent la
non-vacuité, celle qui ne garde que la mesure, celle qui ne garde que le risque,
et celle qui rouvre la régression corrigée dans #463.
