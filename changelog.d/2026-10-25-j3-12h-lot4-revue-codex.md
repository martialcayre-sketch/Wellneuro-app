### J3-12h, lot 4 : revue Codex du courrier complément au portail (D-362, 2026-10-25)

- Drapeau `WN_COURRIER_COMPLEMENT` fermé, l'accusé de lecture
  `courrier_complement` répond 404 avant toute session : aucun compte patient
  n'est résolu pour une surface fermée. Lu avant la session, le corps est
  borné à 64 Kio (borne technique, même motif que `ce-qui-compte`).
- La préparation du courrier relit la tête de fil de la carte sous le verrou
  du patient, juste avant l'insertion : une version supplantée ou dont la
  relecture est retirée entre la route et la consignation est refusée, et rien
  n'est écrit. Le banc PostgreSQL constate qu'aucune version neuve ne s'insère
  pendant ce verrou.
- Écarté : retirer l'ingrédient du catalogue des lignes du courrier, dont le
  texte validé par D-358 §1 le prévoit.
- `WN_COURRIER_COMPLEMENT` reste éteint. Aucune migration.
