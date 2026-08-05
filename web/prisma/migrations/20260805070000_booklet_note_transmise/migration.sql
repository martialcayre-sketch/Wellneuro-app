-- Instantané de la note du praticien au moment de l'envoi du booklet.
--
-- POURQUOI. `syntheses_ia.notes_praticien` reste modifiable après un envoi
-- réussi : l'action `annoter` (PATCH /api/praticien/synthese) n'a aucune garde
-- de cycle de vie, contrairement à `effacer` qui est refusé dès qu'un envoi
-- existe. Tant que la note ne servait qu'à composer l'e-mail, cela n'avait pas
-- de conséquence : le message était parti, l'annoter ensuite ne changeait rien
-- pour le patient.
--
-- La page « Mon bilan » du portail change cela. Une lecture en direct de
-- `notes_praticien` publierait au patient un texte qui ne lui a jamais été
-- transmis — y compris après `suivi_cloture_le`, où tout nouvel envoi est
-- pourtant refusé (`accepteNouvelEnvoi`). La colonne fige ce qui est réellement
-- parti, et c'est elle seule que la route portail sert.
--
-- L'ABSENCE DE GARDE SUR `annoter` EST UN CHOIX, pas une dette laissée ouverte.
-- Le renvoi corrigé (`forceSend`, opération `Renvoi`) est un chemin explicite du
-- produit, et il consiste précisément à corriger une note puis à la renvoyer :
-- une garde symétrique de celle d'`effacer` interdirait le geste qu'elle
-- prépare. C'est l'instantané qui ferme le défaut, pas un refus — et un renvoi
-- écrit un instantané frais. Reste une divergence qu'aucune des deux réponses
-- ne réconcilie : sur un dossier clos, annoter est possible et renvoyer ne l'est
-- plus. Elle est portée comme réserve ouverte, pas fermée ici.
--
-- Additive et réversible : colonne nullable, aucune donnée existante détruite,
-- aucun index, aucune contrainte. Le code qui n'en sait rien continue de
-- fonctionner.
ALTER TABLE "booklet_envois" ADD COLUMN "note_transmise" TEXT;

-- BACKFILL. Sans lui, les bilans déjà transmis apparaîtraient au portail
-- amputés de leur note : le patient l'a reçue par e-mail, mais son espace ne la
-- montrerait pas. C'est le genre d'absence qui ne casse rien visiblement et
-- perd de l'information en silence.
--
-- Mais la note courante n'est celle qui est partie QUE SI la synthèse n'a pas
-- bougé depuis l'envoi. Une première version de ce backfill se fondait sur une
-- mesure — au 2026-07-31, 6 envois réussis, aucun sur une synthèse modifiée
-- depuis. C'était vrai le jour où elle a été prise, et c'est toujours vrai au
-- 2026-08-05 (re-mesuré : 6 envois réussis, 1 portant une note, 0 synthèse
-- modifiée depuis, dernier envoi le 2026-07-27). Ce n'est pas une garantie pour
-- autant : entre la relecture de cette migration et son application par le
-- build, un praticien peut annoter — l'action `annoter` reste délibérément
-- ouverte, l'instantané étant précisément ce qui la rend sans conséquence pour
-- le patient.
--
-- La condition `updated_at <= date_envoi` transforme donc la mesure en
-- INVARIANT : ne sont recopiés que les envois dont la synthèse n'a provablement
-- pas bougé. Les autres restent NULL — un manque visible et honnête, jamais un
-- texte présenté au patient comme transmis alors qu'il ne l'a pas été. Sur les
-- données d'aujourd'hui, cette condition ne retire aucune ligne : elle ne coûte
-- rien et retire la dépendance au temps.
--
-- ELLE COMPARE DEUX HORLOGES, et il faut le savoir. `date_envoi` vient du
-- `DEFAULT CURRENT_TIMESTAMP` de PostgreSQL ; `updated_at` est écrit par le
-- moteur Prisma, donc par l'horloge applicative. Un serveur en avance sur la
-- base, sur une annotation suivie d'un envoi dans la même seconde, produirait
-- `updated_at > date_envoi` et laisserait la note de côté. Le sens de l'échec
-- est le bon — NULL plutôt qu'un texte faux —, et le cas ne se présente sur
-- aucune ligne : le SELECT équivalent a été rejoué le 2026-08-05 avec cette
-- clause exacte, et rend 1 ligne recopiée, 0 exclue.
--
-- Restreint aux envois réussis : une ligne d'échec n'a rien transmis, sa note
-- doit rester NULL.
UPDATE "booklet_envois" be
SET "note_transmise" = s."notes_praticien"
FROM "syntheses_ia" s
WHERE s."id_synthese" = be."id_synthese"
  AND be."statut" = 'Envoye'
  AND s."updated_at" <= be."date_envoi"
  AND s."notes_praticien" IS NOT NULL
  AND btrim(s."notes_praticien") <> '';
