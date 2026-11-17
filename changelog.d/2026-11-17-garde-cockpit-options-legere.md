### Garde du cockpit des options : analyse mémoïsée, plus d'instabilité sous charge (file D, 2026-11-17)

Correctif de banc, sans code de production.

- La contre-épreuve de `cockpit.guard.test.ts` calcule environ dix-huit
  fermetures d'imports. Chaque fermeture analysait de nouveau chaque fichier,
  alors qu'un essai ne change qu'un seul fichier. Le test prenait ~0,5 s seul.
  Sous la charge du contrôle de fusion, il dépassait le délai Vitest de 5 s,
  puis passait au rejeu.
- La résolution des imports et la lecture des accès sont désormais mémoïsées
  par contexte, chemin et texte. Une source surchargée n'est jamais servie
  depuis la mémoire d'une autre. Les assertions sont inchangées : le test
  prend ~60 ms, et le fichier ~0,6 s au lieu de ~1,1 s.
