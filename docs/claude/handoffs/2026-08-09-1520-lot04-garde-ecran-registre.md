# Handoff — 2026-08-09 — Le libellé d'écran relié au barreau du registre (LOT-04)

## Branche et état Git

`campaign/2026-08-08-dettes-ouvertes-5-0/LOT-04`, branchée sur `origin/main`
fraîchement fetché (`f047792b`). PR non ouverte.

## Objectif

Fermer les deux dettes que `D-036` laisse ouvertes : le badge « Scoring
vérifié » empruntait son nom au barreau `scoring_verifie` sans qu'aucun code ne
relie les deux, et le seed n'écrivait pas la clé `certification` que tous les
moteurs produisent. Et surtout **produire une mesure** : la liste des
instruments dont l'écran taît une vérification que le registre déclare — la
matière de `D-037`.

## Décisions prises

1. **Le garde porte deux sorties de natures différentes.** L'assertion bloquante
   (un `certifie` d'écran sous un barreau qui n'atteint pas `scoring_verifie`)
   est **vraie aujourd'hui** : 0 cas, mesuré avant d'écrire. Sa sortie serait
   vide, et le lot ne produirait pas la liste attendue. S'y ajoute donc un
   **inventaire non bloquant** du sens inverse (22 instruments), imprimé avec son
   compte.
2. **Pas de cliquet.** Figer les 22 identifiants du jour dans le garde aurait
   inscrit en dur la liste que tout ce fichier refuse par ailleurs. L'inventaire
   constate ; `D-037` décide.
3. **Pas de 16e bloc au seed** pour exercer la branche `ambigu` : les six
   libellés restent couverts unitairement par `certificationLibelles.guard.test.ts`.

## Fichiers modifiés

- `scripts/lib/verifier_registre_instruments.js` — paramètre
  `certificationsCatalogue`, contrôle bloquant, inventaire, deux gardes
  anti-mutisme.
- `scripts/lib/verifier_registre_instruments.test.mjs` — 8 cas (73 verts).
- `scripts/check_questionnaire_certification.js` — construit la carte depuis le
  catalogue **évalué**, imprime l'inventaire.
- `web/prisma/seed.ts` — 13 clés `certification` sur 15 blocs.
- `web/e2e/fiche-detail-reponses.spec.ts` — nouveau, 3 badges assérés.
- `docs/claude/campagnes/.../lots/LOT-04-garde-code-registre.md` — `## Résultats`.
- `changelog.d/2026-08-09-garde-ecran-registre-certification.md`.

## Ce qui a été appris, et qui n'était pas dans le cadrage

- **`Q_SOM_07` n'affiche pas « Historique » mais « Non interprétable ».** Sa
  passation seedée est datée du 2026-06-15, antérieure à la reconstruction du
  MFI-20 ; la branche `nonInterpretable` de la fiche passe AVANT celle du badge
  de certification. Le fichier de lot annonçait un seul bloc nu : il y en a deux,
  dans deux états différents.
- **Une branche de garde peut ne rien porter.** Le contrôle sortait les états
  terminaux par une branche `ETATS_TERMINAUX` nommée *et* par un
  `barreau !== -1` ; la mutation a montré que la branche nommée ne tuait aucun
  cas. Retirée, commentaire réécrit sur la pièce qui protège réellement.
- **Le renommage silencieux est le vrai danger** : renommer la clé
  `certification` du catalogue ne casse rien, rend le contrôle bloquant vrai pour
  toujours et fait passer l'inventaire de 22 à 60 sans un bruit. C'est ce que
  garde le contrôle « aucun statut ».

## Problèmes ouverts

**Un test E2E rouge, qui n'appartient pas à ce lot.** Sur le projet iPhone 13
(WebKit, macOS), le **67e** test de la passe bloque 120 s sur un `page.goto`.
Bissection sur base et build figés : suite sans les deux tests de ce lot →
66 tests, 28,9 s, tout vert ; avec → le 67e bloque ; **deux tests témoins
triviaux** posés à leur place → même échec, même rang ; quatre témoins → encore
le 67e, mais un autre test ; la même suite de 66 jouée **deux fois** (132 tests,
56,4 s) → tout vert. Ni le seed ni le contenu du spec ne sont en cause : la suite
vivait **exactement à 66 tests**, au bord d'une fragilité que le premier lot
ajoutant un test devait rencontrer. Cause non trouvée — ni compte de contextes,
ni temps écoulé. **Le verdict appartient au CI (Linux).**

## Prochaine action exacte

`bash scripts/check_no_secrets.sh --staged`, commit, revue `wn-reviewer` (classe
scoring/clinique), puis PR — et **lire le résultat du job `verify` avant toute
annonce** : si le CI rouge sur le même symptôme, la fragilité de la suite devient
un lot à part entière, à ouvrir avant celui-ci.

## Interdits encore actifs

- Ne pas écrire `D-037` : la décision se prend **sur** la liste produite ici.
- Ne pas toucher un `certification.status` du catalogue pour réduire l'écart —
  c'est une affirmation clinique.
- Ne pas figer d'identifiants dans le garde ; ne pas creuser d'exception.
