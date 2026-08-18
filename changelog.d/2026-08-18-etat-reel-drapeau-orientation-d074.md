### Corrigé

- **Le drapeau `WN_ENABLE_ORIENTATION_NNPP2` était posé, et deux textes
  affirmaient le contraire** (`D-074`) : `propositionService.ts` justifiait un
  découplage par « drapeau non posé en production », et `FEATURE_FLAGS.md`
  laissait entendre que « seul le drapeau tient encore le verrou ». Le panneau
  d'orientation sert des recommandations en production — or la route ne calcule
  qu'après `orientationActive()` (drapeau `= '1'` ET table signée). Le
  découplage reste juste, mais par l'indépendance des deux surfaces : un état
  qui bascule ne peut pas fonder une décision de conception. Aucun drapeau
  n'est posé ni retiré — la décision constate.

### Documenté

- **Pourquoi le journal d'accès ne suffisait pas à conclure** (`D-074`) : la
  base de production est aussi celle du dev et des E2E, et
  `playwright.config.ts` arme délibérément `WN_ENABLE_ORIENTATION_NNPP2=1`.
  Des accès journalisés sur dossiers fictifs sont donc compatibles avec un
  drapeau éteint chez Vercel — seule l'observation du rendu tranchait. Une
  trace n'est une preuve que si l'on sait qui a pu l'écrire.
- **Un drapeau marqué *sensitive* n'est plus démentable** (`D-074`) : Vercel ne
  réaffiche jamais sa valeur, ce qui a permis à ces affirmations de dériver
  sans contradicteur possible. Troisième cas de la classe après `D-064` et
  `D-070` — réserver *sensitive* aux secrets ; un interrupteur clinique y perd
  sa vérifiabilité.
