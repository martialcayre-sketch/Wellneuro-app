---
id: "LOT-02"
titre: "« Certifié » à l'écran sans la définition de D-034"
statut: "livré (2026-08-08) — libellés renommés « Scoring vérifié », garde mutation-testé"
dépend_de: "aucun"
---

# LOT-02 — « Certifié » à l'écran sans la définition de D-034

## But

**Faire voyager la définition de D-034 jusqu'à l'écran où le mot s'affiche.**
Aujourd'hui elle est écrite dans `docs/DECISIONS.md` (D-034) et
`docs/claude/corpus/README.md`, et elle a été portée dans la seule surface du
**runtime** qui revendiquait la validation — la consigne système de synthèse,
`synthese-v18` → `synthese-v19`, avec un garde de banc. **Elle n'est nulle part
dans l'UI praticien.**

Les badges concernés, vérifiés au cadrage du 2026-08-08 :

- `web/src/components/BibliothequePanel.tsx:33-34` → **« Certifié »**, variante
  `success`, sur toute entrée de bibliothèque dont `statutCertification` vaut
  `certifie` ;
- `web/src/components/FichePatientPanel.tsx:137-147` → **« Certifié Drive »** et
  **« Certifié manuel EORTC »**, sur la fiche patient.

Ce que le mot veut dire, d'après D-034 : *le code reproduit fidèlement la règle
enregistrée* — items conformes à la source, moteur vérifié par le banc `certify`.
Ce qu'il **ne** dit pas : rien de la qualité psychométrique, de la validité de
construit, de la fidélité, ni de l'étalonnage des seuils. Un praticien qui lit
« Certifié » en vert sur une fiche patient n'a, à l'écran, aucun moyen de faire
cette différence.

## Ce qui a été décidé, et qui a élargi le périmètre

**Arbitrage du 2026-08-08, deux réponses à la question ouverte ci-dessous**
(consigné en `D-036`) :

1. **Le libellé change** — « Scoring vérifié » —, plutôt qu'une infobulle ou un
   lien. Une infobulle native est hover-only, et `UX_WELLNEURO_3_0.md:88-90` la
   remplace explicitement par un bouton d'information ; aucun composant
   d'infobulle réutilisable n'existe (seul `@radix-ui/react-dialog` est
   installé). Un lien fait quitter l'écran, ce que la preuve attendue interdit.
2. **Toute la famille des libellés**, pas les trois badges verts seuls : « Non
   certifié » se lit tout aussi bien comme « non validé psychométriquement ».
   C'est le mot qui est ambigu, pas l'état vert.

Le coût est réel et assumé : « Certifié » est employé à l'oral, et il reste dans
le registre, dans le type `StatutCertificationRuntime` et dans le corpus. **Rien
de la donnée n'a été renommé** — l'écart écran/dossier est nommé dans `D-036`.

## Ce qui est fait

- `web/src/lib/certification-libelles.ts` — les deux mappers, jusqu'ici **locaux
  et non exportés** dans leurs composants : aucun banc ne pouvait asserter ce
  qu'ils rendaient. S'y ajoutent les deux littéraux d'écran qui ne passaient par
  aucun mapper (badge et prose des instruments du cabinet) ; hors du module, ils
  auraient échappé au garde.
- Neuf libellés renommés : `Certifié` → `Scoring vérifié`, `Certification
  ambiguë` → `Scoring ambigu`, `Certification à vérifier` / `À vérifier` →
  `Scoring à vérifier`, `Non certifié` → `Scoring non vérifié`, `Certifié Drive`
  → `Scoring vérifié (Drive)`, `Drive ambigu` → `Scoring ambigu (Drive)`,
  `Certifié manuel EORTC` → `Scoring vérifié (manuel EORTC)`, `Cabinet — non
  certifié` → `Cabinet — scoring non vérifié`. `Non scoré`, `Statut inconnu` et
  `Historique` ne portaient pas le mot et n'ont pas bougé.
