### Contre-revue adverse : trois bancs élargis, un texte patient corrigé (2026-08-24)

La passe Codex sur la campagne « Doctrine exécutable » a réfuté sept des treize
affirmations soumises. Six trouvailles, toutes revérifiées dans l'arbre :

- **Un vocabulaire de jeu était servi au patient depuis le 2026-07-18** —
  `components/patient-companion` n'avait jamais été déclaré aux surfaces
  surveillées, le garde connaissant la page du portail mais pas le composant
  qu'elle monte. La phrase devient un constat d'étape, et un nouveau cas remonte
  **transitivement** les imports du portail pour exiger que chaque racine
  atteinte soit déclarée : une surface patient neuve est gardée d'office.
- **Le banc de bump de version du score** ne gardait que deux constantes : la
  formule elle-même pouvait changer sans le réveiller. Il épingle désormais les
  **sorties** du score sur six scénarios et l'**empreinte du mapping** besoin →
  sources, toutes deux par version.
- **Le banc des seuils littéraux** ne voyait qu'une position, le littéral à
  droite d'un opérateur ; la position d'**écrêtage** (`Math.min`/`Math.max`) y
  entre, avec neuf bornes de charge exemptées et motivées.
- **Le banc de la nature du total** perdait la valeur dès qu'elle passait par un
  alias : ils sont résolus à point fixe, et un second détecteur **par libellé**
  couvre les surfaces où la valeur change de nom.
- **Deux surfaces praticien** (fiche-trajectoire, point d'étape J21) portent
  désormais la mention de nature de l'indice « Mon équilibre ».
- **La borne du découpage sous plafond** — un mot plus long que le plafond sort
  seul, hors plafond — est épinglée par un cas plutôt que corrigée : couper
  fabriquerait des mots absents d'un texte signé.

Aucun seuil, aucune valeur clinique, aucune migration.
