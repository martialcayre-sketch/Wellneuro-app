# Handoff — 2026-08-23 — Alliance 6.0-B, LOT-02 : le moteur de proposition

## Branche et état Git

`feat/lot02-moteur-proposition-alliance-6b`, worktree `alliance-6b-lot02`,
depuis `origin/main` 67bd068c (qui contient déjà les arbitrages, PR #775
mergée). Aucune migration, aucun `schema.prisma` touché.

## Objectif

Livrer le module qui assemble des propositions d'objectif à partir de
fragments sourcés, et la route praticien qui les sert et enregistre l'écart
motivé. Déterministe, sans LLM ([[D-094]] §4).

## Décisions prises

**Deux points de conception que la fiche ne tranchait pas.**

1. **Qui écrit `propositions_objectif`.** La `DecisionCard` n'est pas
   persistée (`protocol_drafts` n'en garde que les empreintes d'ancrage) et
   G7 interdit de la recalculer : un GET ne peut pas assembler, et aucun autre
   lot ne portait cette écriture. Arbitré par le responsable : **POST à deux
   gestes** — `assembler` (le cockpit envoie plainte, candidats, SHA ; la
   route lit l'anamnèse EN BASE) et `ecarter`. Idempotent par empreinte.
2. **`assembleeLe` est la clé d'assemblée.** La caducité se dérive : dernier
   assemblage = vivant, précédents = caducs. Ce n'est pas une duplication de
   `creeLe` — un seul `createMany` la pose à l'identique pour toute
   l'assemblée.

**L'anamnèse ne vient jamais du client** — frontière de confiance de la
route. Plainte et candidats, si : la route vérifie forme, longueurs et SHA
hexadécimal, et **ne feint pas** de vérifier l'authenticité du SHA (la table
signée vit sous `lib/clinical/`, que G7 lui interdit).

**Un mot renommé plutôt qu'une garde assouplie.** La source « instrument »
porte `restitution` et non le mot que l'usage attendrait — ce dernier est
refusé comme clé par le balayage. Ce que le fragment cite n'est pas la
mesure mais le libellé publié ; précédent `marqueurPrisma`.

## Fichiers modifiés

- `web/src/lib/praticien/propositionObjectif.ts` (neuf) + `.test.ts` (53 cas)
  + `.guard.test.ts` (17 cas, G7-1 à G7-5)
- `web/src/app/api/praticien/propositions-objectif/route.ts` (neuf) +
  `route.test.ts` (34 cas)
- `web/src/lib/patient/featureFlag.ts` : `isObjectifProposeEnabled` et
  `dossierDansPerimetreProposition` (additif)
- fiche LOT-02 close, fragment `changelog.d/`

## Validations exécutées

- **T1 vert** (`npm run check`, exit 0).
- **Bancs du lot : 104 verts** (53 + 17 + 34), après correction de revue.
- **T2 : 155 passés, 1 échec** — `portail-parcours` iPhone 13, `page.goto` en
  timeout de chargement. **Reproduit à l'identique sur un arbre d'où le lot
  avait été retiré** (module, route et drapeaux déposés de côté, `featureFlag`
  rendu à `HEAD`) : blocage WebKit connu de ce Mac, étranger au lot.
- **Quatre gardes vues rouges par mutation réelle**, la cinquième par `tsc` :
  import de `clinical-engine/` (G7-1), propriété `rangCandidat` (G7-2),
  `objectifNegocie.create` dans la route (G7-3), `rangAffichage` ajouté au
  type exposé (G7-4), balayage désarmé (G7-5).
- **Un défaut réel trouvé par un banc** : `return promesse` dans un `try` ne
  l'attend pas, donc un rejet Prisma échappait au `catch` — la route aurait
  propagé un message qui recopie le `data:` du `createMany`, c'est-à-dire les
  mots du patient. Corrigé en `return await`.
- **Revue `wn-reviewer` : no-go, trois bloquants — tous corrigés.** Voir
  ci-dessous. Après correction : 104 bancs verts, T1 vert, et les trois trous
  signalés vus rouges par mutation.

## Ce que la revue a trouvé

