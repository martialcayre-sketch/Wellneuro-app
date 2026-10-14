# Kit Claude IA - Wellneuro NNPP2

Ce dossier fournit les fichiers Markdown nécessaires pour donner à Claude IA un cadre fiable sur ce dépôt.

## 📋 Campagnes WellNeuro 3.0 (C0-C5)

**[Voir structure des campagnes autonomes](campagnes/README.md)** — programme de développement par lots atomiques.

- Campagne active : [ACTIVE_CAMPAIGN.md](campagnes/ACTIVE_CAMPAIGN.md)
- Plan unique (`D-285`) : [PLAN_WELLNEURO.md](PLAN_WELLNEURO.md) ; programmes 3.2 et 5.0 archivés : [PROGRAMME_WELLNEURO_3_0.md](../archive/roadmap-updates/PROGRAMME_WELLNEURO_3_0.md), [PROGRAMME_WELLNEURO_5_0.md](../archive/roadmap-updates/PROGRAMME_WELLNEURO_5_0.md)
- Navigation rapide : `node scripts/wn-campaign.mjs next` ou `/wn-campaign next`

## Fichiers de contexte IA

- `PROJET_CONTEXTE.md` : contexte projet à jour — stack, architecture, dette technique, ce qui reste ouvert. **À lire en premier.**
- `REGLES_CRITIQUES.md` : sécurité, RGPD, contraintes cliniques et anti-régressions.
- `WORKFLOW_DEVELOPPEMENT.md` : procédure pratique pour modifier, vérifier et livrer.
- `TEMPLATES_PROMPTS.md` : prompts réutilisables pour les tâches courantes.
- `PROMPT_CACHING.md` : stratégie de cache des prompts pour l'API Claude (synthèse IA).
- `CONTEXTE_SESSION_VERCEL_2026-07-01.md` : runbook de l'incident 404/DNS production — référence en cas de nouvel incident de routage ou de domaine.
- `PLAN_WELLNEURO.md` : plan unique (`D-285`) — fait foi sur l'ordre du travail ; `ROADMAP_AGENT_PLAN.md` est archivé sous `../archive/roadmap-updates/` ; `PROJET_CONTEXTE.md` fait foi sur l'état technique courant.
- `SESSION_LOG.md` : historique des résumés de fin de session (décisions, options écartées, prochaine action).

## Comment utiliser

1. Ouvrir `CLAUDE.md` (racine du dépôt) en premier.
2. Lire `PROJET_CONTEXTE.md` pour l'état courant de l'architecture et la dette technique connue.
3. Donner à Claude la tâche précise.
4. Vérifier les résultats avec les checklists et scripts de sécurité (`docs/checklist_tests_end_to_end.md`, `scripts/check_no_secrets.sh`).

## Autres documents utiles du dépôt (hors ce dossier)

- `docs/ROADMAP_TECHNIQUE.md` : architecture technique système.
- `docs/archive/roadmap-updates/HISTORIQUE_CHANTIERS_TECHNIQUES.md` : lots livrés et dette technique (R0→R10), archivé le 2026-10-14 ; dettes vivantes au plan §8.
- `docs/securite_rgpd.md` : exigences RGPD et secrets.
- `docs/checklist_tests_end_to_end.md` : validation manuelle E2E.
- `CHANGELOG.md` : historique des évolutions fonctionnelles.

## Public visé

- Claude IA (contexte système/projet)
- Développeurs de l'application
- Praticiens qui veulent valider les limites fonctionnelles documentées
