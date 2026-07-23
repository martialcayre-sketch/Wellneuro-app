### Bibliothèque — consolidation : PSS-10 unifié, file d'envoi verrouillée (2026-07-23)

Deux reliquats du lot rayon Questionnaires, tranchés par le propriétaire :

- **Q_STR_02 (PSS-10) : la référence est l'inline /50** (items 1–5, source
  Drive, statut certifié) — celle servie aux patients et portée par les
  scores historiques. La variante 0–4//40 de `questionnaires/stress.ts`
  (cliniquement équivalente, seuils décalés de −10) était du code mort
  importé puis masqué : **purgée**, avec note explicative sur place. La
  définition servie ne change pas d'un octet — épinglée par un test
  (`questions.pss10.test.ts` : /50, bandes 10-20/21-26/27-50, items directs
  1→5, inversés 5→1). La maquette Spirale est réalignée sur /50 (échelle
  1–5) et l'artifact republié. `Q_STR_01` partage le même motif
  import-masqué — signalé, non purgé (hors arbitrage).
- **Unicité du brouillon actif de la file d'envoi** : un index partiel
  (`WHERE statut='brouillon'`) n'étant pas exprimable dans le schéma Prisma
  (dérive schéma ↔ migrations), l'invariant est garanti par **sérialisation
  des ajouts concurrents sur le verrou `FOR UPDATE` de la ligne patient**
  (même patron que l'accès portail) : le findFirst-puis-create s'exécute
  sous verrou, la fenêtre TOCTOU disparaît. Aucune migration.
