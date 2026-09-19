# Handoff — 2026-09-19 — La réserve RGPD de la correspondance est soldée (D-234)

## 1. Branche et état Git

- Branche `wn-rgpd-correspondance-2026-09-19`, partie de `origin/main` à
  `f573f601` (`D-233`, clôture de `D-049`, mergée juste avant).
- `D-234` relevé à l'ouverture. **Le numéro ne se réserve qu'au merge** : le lot
  précédent a dû être renuméroté de `D-231` en `D-233` pour cette raison. À
  revérifier avant `gh pr merge`.
- Lot **documentaire seul** : aucune ligne de code, aucun schéma, aucune
  migration, aucun drapeau, aucun message envoyé à qui que ce soit.

## 2. Objectif de la session

Terminer les deux points RGPD de `D-222` §2, derniers des trois retenus par le
responsable le 2026-09-18.

## 3. Décisions prises

**`D-234`** — la réserve est soldée pour ce qu'elle réclamait ; ce qui reste
devient deux lignes tracées du récapitulatif de la rubrique 14.

**La décision de méthode du lot, et elle a changé le livrable.** J'avais annoncé
au responsable que la qualification juridique était « sa lecture ». **C'est
faux** : la rubrique 3 du dossier interdit d'écrire un article du RGPD — « ni
6.1.a, ni 9.2.h, ni aucun autre » — tant qu'un conseil qualifié ne l'a pas posé,
et la rubrique 14 attribue la base légale à **Conseil qualifié**, pas au
responsable. J'allais lui présenter un menu de bases candidates ; c'eût été lui
demander l'acte que le dossier réserve à un conseil. Écarté, et dit comme tel.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** — un dossier RGPD qui décrivait encore l'état du **matin** du
  2026-09-17 (« le logiciel ne garantit pas cette phrase », « non touché »),
  alors que les deux bouts avaient été pris le soir même.
- **Ferme** — le fait des **deux voies**, qui n'était écrit nulle part : deux
  routes gardées fail-closed sur refus/retrait/silence, une troisième sans aucune
  garde, qui transmet malgré un refus.
- **N'atteint pas** — la qualification elle-même. Elle revient au conseil, avec
  l'échéance commune du 2026-10-21.
- **N'atteint pas** — le geste d'information des deux patients. Tracé, non
  exécuté : ce qui part vers un patient est un geste du responsable.
- **N'atteint pas** — l'invariant « le discriminant est LA ROUTE » n'est tenu par
  **aucun banc**. Une quatrième route qui n'appellerait pas la garde hériterait de
  l'exception en silence. Nommé plutôt que supposé ; un garde reste à écrire.
- **N'atteint pas** — les deux pièces résiduelles : l'effet du refus annoncé dans
  « Mes choix », plus absolu que la garde, et la formulation des finalités
  couverte par aucune version (sans portée mesurable : la table est vide).

## 5. Fichiers modifiés

- `docs/DOSSIER_RGPD.md` — rubrique 6 : le tableau des trois routes, la mesure de
  production, et l'encadré qui dit ce qui a été acquitté le 2026-09-17 ;
  rubrique 14 : deux lignes neuves.
- `docs/DECISIONS.md` — `D-234`.
- `changelog.d/2026-09-19-rgpd-correspondance-deux-voies.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## 6. Validations exécutées

- **Lecture de production par conteneur détaché**, agrégats seuls, aucun
  identifiant : 29 dossiers ; **0 `trust_choice_events` toutes finalités** ; 2
  correspondances sur 1 dossier ; accusés v8 → 3, v9 → 2 ; **v8 sans v9 → 2**.
- **Les trois écrivains vérifiés un par un** : `biologie/proposition/courrier` et
  `correspondance-medecin` importent `consentementPartage` ; `adressage/courrier`
  ne l'importe pas du tout.
- `node scripts/lib/decisions-numerotation.mjs` — OK, 234 décisions, sans trou.
- `node --test scripts/wn-coherence-etat.test.mjs` — 29/29.
- T3 non rejoué : lot strictement documentaire, aucun fichier sous `web/`.

`changelog-collate.mjs` non lancé : destructeur sans argument.

## 7. Problèmes ouverts

- **Un fait de production non mesuré jusqu'ici** : personne ne s'étant jamais
  prononcé et la garde étant fail-closed sur le silence, les deux routes gardées
  sont **fermées pour les 29 dossiers**. Coût réel faible (2 lignes, 1 dossier),
  porte présente sur les deux écrans — mais un praticien qui essaierait
  aujourd'hui rencontrerait le mur sur n'importe quel dossier.
- **`one-off-746` a été réattribué** : le filtre de logs Scalingo a rendu un
  conteneur du 2026-09-11 **et** celui du jour. Lire l'horodatage, pas seulement
  le filtre.
- Les deux items tracés en rubrique 14, chacun avec son porteur.

## 8. Prochaine action exacte

1. Revue lue aux trois emplacements ; merger avec `--subject` portant le `D-NNN`
   **revérifié au moment du merge**.
2. Le geste du responsable sur les deux patients — hors dépôt.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en lecture seule par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- **Aucun article du RGPD écrit dans le dossier** tant qu'un conseil ne l'a pas
  posé (rubrique 3).
- **Rien n'est envoyé à un patient** sans demande explicite du responsable.
- `retries` interdit à Playwright ; un rouge WebKit du CI ne se relance jamais.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
