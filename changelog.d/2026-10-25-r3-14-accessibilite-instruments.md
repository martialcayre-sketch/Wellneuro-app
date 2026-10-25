### r3_14 : les instruments des 12 besoins sous banc d'accessibilité, et dans le parcours E67 (Q12, 2026-10-25)

- Banc automatique (Q12 choix B) : `web/e2e/fiche-besoins-accessibilite.spec.ts`
  passe axe-core (WCAG 2.1 A et AA) sur l'onglet « Les 12 besoins » et sur
  son tiroir du poste de pilotage, replis fermés puis dépliés au clavier
  (motif d'un non mesuré, « Écart avec la décision »). Zéro violation exigée,
  aucune règle désactivée, même patron que
  `portail-transmission-compte-rendu.spec.ts`. Le tiroir s'ouvre et se ferme
  au clavier, et le focus revient sur son bouton. Portée bornée aux
  instruments (panneau par son id, tiroir par son rôle et son nom) : la
  réorganisation de l'onglet par J3-12b ne le casse pas, il la garde.
  Premier passage vert sous Chromium et iPhone 13 : aucun correctif d'écran.
- Parcours de la passe humaine (`docs/PASSE_ACCESSIBILITE_E67.md`) : étape 9
  « Mon équilibre » depuis un questionnaire verrouillé (choix C) ; au poste B,
  l'onglet et le tiroir « Les 12 besoins », avec ce qu'il faut y écouter
  (A11Y-01 à A11Y-05 de l'audit) (choix A). La passe reste un geste de la
  file D (H64) : neuf étapes, trois écrans praticien.
- Rien d'autre : aucun texte d'écran, aucun calcul, aucune version, aucune
  migration, aucun drapeau. F9a (caption, radar nommé ou décoratif,
  graduations, `role="status"`) suit J3-12b.
