### Cockpit praticien — un signal d'alerte retire les priorités au lieu de s'afficher à côté (`DC-12`, `DC-23`, `D-099`)

- **Les douze signaux d'alerte de l'anamnèse sont cotés en deux rangs**, par
  arbitrage praticien du 2026-08-23 rendu item par item. Rang **adressage** —
  le report est lui-même le risque : douleur thoracique, essoufflement
  inhabituel, malaise, perte de force brutale, idées noires ou suicidaires,
  sang dans les selles ou les urines. Rang **vigilance** — un avis médical que
  le praticien porte dans la consultation en cours : les six autres. La table
  est signée (`safetySignalsV1.ts`) et son périmètre est figé par un sha.
- **`DC-12` et `DC-23` mordent enfin en production.** Elles étaient actées
  depuis `D-043` avec consommateur câblé et bancé, mais **inertes** :
  `chaineC1.ts` posait `safetyFindings: 0` en dur, faute de producteur. Un
  signal de rang adressage fait désormais passer l'abstention en `required`, la
  table des priorités se tait, la carte est bloquée et aucun protocole n'est
  diffusable. Le candidat est **retiré**, pas affiché sous un bandeau.
- **Le rang vigilance ne change rien, et c'est l'arbitrage lui-même.** Ces six
  signaux continuent de remonter par `extraireVigilanceDeterministe`, inchangé.
  Un banc l'épingle par égalité d'empreintes : revue et carte identiques au
  caractère près, avec ou sans signal de vigilance.
- **Aucun point, dans aucun sens.** Le constat ne porte ni gravité chiffrée, ni
  rang numérique, ni pondération. `confidence`, imposé par la base commune aux
  trois familles de constats, est **figé** à `à_documenter` : le faire varier
  avec le rang en aurait fait une mesure de gravité déguisée. Preuve de bout en
  bout : score favorable et signal majeur coexistent, l'empreinte du snapshot
  est **identique**, et le signal prime malgré tout.
- **Un libellé que la cotation ne connaît pas inhibe au lieu de disparaître.**
  Trois replis fail-open ont été écartés nommément : le filtrage contre
  l'énuméré courant (qui aurait fait disparaître en silence un libellé réécrit),
  le plafond de 50 entrées, et la neutralisation de texte destinée au prompt.
- **La table des règles de priorité est re-signée**, sur un périmètre élargi à
  une seule phrase : le verdict par défaut affirmait « aucun producteur n'existe
  à ce jour », ce que ce lot rend faux. Les deux règles, leurs déclencheurs,
  leurs claims et les deux motifs `required` sont inchangés au caractère près.
  La nouvelle phrase nomme la **portée** de la lecture sans prétendre à une
  couverture : le second producteur — effet indésirable déclaré au portail —
  appartient au lot suivant.
- **Portée mesurée avant décision** (production, lecture seule, agrégats sans
  identité) : 25 consultations, **9 portent au moins un signal** (36 %) et **6
  au moins un signal de rang adressage** (24 %). La cotation graduée rend trois
  dossiers à la table des priorités qu'une cotation uniforme aurait fait taire.
- **Réserve nommée** : le verrou de cette table a un sens **inverse** des
  autres. Ailleurs, un verrou fermé fait taire le moteur — défaut sûr. Ici, il
  retire une inhibition. Le contrepoids est la règle passée en `candidate`, dont
  la revue publie l'inactivité, et un CI qui rougit avant la production.
