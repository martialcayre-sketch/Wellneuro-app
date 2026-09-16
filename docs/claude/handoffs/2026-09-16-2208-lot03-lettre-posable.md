# Handoff — 2026-09-16 — LOT-03 : la lettre posable, et l'ancrage à deux tables

Quatrième lot de la campagne « ouverture du rayon Correspondance ». Deux choses,
dont la seconde est le **verrou technique de LOT-04** : le courrier biologie
devient un papier signé, et `verdictAncrage` cesse de ne connaître qu'une table.
Décision [[D-215]].

## Branche et état Git

`correspondance-lot03-lettre-posable`, branchée sur `origin/main` (`9c7317d0`,
tête au moment du branchement). Aucune migration, aucun `schema.prisma`, aucun
drapeau. Le worktree porte un symlink `web/node_modules` non suivi — à ne jamais
emporter dans un `git add` large.

## Objectif, et pourquoi il existe

`courrier.ts` calculait `html` ; la route ne renvoyait que `{ texte, ancrage… }`
et **aucun consommateur ne lisait ce rendu**. L'écran offrait donc une zone de
texte à recopier pour une lettre faite pour être imprimée et remise. Et
`verdictAncrage` comparait en dur au SHA des indications biologiques : la lettre
d'adressage de LOT-04, ancrée sur les signaux de sécurité, aurait lu « ancrage
périmé » sur **chacune** de ses lignes, sans qu'aucune règle n'ait bougé.

## Décisions prises

Deux arbitrages rendus par le responsable pendant le lot :

| Question | Tranché | Écarté, et pourquoi |
|---|---|---|
| « échange confraternel » sur un papier signé par un pharmacien | « échange **interprofessionnel** » | assumer l'écart par écrit : la signature lève l'ambiguïté, mais le mot ne servait plus à rien une fois la qualité écrite |
| où va le bloc de signature | dans le **texte généré** | le seul HTML : la lettre transcrite à la main partirait sans signataire, et la signature échapperait à la garde de vocabulaire |

Trois choix techniques, écrits dans [[D-215]] : la signature **quitte** le
registre des gabarits pour un module partagé (les quatre empreintes inchangées du
hash-lock prouvent que les quatre corps ne bougent pas) ; le verdict d'ancrage se
rend par une table `ancrageVersion → SHA attendu`, dont la **valeur** reste le SHA
vivant — un contenu qui bouge périme toujours ([[D-079]]) ; une version inconnue
rend `reference_inconnue`, jamais `perimee` ([[DC-24]]).

Le libellé du fil suit l'origine : une ligne ancrée a été **générée** au moment où
le papier est sorti, avant toute remise — « Envoi consigné » y affirmait un geste
que personne n'avait fait.

## Fichiers modifiés

- `lib/correspondance/signature.ts` — **neuf**, le bloc de signature, une fois.
- `lib/correspondance/registreGabarits.ts` — quatre copies remplacées par l'import.
- `lib/biology-library/courrier.ts` et son banc — signature, `patientNom`.
- `lib/documents/rendu.ts` et son banc — le mot du cadre médecin.
- `api/…/biologie/proposition/courrier/route.ts` et son banc — `html` servi, nom
  du dossier passé, HTML jamais consigné.
- `api/…/correspondance-medecin/route.ts` et son banc — la table d'ancrage.
- `lib/praticien/correspondanceMedecin.ts` et son banc — `libelleLigne`,
  `estAncree`, `VERDICTS_ANCRES` (dont le contrat de la route compose son type).
- `components/patient-cockpit/PropositionBilanPanel.tsx` et son banc — l'aperçu
  imprimable, la zone de texte gardée à côté.
- `components/patient-cockpit/ClinicalRuntimeSection.tsx` — `html` câblé.
- `components/correspondance/CorrespondanceMedecinPanel.tsx` et son banc — le
  libellé qui suit l'origine.

## Validations exécutées

T1 vert. T2 joué. **Deux mutations, deux mutants tués** : remplacer
`estAncree(verdict)` par `verdict !== 'sans_ancrage'` fait rougir le banc du
verdict absent, sur cette assertion et sur elle seule ; vider la table d'ancrage
fait rougir quatre bancs de la route, dont celui qui épingle l'estampille du
générateur sur la métadonnée de la table.

Un banc existant affirmait l'ancien verdict (« une version différente périme la
lettre ») : il est **réécrit avec sa raison**, pas supprimé — il tue toujours la
mutation « comparer le seul SHA », et dit désormais ce que le lot change.

## Problèmes ouverts

Le banc du panneau a révélé un défaut de défaut pendant l'écriture : lire
l'origine par `ancrage !== 'sans_ancrage'` faisait d'une charge **sans verdict**
une ligne « préparée ». Corrigé — l'inconnu ne vaut pas une origine — mais la
leçon vaut pour LOT-04 : un contrat qui gagne une valeur doit dire ce que vaut son
absence.

Réserves de campagne inchangées : `supersedes_*`, la journalisation de
`/recentes`, l'énoncé de la pastille sans banc, la nav mobile sans garde.

## Prochaine action

`LOT-04` — la lettre d'adressage, cœur de la campagne. Son ancrage
(`SAFETY_SIGNALS_SHA256`, `'safety-signals-nnpp2-v1'`) **doit ajouter sa ligne**
dans `SHA_ATTENDU_PAR_VERSION` : sans elle, ses lettres liront
`reference_inconnue` — silencieux, mais faux.

## Interdits encore actifs

Inchangés : aucun canal sortant réel, aucune pièce jointe ([[D-122]]), aucun lien
signé médecin, aucune messagerie de santé. Et **la lettre consignée trace
l'adressage, elle ne le vaut pas** : lever l'abstention reste un arbitrage
clinique distinct, hors de ce lot comme du suivant.

## Note de validation

T2 joué deux fois — la seconde après l'ajout des deux assertions E2E. Le seul
rouge est la **signature D-049** (`portail-dossier-deux-voix.spec.ts:128`,
iPhone 13 / WebKit, 2 min sans requête émise), déjà consignée sur `main` et sans
rapport avec ce diff : le portail patient n'est pas touché ici.

## Revue Copilot — verdict de chaque constat

Lue AVANT le merge, comme la règle posée par `D-214` l'impose. Deux constats,
**deux retenus** :

| Constat | Verdict | Traité |
|---|---|---|
| Le libellé d'origine n'est câblé que sur la fiche : l'accueil rend encore `libelleSens`, et `/recentes` n'expose pas le verdict — la même ligne se lit « Envoi consigné » ici et « Courrier préparé » là | **retenu** | `/recentes` sert le verdict, l'accueil lit `libelleLigne`, le calcul passe dans `lib/praticien/ancrageCorrespondance` — deux bancs neufs par surface |
| Le câblage du bouton d'impression n'est éprouvé par rien | **retenu** | banc qui distingue `contentWindow.print()` de `window.print()` — mutant tué : imprimer la page du cockpit fait rougir |

Le premier était **le défaut que `D-209` avait fermé, rouvert par l'autre bout** :
un libellé d'origine posé sur une seule des deux surfaces recrée exactement la
contradiction que la lecture unique du sens avait supprimée. Il n'a pas été vu
en écrivant le lot, ni par le CI.
