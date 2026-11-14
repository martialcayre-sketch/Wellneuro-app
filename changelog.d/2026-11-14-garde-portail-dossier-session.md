### Portail : garde serveur du dossier de la page sur les cinq routes d'écriture, T-51 sous le geste refusé, renvoi au segment canonique (2026-11-14)

Réalisation du lot `garde-portail-dossier-session` (D-481 complément DOC-12,
D-488 amendement DOC-12 ; Q8 a, Q9 a, Q10 a, Q11 a). Préalable du code de
Q2a et Q3a de PAT-6. Aucune migration, aucun drapeau.

- Les envois du portail portent le segment de leur page (en-tête
  `x-wn-dossier-page`, `lib/portail/dossierPage.ts`).
- `POST /api/portail/documents`, `comptes-rendus`, `physio-traitements`,
  `trust/choix` et `trust/signalement` refusent en 409 (`autre_dossier`),
  sans rien écrire ni notifier, quand ce segment n'est pas l'`idPatient` de
  la session, absent compris ; les trois premières sans lire le corps. Les
  refus 401 et 403 passent avant, inchangés (`refusAutreDossier`,
  `lib/trust/portailAuth.ts`).
- T-51, mot pour mot, paraît sous le bouton d'envoi de U33, U34 et U40, et à
  l'endroit du geste sur U35, U07 et U39. Sur U40, la mention de sécurité
  existante, inchangée, suit T-51. Après ce refus, la page ne relit rien et
  garde la saisie.
- `app/portail/[token]/layout.tsx` : avec une session valide (signature
  seule), une page ouverte sous un autre segment renvoie à
  `/portail/<idPatient>`, sans texte. Sans session, rien ne change.
- E2E `portail-garde-dossier-page` (patients fictifs) : changement de compte
  dans le même navigateur, refus sur U39 et U40 sans écriture dans l'un ou
  l'autre dossier ; segment quelconque renvoyé à l'entrée. Les E2E à segment
  constant sont repris sur l'`idPatient`.
