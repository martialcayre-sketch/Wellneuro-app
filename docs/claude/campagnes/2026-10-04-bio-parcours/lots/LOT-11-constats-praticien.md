---
id: "LOT-11"
titre: "BP-11 — Constats du praticien"
statut: "à_faire (fiche proposée le 2026-10-19 ; six arbitrages rendus le 2026-10-19 ; décision du lot D-331 écrite ; déclaration RGPD validée par le responsable le 2026-10-20 ; migration à écrire, release-db après celle de t03, #1581)"
dépend_de: "LOT-09, LOT-12"
---

# LOT-11 (BP-11) — Constats du praticien

> **Fiche proposée le 2026-10-19, arbitrages rendus le même jour.** Écrite
> sans le responsable, à partir des sources citées ; ses six arbitrages sont
> rendus (section « Arbitrages ») et consignés par D-331, qui précise D-122.
> Dépôt public : cette fiche ne porte aucun libellé d'hypothèse, aucun
> contenu de claim, aucune valeur.

## But

Donner au premier parcours (« exploration du besoin 2 », D-266 §6) l'objet
que l'étage outil lit à la place d'une valeur : le **constat du praticien**
sur une hypothèse du vocabulaire signé de BP-12a (cadrage v3, §3.4). BP-16
(boucle d'exploration) et BP-17 l'attendent ; BP-27 pourra le proposer, sans
jamais le poser.

## Résultat observable

Après le lot, sur un dossier, le praticien pose un constat sur une hypothèse
(verdict, motif hors « confirmée », pièces, date « à revoir le »
facultative), le remplace ou le retire ; l'historique reste lisible. Un
constat dont une pièce est corrigée, annulée, invalidée, suivie d'un
prélèvement ou d'une passation plus récents, ou dont la date est passée, se
dit « à relire ». Rien n'est servi au patient. En production, aucun constat
ne se pose avant la signature de la structure de BP-12a.

## Socle établi (ne se rediscute pas)

- **Une migration, deux PR** (D-266 §11) : la migration seule, puis le code
  après release-db approuvée, sentinelle et constat par conteneur (D-087).
- **Release-db au rang 4, après BP-12a** (constatée le 2026-10-16) ; une
  migration en vol à la fois : celle de t03 (#1581) passe d'abord (D-248).
- **Portes levées** : BP-09 constaté (porte 9, #1448, #1455) ; BP-12a,
  code mergé (#1498) — D-314 §6, arbitrage 2 : BP-11 part dès ce merge ;
  essai de restauration (porte 8).
- **Objet distinct** d'`ArbitrageBiologique` (D-059 §4 intacte) et du statut
  posé près d'une valeur (D-322) (cadrage v3, §3.4).
- **Hypothèse par identifiant** `HYP_…` (format fixé par la base, D-314 §8),
  jamais un texte libre de verdict ; libellés en base (BP-12a).
- **Quatre verdicts** `confirmee`, `non_retenue`, `non_evaluable`,
  `sans_objet` (cadrage v3, §3.4).
- **Aucune valeur recopiée**, contrat négatif **propre** aux tables.
- **Auteur et date posés par la base**, ajout seul, `supersedes`.
- **Correction ou annulation d'une pièce ⇒ « à relire »**, jamais réécrit.
- **Registre RGPD avant la table** ; drapeau `WN_BIO_CONSTAT` né avec le
  code (cadrage v3, ligne BP-11).

## Ce que le code fait aujourd'hui (lu le 2026-10-19)

- **Aucun objet de constat** ; `WN_BIO_CONSTAT` n'existe ni dans `web/` ni
  dans `docs/FEATURE_FLAGS.md`.
- **Vocabulaire vide** : `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`
  est livrée vide, verrou éteint (`structureSignee()` rend `false`) ; la
  première signature attend quatre dossiers clos (D-314 §10).
- **Pièces possibles** : `ResultatBiologique` (`resultats_biologiques`,
  correction par ligne neuve `supersedes_resultat_id`, D-124) ;
  `QuestionnaireReponse` (identifiant de ligne, invalidable par le praticien,
  `api/praticien/questionnaires/validite`). L'anamnèse est un JSON sur
  `Patient`, sans identifiant de ligne ; traitements et contexte de
  prélèvement n'existent pas encore (BP-13, BP-05).
- **Patrons** : `annulations_resultats_biologiques_v1` (D-294) et
  `statuts_poses_resultats_biologiques_v1` (D-322) — ordre, FK `RESTRICT`,
  triggers `_no_update`, `_no_truncate`, `_avant_insertion`, RLS, contrat
  négatif joué au CI (`.github/workflows/ci.yml`).
- **Effacement** (`web/src/lib/patient/effacement.ts`) : les réponses de
  questionnaire sont vidées avant les tables de biologie ; les tables du
  constat doivent l'être avant les deux. Le banc de complétude compte tout
  modèle à `id_patient`.

## Arbitrages (rendus par le responsable le 2026-10-19)

Chaque question donne les faits, puis la conséquence de chaque réponse ; la
réponse retenue suit, en **Rendu**.

1. **Ce qu'on peut attacher comme pièce.** Seuls les résultats et les
   réponses de questionnaire ont un identifiant de ligne.
   - **A.** Résultats + questionnaires, chacun par une vraie clé : la base
     garantit l'existence et le dossier ; traitements et contexte par
     migration avec BP-13 et BP-05.
   - **B.** Résultats seuls.
   - **C.** Référence générique sans clé : tout dès maintenant, sans
     garantie d'existence ni de dossier.
   - **Rendu : A.**
2. **La validité d'un constat.** Aucun claim ne fixe de durée.
   - **A.** Date « à revoir le » fixée par le praticien, facultative ;
     passée, « à relire ».
   - **B.** La même, obligatoire.
   - **C.** Aucune durée dans ce lot.
   - **Rendu : A.**
3. **Un nouveau prélèvement d'un analyte cité** (pas une correction).
   - **A.** Le constat reste tel quel ; le signal vient avec BP-16.
   - **B.** Le constat passe « à relire ».
   - **Rendu : B** (contre la recommandation A).
4. **Un questionnaire cité, repassé.**
   - **A.** « À relire », comme un résultat.
   - **B.** Reste tel quel.
   - **Rendu : A.**
5. **La forme de la note** (le cadrage l'exige hors « confirmée » ; rendu :
   un motif fermé l'y remplace, la note n'est obligatoire qu'avec `autre`,
   D-331 §3).
   - **A.** Libre, avec un avertissement à l'écran.
   - **B.** Libre, avec un filtre serveur des recopies « nombre + unité ».
   - **C.** Motif fermé obligatoire + note facultative.
   - **Rendu : C** (contre la recommandation A).
6. **La liste des motifs**, proposée par l'assistant sur la demande du
   responsable (D-308 §2) : neuf codes, trois par verdict hors
   « confirmée » sauf « sans objet » (deux), plus `autre` (note
   obligatoire) ; liste au D-331 §3.
   - **Rendu : la liste telle quelle.**

Précisions de l'assistant, consignées en D-331 et retenues par le
responsable le 2026-10-20 : une passation **invalidée** rend aussi le
constat « à relire » (équivalent d'une annulation, §5.5) ; une re-signature
de la structure qui garde l'hypothèse ne le fait pas (§5.7).

## Périmètre

- **PR 1 (migration seule)** : deux tables (`ConstatPraticien`,
  `PieceConstatPraticien`), CHECK (acte, verdicts, motifs par verdict,
  note, format `HYP_…`, une pièce exactement), triggers (ajout seul,
  praticien du dossier, un seul constat en vigueur par hypothèse et par
  dossier — remplacement et retrait ne visent que lui, D-331 §2 —, pièce
  du même dossier, tête de fil non annulée,
  passation non invalidée, au moins une pièce pour `confirmee` et
  `non_retenue` en fin de transaction), RLS ; contrat SQL négatif au CI ;
  effacement nommé et son banc ; dossier RGPD validé.
- **PR 2 (code)** : route de pose et de retrait, lecture et dérivation de
  « à relire » (D-331 §5), écran du parcours sous `WN_BIO_CONSTAT`,
  `docs/FEATURE_FLAGS.md`.

## Hors périmètre

D-331 §10 : pièces attendues par fiche (BP-16), réveil « résultat arrivé »
(BP-16), traitements et contexte comme pièces (BP-13, BP-05), proposition de
constat (BP-27), toute surface patient.

## Interdits

- Aucune valeur, unité, analyte ou date de prélèvement recopiés.
- Aucun libellé d'hypothèse ni texte clinique au dépôt (D-251 §4).
- Aucune fixture hors Sophie Nicola, Jennifer Martin, Michel Dogné ;
  vocabulaire synthétique en test.
- Aucun constat déduit d'une valeur.

## Critères de done

- Release-db constatée par conteneur (deux tables vides, RLS active).
- Contrat négatif propre joué au CI.
- Correction, annulation, invalidation, prélèvement ou passation plus
  récents, date passée ⇒ « à relire », sans réécriture (tests).
- Effacement testé.

## Dépendances

LOT-09 (BP-09, fait), LOT-12 (BP-12a, code livré). Aval : BP-16, BP-17.
