### Ajouté — Persistance de l'agenda alimentaire et abstention au contrat (lot L3)

L1-bis avait rendu `Q_ALI_09` assignable ; rien ne pouvait encore être conservé. Ce
lot ajoute la table, la couche de persistance et l'effacement RGPD correspondant. Ni
saisie (L4) ni barème (L2) : l'ordre reste **collecte d'abord, calibrage ensuite**.

#### Le contrat gagne un troisième état, et il fallait le faire maintenant

Les quatre présences obligatoires acceptent désormais `null` — « je ne sais pas » —,
distinct de la clé absente. Sans ce troisième état, un patient ignorant le contenu
d'une journée n'avait que deux issues : répondre au hasard, ou **sauter la journée
entière**. La seconde perd aussi les horaires, qui sont la mesure principale de
l'instrument, et c'est le seuil d'exploitabilité (14 jours, 4 week-ends, 7 paires de
jeûne) qui en paie le prix.

Le changement coûtait une passe sur trois fichiers tant qu'aucune ligne n'existe.
Après le premier patient, il aurait coûté un contrat v2, une double lecture, et une
fenêtre de recueil incomparable à elle-même. Le contrat reste donc **v1**.

`soirPlusCopieux` n'accepte **pas** l'abstention (arbitrage praticien) : facultatif, il
n'alimente qu'un drapeau.

#### Le piège que cette asymétrie ouvre, et les cinq endroits où il fallait le fermer

**`null !== undefined` est vrai en JavaScript.** Les prédicats de couverture testaient
`!== undefined` ; depuis que `null` est signifiant, un seul d'entre eux laissé tel quel
aurait compté la journée comme connue, puis le filtre `=== true` l'aurait lue comme un
« non ». Le dénominateur d'une grandeur aurait divergé de celui de ses voisines, sans
qu'aucun test ne parle.

Le cadrage a trouvé **cinq** prédicats là où le plan initial en nommait un. Tous passent
à `typeof … === 'boolean'` : la règle est uniforme, et la différence de contrat vit dans
le **type** et le **validateur** — jamais dans les prédicats, seul moyen qu'ils ne
divergent pas. Symétriquement, la lecture **conserve** `null` pour les quatre (le garde
`!== null` est retiré : une abstention relue en non-réponse sortirait la journée du
dénominateur pour une raison qui n'est pas la sienne) et **l'écarte** pour
`soirPlusCopieux`, seul `!== null` restant du fichier.

#### Table `agenda_alimentaire_jours`

Modèle `AgendaAlimentaireJour` calqué sur `AgendaSommeilNuit`, migration
`20260804120000_agenda_alimentaire_v1` **écrite à la main** — jamais `prisma migrate
dev` ni `db push`. Append-only chaîné, deux FK en `RESTRICT`, RLS deny-all.

**Aucune contrainte unique** sur `(id_assignation, date_jour)`, délibérément : les
lignes supplantées restent, et `count(lignes) − count(distinct date_jour)` est le taux
de correction — seul signal de friction lisible sans nouvelle migration. Avec
`soumisLe` et `dateJour`, la courbe d'abandon (7 / 14 / 21 jours) et les seuils
d'exploitabilité se lisent en SQL, sans rien ajouter.

#### Trois écarts assumés au patron du sommeil

- **`persistence.ts` ne réexporte rien.** Son jumeau sert de barre d'export parce que
  son domaine n'a pas d'`index.ts` ; l'alimentaire en a un, et il est **pur**.
  Réexporter le domaine depuis un module qui importe Prisma le ferait entrer dans le
  premier import client distrait.
- **La version de contrat est vérifiée en lecture.** Côté sommeil,
  `AGENDA_CONTRACT_VERSIONS_LUES` n'est lue nulle part : une ligne écrite demain sous
  un contrat v2 y serait silencieusement relue sous les règles v1. Nouveau `contrat.ts`
  — `undefined` toléré (une ligne ancienne doit rester relisible), version inconnue
  refusée **en la nommant**.
- **`canal` honoré contre une liste fermée** plutôt que forcé en dur : `JourInput` le
  déclare, mais une chaîne libre finirait en clair dans une colonne du dossier patient.

#### L'effacement RGPD demandait trois gestes, pas un

Le garde structurel de `effacement.test.ts` relit `schema.prisma` et exige la chaîne
`tx.agendaAlimentaireJour.deleteMany` — il attrape l'oubli de la ligne d'effacement, et
**rien d'autre**. Deux gestes lui échappent, tous deux ajoutés ici :

- la **liste des modèles mockés** de ce même fichier est écrite à la main ; l'oublier
  fait tomber **huit** tests, pas un — vérifié par mutation ;
- `e2e/helpers/db.ts` doit supprimer les journées **avant** les assignations. Son
  commentaire raconte déjà l'incident que cette table s'apprêtait à rejouer : une seule
  ligne laissée en base fait échouer le reset, donc tous les specs suivants du même
  patient, avec un message qui ne désigne pas le coupable. Ajouté avant qu'une seule
  ligne n'existe.

#### Validations

`npm run check` vert dans les **deux** positions de `WN_AGENDA_ALI` (3 485 tests, +26).
**T3 complet vert en 2 min 6 s** : PostgreSQL éphémère, `prisma migrate deploy` — le SQL
manuel réellement exécuté —, **drift check `migrate diff --exit-code`** confirmant
l'équivalence schéma ↔ migrations, contrats SQL, seed, et 108 E2E.

**Quatre mutations vérifiées** : un prédicat de couverture remis en `!== undefined`
(2 tests tombent), la ligne d'effacement retirée (1), l'entrée de la liste de mocks
retirée (8), et — au lot précédent — le drapeau en fail-open. Un garde vert qui n'a pas
mordu ne prouve rien.

#### Ce que ce lot ne fait pas

Aucune route, aucune surface de saisie, aucun scorer, aucun branchement à Mon Équilibre.
`WN_AGENDA_ALI` reste **éteint** : l'allumer avant L4 exposerait un écran sans question.
