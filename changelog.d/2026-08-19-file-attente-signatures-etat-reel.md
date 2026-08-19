### La file d'attente affirmait des signatures à faire — elles étaient faites

- `docs/claude/campagnes/FILE_ATTENTE.md` (créée la veille, #711) portait
  deux gestes faux à l'écriture : « signer `contradictionsV1` →
  `stopRulesV1` → `priorityRulesV1` » et « poser
  `WN_ENABLE_ORIENTATION_NNPP2` ». Lecture à la source (tables et panneau
  Vercel) : les trois tables sont signées depuis les 2026-08-15/16 (`D-061`,
  `D-062`, `D-067`, frein structurel `D-065`), le drapeau des contradictions
  est posé depuis le 2026-08-16 (`D-064`) et celui de l'orientation EXISTE
  depuis le ~2026-08-05.
- Même classe d'écart que `D-070` : l'état avait été déduit de documents de
  campagne figés à leur date de livraison (lots T0, réserve de la campagne
  packs du 2026-08-03) au lieu d'être lu dans le code et le panneau. Les
  documents historiques, vrais à leur écriture, ne sont pas retouchés ; la
  file, document vivant, revient à l'état réel.
- Reste un constat, pas un geste : la VALEUR du drapeau d'orientation
  (chiffrée, non lisible en CLI ; le verrou `orientationService.ts:103`
  exige exactement `'1'`) — au panneau Vercel, ou en ouvrant un dossier.
