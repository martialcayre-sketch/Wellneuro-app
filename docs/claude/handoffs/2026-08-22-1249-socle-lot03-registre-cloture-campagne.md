# 2026-08-22 12:49 — LOT-03 : les gabarits au registre, le Socle se clôt 3/3

## Ce qui a changé

- **`correspondance/registreGabarits.ts`** — huit gabarits patient versionnés,
  hashés, deux dates, écarts « données de santé » déclarés (quatre nommés).
  Sept appelants migrés au caractère près : 272 tests de surfaces verts sans
  modification, mutation vue rouge. `valideLe: null` partout — la validation
  formelle des textes est un geste du responsable qui n'a jamais eu lieu, le
  registre le dit.
- **La campagne Socle de restitution sûre est TERMINÉE** — ouverte et livrée
  le 2026-08-22, trois lots (PR #736, #739, et la PR de ce lot). **Le gate
  des campagnes 6.0 est posé.** FILE_ATTENTE, état et `next_action` resynchronisés.

## À savoir pour la suite

- **Prochaine primaire : Alliance 6.0-A** (rang 2 — la réponse produit au
  trou ETP). Ouverture = geste du responsable ; le cadrage s'écrira sur état
  réel frais (leçon du Socle : la re-mesure a corrigé le brief sur cinq
  points).
- **Valider un gabarit** = renseigner son `valideLe` (hors empreinte — pas de
  nouvelle version) ; **changer un texte** = nouvelle version au registre
  (hash-lock). Les campagnes 6.0 qui créeront des messages neufs les
  ajoutent AU REGISTRE, avec déclaration de conformité — plus jamais inline.
- Arbitrages responsables pendants (inchangés, consignés) : régimes de garde
  (3 options), candidats de couverture du hook, vestige
  `WN_ALLOW_RISKY_COMMAND`, base E2E dédiée du Mac, `valideLe` des huit.
- Piège technique documenté : `booklet/route.ts` est en CRLF — édité par
  python `newline=''` pour préserver les fins de ligne.

## Ouvert

- PR du lot (T2 en cours au handoff) ; merge = Copilot ou go.
- Session parallèle : travail synthèse non commité toujours dans l'arbre.
