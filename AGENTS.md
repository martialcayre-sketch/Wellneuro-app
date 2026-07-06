# AGENTS.md — Wellneuro NNPP2

## Identité du projet

Wellneuro NNPP2 est une application de consultation en neuronutrition en production, construite sur **Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL (Supabase) + NextAuth**, déployée sur **Vercel** (`app.wellneuro.fr`).

Le déploiement Google Apps Script (GAS) historique a été décommissionné le 2026-07-03 (lot C5) : web app et déclencheurs arrêtés côté console Apps Script. Le code est conservé pour référence dans `archive/gas-legacy/` mais n'est plus exécuté ni maintenu.

**Point de vigilance** : le décommissionnement du déploiement GAS ne signifie pas que Google Sheets a disparu du périmètre applicatif. Plusieurs routes Next.js appellent encore directement l'API Google Sheets (voir ci-dessous) en parallèle de PostgreSQL. Ne pas présumer que ces routes sont mortes sans vérifier.

## Architecture actuelle

- `web/src/app/dashboard/*` : portail praticien (auth Google via NextAuth, restreint au domaine `@wellneuro.fr`)
- `web/src/app/patient/[idAssignation]` : portail patient public (email gate, pas d'auth Google)
- `web/src/app/api/*` : routes serveur (patients, assignations, questionnaires, synthèse IA, booklet)
  - `api/praticien/metrics`, `api/praticien/patients`, `api/praticien/assignations`, `api/praticien/questionnaires`, `api/praticien/reponses`, `api/praticien/migrate-historique` lisent/écrivent encore directement Google Sheets (`SHEET_ID` + token OAuth du praticien) en plus de PostgreSQL — dette technique héritée du strangler pattern, pas encore nettoyée
- `web/prisma/schema.prisma` : schéma PostgreSQL (Patient, Assignation, QuestionnaireReponse, SyntheseIA, BookletEnvoi, ...)
- `web/src/lib/questions.ts` : catalogue des questionnaires et moteur de scoring
- `web/src/lib/auth.ts`, `web/src/lib/prisma.ts` : auth et client base de données
- `archive/gas-legacy/` : ancien code GAS (`Code.gs`, `Questions.gs`, `index.html`, `appsscript.json`) — référence historique uniquement, ne pas modifier ni réactiver

## Chemins importants

- Contexte projet à jour : `docs/claude/PROJET_CONTEXTE.md`
- Scripts de contrôle : `scripts/`
- Exemple d'environnement sans secret : `web/.env.local.example`

## Règles critiques de sécurité

- Ne jamais écrire de secret en dur dans le code ou les commits (`DATABASE_URL`, `SHEET_ID`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SMTP_URL`, etc.)
- Toute configuration sensible passe par les variables d'environnement : `web/.env.local` en développement (jamais commité), variables d'environnement Vercel en production
- Ne jamais committer de données patients réelles
- Ne jamais committer de clés API, fichiers `.env*` réels, identifiants Google, jetons OAuth, exports patients ou fichiers de résultats réels
- Les seuls patients fictifs autorisés sont : Sophie Nicola, Jennifer Martin et Michel Dogné

## Règles RGPD et données de santé

- Minimiser les données manipulées dans le dépôt
- Anonymiser ou fictiviser toute donnée de démonstration
- Refuser l'ajout de données patient identifiantes ou réalistes
- Ne pas inclure de secrets dans les journaux, captures, commits, issues ou pull requests

## Règles cliniques et scoring

- Ne pas modifier la logique clinique existante sans demande explicite
- Ne pas modifier les seuils de scoring sans source et documentation
- Ne pas inventer de questionnaire, score, seuil ou recommandation clinique
- Toute modification clinique doit être documentée dans `CHANGELOG.md`
- Toute modification de questionnaire/scoring doit aussi mettre à jour `docs/questionnaires-drive-mapping.md` et respecter `docs/gouvernance-questionnaires-scoring.md`
- Un questionnaire marqué `certifié` dans la matrice doit avoir une fixture dans `scripts/check_questionnaire_certification.js`
- Les scores Drive certifiés ou ambigus doivent exposer une métadonnée `certification` dans `scoresJson`

## Priorités produit et techniques

- Priorité actuelle : stabilité de l'application en production (`app.wellneuro.fr`).
- Pas de nouvelle migration technologique sans demande explicite.
- Ne pas modifier `archive/gas-legacy/` : ce code est gelé et hors service.
- Ne pas modifier la logique clinique sans consigne claire.

## Règles de style

- Interface et textes utilisateur en français
- Code lisible pour un praticien non-développeur
- Fonctions courtes, noms explicites, commentaires utiles
- Éviter les abstractions prématurées
- Préserver les noms et structures existants sauf demande explicite

## Commandes utiles

```bash
cd web && npm run dev             # serveur de développement
cd web && npm run type-check      # vérification TypeScript
cd web && npm run scoring-check   # certification questionnaires/scoring
cd web && npm run prisma:generate # régénérer le client Prisma après modif du schéma
bash scripts/check_no_secrets.sh  # contrôle anti-secrets avant commit
```

## Consignes pour les agents IA

- Lire ce fichier avant toute modification
- Vérifier l'état Git avant de modifier le dépôt
- Préserver le contenu utile des fichiers existants
- Ne pas écraser une configuration locale ou un secret
- Mentionner clairement les fichiers modifiés dans les réponses et pull requests
