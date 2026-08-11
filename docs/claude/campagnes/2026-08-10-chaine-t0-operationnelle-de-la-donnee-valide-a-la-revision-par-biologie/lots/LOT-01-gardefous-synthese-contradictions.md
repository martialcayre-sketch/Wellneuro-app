---
id: "LOT-01"
titre: "Garde-fous de synthèse et moteur de contradictions"
statut: "en_cours"
dépend_de: "LOT-00"
---

# LOT-01 — Garde-fous de synthèse et moteur de contradictions

## But

Plus aucune causalité affirmée ni faux niveau de certitude en sortie LLM ; les
discordances entre instruments sont détectées par le déterministe et imposées à
la synthèse comme vigilances non censurables.

## Résultat observable

Sur la fixture golden case : la synthèse porte la vigilance C-STR en
formulation neutre (« signal fonctionnel non confirmé par les instruments
spécifiques — à clarifier en entretien »), ne contient ni causalité depuis un
score DNST ni promotion d'un facteur de risque en alerte médicale ; une sortie
hors schéma est rejetée et retentée, jamais servie dégradée.

Second résultat, indépendant de la fixture : le contrat de fraîcheur des claims
épinglés passe sur la production, sur les deux tables signées.

## Périmètre

- Prompt `synthese-v20` (`web/src/lib/anthropic.ts`) : interdit général de
  causalité ; taxonomie facteur de risque ≠ symptôme ≠ dépistage ≠ risque
  global ; consigne de restitution neutre des discordances ; section « axes
  rassurants » dans `resume_praticien`.
- Validation de sortie stricte : schéma fermé, énumérations contrôlées, rejet +
  une relance (remplace la coercion de `validateSyntheseSchema`).
- Moteur de contradictions déterministe (patron orientation : table versionnée +
  claims + signature + SHA) produisant des `DiscordanceFinding` — **une règle
  V1** ([[D-042]]) : C-STR (`ADAPTATION_STRESS ≤ 8` vs DASS-21 `D ≤ 4` et
  `S ≤ 7`), `validationExterne: false` à la livraison. C-SOM et C-ALI sont
  écartées de la V1, motifs inscrits dans la table elle-même.
- Contrat de fraîcheur des claims épinglés ([[D-042]], précisé par [[D-044]]) :
  pour chaque paire `(claim_id, version_claim)` citée par une table signée,
  **quatre** propriétés — `statut = 'VALIDE'`, `active = true`, pas de
  `superseded_at`, `prescriptif = true` (le jeu que la relecture du 2026-08-06 a
  effectivement contrôlé). Plus une **contrepartie négative**, au patron de
  `packs_registre_coherence_v1_negatif.sql` : sans elle, rien ne prouve que le
  contrat rougit. Rejoué **en lecture seule sur la production** (patron
  `web/prisma/checks/`), jamais comme test unitaire — la base CI est vide et le
  banc serait vacué ([[D-012]], [[D-015]]). Couvre `contradictionsV1` **et**
  `orientationRulesV1`.
- Déclencheur du contrat ([[D-044]]) : `paths` de `release-db.yml` étendu à
  `web/src/lib/clinical/**` — sans quoi, le lot ne portant aucune migration, le
  contrat ne démarrerait jamais seul. **Cette ligne de workflow élargit ce qui
  ouvre un accès à la production : elle appelle sa propre revue et ne voyage pas
  dans la PR documentaire.**
- Injection : vigilances déterministes de la synthèse (fusion en tête
  existante) + panneau discordances du cockpit (`MissingDataPanel`).
- Persistance : SHA-256 du prompt système + `inputHash` sur `SyntheseIA`.
- Marquage de la passation courante par instrument dans le bloc transmis au
  prompt (renvoi du LOT-00, point 3) : les passations antérieures **restent
  transmises** — l'évolution entre deux enquêtes d'un même instrument est un
  signal clinique — mais la plus récente `VALID` est nommée comme telle. L'écart
  à corriger est l'absence de repère, pas le nombre de lignes : aucun `distinct`,
  aucune suppression.

## Hors périmètre

