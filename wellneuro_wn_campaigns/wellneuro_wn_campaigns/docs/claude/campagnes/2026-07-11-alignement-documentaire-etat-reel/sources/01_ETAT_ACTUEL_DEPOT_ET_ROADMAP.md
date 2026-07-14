# 01 — État actuel du dépôt et lecture de la roadmap

## État technique identifié

Le dépôt `Wellneuro-app` repose sur :

```text
Next.js 14 App Router
React 18
TypeScript
Tailwind CSS
Recharts
Prisma 7
PostgreSQL Supabase
NextAuth Google OAuth @wellneuro.fr
Anthropic SDK
Nodemailer / SMTP
Vercel
```

## Roadmap actuelle officielle

Le fichier `docs/roadmap.md` indique :

```text
Migration GAS → Next.js terminée
app.wellneuro.fr = unique point d'entrée production
Lots livrés : scaffold, métriques, patients/assignations, IA/booklet, décommission GAS
```

Il mentionne encore une dette Google Sheets côté routes Next.js : `metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `migrate-historique`.

## Point à vérifier avant toute branche

Le `SESSION_LOG.md` plus récent indique une décommission Sheets/OAuth plus avancée que `docs/roadmap.md`.

Conclusion pour l'agent :

```text
Ne pas supposer que la roadmap est parfaitement à jour.
Avant toute tâche sur routes praticien ou OAuth, vérifier l'état réel du code.
Si une divergence existe entre roadmap et code, documenter l'écart avant modification.
```

## État produit déjà acquis

L'app dispose déjà de briques importantes :

- portail praticien ;
- portail patient ;
- token permanent patient ;
- consultations historisables ;
- consentement ;
- assignations ;
- hub patient multi-questionnaires ;
- brouillons locaux ;
- verrouillage/demande de correction ;
- questionnaires génériques ;
- Mon équilibre / cartographie neuro-fonctionnelle ;
- mini-synthèse déterministe ;
- synthèse IA globale nourrie par anamnèse ;
- registre questionnaires/packs ;
- premiers modèles liés à boussole, compléments et règles cliniques.

## Dette UX principale

La dette n'est pas l'absence de React. React est déjà présent.

La dette principale est :

```text
architecture UX encore trop linéaire
fiche patient trop monolithique
navigation praticien peu cockpit
historique de réponses dense et technique
absence de protocole builder structuré
absence de file de validation praticien
absence de charge thérapeutique
absence de compagnon patient longitudinal
```

## Dette produit principale

Le produit sait collecter, scorer et synthétiser. Il doit maintenant mieux :

```text
prioriser
simplifier
préparer une décision
produire un plan 21 jours
suivre l'adhésion
adapter à J21
```

## Recommandation structurante

Ne pas recoder l'app.

Faire une recomposition progressive :
