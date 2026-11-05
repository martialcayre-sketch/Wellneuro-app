### Portail : la caméra est rendue à la page de l'agenda alimentaire (D-437, 2026-11-05)

File C, place 11 (H83), correctif après activation. L'en-tête `Permissions-Policy:
camera=()`, posé sur toutes les pages, interdisait `getUserMedia` à la page de l'agenda
elle-même : le navigateur rendait la caméra « refusée » quels que soient les réglages du
patient, et la photo du repas n'était jamais proposée (constaté en production le
2026-11-05). Sur la seule route `/portail/<jeton>/questionnaires/<assignation>`, la caméra
est désormais rendue à la page elle-même (`camera=(self)`) ; micro et géolocalisation
restent fermés, toute autre page garde `camera=()`, et l'autorisation du patient reste
demandée par le navigateur. Un E2E neuf (`e2e/portail-permissions-camera.spec.ts`)
vérifie l'en-tête sur une vraie réponse, en un seul exemplaire.
