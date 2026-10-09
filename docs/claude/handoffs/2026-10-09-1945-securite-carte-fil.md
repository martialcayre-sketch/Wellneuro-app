# Handoff — 2026-10-09 — D-275 §3 : carte « Signal de sécurité à évaluer » au Fil (LOT-1 sur 3)

## Branche et état Git

- Copie principale, branche `fix/securite-carte-fil` partie d'`origin/main`
  (16998485, #1370 mergée). Commit du lot : eb93f820. PR ouverte avec ce handoff.
- `docs/bp26-relecture-mdcg` (ed5594b3, local, à ne pas pousser tel quel) est intacte.

## Objectif

D-275 §2-§3 en trois PR (précision de mise en œuvre ajoutée à D-275) :
LOT-1 carte du Fil (ce lot) → LOT-2 migration du trigger → LOT-3 producteur
questionnaires + lettre. Plan détaillé : `~/.claude/plans/jiggly-petting-dawn.md`
(hors dépôt) ; l'essentiel est recopié dans D-275.

## Décisions prises

- Trois PR au lieu d'une : le trigger SQL d'`adressages_signal_alerte` n'accepte que
  `^safety:anamnese:[0-9a-f]{16}$`. La levée étant allumée en production
  (`WN_LEVEE_ADRESSAGE=true`), un constat de questionnaire sans lettre possible
  bloquerait un dossier sans issue.
- Arbitrages du responsable pour le §2 (sur scénario) : **A1**, toute passation
  non invalidée compte, et seule une lettre lève (l'invalidation de la passation est
  une seconde sortie, assumée) ; **A2**, une question sans réponse lisible donne une
  limitation sans blocage ; une valeur hors options produit un constat.
- Carte : dossiers actifs à suivi ouvert seulement (un dossier clos ne peut plus
  recevoir de lettre) ; lien `?onglet=cockpit&phase=decision` ; carte non écartable
  et non acquittable par lecture, sans plafond ; résumé compté par dossier ; un échec
  se dit (`signauxSecuriteIndisponibles`).

## Fichiers modifiés

- `lib/fil/signauxSecurite.ts` (nouveau), `lib/fil/cartes.ts`,
  `app/api/praticien/fil/route.ts`, `components/fil/FilDuJour.tsx`.
- `clinical-engine/safetyFindings.ts` (`constatsSecuriteOuverts`),
  `adressagesSignalAlertePrisma.ts` (filtre extrait `couverturesRetenues`, lecture
  groupée), `effetsIndesirablesPrisma.ts` (lecture groupée par filtre de dossier),
  `consultation/consultationPorteuse.ts` (`whereConsultationsPorteuses`).
- Tests : `route.test.ts`, `cartes.test.ts`, `FilDuJour.test.tsx`,
  `lectureCartes.test.ts`, `refus.test.ts`, `chaineC1.test.ts` (équivalence
  Fil = chaîne), garde `adressagesSignalAlerte.guard.test.ts` (lecteur chaîne n: 2).
- `docs/DECISIONS.md` (D-275 statut + précision), `changelog.d/2026-10-09-carte-fil-signal-securite.md`,
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée).

## Validations exécutées

- T1 complet vert ; T2 vert (702 fichiers Vitest / 12 079 cas, 243 E2E).
- Revue `wn-reviewer` : GO, aucun P0/P1. P2-1 (effets indésirables hors porteuse)
  et P2-3 (résumé) corrigés, tests demandés ajoutés ; P2-2 (égalité de tri des
  porteuses) préexistant, laissé.
- Production (conteneur, lecture seule, agrégats) : une seule passation sur les quatre
  questionnaires, réponse « non ».

## Problèmes ouverts

- Branche EI du Fil non testée de bout en bout : sa règle n'est pas signée (`SAF-EI-01`).
- Pas de vérification manuelle du Fil en local (`npm run dev`) : couverte seulement par les tests.
- `.wn/state.json` pointe encore sur bio-ingest LOT-04 : le lot est hors campagne, et
  T1 n'a rien réclamé.

## Prochaine action exacte

CI de la PR (`wn-attendre-ci`), passe Codex par le responsable, merge, déploiement
constaté. Puis LOT-2 en session neuve : migration seule qui élargit la regex du
trigger à `^safety:(anamnese|questionnaire):[0-9a-f]{16}$`, contrats SQL, release-db
approuvée par l'humain, constat par conteneur (`pg_proc`).

## Interdits encore actifs

- Pas de producteur questionnaire signé avant que la migration (LOT-2) soit appliquée
  et constatée.
- Table `SAF-QUEST-01` signée seulement sur surface relue et déclaration du responsable ([[D-195]]).
- Aucun seuil inventé : la valeur 0 (« non ») de chaque instrument est la seule borne.
- Pas de donnée patient réelle ni d'identifiant de dossier dans le dépôt.
- Pas d'auto-merge ; un merge à la fois, déploiement constaté.
