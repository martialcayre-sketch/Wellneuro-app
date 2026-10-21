### Portail : « Ce qui compte » garde son brouillon sur l'appareil (t06)

- Ce qui est rédigé dans « Ce qui compte pour moi aujourd'hui » et pas encore
  envoyé survit désormais au rechargement et à la fermeture de l'onglet :
  brouillon local (`lib/patient/ceQuiCompteBrouillon.ts`), sous l'identité de
  la session lue dans le cookie signé (jamais le jeton de l'URL), 30 jours
  au plus, effacé après confirmation du dépôt et conservé sur erreur. Le
  patient lit « Brouillon restauré sur cet appareil. » à la reprise. La
  famille de clés est inscrite à `FAMILLES_DONNEES_PATIENT` : « Se
  déconnecter » l'annonce et l'emporte. Arbitrage du 2026-10-21 : pas de
  persistance serveur, multi-appareil hors périmètre ; le corps envoyé ne
  change pas. Sans migration.
