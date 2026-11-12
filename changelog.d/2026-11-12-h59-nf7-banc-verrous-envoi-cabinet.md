### J2-base : NF-7, les verrous de l'envoi d'un instrument du cabinet éprouvés contre PostgreSQL (H59, 2026-11-12)

Sans migration ni changement de code de production : un banc à deux sessions
(`web/scripts/banc-envoi-cabinet-deux-sessions.test.ts`), lancé à chaque T3 et
à chaque CI. Il joue les vraies routes d'envoi et de modification des
instruments du cabinet, drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB` allumé dans
le seul banc ; seule la session du praticien est substituée.

- Les deux ordres de chaque paire sont éprouvés : modification et envoi,
  publication et envoi, déclaration et envoi. Pour chaque course, le banc
  constate d'abord que la session attendue est réellement bloquée.
- Deux témoins : une modification annulée en cours, puis un envoi annulé en
  cours.
- Des instruments présentés en ordres opposés, pour deux patients puis pour
  un seul : aucun interblocage dans le délai.
- Une édition du titre écrite sur une lecture périmée ne réinstalle pas
  l'ancien contenu (le défaut corrigé dans #2021).
- Quatre mutations du code rendent le banc rouge : envoi sans `FOR SHARE`,
  modification sans `FOR UPDATE`, modification sans recomptage, édition du
  titre qui réécrit le contenu.
