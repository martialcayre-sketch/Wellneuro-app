### Correspondance — les gabarits de messages patient vivent au registre, et le Socle se clôt 3/3 (LOT-03, `DC-26`)

- **Nouveau registre** `web/src/lib/correspondance/registreGabarits.ts` — huit
  gabarits versionnés, hash-verrouillés (`canonicalSha256`), gelés, portant
  **deux dates** (`redigeLe` mesurée par `git log -S` sur chaque sujet ;
  `valideLe: null` pour les huit — aucun n'a jamais été validé formellement,
  le registre le dit au lieu de l'inventer) et une **déclaration de
  conformité « aucune donnée de santé »** : quatre écarts nommés (titres
  d'instruments, note libre praticien) — leur correction est une décision
  praticien, hors campagne.
- **Sept appelants migrés au caractère près** (lien magique, accès portail,
  relance sommeil, assignation, pack, file d'envoi, accusé, booklet) : les
  272 tests des surfaces touchées sont verts **sans modification** — dont le
  banc strict de la relance — et le banc du registre rejoue les
  concaténations historiques recopiées. `relanceEmail` garde son module
  séparé et sa raison d'être ; les segments date limite / note praticien sont
  partagés au registre.
- **Garde structurelle** (`registreGabarits.test.ts`, 11 cas) : hash-lock,
  liste figée des `gabarit@version`, variables ⇔ placeholders dans les deux
  sens, rendu fail-loud, fidélité. Mutation vue rouge : un corps modifié sans
  nouvelle version casse (2 échecs), restauré vert.
- **La campagne Socle de restitution sûre est terminée** — trois lots livrés
  le jour de son ouverture. Le gate des campagnes 6.0 est posé : couverture
  des chemins sortants prouvée, clinique au niveau « demande », gabarits au
  registre. Restent au responsable : les validations `valideLe`, l'arbitrage
  des régimes de garde, les candidats de couverture du hook.
