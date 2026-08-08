# 2026-08-08 19:39 — LOT-02 : « Certifié » devient « Scoring vérifié »

Campagne `2026-08-08-dettes-ouvertes-5-0`. Branche
`lot-02-badge-scoring-verifie`, base `5e1909ac` (`origin/main` après le squash
de #625). Clôture écrite avant la PR : le merge est un squash.

## Ce qui est fait

Le **LOT-02** en entier, sous l'arbitrage du 2026-08-08 (`D-036`) : **renommer
le libellé** — plutôt qu'infobulle ou lien — et sur **toute la famille** des
libellés qui emploient le mot, pas seulement les trois badges verts.

- `web/src/lib/certification-libelles.ts` : les deux mappers, jusqu'ici **locaux
  et non exportés** dans `BibliothequePanel.tsx` et `FichePatientPanel.tsx`.
  C'est la raison du déplacement, pas un rangement — aucun banc ne pouvait
  asserter ce qu'ils rendaient. S'y ajoutent les deux littéraux d'écran qui ne
  passaient par aucun mapper (`LIBELLE_INSTRUMENT_CABINET`,
  `TEXTE_INSTRUMENTS_CABINET`).
- Neuf libellés renommés (`Certifié` → `Scoring vérifié`, `Non certifié` →
  `Scoring non vérifié`, `Certifié Drive` → `Scoring vérifié (Drive)`, etc.) et
  **trois proses absentes du cadrage** (`BibliothequePanel.tsx:369`, `:1215`,
  `:1405`) qui employaient le même mot trois lignes sous un badge renommé.
- `web/src/lib/certificationLibelles.guard.test.ts`, plus une assertion de rendu
  jsdom sur la colonne « Qualité » et le sélecteur E2E du badge cabinet reporté.
- `changelog.d/2026-08-08-badge-scoring-verifie.md`, `D-036`, le fichier de lot,
  `CAMPAGNE.md`, et l'état machine (`.wn/state.json` puis
  `wn-cycle.mjs --appliquer`, dans cet ordre).

## Ce qu'il faut savoir avant de reprendre

- **Le garde porte sur les valeurs RENDUES, jamais sur le source des
  composants.** Le source contient légitimement `libelleCertificationBibliotheque`,
  `ScoreCertification` et la valeur de donnée `'certifie'` : un `/certifi/i`
  appliqué au source rougirait dessus et exigerait une exception — la forme même
  qui a fait refuser deux fois le garde de `D-034`. **Ne pas « améliorer » le
  garde en le passant au source.**
- **Pas de `\b`** : en JavaScript `é` n'est pas `\w`, donc `\bcertifié\b` ne
  borne rien. `/certifi/i` couvre sans ancrage toutes les variantes.
- **L'exhaustivité vient du typage**, pas d'une liste :
  `Record<StatutCertificationRuntime, LibelleCertification>` ne compile pas si un
  état s'ajoute sans son libellé attendu. Les libellés, eux, sont **écrits à la
  main** — un attendu dérivé du module testé bougerait avec lui.
- **Aucun E2E ne peut voir les libellés de passation, et ce n'est pas un oubli
  de banc.** La colonne « Qualité » ne rend un badge que si `scores_json` porte
  une clé `certification` ; le seed n'en produit aucune, donc les cinq passations
  de Sophie Nicola affichent **toutes « Historique »**, en local comme en CI.
  C'est la relecture d'écran qui l'a montré, pas la lecture du code. Le seul
  témoin du renommage sur cette surface est le banc jsdom avec sa fixture.
- **Le garde n'attrape pas un mot neuf.** Son contrôle de source refuse la
  réintroduction d'un **ancien** libellé — liste fermée de dix. Il attrape le
  revert, pas un « Certifié » inventé ailleurs. Écrit dans son en-tête.
- **Quatre mutations, quatre rouges** : libellé nu remis dans le module (3
  tests), motif cassé (10), ancien libellé réintroduit dans un composant (1),
  source de la règle scorée effacée (le banc de rendu). Les rejouer si le garde
  est retouché.
- **`next-env.d.ts` est régénéré par `npm run check`** avec un contenu différent
  de celui committé : le restaurer (`git checkout --`) avant d'indexer, sinon il
  pollue le diff du lot.

## Prochaine action

**LOT-03** (dette 4) — le dernier lot ouvert de la campagne. Deux gestes, dans
l'ordre : (1) **re-mesurer** la dérive registre/packs à la date d'ouverture, par
lecture `execute_sql` via l'outil MCP — la mesure « 1 pack sur 8 » du 2026-08-05
était périmée et la lecture du 2026-08-08 rend **0 divergence sur 8** ; (2) poser
un garde contre le retour de la dérive. La correction mineure de la date
d'arbitrage HDS (2026-07-21 / 2026-07-22) voyage avec ce lot.

Vérifier à son ouverture qu'aucune écriture de pack n'est en vol : c'est
précisément ce qui a périmé la mesure précédente.

## Questions ouvertes

- **Le garde du LOT-03 vit-il dans `web/prisma/checks/`** (contrat de données,
  gratuit, rejoué en CI sur base éphémère) **ou en lecture de production
  planifiée** ? Seul le second voit la vraie dérive ; seul le premier est
  gratuit.
- **Faut-il un jour aligner le registre sur l'écran ?** Le vocabulaire du dossier
  garde « certifié » (`instrument_registry.json`, `StatutCertificationRuntime`,
  `scripts/check_questionnaire_certification.js`, le corpus). Ce serait une
  campagne de registre, et la dépendance irait dans le bon sens ; rien ne l'exige
  aujourd'hui.
- **Étendre le seed** pour poser une clé `certification` et ouvrir un chemin E2E
  sur la colonne « Qualité » ? Geste séparé, non fait ici.

## Interdits encore actifs

- Ne renommer **aucune valeur de donnée** pour aligner le dossier sur l'écran
  sans décision : le hors-périmètre du lot fige `instrument_registry.json`, le
  champ `cosmin` et `verifier_registre_instruments.js` (`D-034`).
- Ne pas toucher la phrase de consentement patient « Je certifie l'exactitude
  des informations fournies » (`portail/[token]/page.tsx:269`) — autre sens du
  verbe, autre surface.
- Ne pas creuser d'exception dans le motif du garde.
