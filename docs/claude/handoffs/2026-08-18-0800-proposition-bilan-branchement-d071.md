# Handoff — 2026-08-18 — D-071 : la proposition de bilan atteint un écran

- **État** : `feat/proposition-bilan-branchement`, depuis `origin/main` à
  `69d62a8e`. T1 vert ; **T3 entièrement vert** (exit 0), `migrate diff` « No
  difference detected », 136 E2E passées. Aucune migration dans cette PR.
- **Décision** : `D-071` §1, §2 bis et §4 — §2/§3 étaient déjà appliqués et
  vérifiés en production (#703, `release-db` du 2026-08-17).

## Ce que le lot a réellement fermé

`deriverStatutsBiologie` a un appelant de production. Le catalogue (`D-068`) et
les quinze règles signées (`D-069`) ont cessé d'être dormants — trois jours
après leur signature.

Le **contrat M-B est gardé pour la première fois** : la table canonique et sa
signature passent verbatim, et un banc-sentinelle éprouve l'identité de
référence puis la concordance du SHA, sur deux chemins de données. Un spread
comme un `filter(statut === 'publiee')` le tuent. L'assertion qui les attrape
est l'identité, **pas** le SHA — un filtre qui ne retire rien produit le même
hachage.

## Les deux replis fail-open, et pourquoi ils sont fermés à la frontière

`statuts.ts` conclut `deja_documente` sur une date illisible comme sur une date
future — donc **retire** le panel des propositions. Une donnée aberrante y
produisait la conclusion rassurante (`DC-24`, `DC-25`). Le moteur étant hors
périmètre, la fermeture est posée dans le service et la route : la déclaration
douteuse est écartée **et dite**, à l'écran, sur la ligne concernée. Le sens du
repli est arbitré, pas subi — écarter propose un bilan de trop, garder en
tairait un.

## Ce que la revue a changé (GO sous réserve → corrigé)

- **Une déclaration erronée était irrattrapable** : le formulaire disparaissait
  dès qu'un panel était déclaré, et aucune route de correction n'existait. Une
  année saisie de travers retirait un panel sans issue. Le formulaire reste
  désormais offert.
- **Le service ne re-testait pas le drapeau**, contrairement au patron
  d'`evaluerOrientationPourPatient` : un futur appelant aurait lu le dossier
  sans verrou.
- **Frontière de fuseau** : `<input type="date">` + `new Date()` refusaient la
  date du jour comme future, chaque nuit entre minuit et 2 h à Paris.
- **`PostBody` est un cast, pas une validation** : `{"idPatient": 123}` rendait
  500 avant le test du drapeau — la route se distinguait d'une route fermée.
- Bancs ajoutés : journalisation d'accès assertée **positivement**, allow-list
  du payload (ni signature ni `shaPerimetre` ne doivent traverser HTTP), date
  illisible, fuseau, et un banc de rendu qui garde les trois affirmations de
  doctrine — « pas une ordonnance », « non évalué ≠ non remboursé »,
  « déclaration écartée dite ». Elles ne vivaient que dans le changelog.

## Ce que le dépôt a signalé de lui-même

`MATRICE_CONSOMMATION.md` est générée depuis le code et recense les sources de
savoir dormantes : elle a refusé de rester à jour. La table d'indications n'y
avait **aucune ligne** — ce qui rendait le constat de dormance de `D-070`
indémontrable par l'outil. Elle y entre : 21 sources, 5 dormantes.

## Dettes nommées (`D-071` §5)

- La matrice reste imprécise sur la bibliothèque NABM : elle la compte
  « 1 surface indirecte » sur la foi d'un `import type`, effacé à la
  compilation, alors que le service ne passe aucun remboursement. Corriger le
  générateur est un lot à part.
- L'état affiché n'est pas remis à zéro au changement de patient (défaut
  préexistant, partagé avec les arbitrages ; correctif connu `key={idPatient}`,
  hors périmètre car il touche tous les panneaux du cockpit).

## Prochaine action

PR relue et mergée. **Allumer `WN_CB_PROPOSITION` reste un geste
d'exploitation distinct** : le merge ne change rien en production, et c'est
délibéré. Avant l'allumage, trancher les deux dettes ci-dessus.
