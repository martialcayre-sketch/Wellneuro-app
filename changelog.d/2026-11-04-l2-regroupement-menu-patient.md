### Portail patient : « Autres espaces » rangés en quatre groupes nommés, D-423 au registre (2026-11-04)

- Lot L2 de l'audit « rails et menus » (`docs/claude/propositions/2026-11-01-portail-rails-et-menus/`,
  chapitre 11). Sans drapeau (D-423 §7) : le retour arrière est un revert.
  Aucune route, aucune sonde, aucun drapeau, aucune migration ;
  `[token]/page.tsx` et `/api/portail/session` ne sont pas touchés.
- Sur le hub, la nav `aria-label="Autres espaces"` porte l'ancre « Mon
  parcours » (`aria-current="page"`), puis « Au jour le jour », « Ce que j’ai
  reçu », « Ce que je transmets » et « Avec mon praticien », dans l'ordre de
  D-423 §2. Le rendu part de `entreesServies()` et de `useEtatsSondes()`
  (nouvelle fonction `groupesServis()`, composant `NavAutresEspaces`) : plus
  aucune liste écrite à la main. Un groupe sans entrée ouverte ne s'affiche
  pas. Les libellés d'entrée ne changent pas.
- Les entrées deviennent des liens de liste d'au moins 44 px en `rem`
  (`min-h-11`) au lieu de boutons `ghost` de 48 px (Q17). Rien n'est repris du
  rail praticien (aucun jeton `--rail-*`).
- Les dix `Lien*` prennent une prop optionnelle `sondeSeule` : ils sondent et
  rapportent sans rendre de lien ; leur rendu par défaut est inchangé.
- Le compteur « N questionnaires à compléter · ≈ N min » est retiré (Q18,
  D-423 §6) ; la liste « À compléter » reste. « Mon accompagnement » s'affiche
  déplié d'office quand un protocole est servi, replié sinon (Q19, D-423 §3).
- Le retour de `/informations` devient « ← Mon parcours », même cible (Q20) ;
  `/conditions` garde « ← Mon espace ».
- « Ce que j’ai reçu » prend l'apostrophe typographique (Q35).
- D-423 « Menu patient » entre au registre `docs/DECISIONS.md`, à son rang ;
  le commentaire du hub sur l'arbitrage du 2026-09-12 se réduit à un renvoi à
  D-423 §5. Ligne « Autres espaces » du §8 du plan soldée.
- Bancs : ordre exact des groupes et des entrées, groupe vide sans étiquette,
  chaque lien une seule fois, une seule ancre active, « Mon parcours » seul
  titre de ce nom, cibles `min-h-11`, aucun `bg-rail` ni
  `data-theme="praticien"`, compteur absent, dépli avec et sans protocole,
  matrice majeur, mineur, clos majeur et clos mineur, `sondeSeule` dans la
  table fail-closed des dix `Lien*`.
- E2E adaptés : `portail-dossier-deux-voix`, `portail-bilan`,
  `portail-parcours`, `visual` ; `portail-transmission-compte-rendu` garde
  son budget de Tab. Nouveau `portail-autres-espaces.spec.ts` : un clic
  vers le suivi et le carnet depuis « Au jour le jour », cible de 44 px,
  sur Desktop Chromium et iPhone 13.
