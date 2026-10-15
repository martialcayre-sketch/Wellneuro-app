### Sécurité : le patient d'un signalement est figé dès qu'un avis existe (D-281 §5, migration seule, 2026-10-15)

- **Le trou, fermé en défense en profondeur** : le patient d'un signalement
  rattaché ou lié à un programme était figé. Mais supprimer le programme le
  remet à NULL, et un signalement du formulaire d'avant (sans rattachement)
  n'était alors plus « lié » : son patient redevenait modifiable alors qu'il
  portait des avis (revue CodeRabbit de #1464, arbitrage du responsable du
  2026-10-15). Aucun chemin de l'application n'y mène aujourd'hui : seul
  l'effacement IDP2 supprime un programme, et il supprime avis et
  signalements dans la même transaction. La base tient désormais l'invariant
  seule.
- **Migration seule** : une fonction de trigger remplacée, sans colonne,
  table ni index, et `schema.prisma` inchangé. Le patient d'un signalement
  qui porte au moins un avis est désormais figé, quel que soit son lien au
  programme. Les gardes existantes et leurs messages sont inchangés. Aucun
  code ne s'en sert : aucun écrivain ne change le patient d'un signalement.
  La règle `SAF-EI-01` reste non armée.
- **Contrat SQL** `trust_aer_patient_fige_verdict_v1_negatif.sql`, branché
  au CI : refus avant et après l'effacement, chacun par son motif ; un
  signalement délié sans avis reste modifiable. Contre-épreuve jouée en local :
  avec l'ancienne fonction, le contrat échoue sur le cas visé.
