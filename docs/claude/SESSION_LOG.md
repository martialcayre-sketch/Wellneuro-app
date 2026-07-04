# Journal de session — Wellneuro NNPP2

## 2026-07-04 — Série D1 (design system) terminée

**Décisions prises** : livraison complète de la série D1 (PR #4 à #10, mergées) — tokens deep teal/champagne gold, thèmes `patient` (clair)/`praticien` (sombre) via `data-theme`, composants `ui/` (Badge, MetricCard, PatientRow), shell praticien sombre, `MetricsSection`/`PatientsPanel` restylés, Recharts retenu pour les composants de score, `docs/design-system-d1.md` rédigé.

**Options écartées** : `text-primary` pour le logo en mode sombre (contraste ~1,9:1, rejeté) → `text-accent` ; forge de cookie NextAuth pour tester `/dashboard` → redirect commenté temporairement puis annulé (plus simple) ; Nivo/Visx/ECharts pour la viz de score → Recharts (API JSX, bundle raisonnable).

**Corrections notables** : deux vrais bugs de contraste AA détectés uniquement par capture d'écran (`dashboard/page.tsx`, `dashboard/patients`/`synthese`), un commit égaré sur une mauvaise branche (espace Git partagé), convention CRLF/LF non uniforme du dépôt.

**Prochaine action prioritaire** : E0 — bascule Sheets → PostgreSQL exclusif (dette technique, prioritaire avant tout nouvel empilement), ou E1 (référentiels Ciqual, parallélisable).

**Questions ouvertes** : `SynthesePanel.tsx` reste non migré au thème sombre (aucun lot D1 ne le couvre) — à trancher si un futur lot le concerne.
