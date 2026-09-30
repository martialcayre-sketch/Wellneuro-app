### Suivi : le serveur refuse un jalon hors fenêtre, et le rail « Suivi » dit vrai — lot 4 (D-255) (2026-09-30)

- **Avant**, le cockpit ne proposait un jalon de mesure (J21, J42, J90) que
  dans sa fenêtre, mais le serveur acceptait tout jalon posté par le
  navigateur.
- **Maintenant**, la confirmation d'un jalon de mesure nouveau est refusée
  sans protocole diffusé sur le cycle, ou hors de sa fenêtre comptée depuis la
  diffusion. Le motif s'affiche au praticien. Un jalon déjà confirmé se
  re-confirme comme avant.
- **Le rail « Suivi »** ne dit plus « renseignée » sur un dossier sans
  protocole. Il dit « à ouvrir » sans diffusion, « en attente du patient »
  avant le premier point d'étape rendu, « renseignée » ensuite.
- **Le panneau J21**, sans protocole diffusé, dit que les points d'étape ne
  courent pas encore, au lieu d'afficher « en attente du patient » et les
  boutons d'ajustement.
