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
│   ├── prochain gate : G1 levé (D-267, #1325) ; migration #1326 appliquée et constatée ; `usage_ia` v5 (#1328)
│   └── objectif      : une donnée biologique fiable
│
├── Track B — BIO-PARCOURS
│   ├── lot courant   : LOT-26 (BP-26), note de qualification ; BP-02 terminé (2026-10-05)
│   ├── prochain gate : G4, BP-26 avant toute assistance
│   └── objectif      : l'exploitation longitudinale de la donnée validée
│
├── Track C — BIO-PRESCRIPTION
│   ├── statut        : cadrage (audit du 2026-10-05), non ouverte
│   ├── articulation  : BP-04, BP-16 et BP-18 de BIO-PARCOURS, sans les dupliquer
│   └── objectif      : une exploration hiérarchisée, décidée par le praticien, soumise au médecin
│
├── Socle terminologique — existant, à préserver (audit §3.4)
│   ├── analytes, synonymes / resolver, NABM versionnée (ANS)
│   ├── remboursement dérivé (remboursable.ts), correspondances signées
│   └── LOINC [futur] : en complément de la NABM, jamais à sa place
│
├── CROSS-TRACK GATES
│   G1  BP-01 (levé, #1314) + D-267 (levé, #1325)       → code LOT-07
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

[`AUDIT_PANELS_BIOLOGIE_2026-10-05.md`](AUDIT_PANELS_BIOLOGIE_2026-10-05.md) :
l'audit des panels (cadrage directeur, première mission). On y trouve les
mesures de production, la classification, la cible et les trois prochaines
PR. Lui aussi est figé. **Règle immédiate du responsable (2026-10-05)** :
aucun nouveau pack biologique clinique tant que la décision de
rationalisation n'est pas prise ; un besoin s'exprime en analytes, axes,
règles ou propositions patient.
