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
  `certificationsCatalogue`, contrôle bloquant, inventaire, trois gardes
  anti-mutisme (absente, sans statut, hors vocabulaire).
- `scripts/lib/verifier_registre_instruments.test.mjs` — 10 cas (75 verts).
- `scripts/check_questionnaire_certification.js` — construit la carte depuis le
  catalogue **évalué**, imprime l'inventaire groupé par effet d'écran.
- `web/prisma/seedReponses.ts` — **nouveau**, module de données pur.
- `web/prisma/seedCertification.guard.test.ts` — **nouveau**, l'égalité seed ↔
  catalogue dans les deux sens.
- `web/prisma/seed.ts` — 13 clés `certification` sur 15 blocs, données déplacées.
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

## Ce que la revue adversariale a repris

`wn-reviewer` : **GO sous conditions**. Aucun des deux constats majeurs ne
portait sur la logique du garde — les deux portaient sur ce que le lot **dit** :

1. La sortie livrable attribuait à la fiche patient le libellé de la
   **bibliothèque** (« Statut inconnu » vs « Historique ») et rangeait les
   4 `ambigu` sous le mot « muet », alors que l'écran y **affirme un doute**.
   Sur la sortie même qui doit fonder `D-037`. Corrigé, champ renommé
   `divergencesEcranRegistre`, inventaire regroupé par effet d'écran.
2. Le seed est **inerte sur une base déjà seedée** (`update: {}`) : les 13 clés
   ne s'écrivent que sur une base neuve, et l'E2E est rouge sur la base de dev
   partagée avec un symptôme qui ne dit rien du code. Écrit aux deux endroits.

Et le trou le plus sérieux, moyen mais structurel : **rien ne tenait l'égalité
seed ↔ catalogue**. `seedCertification.guard.test.ts` la tient désormais dans les
deux sens ; les données de réponses ont dû sortir de `seed.ts` (qui s'exécute au
chargement) vers `seedReponses.ts`, un module pur.

## Problèmes ouverts

**Un test E2E rouge sur Mac, qui n'appartient pas à ce lot — et que le CI ne
reproduit pas.** Sur le projet iPhone 13 (WebKit, macOS), le **67e** test de la
passe bloque 120 s sur un `page.goto`. Bissection sur base et build figés : suite
sans les deux tests de ce lot → 66 tests, 28,9 s, tout vert ; avec → le 67e
bloque ; **deux tests témoins triviaux** posés à leur place → même échec, même
rang ; quatre témoins → encore le 67e, mais un autre test ; la même suite de 66
jouée **deux fois** (132 tests, 56,4 s) → tout vert. Ni le seed ni le contenu du
spec ne sont en cause : la suite vivait **exactement à 66 tests**, au bord d'une
fragilité que le premier lot ajoutant un test devait rencontrer. Cause non
trouvée — ni compte de contextes, ni temps écoulé. **Le job `verify` de la
PR #630 est vert** : la fragilité est locale à macOS. Elle mordra la prochaine
session qui jouera T3 sur Mac.

**Une non-couverture nommée, à arbitrer** : un instrument à l'état terminal
(`suspendu`, `remplace`) dont le catalogue déclare encore `certifie` échappe aux
deux sorties du garde — or ses passations passées continueraient d'afficher
« Scoring vérifié », le badge relisant `scores_json`. Zéro cas aujourd'hui. En
faire un contrôle bloquant suppose de trancher si une suspension emporte la
certification du scoring ; une suspension peut être motivée hors scoring.

## Prochaine action exacte

Lire le job `verify` de la PR #630 sur le second commit (les correctifs de revue
n'ont pas encore été soumis au CI au moment où ces lignes sont écrites), puis
merge. `D-037` s'arbitre ensuite **sur la liste**, en séparant les 18 silences
des 4 affirmations de doute.

## Interdits encore actifs

- Ne pas écrire `D-037` : la décision se prend **sur** la liste produite ici.
- Ne pas toucher un `certification.status` du catalogue pour réduire l'écart —
  c'est une affirmation clinique.
- Ne pas figer d'identifiants dans le garde ; ne pas creuser d'exception.
