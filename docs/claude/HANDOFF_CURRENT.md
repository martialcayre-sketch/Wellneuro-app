# Handoff — 2026-08-04 — LOT-07 : ce que « certifié » ne dit pas

Écrit sur la branche vivante, avant la PR.

## Git

- Worktree `.claude/worktrees/lot-07-reliquat-certification`, branche
  `worktree-lot-07-reliquat-certification`, partie de `main` après #559.
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`,
  **LOT-07 — dernier lot**. Rien sous `web/src/`.
- `cible_pr_lot` corrigée en `main` : la branche d'intégration déclarée par
  `CAMPAGNE.md` **n'a jamais existé sur origin**, les LOT-00 à LOT-06 sont tous
  partis en PR directe.

## Objectif atteint

Le score-check était vert sur 65 instruments, et ce vert portait sur le **calcul**.
Rien n'empêchait d'y lire « instrument validé ». La distinction est désormais
écrite dans `docs/gouvernance-questionnaires-scoring.md`, et les trois axes —
scoring vérifié, validité psychométrique, complétude bibliographique — sont
séparés et chiffrés.

## Le chiffre qui résume le lot

**43 entrées portent `reference_identifiee`. Deux portent un identifiant.**

Le garde n'exige, pour ce statut, qu'**un** champ non vide parmi `auteurs`,
`anneePublication`, `formePubliee`, `doi`, `pmid`. Huit des douze entrées
`a_completer` avaient déjà un nom d'auteur : s'adosser au garde aurait produit
douze montées purement déclaratives, en CI vert. La règle retenue — un identifiant
qui certifie **la forme servie** — en a laissé passer deux.

## Ce qui est en place

- `motifBibliographique`, nouveau champ, sur les **10** entrées `a_completer` :
  ce qui a été cherché, et pourquoi ça n'a rien donné. Seuil de 40 caractères,
  repris de `droits.detail` et de `verdictScoring.reserve.motif`.
- Trois contrôles dans `scripts/lib/verifier_registre_instruments.js` : motif
  obligatoire sur `a_completer` ; motif **interdit** ailleurs (un constat survivant
  à une promotion contredit son voisin) ; `cosmin !== 'inconnu'` exige une étude
  concordante au dossier.
- Le barreau `psychometrie_revue` exige désormais une preuve **graduée** et un
  `cosmin` posé — voir « ce que le lot ouvrait » ci-dessous.
- `measurement_evidence.json` rejoint `instrument_registry.json` du côté « code »
  dans le classement `docs_only` de `ci.yml`.
- 3 lignes de preuve psychométrique, toutes sur `Q_PED_01`, toutes `inconnu`.
- 65 tests au banc, T1 vert.

## Ce que la revue adversariale a corrigé — et que je n'avais pas vu

1. **Le lot ouvrait une porte en écrivant ses propres données.**
   `measurement_evidence.json` était vide : personne ne pouvait franchir le
   barreau `psychometrie_revue`, dont le garde ne teste que la **présence** d'une
   preuve. Y écrire trois lignes concluant `inconnu` — dont une qui dit
   « coefficient non rapporté dans la notice consultée » — le rendait franchissable
   pour `Q_PED_01`, à un statut près. Fermé dans le lot.
2. **Le fichier de preuves était classé `docs_only` par le CI** : éditable seul,
   `verify` vert, sans qu'aucun contrôle ne le lise. Le commentaire de `ci.yml`
   tenait déjà ce raisonnement mot pour mot pour le registre.
3. **`Q_ALI_03` allait recevoir un PMID qui ne certifie pas la forme servie** :
   la publication décrit 8 questions, le dépôt en sert 23 et déclare l'instrument
   **débaptisé** (« il n'est plus selon Monnier »). Redescendue en `a_completer`.

## Problèmes ouverts

- **Trois écarts cliniques trouvés, aucun tranché** — ils appellent le praticien :
  - `Q_STR_03` : la source cote 11 items de 1 à 6 (étendue **11-66**) ; le dépôt
    sert 0-5, `maxTotal: 55`, avec cinq bandes d'interprétation, et l'instrument
    alimente Mon Équilibre (besoin 9). Si l'écart est réel, les bandes servies sont
    décalées et `divergencesCritiques: 0` affirme plus que ce qui est su.
  - `Q_FIB_03` : si l'item servi est l'examen des 18 points sensibles, sa source
    publiée est le critère ACR 1990, pas l'ELFE.
  - `Q_NEU_03` : l'éditeur date le manuel de 1998, le registre déclare 1992.
  Aucune `verdictScoring.reserve` n'a été posée : plafonner un barreau est une
  décision clinique, pas un geste de lot bibliographique.
- **`a_completer` recouvre maintenant deux situations qu'aucune requête ne
  sépare** : « cherché, rien n'existe » (`Q_STR_03`, `Q_NEU_12`, `Q_FIB_03`,
  `Q_URO_02`) et « trouvé, non indexé » (`Q_NEU_03`, `Q_TAB_01`, `Q_TAB_03`).
  La distinction ne vit que dans une phrase française. Un booléen
  `referenceLocalisee` la rendrait interrogeable ; non fait, hors périmètre.
- **Deux des dix `a_completer` ne fermeront jamais** (`Q_SOM_09`, `Q_ALI_09`,
  créés par WellNeuro). Le compteur imprime le sous-compte à part, dérivé de
  `versionServie.statutContenu` — un compteur qui ne peut pas atteindre zéro
  cesse d'être lu.
- **Soupçon non vérifié** : le seuil servi de `Q_SOM_06` est ≥ 23 quand celui
  usuellement cité pour l'asthénie de Pichot est ≥ 22.
- Le `commentaire` de `measurement_evidence.json` annonçait un « claimId validé
  correspondant » que les trois lignes n'ont pas ; la phrase a été amendée, mais
  le rattachement aux claims reste à faire.
- Hérités : les six règles du LOT-05 ne sont pas signées cliniquement, sans quoi
  le LOT-06 livré n'affiche rien.

## La leçon de méthode, revenue une troisième fois

Mes mutations testaient le **retrait** du contrôle, pas son **déplacement**. La
mutation « hors de la boucle » a survécu au premier passage : un banc dont chaque
cas n'instancie qu'**une** entrée ne distingue pas « dans la boucle » de « hors de
la boucle ». Refermée, la variante « **dernière** entrée » a survécu à son tour —
le cas correctif plaçait la faute en seconde et dernière position. Il a fallu un
cas à **trois** entrées, faute au milieu. Un banc vert ne prouve que ce qu'il sait
instancier.

## Prochaine action exacte

Ouvrir la PR sur `main` avec `--body-file`, attendre son CI avec
`node scripts/wn-attendre-ci.mjs <N>` (**code `0` exigé** ; `2` signifie que
`verify` n'a pas tourné), puis merger si l'autorisation est donnée.
Ensuite : arbitrage praticien sur les trois écarts cliniques ci-dessus, et
signature clinique de la table du LOT-05.

## Interdits encore actifs

- Aucune migration, aucune écriture Supabase, rien sous `web/src/`.
- Ne pas merger sur les seuls checks Vercel : `verify` absent **bloque**, et
  `enforce_admins` est actif — personne ne passe outre, propriétaire compris.
- Ne pas corriger l'écart de cotation de `Q_STR_03` sans décision du praticien :
  c'est un seuil clinique servi en production.
