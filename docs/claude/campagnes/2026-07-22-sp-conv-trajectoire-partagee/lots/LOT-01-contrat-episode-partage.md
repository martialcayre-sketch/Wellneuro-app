---
id: "LOT-01"
titre: "Contrat d'épisode partagé — une trajectoire, deux lectures"
statut: "livré — 2026-07-23, PR de lot : module lib/trajectoire-partagee (contrat pur, 22 tests + garde D7), T1/T2 verts"
dépend_de: "LOT-00"
---

# LOT-01 — Contrat d'épisode partagé — une trajectoire, deux lectures

## But

Un module de dérivation **pur et sans écriture** qui répond, pour un
patient donné, à « où en est l'épisode, qu'est-ce qui vient ensuite, et
qu'a-t-on le droit d'en montrer au patient ? » — consommé ensuite par le
cockpit (LOT-02) et le parcours patient (LOT-04). C'est la réponse au
défaut central de l'audit : praticien et patient ne décrivent pas le même
moment du même parcours.

## Résultat observable

- Une fonction (nom indicatif `deriverEtatEpisode`) retourne un objet
  contenant : identifiant de cycle (persisté G2), jalon courant et dernier
  jalon confirmé, phase clinique due (même règle que D5), prochaine action,
  date de dernière évolution, **formulation praticien**, **formulation
  patient** (vocabulaire D7), **visibilité patient autorisée** (booléen par
  champ).
- Un test de garde échoue si la formulation patient contient un score, un
  pourcentage, un délai promis ou le vocabulaire proscrit (réutilise le
  patron `lib/gamification-patient.guard.test.ts`).
- Aucune écriture, aucune migration, aucun nouvel appel réseau : dérivation
  depuis des données déjà chargées par les routes existantes.

## Périmètre

- Nouveau module `web/src/lib/trajectoire-partagee/` (nom à confirmer au
  premier commit) : types du contrat + dérivation + formulations.
- Entrées consommées : `construireTrajectoire`
  (`web/src/lib/protocol/trajectoire.ts` — cycles `cycleId`/`versionScore`
  persistés), `Consultation.statut` (déjà exposé par
  `api/portail/session/route.ts`), `protocoleDiffuse`/`finDeCycle`
  (`api/portail/protocole`), `BookletEnvoi` (Prisma), état runtime du
  cockpit (`api/praticien/cockpit`).
- Extension des `select` de routes existantes si un champ déjà persisté
  manque au payload — sans nouvelle route en V1.

## Hors périmètre

Tout rendu UI (LOT-02/LOT-04) ; toute persistance nouvelle — si un champ
manquant non dérivable apparaît, **arrêt et lot migration séparé sous
gate** ; le moteur `lib/equilibre` (jamais réimplémenté) ; la comparaison
inter-cycles hors version identique (garde A8-3).

## Fichiers probables

- `web/src/lib/trajectoire-partagee/contrat.ts` + `contrat.test.ts` (créés)
- `web/src/lib/trajectoire-partagee/formulations.ts` + garde de vocabulaire (créés)
- `web/src/lib/protocol/trajectoire.ts` (lecture seule, import)
- `web/src/app/api/praticien/cockpit/route.ts`,
  `web/src/app/api/portail/session/route.ts` (extension de payload si
  nécessaire, additive)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.
- Jamais de score, discordance ou donnée réservée praticien dans la
  formulation patient.

## Étapes

- [ ] Vérifier les hypothèses (signaux réellement présents dans les
      payloads listés).
- [ ] Écrire les types du contrat et la dérivation, tests d'abord.
- [ ] Brancher la garde de vocabulaire patient.
- [ ] T1 puis T2 ; relire le diff.

## Tests

Vitest : dérivation sur les trois patients seedés (cycle unique, multi-
cycles, aucun épisode) ; garde de vocabulaire ; statut « indéterminé »
quand les données ne permettent pas de conclure (jamais deviné).

## Critères de done

Contrat consommable par LOT-02 et LOT-04 sans nouvel appel réseau ; gardes
vertes ; zéro migration.

## Résultats

À compléter à la clôture.