**B2, et c'était le défaut du LOT-09.** Les deux listes de mots interdits
étaient entièrement en FRANÇAIS, alors que la donnée amont nomme ses champs
`rank` et `confidence` (`clinical-engine/decisionCard.ts`). Mes quatre
mutations vues rouges étaient toutes francisées ; la plus PROBABLE — recopier
le champ tel qu'il arrive — serait passée, et le classement se serait
persisté dans le blob (exposé en `unknown`, donc hors du pin de type) sans
qu'aucun des 94 cas ne bouge. Racines anglaises ajoutées des deux côtés.
`priorit` volontairement PAS ajouté par sous-chaîne : `objectifPrioritaire`
est un champ d'anamnèse, une garde à faux positif finit assouplie.

**B3.** G7-1 ne lisait que les préfixes d'alias `@/lib/…` : `from
'../clinical-engine/…'` la traversait entièrement — et c'est l'idiome local
(`clinical/contradictionFinding.ts` importe `'../clinical-engine/types'`). La
garde lit désormais les spécificateurs d'import et refuse le répertoire comme
SEGMENT de chemin. La vérification `not.toContain('canonical')` ne portait par
ailleurs que sur le module, pas sur la route.

**B1.** Le POST `assembler` rendait le dossier — fragments, donc verbatim
patient — sans journaliser l'accès. Le patron hérité (« une écriture laisse sa
propre trace ») ne s'appliquait pas : son cas nominal n'écrit rien
(idempotence), et `propositions_objectif` ne porte aucun `praticien_email`. Le
chemin d'usage normal était donc celui qui ne laissait pas de trace.

**E1/E2/E3, M2/M3/M4/M5, F1/F3/F4** corrigés dans le même passage. Les deux
plus graves : `disposees` était filtrée sur « ce qui n'est pas vivant », si
bien que le surplus au-delà du plafond y tombait avec `disposition: null` —
l'écran aurait lu un geste qui n'a pas eu lieu ; et l'identifiant de règle
était du texte libre, ce qui laissait persister `regle: "Recommandation
Wellneuro validée"` comme une provenance (contrôle de FORME ajouté, pas une
confrontation — G7 intacte).

## Problèmes ouverts

- **Une assemblée devenue VIDE ne retire pas la précédente** : il n'existe
  aucune ligne à écrire pour dire « désormais, rien ». Fermer ce cas demande
  une colonne ou une table d'assemblée — donc une migration, hors périmètre.
  Le geste `assembler` fait foi ; le LOT-03 doit l'appeler avant d'afficher.
- **Lire-puis-écrire n'est pas étanche à la course** (relevé en revue) : deux
  `assembler` concurrents écrivent deux assemblées identiques. Le service
  reste juste et le troisième appel re-stabilise par idempotence ; il reste du
  bruit dans le matériau du bilan LOT-06. Se fermerait par une transaction
  sérialisable — arbitrage renvoyé au LOT-03, quand on saura à quelle cadence
  le panneau appelle réellement.
- Le SHA du périmètre signé n'est **pas confrontable** depuis la route (G7).
  Sa forme est vérifiée, son authenticité non. La forme de l'identifiant de
  règle l'est désormais aussi — ce n'est pas une authentification, mais une
  phrase ne peut plus passer pour une provenance.
- **G7-1 reste bâtie sur une liste de répertoires**, comme G6 : elle couvre
  maintenant alias ET chemins relatifs, mais un moteur clinique qui
  déménagerait hors de ces cinq répertoires en sortirait. Faiblesse partagée
  avec la garde de 6.0-A.

## Prochaine action exacte

Ouvrir la PR. Ensuite le LOT-03 (cockpit : reprendre, amender, écarter ; diff proposé↔négocié), qui
consomme `PropositionExposee` et ajoute `sourcePropositionId` à la route
objectifs.

## Interdits encore actifs

- Aucun import de `clinical-engine/` ni `clinical/` depuis le module ou la
  route (G7-1) ; aucune écriture sur les tables de 6.0-A (G7-3).
- `enoncePatient` jamais pré-rempli autrement que par citation verbatim
  sourcée ; le moteur ne paraphrase jamais.
- Aucun LLM dans ce lot ; aucun tri, rang, score ou numérotation ([[D-094]]
  §3, [[D-093]]).
- Drapeau `WN_OBJECTIF_PROPOSE` éteint à la livraison — l'allumer est un geste
  du responsable.
