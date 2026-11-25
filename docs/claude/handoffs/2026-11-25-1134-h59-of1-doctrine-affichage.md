# Handoff — 2026-11-25 — H59, OF-1 : doctrine d'affichage longitudinal (D-560), constat CF-0a

Lot `h59-of1-doctrine-affichage` (file A, clinique, P0), inscrit et pris le
2026-11-25 sur la validation du responsable, dans le worktree
`h59-nf7-retrait-drapeau-cadrage`.

## Branche et état Git

- Branche `h59-of1-doctrine-affichage`, tirée d'`origin/main` à `8bb812f8`.
- La branche précédente, `a-minibuilder-test-delai-propre`, est mergée (#2333,
  `b15a2d9c`) ; son lot est `fait` au carnet.
- Numéro D-560 réservé (`refs/tags/reserve/D-560`).
- Un commit de lot, tardif ([[D-518]]).

## Objectif

Écrire la décision d'OF-1 (pièce 06 §7 : « D-xxx praticien seul : tableau du
§4, formule du §4, encart des refus »), qui tient le lot OF-2
(`h59-of2-planche-a`) et, à travers lui, la porte 24 ([[D-534]] §3).

## Décisions prises

- **Constat CF-0a** (porte d'OF-1), validé par le responsable le 2026-11-25
  (« 1 oui ») : CF-0a (pièce 02 §5) est tenue par [[D-333]] et [[D-334]],
  signées M-2 le 2026-10-23. Le relevé du 2026-11-16 cherchait le libellé
  « CF-0a » et ne l'a trouvé dans aucune décision ; le contenu, lui, y était.
- **D-560**, texte validé mot pour mot le 2026-11-25 (« 2 oui »). Nature
  clinique : elle étend [[D-058]] (réponse à `20261116-2340-a`). Le texte part
  de la pièce 06 §4, mise à jour par [[D-333]], [[D-334]] et [[D-406]] (la
  porte 20, K-11, est levée depuis le 2026-11-01).
- Corrections du corps après les revues P0, validées mot pour mot par le
  responsable le 2026-11-25 (« oui ») : paire de [[D-406]] §3 exceptée du
  refus entre cycles ; ligne « score composite » ramenée au texte de
  [[D-058]] §4, [[D-333]] §2 (règles 2 et 3) et [[D-334]] §4 ; [[D-397]]
  citée (paire du momentum, réserve R:o, porte 22 fermée) ; encart « aucun
  mot qui qualifie un écart » (les tendances factuelles de D-058 §4
  demeurent) ; médiane sous le masquage de [[D-298]] à chaque jalon ;
  surfaces sans chiffre étendues à tout document remis ou adressé et au mode
  consultation ([[D-354]]).
- Règle neuve, nommée comme telle dans l'en-tête : la biologie à plusieurs
  dates, côte à côte à la date de prélèvement. Les unités mêlées restent à
  [[D-157]] §4 ; couleur, tri et flèche à [[D-333]] §5 et D-266 à D-268.
- Ajouts propres à la session : l'en-tête (date, statut, D-397, règle neuve,
  porte CF-0a), qui ne porte aucune règle de plus que le corps.

## Fichiers modifiés

- `docs/decisions/D-560.md`
- `changelog.d/2026-11-25-h59-of1-doctrine-affichage.md`
- `docs/claude/plan-journal/H59/2026-11-25-01-of1-doctrine-affichage.md`
- ce handoff

## Validations exécutées

- Références vérifiées sur `origin/main` : D-058 §1, §3 et §4 ; D-106 ;
  D-113 §9 ; D-157 §4 ; D-298 ; D-333 §1, §2, §4, §5 ; D-334 §2, §4 ;
  D-354 ; D-397 (Q5, §8 R:o ; porte 22 fermée au plan) ; D-406 ;
  DC-22, DC-27 et DC-41 (`AUDIT_DOCTRINE_CHAINE_T0.md`) ; A8-2 et A8-3
  (`REGISTRE_FRONTIERES.md`). `BANDES_DE_BRUIT` est vide
  (`momentumParBesoin.ts`).
- T1 `npm run check:rapide` : 0.
- Codex : `--mode controle` → barrière tenue ; `--mode revue` : 2 P2
  (cycles et D-406 §3 ; références du score composite), corrigés.
- `wn-reviewer`, première passe : GO, 0 P0, 0 P1, 3 P2 et 8 P3 ; seconde
  passe sur la tête corrigée : GO, 0 P0, 0 P1, 1 P2 (encart et paire de
  D-406 §3) et 4 P3, corrigés : encart aligné sur la paire de D-406 §3 et
  sur D-058 §4, ligne du score composite (D-333 §5, DC-21, extension de
  D-334 §4 nommée), « courbes du momentum » ; retouches validées mot pour
  mot (« oui validé »). Verdicts dans le corps de la PR.

## Problèmes ouverts

- La formule du §3 n'est servie qu'après une décision qui définit « action
  diffusée ». Cette décision n'existe pas.
- Des citations de la pièce 06 sur la biologie, D-245 et D-261 ne sont pas
  reprises dans D-560 (D-157, D-266 à D-268 le sont, dans l'en-tête) : elles
  se revérifieront au lot de code qui affiche la biologie.
- Le comportement d'une série biologique aux unités mêlées (silence ou
  colonnes séparées) n'est pas dit : à fixer au lot OF-2, avec un banc qui
  vérifie l'encart sur chaque surface du §1.

## Prochaine action exacte

1. `wn-reviewer` sur la tête corrigée.
2. Commit, push, PR (`--body-file`), `wn-attendre-ci` en fond. PR
   documentaire : PR-Agent ne tourne pas, la revue retenue est `wn-reviewer`
   ([[D-448]]).
3. « prête @<sha> » sur la PR et à la boîte `integrateur`.
4. Au merge : `h59-of2-planche-a` repasse `pret`, `20261116-2340-a` passe à
   `close`, lot `fait`.

## Interdits encore actifs

- Ne pas déclarer la porte 24 levée : OF-2 reste à livrer.
- Aucun seuil, aucune bande, aucun poids ; `BANDES_DE_BRUIT` reste vide.
- Aucun code, aucune migration, rien au portail.
- Ne rien modifier au texte validé de D-560 sans nouvelle validation mot pour
  mot du responsable.
