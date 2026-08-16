### D-061 — les quatre tables cliniques restantes sont signées, dont deux en passage en force (2026-08-15)

Arbitrage praticien explicite, pris après exposé des blocages. La production
CHANGE : l'abstention passe de « non évaluée » à évaluée, l'extinction et les
priorités deviennent productibles dès que leurs drapeaux d'exploitation sont
posés. Signer n'allume pas — chaque table garde son ET avec un drapeau.

- **Arrêt et contradictions signées ensemble.** L'ordre a un sens clinique et
  n'est gardé par rien : la table d'arrêt seule ferait tourner l'extinction
  sans le frein de `D-053` §5, aucun constat n'existant si les contradictions
  sont inactives.
- **Priorités : passage en force nommé.** Le bloc « À LIRE AVANT DE SIGNER »
  (`D-054`) énonce que le SHA ne couvre pas la procédure d'abstention, si bien
  que la signature ouvre un verdict qu'aucune ligne signée ne décrit —
  `DC-17`, `DC-26`. La dette reste ouverte et prioritaire.
- **Biologie : signée vide, passage en force nommé.** Mesuré au banc, la
  signature est observablement inerte aujourd'hui : le moteur refuse toujours,
  mais sur « aucune règle publiée » au lieu du verrou. Le risque est à la
  première règle ajoutée, qui entrera sous signature acquise — le verrou ne
  teste ni date ni SHA, contrairement aux quatre autres.
- **Sentinelles inversées, jamais supprimées.** Sept bancs affirmaient la
  non-signature. Ils affirment désormais la signature et sa bonne forme, de
  sorte qu'une dé-signature accidentelle reste attrapée.
- **Machinerie de banc corrigée.** `retablirTablePriorites()` remettait `false`
  en dur au nom de « l'état livré » ; après signature, il imposait l'ancien
  état au lieu de restaurer le vrai.

Correction d'une erreur propagée le même jour : `ORIENTATION_METADATA` était
**déjà signée** (2026-08-06, 23 claims). Deux affirmations contraires, dans la
PR #685 et dans le §F.2 du catalogue biologie, sont corrigées ici.

Non joué : T2 et T3 sont injouables dans le conteneur distant (installation
Playwright en dur, CDN refusé par l'allowlist). `npm run check` est vert sur
41 fichiers de bancs.
