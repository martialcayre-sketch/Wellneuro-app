---
id: "2026-07-22-g-trust-04-durcissement-et-reliquats"
titre: "G-TRUST-04 — durcissement et reliquats"
statut: "livrée"
créée_le: "2026-07-22"
mise_à_jour: "2026-07-23"
lot_courant: "LOT-00"
---

# G-TRUST-04 — durcissement et reliquats

> Campagne mono-lot (précédent : SP-SPI), ouverte le 2026-07-22 sur décision
> utilisateur : « ouvrons tout sauf les invitations patient — 1 plan 1 lot
> qu'on en finisse ». Exécution en PR successives directes vers `main`
> (exception Vague 2, gardien = CI `verify`), merges par Copilot.

## Objectif

Avancer les exigences de G-TRUST-04 ouvrables sans changer d'hébergeur, et
purger les reliquats du backlog d'audit — en un seul lot :

1. **Piste d'audit des accès légitimes** (exigence 5) : table
   `journal_acces_dossiers` — « qui a lu quel dossier, quand » persisté en
   base, versant praticien.
2. **Exercice sur table** de `docs/PROCEDURE_VIOLATION_DONNEES.md` (reste de
   l'exigence 6), scénario fictif.
3. **Next 14.2.5 → 14.2.35** (correctifs de sécurité de l'intervalle).
4. **Code mort prouvé** : suppression des 3 composants `ui/Score*` jamais
   référencés.
5. **`@ts-nocheck` du catalogue clinique** : levée par vagues mesurées,
   types seuls, zéro changement runtime.
6. **Reliquats documentaires** : requalification « onboarding cassé »,
   arbitrage Previews Vercel consigné, checklist G-TRUST-04 mise à jour.

## Résultat observable

- Une lecture `execute_sql` répond « qui a lu le dossier X, quand » pour tout
  accès praticien à dossier nommé postérieur au déploiement.
- La procédure de violation a été exercée une fois, fiche remplie sur scénario
  fictif, constats consignés.
- `next` en 14.2.35, catalogue clinique typé (ou reliquat borné documenté),
  zéro composant orphelin dans `ui/`.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel — exemples limités à Sophie Nicola, Jennifer Martin et
  Michel Dogné.
- Migration sous gate : PR de migration seule, revue adversariale
  `wn-reviewer` avant merge, vérification `execute_sql` après.
- **Zéro changement de logique clinique ni de seuil** — la certification des
  63 questionnaires et les tests scoring sont les juges du chantier
  `@ts-nocheck`.
- Changements minimaux, une PR = un objet.

## Décisions prises (2026-07-22)

| # | Décision | Motif |
|---|---|---|
| GD-1 | **Granularité V1 du journal : lectures praticien de dossier nommé (GET) seules.** Listes, agrégats et écritures exclus ; versant patient exclu | « Qui a lu **quel** dossier » — les listes montrent le portefeuille, pas un dossier ; les écritures laissent déjà une trace datée et attribuée ; les entrées patient sont déjà tracées (`portail_connexions_google`, `portail_magic_links.consomme_le`) |
| GD-2 | **Rétention : 12 mois glissants**, purge opportuniste à l'écriture, plus effacement avec le dossier | Aligné sur le précédent G5 arbitré par le responsable le 2026-07-22 ; un journal de comportement praticien sans borne deviendrait lui-même un passif. Constante applicative, révisable sans migration |
| GD-3 | **Aucun écran de consultation en V1** | L'exigence demande la piste, pas l'IHM ; une route de lecture du journal serait une surface de plus. Requête type consignée dans le lot |
| GD-4 | **Écriture awaitée, fail-open** — jamais fire-and-forget, jamais bloquante | Patron `tracer()` de G5 : un handler serverless est tué à la réponse ; une trace perdue se journalise (`PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC`), une lecture légitime n'échoue jamais pour cause d'audit |
| GD-5 | **`@ts-nocheck` : tout, par vagues mesurées, critère d'arrêt** sur `questions.ts` si le geste devient disproportionné | Types seuls ; mesurer avant d'agir ; un reliquat borné et daté vaut mieux qu'un diff de 2 300 lignes sur du clinique certifié |
| GD-6 | **Previews Vercel : conservées**, avec règle écrite « jamais de drapeau `WN_*` posé sur l'environnement Preview » | La décision #258 (vérification visuelle des PR) date du jour même ; le vecteur réel de l'incident du 2026-07-21 était le drapeau posé sur Preview, pas la Preview. Arbitrage par défaut, révocable par le responsable |

## Questions ouvertes

- Reconduction ou levée de la dérogation G-TRUST-04 au 2026-10-21 (humain).
- Confirmation juridique de la procédure de violation (dette D-TRUST-02,
  humain).

## Dépendances

- `CHECKLIST_ACTIVATION_G_TRUST_04.md` (campagne TRUST) — source à jour du
  gate, mise à jour en clôture.
- Patrons répliqués : migration G5 (`20260722100000_idp2_g5_trace_connexions_google`),
  `tracer()` de `portail/google/retour/route.ts`, garde structurelle
  d'`effacement.test.ts`.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Durcissement G-TRUST-04 + reliquats (6 chantiers, ~11 PR) | livré (#272, #273, #275, #276, #278, #281, PR de clôture du 2026-07-23) | — |

## Done de campagne

- [x] Journal d'accès livré (22 routes, #278 + PR de clôture) ; table vérifiée
      en production après #273/#278 (`execute_sql`, 0 ligne — attendu, aucun
      dossier ouvert depuis le déploiement). La preuve fonctionnelle au
      premier dossier ouvert reste consignée dans `next_action`.
- [x] Exercice sur table exécuté et consigné (#281, fiche 2026-EX1).
- [x] Next 14.2.35 (#275), code mort supprimé (#276), `@ts-nocheck` levé
      17/17 (PR de clôture, juge de certification transpilé).
- [x] Checklist G-TRUST-04 exigences 5/6 mises à jour avec preuves (PR de
      clôture).
- [x] Lot `livré` **et** campagne `livrée` dans le même commit de clôture
      (2026-07-23).
