## 2026-08-11 — fix(inbox): bornes du motif de retrait via MOTIF_MIN/MOTIF_MAX

Remplace les valeurs `5` et `500` codées en dur dans `InboxQuestionnaires.tsx`
par les constantes `MOTIF_MIN` et `MOTIF_MAX` importées de
`lib/scoring/invalidation.ts`, afin que l'UI reste synchronisée avec la
validation serveur en cas d'évolution des bornes.
