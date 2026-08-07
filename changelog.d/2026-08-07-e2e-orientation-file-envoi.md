### Une preuve E2E du parcours orientation → file d'envoi → envoi (2026-08-07)

Le chemin par lequel le praticien envoie désormais ses questionnaires — le
panneau d'orientation propose, un clic pose l'instrument dans la file, un second
l'envoie — **n'avait aucune couverture de bout en bout**. Les bancs unitaires
tenaient chaque pièce séparément ; rien ne jouait la chaîne. La colonne « File
d'envoi » n'était vérifiée que par le titre de sa colonne, sur un test qui
acceptait explicitement qu'elle soit vide.

`web/e2e/orientation-file-envoi.spec.ts` joue maintenant les six étapes sur un
patient fictif, et **chacune est prouvée rouge par une mutation** — le bouton
neutralisé, le brouillon créé sans son contenu, le titre retiré de la colonne,
l'assignation non créée, le brouillon qui ne quitte pas la file, la déduplication
désactivée, et le verrou d'orientation refermé. Une passe de référence verte
précède la série : sans elle, un harnais cassé rendrait tout rouge et
« prouverait » les sept maillons d'un coup.

**Le parcours était injouable sur le banc, pour deux raisons indépendantes.**
`WN_ENABLE_ORIENTATION_NNPP2` n'était posé nulle part côté dépôt, alors qu'il est
en production depuis le 2026-08-04 : la route répondait `actif: false` et le
panneau ne proposait rien. Et même le drapeau armé, le seed ne déclenche aucune
règle — l'orientation **ignore le score stocké** et le recalcule depuis les
réponses brutes, qu'aucune passation seedée ne porte. Le banc arme donc le
drapeau et provisionne une réponse porteuse de réponses brutes.

**Une absence ne se lit pas à l'écran sur cette colonne.** La file part d'une
liste vide : le message « La file est vide » et un décompte à zéro sont tous deux
vrais *pendant le chargement*. Les deux ont laissé verte une mutation qui cassait
réellement le produit. Ce maillon-là s'assère sur la réponse du serveur, jamais
sur le DOM.

Ce que le spec ne couvre pas, et qu'il ne faut pas lui prêter : l'envoi du
**mail** lui-même, le refus serveur 409 sur un questionnaire déjà assigné, le cas
d'une recommandation ciblant un pack, et celui d'un patient sans adresse. Une
règle vers une cible, pas la table entière.
