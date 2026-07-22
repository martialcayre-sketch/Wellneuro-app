### C3 LOT-06 — migration `correspondances_medecin` (fil médecin V1, migration seule) (2026-07-22)

Première PR du fil de correspondance médecin (arbitrages FM-1 « C puis A » et
FM-2 « conservation alignée dossier » du 2026-07-22). Le patron SP-SPI est
repris : **la migration voyage seule**, l'écran suivra dans sa propre PR.

- **Table `correspondances_medecin`** : le praticien consignera un envoi fait
  par ses canaux habituels (sens `sortant`) et transcrira une réponse reçue
  (sens `entrant`). Le médecin n'accède à rien, l'application n'envoie rien.
- **Minimisation** : le médecin (un tiers) n'est désigné que par un libellé
  libre — ni adresse e-mail, ni RPPS, ni compte. Texte seul par construction :
  aucun champ fichier (mur HDS).
- **Deux dates jamais confondues** (patron SP-TT) : `echange_le` est la donnée
  transcrite, facultative ; `consigne_le` est posé par la base, inantidatable.
- **Attribution** : `praticien_email` porte qui a consigné (le But du lot dit
  « datée, attribuée » ; patron `relecture_notes`) — ajout constaté en revue
  (AC-2), acté ici.
- **FM-2 outillée dès la migration** : FK `ON DELETE RESTRICT` vers
  `patients`, et `effacerDossier` efface la table nommément — la garde
  structurelle d'`effacement.test.ts` l'exige dès que le modèle existe.
- RLS deny-all sans policy, index `(id_patient, consigne_le)`, cohérent avec
  `relecture_notes`.

Aucune route, aucun écran dans cette PR : la table reste vide jusqu'à la PR 2.
