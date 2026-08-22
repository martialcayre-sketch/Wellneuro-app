## 2026-08-22 — feat(portail): « ce qui compte pour moi aujourd'hui » — une parole déposée, conservée, jamais notée (Alliance 6.0-A, LOT-03)

Le patient peut déposer au portail un texte libre horodaté, conservé tel quel ;
le praticien le lit chronologiquement dans l'onglet « Trajectoire » du dossier.
La surface patient vit derrière le drapeau **neuf et éteint
`WN_CE_QUI_COMPTE`** : l'allumer est un geste distinct.

Aucune migration, aucune colonne — la table `ce_qui_compte_entrees` existe
depuis le LOT-01, et la liste blanche du contrat SQL refuserait tout ajout.
**Aucune surface de correction ni de suppression** n'est posée : cette table
n'a pas de colonne `supersedes`, donc une entrée ne peut pas en corriger une
autre, et il n'existe volontairement aucun verbe pour écraser.

Contrat d'accès : drapeau fail-closed (503) d'abord, puis authentification par
le cookie signé du portail, puis seulement le corps de la requête.
**L'identifiant du patient vient de la session, jamais du corps** — un
`idPatient` reçu est ignoré, pas comparé. Un dossier clôturé n'empêche pas le
dépôt : la clôture est un état du suivi praticien, pas un ordre de silence fait
au patient.

Deux dates jamais confondues : la date de saisie est déclarée par le client et
bornée côté route (refus au-delà d'une tolérance de fuseau d'un jour), la date
d'enregistrement est posée par la base et n'est jamais transmise. Une saisie
non déclarée reste absente — jamais comblée par la date d'enregistrement, qui
fabriquerait une déclaration que le patient n'a pas faite (`DC-24`). Le texte
est borné par **refus, jamais par troncature** : tronquer une parole de patient
est une altération de donnée, pas une validation.

Cinq gardes structurelles, chacune **vue rouge par une mutation réelle** avant
d'être déclarée verte : silence ≠ réponse (une erreur de lecture n'affiche
jamais le libellé d'absence), anti-agrégat (aucun décompte, et aucun module
clinique, de scoring ou de synthèse n'importe le lot), conservation (deux
dépôts = deux lignes), portée session, deux dates.
