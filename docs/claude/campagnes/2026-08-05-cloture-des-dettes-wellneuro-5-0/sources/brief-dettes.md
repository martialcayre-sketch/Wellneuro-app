# Clôture des dettes Wellneuro 5.0 — audit challengé

Audit d'entrée du 2026-08-05, confronté au dépôt. Les corrections factuelles
sont marquées **CORRIGÉ**.

## Objectif

Fermer les dettes qui empêchent de déclarer Wellneuro 5.0 achevé, sans nouvelle
ingestion de savoir ni nouvelle migration technologique.

## Constats retenus, après vérification

1. **Ingestion complète, consommation partielle.** Confirmé. `WN_ENABLE_ORIENTATION_NNPP2`
   (double verrou avec `tableSignee`) et `WN_ENABLE_CORPUS_CLINIQUE_V1` (double verrou
   avec `validationExterne`) gardent des surfaces livrées et dormantes. Livrable :
   une matrice de consommation (source → surface → décision → validation → visible patient).

2. **Certification du calcul ≠ validation psychométrique.** Chiffres exacts
   (`.wn/state.json`) : 60 `scoring_verifie`, 2 suspendus terminaux, 1 `droits_verifies`
   (Q_SOM_09), 1 `contenu_verrouille` (Q_GEO_04). **Nuance** : l'écart est déjà écrit
   (#560, « ce que certifié ne dit pas »). La dette n'est pas de le nommer mais de le
   solder : notices bibliographiques, COSMIN, escalade SIIN ouverte depuis le 2026-07-25.

3. **Classes de scoring ouvertes** : `sum_decimal`, `count_threshold`, `ecab` exposés à
   la classe de problème fermée pour le TFD (#567) et le PSQI (#566). À corriger avant
   d'être reliés à une règle d'orientation.

4. **Double source de vérité des packs.** Confirmé : `packRegistry.ts` expose un signal
   typé `source: 'registry' | 'legacy'` avec `raison` (`registre_absent`, `registre_vide`,
   divergence). Aucun consommateur de ce signal trouvé en dehors des tests — à confirmer
   au cadrage du lot. Le signal existe, la surveillance non.

5. **Deux parcours patients.** Confirmé : `web/src/app/patient/[idAssignation]/page.tsx`
   et `web/src/app/portail/[token]/`. Deux URL, deux surfaces de test, deux corrections.

6. **État réel et documentation désynchronisés.** Confirmé et pire que décrit :
   `.wn/state.json` porte `git.branch = worktree-signature-table-orientation` (worktree
   mort), `dirty: true`, `last_checked_at` au 2026-07-23, et un `next_action` de plusieurs
   milliers de caractères mêlant décisions closes et actions en vol.

7. **Déploiement de la base couplé au build — CORRIGÉ, l'audit inverse le risque.**
   Le workflow `release-db.yml` et `docs/DEPLOIEMENT_RELEASE_DB.md` sont **déjà sur `main`**
   depuis #517 (2026-08-01). La PR #435 ne crée pas le workflow : elle **retire les
   écritures de `web/scripts/vercel-build.sh`** (−149 lignes) et aligne la doctrine.
   Conséquence : aujourd'hui **deux chemins d'écriture coexistent**, dont celui du build,
   non gaté par un environnement protégé. Ne pas merger #435 n'est donc pas prudent :
   c'est laisser le chemin faible ouvert. Le blocage est purement ops (environnement
   GitHub `production`, secrets, reviewers distincts), pas du code. #435 date du
   2026-07-28 et n'a pas bougé depuis.
   **Angle mort de l'audit** : la PR #372 (2026-07-25, non brouillon, rubriques de six
   questionnaires) est ouverte et non mentionnée.

8. **HDS et données réelles — CORRIGÉ dans son statut.** Le gate G-TRUST-04 n'est pas
   « en attente » : il a été **arbitré le 2026-07-22** — rester sur l'hébergement actuel,
   borner la phase de test au 2026-10-21, ne pas instruire de migration HDS. Ce n'est
   donc pas une dette de 5.0 mais une échéance datée. Les vraies dettes actionnables sont
   les exigences indépendantes de l'hébergeur : piste d'audit des accès légitimes,
   procédure de violation de données, dossier RGPD.

## Ce que l'audit surestime

- **Point 7** : présenté comme « consolidation prioritaire à ne pas merger » ; c'est en
  réalité une PR prête dont seul le préalable ops manque, et dont le non-merge maintient
  le défaut qu'elle corrige.
- **Point 8** : présenté comme un gate à lever ; c'est une décision déjà prise avec date
  de revue.

## Ce que l'audit sous-estime

- Le nettoyage de `.wn/state.json` et la **vue de vérité générée** (point 6) conditionnent
  la lecture de tous les autres points : sans elle, chaque audit suivant repart d'un état
  incertain. C'est un lot d'outillage, pas de documentation.
- Deux PR ouvertes (#435, #372) sont des dettes en soi.

## Hors périmètre

- Toute nouvelle ingestion de savoir.
- Toute migration technologique ou d'hébergement.
- Biologie réelle, documents de laboratoire, dispositifs connectés, captation vocale
  (subordonnés au gate G-TRUST-04).
- Toute modification de seuil clinique sans demande explicite.