- Hypothèses cliniques persistées (backlog P2).
- Régénération de synthèses passées.
- Modification des seuils des instruments.
- **Sous-score de rythme du DNST** (ME3/ME4/ME7/ME10, plafond 16) — condition
  du retour de C-SOM, mais c'est un score nouveau au catalogue : son `D-xxx` et
  son `versionScore` sont un autre geste ([[D-042]]).
- **Drapeau d'anamnèse « restriction déclarée »** — condition du retour de
  C-ALI ; il modifie le recueil, pas la synthèse ([[D-042]]).

## Fichiers probables

`web/src/lib/anthropic.ts:211-461`,
`web/src/app/api/praticien/synthese/route.ts:276-286,313-453`,
nouveau `web/src/lib/clinical/contradictionsV1.ts` (+ engine/service au patron
de `orientationRulesV1.ts`), `web/src/lib/clinical-engine/types.ts:199-207`,
`web/src/components/patient-cockpit/MissingDataPanel.tsx`,
nouveau contrat de fraîcheur des claims au patron `web/prisma/checks/`,
`web/prisma/schema.prisma` seulement si `inputHash` exige une colonne
(migration séparée, sinon champ JSON existant).

## Interdits

- Le LLM ne produit jamais une contradiction : il restitue celles du
  déterministe.
- Aucune vigilance déterministe supprimable par la sortie LLM.
- Pas de nouveau few-shot contenant des données patient.

## Dépendances

LOT-00 (les contradictions ne raisonnent que sur passations `VALID`).

## Étapes

1. Table de contradictions (C-STR seule) + moteur + tests unitaires (bump de
   version signé), banc d'absence de champ de certitude ([[D-041]]).
2. Contrat de fraîcheur des claims épinglés dans `web/prisma/checks/`, rejoué en
   lecture seule sur la production — avant d'épingler le premier claim de
   C-STR, sinon le trou de l'audit §E est recopié dans une table neuve.
3. Prompt v20 + garde d'empreinte (patron `promptAlimentaire.guard.test.ts`).
4. Schéma de sortie strict + chemin de rejet/relance audité.
5. Injection vigilances + cockpit.
6. Marquage de la passation courante par instrument dans le bloc de synthèse.

## Tests

