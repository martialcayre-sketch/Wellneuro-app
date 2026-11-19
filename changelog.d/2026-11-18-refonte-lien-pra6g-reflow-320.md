### Refonte Lien, PRA-6g : l'import d'un compte rendu (onglet Biologie) et le rayon Connaissances ne font plus défiler la page à 320 px (2026-11-18)

Lot du constat à l'écran de PRA-6 (`pra6-constat.md`, §3.7, critère WCAG
1.4.10, zoom 200 % du téléphone). Des classes de mise en page seulement :
aucun texte, aucun décor, ni route, ni garde, ni drapeau, ni schéma.

- **P25, onglet Biologie du dossier** (62 px) : le champ fichier de l'import
  d'un compte rendu imposait sa largeur propre (340 px) à son libellé, dans
  une place de 236 px. Le libellé et le champ reçoivent `min-w-0 max-w-full`
  (`ImportCompteRenduPanel`) : le libellé se replie, le bouton « Déposer »
  passe à la ligne. Au bureau, rien ne bouge.
- **P46, rayon Connaissances** (5 px) : l'élément non identifié du constat est
  un texte. Le message affiché quand la recherche corpus n'est pas ouverte
  contient le nom du drapeau, un mot sans espace qui dépassait sa carte. La
  carte reçoit `break-words`. Recherche ouverte, l'écran tenait déjà à 320 px.

Banc : `bibliotheque-mobile.spec.ts`, le banc de reflow pleine page existant,
reçoit deux tests à 320 px, joués sous Chromium et WebKit. Son détecteur nomme
désormais aussi les nœuds de texte qui dépassent, faute de quoi P46 restait
anonyme. Rouges sans le correctif, verts avec.

Non traité, comme demandé : la convention du dépôt à 195 px. Mesure et causes
probables au handoff, en proposition de lot.
