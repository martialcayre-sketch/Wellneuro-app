### Synthèse : « vider » et l'envoi du booklet passent sous le même verrou du dossier (file D, 2026-11-17)

- « Vider » une synthèse (PATCH `api/praticien/synthese`, action `effacer`)
  vérifiait hors verrou que son booklet n'était pas parti. L'envoi du
  booklet (`api/praticien/booklet`) ne prenait pas le verrou du dossier. Un
  booklet pouvait donc partir d'une synthèse vidée entre-temps. Démontré
  dans le code, sans occurrence observée.
- « Vider » contrôle désormais le booklet sous le verrou que prennent
  l'impression et les autres actions (#2221, #2226). Il compte les envois
  partis et ceux en partance, et le message de refus est inchangé.
- L'envoi prend ce verrou juste après celui du bilan. Il relit la synthèse sous
  lui : si elle a changé depuis la lecture qui a servi au document, il
  refuse (409, « La synthèse a été modifiée entre-temps. Rechargez-la avant
  de recommencer. ») et rien ne part. Il réserve ensuite sa ligne de
  journal avant l'e-mail. Le renvoi confirmé la réserve aussi, sans lire le
  registre : il part toujours, même si un autre vient de partir.
- Le renvoi réservé amende D-399 (en-tête et §5) par une note datée. Une
  ligne de bilan restée marquée (processus arrêté) empêche désormais aussi
  de vider la synthèse : c'est le sens prudent de D-399.