- **Trois proses trouvées à l'exécution et absentes du cadrage** :
  `BibliothequePanel.tsx:369` (description du tiroir d'édition), `:1215`
  (pied de l'éditeur) et `:1405` (pied de la relecture) employaient le même mot
  trois lignes sous un badge renommé. Les laisser aurait rendu l'échelle
  incohérente à l'écran.
- `web/src/lib/certificationLibelles.guard.test.ts` — table écrite à la main,
  exhaustivité **par le typage** (`Record<StatutCertificationRuntime, …>` ne
  compile pas si un état s'ajoute sans attendu), refus de `/certifi/i` sur les
  valeurs rendues, auto-test du motif sur les dix anciens libellés.
- Assertion de **rendu** sur la colonne « Qualité » avec son contrôle négatif
  (`FichePatientPanel.test.tsx`) et sélecteur E2E reporté sur le nouveau libellé
  du badge cabinet (`e2e/dashboard-praticien.spec.ts`).

## Ce que la relecture d'écran a appris, et qui vaut réserve

La colonne « Qualité » ne rend un badge de vérification que si `scores_json`
porte une clé `certification`. **Le seed n'en produit aucune** : les cinq
passations de Sophie Nicola affichent toutes « Historique », en local comme en
CI. Aucun E2E ne peut donc témoigner des libellés de passation ; le seul témoin
est le banc jsdom avec sa fixture dédiée. Étendre le seed est un geste séparé,
non fait ici.

Et le garde ne ferme pas tout : son contrôle de source refuse la réintroduction
d'un **ancien** libellé, liste fermée — il attrape le revert, pas un mot neuf
inventé ailleurs.

## Hors périmètre

- Toute modification du registre `instrument_registry.json`, du champ `cosmin`,
  ou du banc `verifier_registre_instruments.js` — D-034 les fige.
- Le texte patient : `web/src/lib/trust/contenus/registre.ts` ne revendique
  **déjà** rien (« cet accompagnement relève du bien-être et du suivi ; il
  n'établit pas de diagnostic médical »). D-034 aligne l'interne sur l'externe,
  pas l'inverse.
- Réécrire les commentaires `// Certifié v2 — …` de `web/src/lib/questions.ts` :
  ils datent une conformité de source, ils ne s'affichent pas.

## Preuve attendue

- Un praticien voyant le badge peut atteindre la définition **sans quitter
  l'écran** (infobulle, libellé, ou lien court).
- Un banc assère la présence de la qualification **et** refuse le retour du mot
  nu — un garde qui n'assère que la présence est satisfait par l'inversion exacte
  du défaut.
- Textes en français ; T2 avant commit (changement UI).

## Question tranchée à l'ouverture

~~Infobulle, libellé plus long (« Scoring vérifié »), ou lien vers la
définition ?~~ **Tranchée le 2026-08-08 : le libellé, sur toute la famille**
(`D-036`). Le coût d'usage oral est accepté ; il est écrit dans la décision
plutôt que passé sous silence.

## Validation

- T1 vert (296 bancs d'outillage, type-check, lint, anti-secrets).
- **T2 vert** — 131 tests Playwright (Chromium + iPhone 13), dont
  `dashboard-praticien.spec.ts:94` qui emprunte le badge cabinet renommé, plus
  4 190 tests Vitest sur 371 fichiers.
- **Quatre mutations, quatre rouges** : libellé nu remis dans le module (3
  tests, dont le couplage qui attrape une régression du module que la table
  attendue ne suivrait pas), motif cassé (10), ancien libellé réintroduit dans un
  composant (1), source de la règle scorée effacée (le banc de rendu).
- Écran réel relu sur les deux surfaces (capture Playwright jetable, supprimée) :
  badges et prose du cabinet corrects et sans débordement ; c'est cette
  relecture qui a montré que la colonne « Qualité » ne sert que « Historique »
  sur données seedées.
