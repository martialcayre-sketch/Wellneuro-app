### D-335 : données physiologiques déclarées et traitements en cours — contrat de BP-13 écrit, arbitrages rendus (LOT-13, 2026-10-21)

- `docs/DECISIONS.md` : D-335 consigne les arbitrages du responsable
  (2026-10-20 et 2026-10-21) et amende D-331 §2 et §5. Six critères
  physiologiques en lignes datées (sexe déclaré, statut menstruel,
  grossesse, allaitement, poids, taille), « inconnu » écrit, aucun IMC ;
  traitements et compléments en lignes, sans classe ; ajout seul, à deux
  mains (patient au portail, praticien au cockpit), patron de remplacement
  de la tête et de retrait de D-331. La garde de population (D-101) reste
  sur l'anamnèse ; un écart s'affiche en discordance. La synthèse du premier
  bilan lira les traitements en vigueur ; sexe et statut menstruel ne
  partent pas à l'IA. Un traitement devient une pièce de constat.
- `docs/DOSSIER_RGPD.md` : les deux tables et la clé de pièce sont
  déclarées avant leur création ; texte patient proposé
  (`docs/claude/propositions/2026-10-21-bp13-texte-patient/README.md`).
  Validation du responsable attendue avant le merge de la migration.
- Fiche LOT-13 proposée ; campagne et fiche F07 du plan mises à jour.
- Décision seule : aucun code, aucune migration encore.
