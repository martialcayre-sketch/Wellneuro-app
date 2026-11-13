### Refonte Lien, PRA-3b micro-lot Q18 : la diffusion n'approuve plus qu'une version en vigueur (2026-11-13)

- Validation « pour diffusion » (`POST /api/praticien/protocoles/diffusion`) :
  le serveur refuse désormais (409, motif neuf `version_plus_en_vigueur`)
  l'empreinte d'une version qui n'est plus celle en vigueur sur la décision
  — celle que le GET montre (`resolveActiveVersion`). Un onglet resté ouvert
  sur une version relue, puis remplacée ailleurs, ne peut plus la faire
  approuver. Le refus précède le rejeu de la carte et toute écriture.
- Aucun texte neuf : le refus porte le message existant de l'aperçu périmé
  (« L’aperçu de ce que le clic remettra au patient n’est plus exact : il
  vient d’être mis à jour. Relisez-le avant de valider. »), et le cockpit
  recharge versions et aperçu, comme pour un aperçu périmé.
- Réponse « a » du responsable à Q18 (prototype PRA-3b, 2026-11-13), micro-lot
  serveur posé avant la PR 4. Aucune migration, aucun drapeau, rien de
  clinique.
