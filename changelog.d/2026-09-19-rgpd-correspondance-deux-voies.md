### La réserve RGPD de la correspondance médecin est soldée : deux voies nommées, deux items tracés, aucun article écrit (2026-09-19)

Le dossier RGPD décrivait encore l'état du **matin** du 2026-09-17 — « le
logiciel ne garantit pas cette phrase », « non touché ». Les deux bouts avaient
été pris le soir même (`D-222` et `D-219` §3 amendés en place) et le dossier ne
le disait pas. `D-234` le met à jour et transforme ce qui reste dû, jusque-là une
réserve en prose, en **deux lignes du récapitulatif de la rubrique 14**, avec
porteur et échéance comme les dix-huit autres.

**Le fait central n'était écrit nulle part : il y a deux voies.** Trois routes
écrivent dans `correspondances_medecin`. Deux appellent `verdictPartageMedecin`,
fail-closed sur refus, retrait **et** silence ; la troisième —
`api/praticien/adressage/courrier`, la lettre d'adressage sur signal d'alerte —
n'a **aucune garde**, délibérément. La voie ordinaire repose donc sur le choix du
patient, désormais techniquement tenu ; la voie d'exception transmet une donnée
de santé à un tiers **malgré un refus exprimé**. Les deux ne peuvent pas reposer
sur la même justification, et la seconde n'en a aucune d'écrite.

Corollaire à surveiller : **le discriminant est la route, jamais le
destinataire**. Une quatrième route qui n'appellerait pas la garde hériterait de
l'exception en silence. Aucun banc ne tient cet invariant — il est nommé plutôt
que supposé.

**Aucun article du RGPD n'est écrit, et c'est la règle du dossier.** La
rubrique 3 l'interdit — « ni 6.1.a, ni 9.2.h, ni aucun autre » — tant qu'un
conseil qualifié ne l'a pas posé, et la rubrique 14 attribue la base légale à
**Conseil qualifié**, pas au responsable. Présenter au responsable un choix de
bases candidates aurait été lui demander l'acte que le dossier réserve à un
conseil ; ce lot ne le fait pas. La qualification de la voie d'exception entre au
récapitulatif avec ce porteur et l'échéance commune du 2026-10-21.

**Les chiffres de production retournent la seconde question.** Mesurés en
agrégats le 2026-09-19 : 29 dossiers, **0 `trust_choice_events` toutes finalités
confondues**, 2 lignes de correspondance sur 1 dossier, accusés v8 → 3 et
v9 → 2, **v8 sans v9 → 2**. Deux conséquences non mesurées jusqu'ici : personne
ne s'étant jamais prononcé et la garde étant fail-closed sur le silence, les deux
routes gardées sont **fermées pour les 29 dossiers** depuis le 2026-09-17 ; et
« informer les patients déjà consentants » ne vise pas un mécanisme mais **deux
personnes**, que leur praticien connaît. Ce qui part vers un patient restant un
geste du responsable, l'item est **tracé, non exécuté**.

Aucune ligne de code, aucun schéma, aucune migration, aucun drapeau, aucun
message envoyé.
