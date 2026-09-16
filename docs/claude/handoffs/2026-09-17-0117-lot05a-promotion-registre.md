# Handoff — 2026-09-17 — LOT-05a : trois arbitrages entrent au registre

Promotion, pas arbitrage. Décision [[D-219]].

## Branche et état Git

`correspondance-lot05-registre`, branchée sur `origin/main` (`6e19f494`, tête après
le merge de [[D-218]]). Aucune migration, aucun drapeau, **aucun code exécutable** :
le diff ne touche que des commentaires, une entrée de registre, un fragment et un
bandeau.

## Objectif, et pourquoi il existe

`FM-1`, `FM-2` et l'arbitrage TRUST (« indicateur seul ») ont été rendus le
2026-07-22 et n'ont jamais changé. Six fichiers de production s'y adossent
**nommément**, et le registre des décisions ne les connaissait pas : ils vivaient
dans le cadrage d'une campagne close. Une règle que le code cite et que le registre
ignore se vérifie par archéologie, pas par index.

## Décisions prises

Aucune. C'est le point : l'entrée **recopie** trois arbitrages existants, elle n'en
rend aucun. Deux choix de forme, écrits dans [[D-219]] :

- **les ancres sont renommées dans la MÊME entrée** — promouvoir sans renommer
  aurait créé une seconde source, et rien pour dire laquelle fait foi ;
- **le cadrage n'est pas réécrit** : il porte un bandeau qui renvoie au registre, et
  garde la délibération et les options écartées, qu'aucune entrée ne remplace.

## Fichiers modifiés

- `docs/DECISIONS.md` — [[D-219]].
- `api/praticien/correspondance-medecin/route.ts` (+ banc) — §2 et §3.
- `api/praticien/adressage/courrier/route.ts` (+ banc) — §2.
- `lib/patient/effacement.ts` — §2.
- `lib/trust/consentementPartage.ts` — §3.
- `api/praticien/biologie/proposition/route.ts` — §3, **trouvée par la revue**.
- `components/patient-cockpit/PropositionBilanPanel.tsx` — §3, **trouvée par la revue**.
- `campagnes/…/CADRAGE_FIL_MEDECIN_5_0.md` — le bandeau.
- `changelog.d/2026-09-17-trois-arbitrages-au-registre.md`.

## Validations exécutées

T1 vert. Pas de T2 : le diff ne porte aucun code exécutable, et les bancs des trois
chemins concernés sont **inchangés** — refus sur dossier clos dans les deux sens,
effacement nommé de la correspondance, exposition du choix de partage.

## Problèmes ouverts

**La rubrique 6 du `DOSSIER_RGPD` affirme l'inverse de §3**, et le centre TRUST dit
au patient que le partage « arrivera dans une prochaine version » — faux depuis le
2026-07-22. C'est **LOT-05b**, finalité distincte, PR distincte.

Plus lourd, et **hors de portée d'une session autonome** : quatre versions publiées
du registre TRUST patient portent « aucun partage avec un tiers … sans un choix
explicite de votre part ». Le logiciel ne garantit pas cette phrase — §3 la confie
au praticien. Corriger un document patient **publié et versionné** est un arbitrage
du responsable, pas un correctif : il est **nommé**, pas touché.

**`.wn/state.json` n'a pas été modifié**, contrairement à ce que le plan de campagne
proposait. Le seul champ qui aurait accueilli la péremption du cadrage est
`blocking_issues`, qui dit « ce qui bloque » — y déposer une note non bloquante
aurait pollué la sémantique d'un champ que d'autres sessions lisent. Le bandeau dans
le document lui-même protège le lecteur, qui est le but.

## Prochaine action

`LOT-05b` — la rubrique RGPD, le texte du centre TRUST, et la messagerie de santé
écrite hors de portée. Puis `LOT-06`, la mesure.

## Interdits encore actifs

Inchangés. Et un de plus, nommé ici : **ne pas réécrire une version publiée du
registre TRUST patient** sans arbitrage explicite du responsable.
