# Gate — Persistance des documents composites C3 (option (b), NON ouvert)

> Documente le **gate migration** de l'option (b) « persistance / historique immuable
> des documents composites », **différé** au handoff C3 LOT-04. **Périmètre :
> documentaire — aucun code, aucune migration, `schema.prisma` et
> `web/prisma/migrations/` intacts.** **Le gate n'est PAS ouvert** : ce document le
> décrit, il ne l'active pas.

## Rappel : V1 = option (a) sans persistance (défaut retenu)

- Un document composite C3 est **recomposé à la demande** depuis les blocs déjà
  persistés (C1 recalculable, C2 persisté, `SyntheseIA`). Sa **version** = tuple des
  versions/hash de ses blocs (`deriveVersionDocument`, `canonicalSha256`). **Aucune
  ligne de document n'est stockée.** → aucune migration.
- (a) reste le **défaut** tant qu'un besoin d'**historique immuable de documents
  composites**, distinct des ancrages sources, n'est pas confirmé.

## Ce que l'option (b) apporterait

- Un **enregistrement immuable** de chaque document diffusé (ce qui a été **réellement
  envoyé**, figé), indépendant d'une éventuelle évolution ultérieure des blocs sources.
- Utile seulement si l'on doit **prouver a posteriori** l'état exact d'un document à sa
  diffusion (au-delà de l'audit d'envoi `BookletEnvoi` déjà existant).

## Mécanique de migration (si un jour le gate est ouvert)

- **Additive-only** : une table `document_composite` (ou `document_envoi`) versionnée,
  **nullable**/nouvelle, pour que les lignes existantes restent valides sans
  rétro-remplissage obligatoire.
- **Une seule migration nommée** (ex. `c3_document_bundle_v1`).
- **Ancrages réutilisés** : la ligne référencerait les hash/versions **existants**
  (blocs sources) — **aucune nouvelle vérité clinique** (frontière A2). Le document
  stocké est un *instantané de composition*, pas une source clinique.
- **Exécution** : base éphémère d'abord ; **production uniquement via le pipeline
  Vercel (`migrate deploy` au merge sur `main`)**, jamais à la main.
- **Rollback** documenté : `DROP` des seuls nouveaux objets.

## Checklist de confirmation du gate (avant toute migration)

> Miroir du régime C2A. Le gate n'est levé que si **l'utilisateur** coche
> explicitement ces points **par un message distinct** : ni la rédaction de ce
> document, ni une activation de campagne, ni un « ok » général ne valent
> confirmation.

- [ ] Le besoin d'un **historique immuable** de documents composites (distinct de
      `BookletEnvoi` et des ancrages sources) est **confirmé**.
- [ ] Le modèle est figé (table versionnée, colonnes **nullable**, ancrages sur les
      hash/versions existants).
- [ ] La migration est **additive-only**, **unique**, **nommée**.
- [ ] L'environnement est confirmé : base éphémère d'abord, **prod au merge via
      `migrate deploy`** — jamais à la main.
- [ ] Le **rollback** (`DROP` des seuls nouveaux objets) est lu et accepté.

> Tant que cette checklist n'est pas cochée : le lot migration reste
> `bloqué_confirmation` ; `schema.prisma` et `web/prisma/migrations/` restent
> intouchés ; aucun `prisma migrate`/`db push`.

## Frontières réaffirmées

- **Ne possède pas** le contenu clinique source (C1/C2/`lib/equilibre`) : un document
  persisté serait un instantané de composition, jamais une source.
- **N'absorbe pas** l'audit d'envoi existant (`BookletEnvoi`) ni le fil médecin
  (report distinct, `2026-07-18-c3-fil-correspondance-medecin/`).
- **Refuse** : migration sans confirmation distincte ; toute réécriture destructive.

## Raccordement

- **Dette reprise** : report « persistance option (b) » du **handoff C3 LOT-04**.
- **Précédent** : régime de gate C2A (persistance minimale) et cadrage du gate
  modèle multi-cycles (`propositions/2026-07-18-gate-modele-multi-cycles/`).
- **Promotion registre différée** : aucune entrée normative tant que le gate n'est pas
  ouvert et tranché.
