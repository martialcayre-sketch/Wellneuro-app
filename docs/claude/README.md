# Kit Claude IA - Wellneuro NNPP2

Ce dossier fournit les fichiers Markdown nécessaires pour donner à Claude IA un cadre fiable sur ce dépôt.

## Fichiers

- `PROJET_CONTEXTE.md` : contexte projet à jour — stack, architecture, dette technique, ce qui reste ouvert. **À lire en premier.**
- `REGLES_CRITIQUES.md` : sécurité, RGPD, contraintes cliniques et anti-régressions.
- `WORKFLOW_DEVELOPPEMENT.md` : procédure pratique pour modifier, vérifier et livrer.
- `TEMPLATES_PROMPTS.md` : prompts réutilisables pour les tâches courantes.
- `PROMPT_CACHING.md` : stratégie de cache des prompts pour l'API Claude (synthèse IA).
- `CONTEXTE_SESSION_VERCEL_2026-07-01.md` : runbook de l'incident 404/DNS production — référence en cas de nouvel incident de routage ou de domaine.
- `ROADMAP_AGENT_PLAN.md` : feuille de route produit consolidée (séries D/R/E, priorités) — fait foi sur les priorités produit, `PROJET_CONTEXTE.md` fait foi sur l'état technique courant.
- `SESSION_LOG.md` : historique des résumés de fin de session (décisions, options écartées, prochaine action).

## Comment utiliser

1. Ouvrir `CLAUDE.md` (racine du dépôt) en premier.
2. Lire `PROJET_CONTEXTE.md` pour l'état courant de l'architecture et la dette technique connue.
3. Donner à Claude la tâche précise.
4. Vérifier les résultats avec les checklists et scripts de sécurité (`docs/checklist_tests_end_to_end.md`, `scripts/check_no_secrets.sh`).

## Autres documents utiles du dépôt (hors ce dossier)

- `docs/roadmap.md` : lots livrés et dette technique.
- `docs/securite_rgpd.md` : exigences RGPD et secrets.
- `docs/checklist_tests_end_to_end.md` : validation manuelle E2E.
- `CHANGELOG.md` : historique des évolutions fonctionnelles.

## Public visé

- Claude IA (contexte système/projet)
- Développeurs de l'application
- Praticiens qui veulent valider les limites fonctionnelles documentées
