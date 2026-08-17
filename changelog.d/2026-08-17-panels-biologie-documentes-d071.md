### LOT-06 — la table des panels documentés hors outil (migration seule, D-071)

- **Nouvelle table `panels_biologie_documentes`** : le praticien déclare qu'un
  panel a déjà été exploré, et à quelle date. Elle rend atteignables les deux
  statuts que le moteur savait produire sans jamais pouvoir les atteindre —
  `deja_documente` et `a_repeter` — faute de source. Sans elle, l'outil
  reproposait un bilan récent sans signaler qu'il ignorait la question.
- **Sans valeurs (verrou HDS)** : existence et date d'un bilan revenu sur
  papier, jamais un résultat. Le verrou est une **liste blanche de colonnes**,
  pas un motif de noms : un `commentaire` ou un `payload` jsonb — les chemins
  les moins coûteux pour ranger un résultat — ne passent pas davantage qu'une
  colonne nommée `valeur`.
- **Deny-all RLS** posé par la migration (posture `D-005`) : la table porte un
  lien nominatif dossier ↔ panel ↔ date ↔ praticien déclarant, et une table
  neuve de `public` rejoint sinon le périmètre Supabase Data API.
- **Contrat SQL à sept termes** (`cb_panels_documentes_v1_negatif.sql`, joué
  par le CI), chacun **tué par mutation** avant d'être retenu : déclaration
  valide acceptée, doublon `(patient, panel)` rejeté en 23505, deux CHECK
  mordants, sept colonnes exactes, index réellement unique et sur les bonnes
  colonnes, deux clés étrangères en `ON DELETE RESTRICT` (invisibles du drift
  check), RLS active sans policy. Neuf mutations le font rougir — index
  recréé non unique sous le même nom, FK passée en `CASCADE`, RLS désactivée,
  colonne ajoutée, CHECK resserré par coquille, entre autres.
- **Une déclaration par (patient, panel)** — unicité SQL. Le moteur ne lit
  qu'une date par panel ; deux lignes concurrentes rendraient le statut
  dépendant de l'ordre de lecture.
- **Pas de CHECK « date non future »** : Postgres refuse `now()` dans un CHECK
  (fonction non immutable). La borne se garde côté route, avec le
  branchement — dette nommée, pas oubliée.
- **Effacement IDP2 branché dans la même PR**, contrairement à l'usage
  « migration seule » : le banc de complétude d'`effacement.test.ts` se dérive
  du schéma et rougit dès que le modèle apparaît. Coût nommé : entre le
  déploiement Vercel et l'approbation `release-db`, un effacement de dossier
  échoue **fermé** (transaction annulée) et redevient possible après la
  release.
- **Dette nommée** : ouvrir cette table rend atteignables deux replis
  fail-open du moteur — date illisible ou date future concluent toutes deux
  `deja_documente`, donc retirent le panel des propositions (`DC-24`,
  `DC-25`). Branches mortes jusqu'ici, couvertes par aucun banc, à traiter
  avant le premier appelant.
- **Aucun appelant applicatif** : ni service, ni route, ni écran. Le
  branchement de la proposition de bilan suit dans une PR distincte, derrière
  le drapeau neuf et éteint `WN_CB_PROPOSITION` (`D-071` §1).
