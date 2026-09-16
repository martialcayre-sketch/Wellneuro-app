### Le geste de transcription tient en consultation, et le fil se range sur l'échange (2026-09-16)

Six défauts de l'onglet « Correspondance », tous vérifiés dans le code avant
d'être corrigés. Aucun n'est une préférence d'écran : chacun produisait une
affirmation fausse ou une perte silencieuse.

**Le brouillon ne se perd plus au changement d'onglet.** La fiche démontait le
panneau à chaque bascule — `{ongletActif === 'correspondance' && <Panel />}` —
alors que son conteneur porte déjà `hidden`. Une transcription de plusieurs
milliers de caractères disparaissait sans un mot dès qu'on allait vérifier une
synthèse. L'onglet reste désormais monté après sa première visite, et aucune
requête n'est rejouée : le fil et les synthèses dépendent du seul `idPatient`.

L'état retient **le dossier visité**, pas un booléen. Un simple drapeau aurait
fait charger le fil d'un dossier dont l'onglet n'a jamais été ouvert — donc
écrire une ligne au journal d'accès pour une lecture que personne n'a demandée.

**La troncature cesse d'être muette.** `maxLength` empêche de taper au-delà de
8 000 caractères, mais un collage — le geste normal d'une transcription — est
coupé par le navigateur sans un mot, sous un placeholder qui promet une
transcription fidèle. Le refus serveur `texte_trop_long` était de ce fait
inatteignable depuis cet écran : il ne gardait que l'API. Le compte se lit
désormais avant le geste, et l'atteinte de la borne se dit.

**Le fil se range sur la date de l'échange, plus sur celle de la saisie.** Une
lettre de juin transcrite aujourd'hui se rangeait en tête, devant ce qui s'était
réellement passé depuis. Elle se range maintenant en juin. `consigneLe` reste le
repli quand la date d'échange n'est pas renseignée, reste le départage à date
égale, et reste affichée dans tous les cas — c'est la seule des deux qui ne peut
pas être antidatée. La date d'échange passe en tête de la ligne meta : elle
ordonne le fil, un ordre dont la clé est invisible serait inexplicable.

**Le compteur du rail continue, lui, de mesurer l'attente sur `consigneLe`**, et
c'est délibéré : une pastille ne se fonde pas sur une date saisie à la main.
L'écart entre les deux est écrit plutôt que subi.

**Les dates sont rendues en heure de Paris.** Elles étaient les seules du produit
à suivre le fuseau de la machine : une consignation de 00 h 30 à Paris
s'affichait la veille côté serveur. Onze fichiers du dépôt épinglent ce fuseau.

**Le dernier médecin se reprend d'un geste, il ne se pré-remplit pas.** Un champ
rempli par défaut se valide sans être lu, et la ligne produite est **définitive**
— la table ne porte aucune colonne `supersedes_*`, il n'existe ni PATCH ni
DELETE, et une attribution fautive tient jusqu'à l'effacement du dossier. Le
confort de la frappe ne vaut pas ce risque ; un bouton le rend en laissant le
geste au praticien.

**Un échec de lecture ne se rend plus comme un dossier sans envoi.** La section
« Correspondance avec le patient » n'avait aucune branche d'erreur : ses trois
conditions étant fausses, elle ne rendait **rien** sous son titre —
indistinguable d'un dossier vide. La section médecin refusait déjà ce raccourci ;
les deux tiennent désormais le même refus (`DC-24`).

Le banc qui n'attendait qu'une alerte a été **réécrit pour défendre le nouveau
comportement**, jamais corrigé en silence.
