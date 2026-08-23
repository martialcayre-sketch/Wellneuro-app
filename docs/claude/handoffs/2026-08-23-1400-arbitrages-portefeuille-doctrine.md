# 2026-08-23 14:00 — Trois arbitrages de portefeuille (D-096)

## Ce qui a changé

Les trois questions que le LOT-01 avait laissées ouvertes sont tranchées et
écrites. Docs seules, aucun code.

- **`DC-09` → LOT-09** (fiche neuve). Les dix autres orphelines restent des
  dettes nommées, écrites au LOT-08.
- **LOT-02 → Curation signée.** Le périmètre part avec ses contraintes, comme
  source de cadrage :
  `2026-08-18-curation-signee/sources/2026-08-23-transfert-migration-axes-claim.md`.
  La fiche LOT-02 reste en place, marquée **transféré**, avec le motif — le
  numéro n'est pas réattribué.
- **`DC-29` → descente de provenance d'abord** au LOT-06 ; la forme vide
  devient le repli, plus le défaut.

## À savoir pour la suite

- **« Doctrine exécutable » n'a plus de migration.** Plus aucune étape sous
  confirmation obligatoire, plus de délai `release-db`. Si un lot en découvre
  le besoin, il **s'arrête et le nomme** — c'est écrit dans les gates.
- **Le graphe est presque plat** : un seul lien fort, LOT-04 → LOT-05/LOT-06.
  **LOT-03, LOT-07 et LOT-09 sont entièrement libres** — trois lots
  parallélisables si vous voulez ouvrir plusieurs worktrees.
- **LOT-09 est le meilleur rapport de la campagne** : le patron est déjà
  écrit et constaté opérant sur `DC-27` — clause dans `anthropic.ts` plus
  garde `api/praticien/synthese/promptPassationCourante.guard.test.ts:70-78`.
  Classe clinique quand même : T3, revue `wn-reviewer`, la formulation se fait
  trancher avant d'être posée.
- **Décompte des orphelines : dix, plus la part de `DC-11`** — onze statuts
  portent le marqueur, écrit **exactement** `**Orpheline**`, capitale
  comprise. `grep -c '\*\*Orpheline\*\*' CONSTITUTION_CLINIQUE.md` doit rendre
  **13** : onze statuts plus deux occurrences dans l'en-tête qui le définit.
  La casse flottante a été un vrai défaut, trouvé en revue — la moitié des
  marqueurs échappait au grep. Si un futur lot ferme une orpheline, **retirer
  son marqueur** et corriger le compte, sinon trois documents mentent.
- **`DC-36` est désormais la seule règle** sans preuve, sans banc et sans
  véhicule.

## Ouvert

- PR des arbitrages : CI à attendre, merge = Copilot ou go.
- **L'arbitrage de portefeuille sur les dix orphelines restantes** n'est pas
  clos — il est *reporté*, et le LOT-08 le rappellera. Options déjà nommées :
  dettes nommées (choix actuel), campagne dédiée, ou rattachement au coup par
  coup.
- Curation signée reste **à l'arrêt** et en `--init-only` : la migration
  transférée n'existera que le jour où cette campagne se cadre. Rien ne
  presse — mais `DC-07`, `DC-13` et `DC-20` la désignent maintenant comme leur
  porteur, et si elle ne s'ouvre jamais, ces trois règles n'ont plus de
  véhicule non plus.
- `DC-26` reste partiel (compilateur absent, au périmètre d'aucun lot).
