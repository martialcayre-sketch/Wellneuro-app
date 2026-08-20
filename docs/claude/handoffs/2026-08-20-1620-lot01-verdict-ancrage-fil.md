# 2026-08-20 16:20 — LOT-01 Biologie : le fil relit l'ancre, et dit si elle tient

## Ce qui a changé

- **`web/src/app/api/praticien/correspondance-medecin/route.ts`** — `SELECTION`
  porte les deux colonnes d'ancrage de `D-073`, et **elles seules** ; le
  verdict (`concordante` / `perimee` / `sans_ancrage`) est calculé côté
  serveur. **Ni le SHA ni la version ne traversent HTTP** : le client n'en
  ferait rien de juste. Le helper du verdict n'est **pas exporté** — le banc
  l'éprouve à travers la route, pas à côté.
- **`CorrespondanceMedecinPanel.tsx`** — la mention rejoint la ligne de
  métadonnées existante, au patron déjà en place (`· synthèse référencée`).
  Aucun badge, aucune couleur. **Une lettre sans ancre ne rend rien** — c'est
  `DC-24`, et c'est le cœur du lot : la présenter comme périmée ferait porter
  un soupçon à tout l'historique antérieur à `D-073`.
- **`sans_ancrage` vaut pour AU MOINS UN nul**, pas « les deux » comme le
  cadrage l'écrivait. Le CHECK `c3_correspondance_ancrage_complet_check`
  interdit déjà la demi-ancre en base ; la garde applicative est une défense
  en profondeur. Le fichier de lot porte l'écart.

## À savoir pour la suite

- **Le terme « version » détecte moins qu'il n'y paraît.** Trois littéraux
  `indications-biologie-v1` coexistent : la métadonnée de la table (qui fait
  foi), celui qu'estampille `courrier.ts` (**en dur, non dérivé** de la
  métadonnée), celui que la route compare. Le banc les confronte tous les
  trois et rougit si l'un bouge — mais **toute la détection réelle de
  péremption repose sur le SHA vivant**. Une re-signature qui bumperait la
  seule version laisserait les lettres antérieures en « concordant ». La
  question clinique est posée, pas tranchée.
- **La boucle écriture → lecture n'est épinglée nulle part** : le banc du POST
  du courrier mocke le générateur. C'est le LOT-02, par parcours.
- **Aucun `D-xxx` neuf.** Le lot s'adosse à `D-073`, qui ne portait que les
  colonnes. La revue pose la question : un verdict **servi au praticien**
  tient-il sous une décision qui ne visait que l'écriture ? À trancher par le
  responsable ; le lot n'a pas inventé de règle clinique — il lit une
  empreinte.
- **La matrice de consommation** fait entrer le fil dans les consommateurs
  indirects du corpus de synthèse (saut 1, via `indicationsBiologieV1.ts`).
  Faux positif de lecture humaine : la route ne consomme qu'une empreinte.

## Vérifié

- Suite **Vitest complète verte** : 421 fichiers, 5032 tests. Lint vert
  (un avertissement préexistant, `TrajectoirePanel.tsx`, hors diff).
  Anti-secrets vert.
- **T2 non obtenu ici** : `wn-test-worktree.sh` meurt à l'installation des
  navigateurs Playwright — le proxy du conteneur bloque `cdn.playwright.dev`
  —, **avant tout test**. Ne pas lire l'absence de T2 comme un T2 vert. Le
  segment E2E relève du CI (`D-049`) ; le CI de la PR reste la porte.
- **Production lue** (`execute_sql`, 2026-08-20) : `ancrage_sha256` et
  `ancrage_version` existent sur `correspondances_medecin`. Le GET du fil ne
  part pas en 500.
- Revue **`Agent(wn-reviewer)`** : GO sous conditions, deux conditions
  refermées (banc de la demi-ancre inverse, sur-affirmation corrigée dans le
  commentaire et le changelog) et deux mineurs (nom réel des contraintes,
  écart de spec tracé).
