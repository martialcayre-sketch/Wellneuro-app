# BIOFLOW — roadmap de coordination

BioFlow est le nom produit de l'ensemble formé par `biology-library`,
BIO-INGEST et BIO-PARCOURS. **Ce n'est ni une campagne, ni un moteur, ni un
backlog.**

**Règle capitale : cette roadmap référence les lots des campagnes, elle ne
les duplique jamais.** Le détail vit dans les fiches de chaque campagne ; les
décisions vont au registre `D-xxx`.

```
BIOFLOW
│
├── Track A — BIO-INGEST
│   ├── lot courant   : LOT-07, faits imprimés du laboratoire
│   ├── prochain gate : G1, la décision préalable à LOT-07
│   └── objectif      : une donnée biologique fiable
│
├── Track B — BIO-PARCOURS
│   ├── lot courant   : LOT-02 (BP-02), constat d'usage ; BP-26 en parallèle
│   ├── prochain gate : G4, BP-26 avant toute assistance
│   └── objectif      : l'exploitation longitudinale de la donnée validée
│
├── CROSS-TRACK GATES
│   G1  BP-01 (levé, #1314) + décision préalable mergée → code LOT-07
│   G2  LOT-07 livré                                    → purge, réconciliation des imports
│   G3  traitement asynchrone durable livré             → montée en charge de l'ingestion
│   G4  ligne BP-26 statuée                             → toute assistance clinique
│
└── BIOFLOW PLATFORM
    statut : NON OUVERTE (API, SaaS, multi-tenant, connecteurs)
```

Le lot courant fait foi dans le `lot_courant` de chaque campagne :
[BIO-INGEST](../../claude/campagnes/2026-09-30-bio-ingest/CAMPAGNE.md) et
[BIO-PARCOURS](../../claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md).
L'arbre ci-dessus se met à jour quand un lot courant change.

## Parallélisme

- Au plus une PR structurelle par campagne à la fois.
- Jamais deux PR simultanées sur les mêmes modèles Prisma ou la même
  frontière biologique.
- Un merge à la fois (`D-248`) et une migration à la fois (`D-087`).

## Référence

[`AUDIT_BIOFLOW_2026-10-04.md`](AUDIT_BIOFLOW_2026-10-04.md) : l'état des
lieux du 2026-10-04, figé. C'est une photographie datée, pas un backlog ni
l'état courant.
