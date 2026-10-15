### Fil du jour : incidents et demandes de droit lus sur les patients du praticien (2026-10-15)

- Les cartes « Signalement » des incidents de confidentialité et des
  demandes de droit lisaient les dix premiers non traités de toute la base,
  sans ordre : les signalements d'un autre praticien, ou d'un patient
  inactif, prenaient les places puis étaient écartés, et ceux du praticien
  connecté pouvaient ne jamais apparaître.
- Ils se lisent désormais sur les patients actifs du praticien avant la
  borne de dix, comme les effets indésirables depuis #1483, et les plus
  anciens d'abord : les deux portent un délai légal (72 h pour un incident,
  un mois pour une demande de droit). Le statut reste leur règle. Aucune
  migration.
- Une session sans e-mail est refusée (401, Fil indisponible), comme au
  panneau TRUST, au lieu d'un repli sur une adresse vide (revue CodeRabbit).
