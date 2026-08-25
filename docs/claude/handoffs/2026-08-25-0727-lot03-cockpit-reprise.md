# Handoff — 2026-08-25 — Alliance 6.0-B, LOT-03 : reprendre, amender, écarter

## Branche et état Git

`feat/lot03-cockpit-reprise-alliance-6b`, worktree `alliance-6b-lot02`, depuis
`origin/main` 1f316c8d. Aucune migration, aucun `schema.prisma` touché.

La campagne était repassée **inactive** après la clôture de
`doctrine-executable` (`D-109`) : `.wn/state.json` et `CAMPAGNE.md` sont remis
en marche dans ce lot, l'alliance redevient la campagne active.

## Objectif

Donner au praticien la surface de disposition des propositions, et rendre
observable ce qu'il a repris plutôt que rédigé.

## Décisions prises

**Le déclencheur d'assemblage, arbitré après mesure.** Trois faits vérifiés
dans le code, et ils renversent ce que la fiche laissait supposer :
`GET /cockpit` ne rend **jamais** `ready` ; le `POST` qui produit la carte de
décision **n'écrit rien** ; la carte n'est persistée nulle part
(`protocol_drafts` n'en garde que des empreintes d'ancrage). Elle n'existe donc
que dans le navigateur, entre la confirmation d'épisode et le rechargement
suivant. Une carte du workflow a été établie pour trancher.

Conséquence : l'option « le panneau va chercher les candidats lui-même » était
**impossible** — il lui aurait fallu POSTer une confirmation, or confirmer est
un acte du praticien. Retenu : la section clinique appelle `assembler` sur sa
réponse `ready`, le poste de pilotage porte un **compteur** d'assemblages (pas
un booléen : un praticien peut confirmer deux fois), le panneau relit.

**L'échec de l'assemblage ne fait jamais échouer la confirmation.** L'épisode
est confirmé, la carte est affichée : c'est le résultat attendu. Le drapeau
étant éteint, le refus le plus fréquent sera un `503` parfaitement normal.

**`enoncePatient` n'est jamais transmis.** L'écran désigne un fragment par son
indice, le serveur recopie. Un fragment non-anamnèse est refusé (`422`).

**La reprise est transactionnelle** : objectif + geste, ou rien.

## Fichiers modifiés

- `objectifs/route.ts` : `sourcePropositionId`, `verifierReprise`, transaction
- `objectifNegocie.ts` : le champ + `CibleObjectif.origine`
  (`revision` ne rejuge pas la longueur, `reprise` si — le texte entre pour la
  première fois dans la table)
- `objectifNegocie.guard.test.ts` : G1 élargie, **vue rouge puis verte**
- `cockpit/route.ts` : `perimetreSigne` + `canalPlainte` à côté de la carte
- `ClinicalRuntimeSection.tsx` : le déclencheur · `FichePatientPanel.tsx` : le
  compteur · `ObjectifNegociePanel.tsx` : la surface
- `assemblageProposition.ts` (neuf) : hachage + assembleur, sortis du domaine
- `propositionObjectif.ts` : **pur, n'importe rien**

## Validations exécutées

- **T1 vert.** **T2 : 5 854 Vitest verts**, E2E 155 passés / 1 échec —
  `portail-parcours` iPhone 13, que l'outillage classe lui-même comme signature
  WebKit macOS jamais observée en CI, et que le LOT-02 avait déjà démontré
  étranger au lot sur ce même spec (arbre témoin sans le lot).
- Bancs touchés après revue : route objectifs 44 cas, panneau 26, section
  clinique 22, gardes G1-G6 15.

**Deux défauts trouvés par les paliers, invisibles de `tsc` :**

1. La garde de fraîcheur de la matrice de consommation a refusé un import de
   `CANAL_PLAINTE` dans un composant `'use client'` — il aurait embarqué les
   **667 lignes de la table signée** dans le bundle du navigateur pour une
   seule chaîne. La dérive de la matrice a disparu avec la cause.
2. **T2 a fait échouer la construction de production** : le panneau tirait
   `node:crypto` en ne voulant du moteur qu'une borne de longueur. Défaut
   hérité du LOT-02. Le domaine est désormais pur, et **ce zéro d'import est un
   invariant asserté** (G7-1) : il rougira avant le build.

**Deux ancres d'anti-vacuité se sont périmées au découpage et l'ont dit
bruyamment** — le risque exact que la revue du LOT-02 avait nommé.

**Revue `wn-reviewer` : no-go, deux bloquants — corrigés.**

- **B1** — `WN_OBJECTIF_PROPOSE` ne gardait pas la reprise, c'est-à-dire la
  seule écriture nouvelle du lot. La garde porte maintenant sur le chemin
  `sourcePropositionId` seul ; l'objectif rédigé à la main reste servi.
- **B2** — la leçon du LOT-02 n'avait pas été propagée à `G2`, que j'éditais :
  la liste se disait bilingue et ne l'était pas. Et
  `ClinicalRuntimeSection.tsx`, seul fichier qui lise `priorityCandidates` pour
  les renvoyer au moteur, n'était sous aucune garde de nommage.
- **M3 à M6, F7, F9, F10, F12** corrigés dans la même passe. Les deux plus
  graves : reprendre puis reformuler empilait deux modes contradictoires ; et
  les résumés affichaient le premier fragment — toujours la règle signée — nu,
  sans provenance, comme « ce que le praticien a repris ».
- **Le déclencheur n'avait aucun banc** : quatre cas posés, dont « un échec
  d'assemblage ne fait pas échouer la confirmation ».

## Problèmes ouverts

- **L'assemblage ne se déclenche qu'à la confirmation d'un épisode.** Ouvrir
  une fiche sans confirmer n'assemble rien : le panneau sert la dernière
  assemblée enregistrée, et le dit. C'est la conséquence directe du fait que la
  carte n'existe pas ailleurs, pas un manque à combler côté écran.
- Les deux dettes du LOT-02 restent : une assemblée devenue **vide** ne retire
  pas la précédente (migration) ; lire-puis-écrire n'est pas étanche à la course
  côté assemblage.
- Le SHA du périmètre n'est toujours pas **confrontable** depuis la route des
  propositions (G7). Sa forme est vérifiée, son authenticité non.
- L'amendement patient (« le dire autrement ») reste sans écrivain : LOT-04.
- **Le contrôle « proposition déjà disposée » est un lire-puis-écrire hors
  transaction** (relevé en revue, nommé dans le code) : deux reprises
  concurrentes créeraient deux têtes portant le même énoncé, donc un portail
  qui refuse toute ratification jusqu'à arbitrage. Fermer demanderait un index
  unique — une migration.
- Aucun **déplacement de focus** quand la sélection d'un fragment bascule le
  formulaire situé plus bas, ni quand l'écart révèle son champ. Relevé en
  revue, non traité.
- Le lot n'a **aucun E2E** du parcours reprendre / écarter, alors que le critère
  de done parle d'un parcours « complet ».

## Prochaine action exacte

PR. Ensuite LOT-04 — portail : la contre-proposition
du patient, qui écrira enfin `amendements_objectif`.

## Interdits encore actifs

- `enoncePatient` jamais pré-rempli autrement que par citation verbatim
  sourcée ; le serveur recopie, l'écran désigne.
- Aucun compteur, taux ou agrégat de propositions à l'écran.
- Le domaine `propositionObjectif.ts` n'importe **rien** — ni moteur clinique,
  ni dépendance réservée au serveur.
- Drapeau `WN_OBJECTIF_PROPOSE` éteint : l'allumer est un geste du responsable.
