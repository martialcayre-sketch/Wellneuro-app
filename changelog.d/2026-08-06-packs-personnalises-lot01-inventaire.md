### Inventaire des surfaces packs et décision produit D-030 (2026-08-06)

Documentation seule, aucune modification de code. LOT-01 de la campagne
`2026-08-06-packs-personnalises` (retrait des packs de questionnaires figés au
profit d'un envoi personnalisé par patient) pose la matrice exhaustive de ce
qui consomme les packs non-base — orientation, portail patient, praticien,
doctrine/seed/registre, observabilité, RGPD, tests, E2E, scripts d'exploitation
— avant tout retrait effectif, chaque ligne relue sur pièce dans le dépôt et
datée du jour, avec trois lectures SQL indépendantes de la base de production
(composition des 8 packs, écrivain unique de `consultations.id_pack_assigne`,
volumétrie de `pack_propositions`).

Parmi les corrections apportées au cadrage initial du lot, actées dans
`docs/DECISIONS.md` (D-030) : le modèle `PackProposition` n'est pas « sans
objet » — il est écrit en runtime par `api/portail/pack-reevaluation` (0 ligne
en production au 2026-08-06, mais un écrivain réel) — et le bloc « Packs
suggérés » de `PatientsPanel.tsx` (`packsRecommandes`) est une porte du
parcours qui continuera de citer des packs désactivés après retrait, absente
du texte initial du lot.

D-030 porte aussi les trois arbitrages produit du 2026-08-06 : le second pack
créé par le praticien (« Florence 1 ») est désactivé en même temps que les
packs de doctrine — « Base de consultation » n'est jamais désactivée et reste
le seul pack actif (6 packs désactivés au total) ; le geste d'envoi depuis
l'orientation devient l'ajout à la file d'envoi existante
(`POST /api/praticien/file-envoi`) plutôt qu'une assignation directe
de pack ; la campagne passe avant la reprise des dettes 5.0. Les compositions
de remplacement des 6 règles d'orientation à `packId` sont proposées à titre de
candidats pour le LOT-02 (arbitrage clinique et re-signature D-018 requis),
pas encore actées.
