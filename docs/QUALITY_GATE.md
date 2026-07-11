# Quality Gate Wellneuro

> Sélectionner les contrôles selon le type de changement. Tous les changements doivent passer la section « Tous ».

## Tous les changements

Obligatoire avant tout commit :

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

## Changement questionnaires ou scoring

Ajouter obligatoirement :

```bash
cd web && npm run scoring-check
```

## Changement pack registry ou questionnaire_packs

Ajouter obligatoirement :

```bash
cd web && npm run check:pack-registry
```

## Avant déploiement en production

Exécuter toute la suite :

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
cd web && npm run scoring-check
bash scripts/release_go_no_go.sh
```

## Changement documentaire seul (pas de code)

- Vérifier les liens internes :
  - Chemins relatifs valides dans `web/`, `docs/`, `.github/`
  - Pas d'URL cassées vers sections internes
- Chercher les références obsolètes (ancien noms, chemins, commandes)
- Éviter créer une source de vérité concurrente (ex. 2 roadmaps, 2 SESSION_LOG, 2 DECISIONS)
- Exécuter `bash scripts/check_no_secrets.sh` (pas de secret en dur en Markdown)

## Changement clinique ou scoring

Obligatoire en plus :

- Consulter `docs/gouvernance-questionnaires-scoring.md`
- Traçabilité documentée dans `CHANGELOG.md` (date, auteur, justification clinique)
- Aucun secret clinique (algorithme, score, formule) commité en dur

## Changement base de données (schéma Prisma)

Avant toute modification de `web/prisma/schema.prisma` :

1. **Confirmation distincte** requise (pas d'ajout automatique)
2. Exécuter localement : `cd web && npx prisma migrate dev --name [descriptive_name]`
3. Vérifier création fichier migration en `web/prisma/migrations/`
4. Committer migrations + schéma
5. En production : `cd web && npx prisma migrate deploy`

## Changement IA / prompts

- Vérifier format prompt (pas de secret embarqué)
- Tester localement avec `ANTHROPIC_API_KEY` si modification prompt_cache
- Documenter version prompt et corpus dans les métadonnées (éviter à changer silencieusement)
