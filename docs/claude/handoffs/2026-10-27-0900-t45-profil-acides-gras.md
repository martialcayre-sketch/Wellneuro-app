# Handoff — t45, troisième lot : le profil érythrocytaire composé de ses vingt acides (D-387)

## Branche et état du dépôt

- Branche `lot/t45-profil-acides-gras`, worktree `d281-lot3-portail`,
  partie d'`origin/main` (eca887d8 fusionné). Aucune migration, aucun schéma.

## Objectif

Le reste « panels » de t45 : faire entrer les acides gras dans les panels en
détaillant le profil `BIO_AG_ERYTHROCYTAIRES`, déjà cité par quatre panels,
sans rien ajouter à ce que l'application propose de prescrire.

## Décisions prises

- Arbitrages du responsable du 2026-10-26 et du 2026-10-27 (questions à
  options) : composer le profil plutôt qu'ajouter des acides aux panels ;
  type `regroupement` (le type `groupe` affirmerait un acte) ; les vingt
  acides seuls, sans les rapports ; une liste du laboratoire qui nomme la
  fraction et la composition, sans compléter les écarts.
- Source : le compte rendu complet du laboratoire, présenté par le
  responsable le 2026-10-27, imprime les vingt acides sous « Profil des
  Acides Gras de la membrane Érythrocytaire ». Aucune identité versée.
- Consignées dans `D-387`, qui amende D-376 §1 (fraction) et §4.

## Fichiers modifiés

- `web/src/lib/biology-library/compositionsPreparees.ts` (le regroupement)
  et son banc ; `web/src/lib/biology-library/candidatsNabm.ts` (le profil
  en « regroupement ») et son banc (39 « aucun acte », 2 regroupements).
- `docs/DECISIONS.md` (D-387), `docs/claude/PLAN_WELLNEURO.md` (ligne t45),
  `changelog.d/2026-10-27-t45-profil-acides-gras.md`, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (compositions préparées, candidats NABM, compositions) :
  34 verts. T1 complet, T2 et revue : résultat dans la PR.
- Lectures par conteneur, en lecture seule : V105 (987 actes, aucun ne nomme
  un des vingt acides) ; panels (le profil dans quatre panels, sans
  composition) ; constat « aucun acte » du profil signé sur V105.

## Problèmes ouverts

- Le numéro D-387 se revérifie juste avant le merge : #1727 (autre
  session) le revendique aussi ; la PR qui merge la seconde renumérote.
- Après le déploiement, au praticien, dans cet ordre : les vingt constats
  « aucun acte », vérifiés acide par acide ; la composition ; puis le
  contrôle de « hors nomenclature » au courrier et au document patient.
- Constat par conteneur au prochain import d'un profil d'acides gras.

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge (aucune migration ;
`web/src/lib/biology-library` n'est pas un chemin déclencheur de release-db),
constat du déploiement, puis l'ordre des signatures au responsable.

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge ; jamais d'image antérieure à
  257807e3 ; les PR et release-db des autres sessions ne sont pas à nous ;
  hors périmètre : m38, WN_CONSTAT_BESOIN, signature NABM de TP/INR.
- Aucune identité du compte rendu présenté (nom, adresse, dossier, dates)
  dans un fichier durable.