- Régressions sections 57 et 58 de la spec, **avec un écart nommé** : la
  section 57 attend une contradiction de sommeil, que C-SOM aurait produite
  faussement ([[D-042]]). Le banc retient donc de la 57 ce qui reste vrai
  — mélatonine non suggérée, aucune causalité depuis le score DNST — et **ne
  teste pas** la contradiction attendue, plutôt que de la faire passer par une
  règle dont la population est fausse. La 58 (pas d'alexithymie, question
  d'entretien générée) est inchangée.
- Aucun champ de certitude, de probabilité, de score ou de confiance sur l'objet
  produit, sous quelque nom que ce soit ([[D-041]]) — assertion sur le type,
  pas sur une instance.
- Contrat de fraîcheur : un claim inexistant, non `VALIDE`, `active = false`,
  `superseded` ou non prescriptif, cité par l'une des deux tables signées, fait
  échouer le contrat — **et la contrepartie négative le prouve**.
- SHA de la table comparé à un **littéral épinglé**, jamais recalculé dans le
  test. La leçon est écrite dans `orientationRulesV1.test.ts:95-101` (« ce test
  ne pouvait pas rougir ») : comparer `sha256(JSON.stringify(table))` à
  lui-même est une tautologie.
- Le motif de retrait de C-SOM est présent dans la table ([[D-042]] en fait un
  livrable) et la justification `DC-37` du recoupement C-STR / `R2-STR-01` est
  portée par la règle, pas supposée.
- Rejeu des entrées d'une synthèse de référence ⇒ absence des formulations
  proscrites (liste dans la spec §F).
- Non-fuite `narratif_patient` : aucun score, aucun axe DNST nommé, vocabulaire
  anxiogène absent (`documents/vocabulaire.ts`).
- Deux passations `VALID` du même instrument ⇒ les deux partent au prompt, une
  seule est marquée courante (banc de non-régression du renvoi LOT-00).
- T2 avant commit.

## Done

Critères du Lot B de `sources/02-spec-lots-parcours-t0.md`, **réduits et
l'écart nommé** ([[D-044]]) — la spec reste intacte, c'est la fiche qui déclare
ce qu'elle tient :

- **Critères 3 et 4 : intégralement.** Rejet + relance d'une sortie hors
  schéma ; non-fuite de `narratif_patient`.
- **Critère 1 : en partie.** « Mélatonine non suggérée » et « pas
  d'alexithymie » sont tenus ; « contradiction produite » ne l'est pas — la
  règle qui l'aurait produite est C-SOM, retirée par [[D-042]].
- **Critère 2 : NON TENU.** Il exige que la sortie « porte les deux vigilances
  C-STR et C-SOM » ; [[D-042]] rend cela inatteignable. Écart assumé, pas
  oublié.
- Fragment `changelog.d/` (bump prompt + nouvelles vigilances).

## Forme de l'objet produit — [[D-041]]

Le moteur produit **un objet unique à trois formes** (`DISCORDANCE`,
`CONVERGENCE`, `CONFLIT_SOURCES`), et non trois objets voisins. Seule
`DISCORDANCE` est peuplée par ce lot ; les deux autres sont prévues par le
type et vides à la livraison — la structure évite un second moteur, elle
n'anticipe aucune règle clinique.

**Garde non négociable** : l'objet ne porte **aucun champ de certitude, de
probabilité, de score ou de confiance**, sous quelque nom que ce soit. Réunir
convergence et discordance invite précisément à lire la première comme une
certitude, ce que `DC-29` interdit. Un banc assère l'absence d'un tel champ.

**Le type est propre au moteur** ([[D-044]]) : `DiscordanceFinding` n'est
**pas** réutilisé. Il hérite de `ClinicalFindingBase`, qui porte
`confidence: QualitativeConfidence` (`clinical-engine/types.ts:184-186`) —
champ que `clinicalReview.ts:107` valide à l'exécution et que le garde
ci-dessus interdit. Le banc de D-041 aurait échoué le premier jour. Coût
assumé : l'injection cockpit convertit.

## Règles de la table V1 — [[D-042]]

`../DOSSIER_REGLES_LOT-01.md` a descendu les trois règles prédicat par prédicat
contre la grille `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md` ; [[D-042]] a
tranché les trois arbitrages ensemble :

- **C-STR — retenue à `≤ 8`**, la bande publiée de l'axe. Le **trou à 9** des
  bandes d'`ADAPTATION_STRESS` est laissé ouvert délibérément : le fermer aurait
  coûté un point sans source, et `R2-STR-01` (`≤ 17`) couvre déjà ce patient. Le
  recoupement avec `R2-STR-01` doit être **justifié dans la règle** (`DC-37`),
  pas supposé.
- **C-SOM — retirée de la V1**, motif inscrit dans la table : l'axe `ME` du DNST
  porte six items de sociabilité sur dix, et la règle sélectionnerait
  systématiquement des patients introvertis qui dorment bien.
- **C-ALI — reportée** : le drapeau d'anamnèse « restriction déclarée » qu'elle
  suppose n'existe pas dans le recueil. Les deux candidats les plus proches
  — `variationPoids` et `intolerancesAlimentaires` (ajouté par `367688ad`) — ne
  déclarent ni l'un ni l'autre une éviction. Son seuil `≥ 7`, en revanche, est
  bien sourcé (bande « Intensité élevée » de `Q_MOD_03`, déjà utilisée au même
  seuil par `R2-NEU-01` dans la table signée).

Les quatre livrables d'architecture du lot — moteur, prompt v20, schéma
strict, injection cockpit — sont **inchangés**. Seul le peuplement de la table
passe de trois règles à une ; le contrat de fraîcheur des claims s'y ajoute.

Restent ouverts, à instruire avant écriture : le `justificationClaims` de C-STR
(la descente s'est arrêtée aux instruments, qui suffisent à fonder la règle mais
pas à remplir ce champ) et la cohabitation à l'écran des deux sorties C-STR /
`R2-STR-01`.
