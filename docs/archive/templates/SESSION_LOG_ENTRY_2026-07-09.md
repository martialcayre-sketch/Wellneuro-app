## 2026-07-09 — Audit de reprise dev et recentrage roadmap

**Décisions prises** : retour prioritaire au développement applicatif sans ouvrir de nouveau chantier évolutif. Le dépôt est plus avancé que la documentation : portail patient unifié P1–P6, cookie signé `wn_portail`, hub « Mes questionnaires », pages autonomes par questionnaire, brouillons locaux, demande de correction enrichie, consentement groupé, synthèse IA enrichie par fiche + anamnèse, registre normalisé questionnaires/packs. La priorité devient la consolidation : réalignement documentaire, validation E2E, finalisation du pack de base, puis transition progressive vers le registre relationnel.

**Options écartées** : lancement immédiat du module compléments clean label, RAG SIIN complet, protocole 21 jours automatisé, enrichissement supplémentaire de la synthèse IA avant validation terrain. Risque jugé trop élevé tant que le flux central patient → questionnaires → synthèse → fiche praticien n'est pas validé.

**Prochaine action prioritaire** : R0 — réaligner `README.md`, `AGENTS.md`, `docs/roadmap.md`, `docs/claude/PROJET_CONTEXTE.md` et `SESSION_LOG.md` avec l'état réel du code, notamment la décommission Sheets/OAuth et le portail patient unifié.

**Questions ouvertes** : vérifier s'il reste des occurrences actives de `SHEET_ID`/Sheets dans le code ; compléter le pack « Base de consultation » ; valider visuellement le parcours patient mobile ; décider du calendrier de bascule lecture packs vers le registre relationnel.
