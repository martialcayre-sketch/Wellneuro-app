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
- **Un garde qui interdit un MOT n'épingle pas un SENS.** Première rédaction
  refusée en revue : les deux constantes n'avaient aucun attendu écrit à la main.
  `TEXTE_INSTRUMENTS_CABINET` réécrit en « leur scoring **est** vérifié par
  WellNeuro » ne porte pas le mot interdit et **passait vert**, en affirmant à
  l'écran l'inverse de D-034 ; la chaîne vide aussi. D'où `ATTENDUS_CONSTANTES`.
  C'est le piège connu du dépôt pris par l'autre bout.
- **La surface principale n'avait AUCUN rendu asséré.**
  `app/dashboard/bibliotheque/page.test.tsx` **mocke** `BibliothequePanel`, et
  l'E2E ne touchait que le badge cabinet : un composant calculant le libellé par
  le module puis en affichant un autre passait tout le CI, sur l'écran qui porte
  les 64 instruments. `BibliothequePanel.test.tsx` ferme ce trou.
- **Le seed omet une clé que le moteur PRODUIT** — pas une impossibilité de banc,
  comme une première rédaction l'écrivait. Les moteurs propagent la métadonnée
  (`questions.ts`, `certification: sc.certification || null`),
  `api/patient/submit` persiste le résultat entier, `portail-parcours.spec.ts`
  complète déjà une soumission réelle, et les quatre instruments de Sophie Nicola
  la déclarent au catalogue. Il manque **une assertion**, et 4 lignes de seed.
- **Le badge est muet pour 21 des 65 instruments, production comprise.** Mesuré
  le 2026-08-08 : 38 `certifie`, 21 `inconnu`, 6 `ambigu`. PSQI (`Q_SOM_01`) et
  MMSE (`Q_GEO_04`) inclus, que le registre couvre. Le lot traite le badge qui
  rassure à tort ; celui qui ne dit rien reste.
- **Le garde n'attrape pas un mot neuf.** Son contrôle de source refuse la
  réintroduction d'un **ancien** libellé — liste fermée de dix, **à la casse
  près** : `'Instrument certifié'` en minuscule lui échappe. Écrit dans son
  en-tête, avec le piège corollaire : le scan lit les fichiers **entiers**,
  commentaires compris — ne pas documenter un ancien libellé dans un commentaire
  des deux composants scannés.
- **Six mutations, six rouges** : libellé nu dans le module (5 tests), motif
  cassé (10), ancien libellé réintroduit dans un composant (1), source de la
  règle scorée effacée (1), **sens de la prose cabinet inversé (1)**, **libellé
  nu posé directement dans le badge du catalogue (6)**. Les rejouer si le garde
  est retouché.
- **Un chiffre de passe se relève sur la passe du code LIVRÉ.** Une première
  rédaction annonçait « 131 tests E2E » : c'était le compte des passes qui
  portaient le spec de **capture jetable**. Sur le code livré, T2 rend **130
  passés, 2 ignorés** et 4 200 Vitest sur 372 fichiers. Rejouer avant de citer.
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
  sur la colonne « Qualité » ? Geste séparé, non fait ici — mais il coûte 4
  lignes, et le seed est aujourd'hui **moins fidèle que le moteur**.
- **Le badge muet sur 21 des 65 instruments** est-il la lecture voulue, ou une
  dette à ouvrir maintenant qu'elle est mesurée ? Elle touche des instruments que
  le registre certifie (PSQI, MMSE).
- **Le garde de divergence code ↔ registre** — `def.scoring.certification.status`
  contre le barreau `scoring_verifie` — entre-t-il au périmètre du LOT-03 (dette
  4, anti-dérive) ou fait-il l'objet d'une dette à part ?

## Interdits encore actifs

- Ne renommer **aucune valeur de donnée** pour aligner le dossier sur l'écran
  sans décision : le hors-périmètre du lot fige `instrument_registry.json`, le
  champ `cosmin` et `verifier_registre_instruments.js` (`D-034`).
- Ne pas toucher la phrase de consentement patient « Je certifie l'exactitude
  des informations fournies » (`portail/[token]/page.tsx:269`) — autre sens du
  verbe, autre surface.
- Ne pas creuser d'exception dans le motif du garde.
