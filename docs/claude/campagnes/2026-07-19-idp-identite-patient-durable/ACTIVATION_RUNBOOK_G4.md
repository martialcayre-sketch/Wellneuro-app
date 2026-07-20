# G4 — Runbook d'activation du lien magique

> Procédure d'activation explicite du lien d'accès patient à usage unique.
> Prérequis : gate G4 mergé (#172), surface praticien mergée, CI verte,
> instruction explicite du responsable. Rollback = drapeau à `false`, non destructif.
>
> Calqué sur `ACTIVATION_RUNBOOK_C5.md`.

## Ce que ce runbook n'autorise pas

**Il ne lève pas G-TRUST-04.** Le gate reste non levé
(`CHECKLIST_ACTIVATION_G_TRUST_04.md`), son point bloquant est **l'hébergement
HDS**, et sa levée appartient au responsable du traitement — pas à ce document,
pas à l'assistant.

Ce que ce runbook fait est plus étroit, et va dans le bon sens : il substitue un
lien **haché, expirant en 24 h, à usage unique** au lien permanent stocké en
clair, pour les personnes **déjà** présentes en base. C'est l'exigence 4 du gate
(gestion des sessions et révocations), pas le gate entier.

## État de départ, à vérifier avant d'activer

Au 2026-07-20, la base de production porte **17 patients, 3 graines fictives,
13 accès portail ouverts**, et le responsable a qualifié une partie des dossiers
restants comme **de vraies personnes**. Cet état conditionne la prudence de la
procédure : l'essai se fait sur une fixture, jamais sur un dossier réel.

## Deux drapeaux, et ils ne s'allument pas ensemble

| Drapeau | Ce qu'il ouvre | À l'activation |
|---|---|---|
| `WN_G4_LIEN_MAGIQUE` | entrée `/portail/lien/[jeton]`, action praticien d'émission | **`true`** |
| `WN_G4_REDEMANDE_PATIENT` | canal **public** `POST /api/portail/lien/demande` | **laissé absent** |

Le canal de redemande est public et non authentifié. Sa réponse est
indifférenciée, mais deux résidus de la revue de sécurité subsistent : **le temps
de réponse n'est pas égalisé** et **il n'y a pas de limitation par IP**. Sur des
adresses de personnes réelles, ce n'est plus théorique.

La coexistence des deux chemins le rend **non indispensable** : un patient dont
le lien magique expire garde son lien permanent, et l'écran d'échec l'invite à
demander un nouveau lien à son praticien. Ce canal s'ouvrira dans un lot dédié,
une fois les deux résidus fermés.

## Prérequis (à confirmer avant activation)

- [ ] Gate G4 (#172) et surface praticien mergés dans `main`, CI verte.
- [ ] `WN_G4_LIEN_MAGIQUE` **absent** du déploiement courant (les routes du lien
      magique répondent 404, le bouton praticien n'apparaît pas).
- [ ] `portail_magic_links` **vide** — aucun lien n'a pu être émis drapeau éteint :

```sql
SELECT count(*) FROM portail_magic_links;  -- attendu : 0
```

- [ ] Instruction d'activation du responsable consignée, avec sa date et le
      périmètre qu'elle autorise.

## Procédure d'activation

1. **Définir la variable** dans Vercel Production :
   `WN_G4_LIEN_MAGIQUE=true` (Project → Settings → Environment Variables →
   Production). **Ne pas définir `WN_G4_REDEMANDE_PATIENT`.**
2. **Redéployer** la production.
3. **Essai sur `PAT_SEED_03` (Michel Dogné), et sur lui seul** :
   - depuis `dashboard/patients`, sélectionner le patient fictif, cliquer
     « Envoyer un lien à usage unique (24 h) » ;
   - ouvrir le lien reçu : l'espace patient s'ouvre sans repasser par le gate
     e-mail ;
   - **rouvrir le même lien** : l'écran « Votre lien n'est plus valable »
     s'affiche, sans indiquer la raison du refus ;
   - vérifier que le lien **permanent** du même patient fonctionne toujours —
     c'est la coexistence, et c'est ce qui protège les 13 accès ouverts.
4. **Contrôle en base** (MCP Supabase, lecture seule) :

```sql
SELECT count(*) AS liens,
       count(*) FILTER (WHERE consomme_le IS NOT NULL) AS consommes,
       sum(rejeux_refuses) AS rejeux
FROM portail_magic_links;
-- attendu : 1 lien, 1 consommé, au moins 1 rejeu refusé
```

**Aucun lien magique n'est envoyé à un dossier réel tant que l'essai n'est pas
concluant.** L'extension aux dossiers réels est une décision distincte, à
consigner comme celle-ci.

## Rollback (immédiat, non destructif)

1. `WN_G4_LIEN_MAGIQUE=false` (ou supprimer la variable) dans Vercel Production.
2. Redéployer.
3. Vérifier que `/portail/lien/<jeton>` répond 404 et que le bouton praticien a
   disparu.

Les liens magiques déjà émis deviennent inertes ; **les liens permanents n'ont
jamais cessé de fonctionner**, donc aucun patient ne perd son accès.

**Interdit absolu** : aucun `DROP`, `DELETE`, `TRUNCATE` sur
`portail_magic_links`. Ses lignes portent la trace des rejeux refusés —
c'est une exigence du registre, pas un journal de confort.

## Traçabilité

- Consigner date, auteur et périmètre de l'activation dans
  `docs/claude/SESSION_LOG.md` et `CHANGELOG.md`.
- Mettre `docs/claude/REGISTRE_FRONTIERES.md` en accord avec le réel : la
  mention « livrable en préproduction » suppose une préproduction qui **n'existe
  pas** (un seul projet Supabase ; les déploiements Preview lisent la base de
  production).
- En cas d'incident : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md` pour
  Vercel/DNS, et le rollback ci-dessus.
