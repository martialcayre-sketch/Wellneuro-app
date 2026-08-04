# Handoff — 2026-08-04 — Les écarts du LOT-07 tranchés, et le défaut trouvé dessous

Écrit sur la branche vivante avant la PR, puis **rafraîchi depuis `main` après le
merge** : seules cette section et « Prochaine action exacte » ont changé — le
reste est le handoff d'origine, écrit avant de livrer.

## Git

- **Livré.** PR **#561** mergée en squash (`74f1ee49`), branche et worktree
  supprimés. `verify` avait réellement tourné, et était vert.
- Suite directe du LOT-07 (#560, `71818caa`) : ce lot tranche les trois écarts
  qu'il avait trouvés sans les résoudre. **Changement de logique clinique** — T3
  complet vert (3 504 tests unitaires + 108 E2E), revue adversariale passée,
  fragment de changelog livré.
- Décision **D-014** au registre.

## Les écarts, tranchés

| Entrée | Verdict | Pièce |
|---|---|---|
| `Q_STR_03` cotation | **N'était pas un défaut** | Mêmes 11 items, mêmes six ancres ; ré-encodage 0-based, servi = source − 11. Translation constante : classement inchangé, somme cohérente de bout en bout |
| `Q_STR_03` bandes | **Défaut réel, non corrigeable** | Le manuscrit ne publie **aucun** seuil ; les jeux d'aval ne sont signés de personne (l'un se déclare « adapté » par un tiers). Réserve posée, bandes inchangées |
| `Q_NEU_03` | **1992 → 2008** | 1992 et 1998 datent l'**entretien structuré** ; le PDF de l'éditeur porte « SIGH-SAD-SA, © 2008, January 2008 version » pour la version servie |
| `Q_FIB_03` | **Piste ACR 1990 fermée** | Le dépôt sert 9 zones + 3 symptômes, `type: journal`, sans total, `actif: false` — pas l'examen des 18 points, que l'ACR 2010 a de toute façon abandonné |

## Le vrai sujet, trouvé en chemin

Le moteur `sum` jetait le `missing` que `sumItems` calculait. Un item non répondu
n'est pas compté `0` : il est **ignoré**. Le total sortait donc plus bas et
décrochait une bande calibrée sur la forme complète — **à sens unique, vers le
sous-classement**, c'est-à-dire le faux négatif. `bms_average` en pire : sa
moyenne divisait par des items que personne n'avait posés.

Fermé dans les deux moteurs, **et un étage plus bas** : `equilibre/score.ts`
recalcule le score sur les `rawAnswers` stockés, puis divise le total par le `max`
de la forme complète. Là, le total **est** la lecture — et sur une source
`inverser: true`, l'erreur devient rassurante : un `Q_STR_03` tronqué rendait
« besoin bien couvert ». Une source à recueil partiel n'entre plus dans la
couverture ; un besoin dont toutes les sources le sont ressort **non mesuré**,
jamais `0`.

**Portée mesurée, pas supposée.** Les 21 réponses `sum` de production portent
toutes exactement le nombre d'items attendu (`execute_sql`, 2026-08-04) : aucun
résultat existant ne bouge. Mais **le trou n'était pas théorique** — côté serveur,
la complétude n'est exigée que pour `def.cabinet`, et aucun instrument servi par
`sum` n'est de cabinet : un POST partiel authentifié était accepté.

## Problèmes ouverts

- **La classe n'est pas fermée.** Trois moteurs servis portent le même défaut, non
  touchés ici et nommés au changelog : `sum_decimal` (`Q_GEO_05`, QDRS — un
  recueil partiel décroche « Normal » sur une **gradation de démence**),
  `count_threshold` (`Q_INF_05`, qui **calcule** `missing` puis l'ignore) et
  `ecab` (`Q_NEU_08`, dépendance aux benzodiazépines). C'est la prochaine action.
- **`Q_STR_03` sert toujours ses cinq bandes** au praticien et au prompt IA, alors
  que la réserve dit qu'elles n'ont aucune source. Faut-il un signal côté fiche,
  ou la réserve reste-t-elle un fait de dossier ? Décision produit, ouverte.
- **Divergence assumée** : `plaintes_actuelles` met `total: null` sur recueil
  partiel, `sum` sert le total à côté de `missing`. Documenté sur place.
- **L'invariant qui fait tenir « portée nulle » n'est pas gardé** :
  `equilibre/score.ts` ne lisait ni `interpretation` ni `average`. Si un lot futur
  s'y met, ce changement devient rétroactif sans que personne ne le voie.
- Hérités : les six règles du LOT-05 ne sont pas signées cliniquement ; l'ouvrage
  de C. Cungi n'a pas pu être consulté (Google Books 429) — seule pièce où des
  seuils pourraient être signés de l'auteur.

## La leçon de méthode

**Trois fois, un chiffre supposé a failli devenir un fait.** « 5 items sur 20 » et
« 13 sur 20 » venaient de comptes que je n'avais pas lus — les instruments en
comptaient exactement 5 et 13, tout était complet. Puis deux sous-agents se sont
contredits sur le nombre d'instruments `sum` (26/25 contre 25/24) ; seul le
catalogue **résolu à l'exécution** a tranché — 26 drapeau éteint, 25 allumé. Un
compte obtenu au grep n'est pas un compte : il attrape les `parts` d'un moteur
composite et ignore la résolution des drapeaux.

Et la revue adversariale a démoli trois affirmations que le code écrivait sur
lui-même, dont une **qui sous-estimait le lot**. Un commentaire faux dans un
fichier de logique clinique ne survit pas au premier lecteur qui vérifie.

## Prochaine action exacte

**Fermer la classe du recueil partiel sur les trois moteurs restants**, en
partant de `main` (jamais de la branche squashée). Par ordre de gravité
clinique :

1. `sum_decimal` → **`Q_GEO_05` (QDRS)** — un recueil partiel décroche la bande
   « Normal » (0-1) sur une **gradation de démence**. C'est le plus sérieux.
2. `count_threshold` → `Q_INF_05` — il **calcule** déjà `missing` et l'ignore
   pour la bande : le correctif y tient en une condition.
3. `ecab` → `Q_NEU_08` (dépendance aux benzodiazépines).

Le dessin est déjà arrêté et éprouvé par D-014 : `interpretation: null` sur
recueil partiel, `total` conservé à côté de `missing`, note en français. Reprendre
les cas de `web/src/lib/questions.test.ts` et **éprouver le banc par mutation** —
en particulier `missing > 0` remplacé par `repondus === 0`, celle qui rétablit
l'ancienne tolérance en gardant l'apparence d'un garde.

Deux décisions **produit** attendent par ailleurs le praticien, et ne bloquent pas
ce travail : le signal côté fiche pour les bandes non sourcées de `Q_STR_03`, et
la consultation de l'ouvrage de C. Cungi.

## Interdits encore actifs

- Aucune migration, aucune écriture Supabase.
- Ne pas merger sur les seuls checks Vercel ; `enforce_admins` est actif.
- **Ne pas remplacer les bandes de `Q_STR_03`** — arbitrage praticien du
  2026-08-04 : aucun jeu de seuils n'est signé de l'auteur, et on n'échange pas un
  jeu non sourcé contre un autre.
