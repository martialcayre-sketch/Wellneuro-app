### LOT-03 — l'information des personnes est consignée, le dossier RGPD dit l'état réel

- **Le trou « le plus coûteux du dossier » se comble à moitié, et le dossier
  dit laquelle** : la rubrique 11 de `docs/DOSSIER_RGPD.md` portait
  « information sur l'écart HDS consignée nulle part — ni date, ni forme, ni
  contenu, ni modalité de retrait ». Sur déclaration du responsable de
  traitement (session du 2026-08-19), **la forme (orale, en consultation) et
  le contenu** sont consignés — cette déclaration est la seule source, il
  n'existe aucune trace au dépôt de l'information elle-même. **Restent
  ouverts, chacun avec sa ligne au §14** : la date de délivrance (l'ancrage
  déclaré « depuis la souscription HDS » n'est pas tenu pour établi — le
  dépôt refuse l'inférence de souscription, et aucune option HDS n'est active
  sans annexe signée), la modalité de retrait, l'absence de trace écrite par
  participant, et le périmètre des personnes couvertes.
- **`D-078` rend cette information à renouveler** : elle décrit un état
  antérieur (l'écart a changé de nature — migration engagée, fenêtre de
  moindre couverture). Un support est **préparé, pas publié** :
  `sources/brouillon-information-hebergement-v2.md`, avec ses quatre réserves
  au rédacteur ; sa publication (v2 du document versionné, re-acquittement
  éventuel) est un **lot TRUST distinct**.
- **Trois échéances réconciliées au tableau §14** (qui fait foi) : rubrique 11
  passe de « au plus tôt » (échue) à consignée, son renouvellement **indexé
  sur la bascule** — c'est elle qui ouvre la fenêtre de moindre couverture,
  pas le 2026-10-21 ; la ligne DPA passe de « avant bascule Scalingo » —
  ordre suspendu par `D-078` — à « dès réception de l'annexe, et en tout état
  de cause avant tout décommissionnement » ; et **la ligne « preuve
  fonctionnelle de la piste d'audit » était échue sans que personne l'ait
  relevé** — son échéance « premier dossier ouvert » est dépassée depuis que
  des dossiers réels sont utilisés (`D-075`, `D-077`) : annotée, reportée.
- **§6 et §12 annotés sans rien effacer** : la condition `D-037` « avant toute
  donnée réelle » et l'ordre imposé de `D-006` portent leur suspension par
  `D-078` ; §12 gagne l'état du jour — levée par écart assumé, sept exigences
  inchangées, fenêtre moins couverte acceptée sciemment, revue au 2026-10-21.
  La formule qui tient le dossier est conservée : « ce n'est pas une
  conformité, c'est un écart assumé, compté et daté ».
- **`CHECKLIST_FINALISATION.md` §F** : l'acte de levée est coché — avec la
  mention de ce qu'il n'est pas (levée par écart assumé, pas de conformité) ;
  l'arbitrage fournisseur est noté rendu, sa case reste **ouverte** — c'est la
  signature qui la ferme.
- **Rien de ce qui relève d'un conseil qualifié n'a été écrit** : base légale,
  mécanisme de transfert et AIPD restent des trous ouverts, avec leur porteur.
- **Ce que la revue (`wn-reviewer`) a changé — six bloquants, refermés** : le
  trou de la rubrique 11 était barré en entier alors que deux de ses quatre
  composantes restaient ouvertes ; l'ancrage « depuis la souscription HDS »
  reprenait l'inférence que `D-047` a démentie et que le runbook refuse
  (« une souscription inférée n'est pas une preuve produite ») ; le
  provisionnement du staging était juxtaposé comme s'il datait l'information ;
  le renouvellement était calé sur le 2026-10-21 alors que `D-078` rend
  l'information *plus* exigeante et que la fenêtre s'ouvre à la bascule ;
  l'absence de trace écrite ne vivait qu'en prose, hors du tableau qui fait
  foi ; et une case cochée affirmait qu'aucune échéance n'était passée — la
  piste d'audit démentait. Côté brouillon : la fenêtre de moindre couverture
  était tue par le texte qui existait pour la dire, l'affirmation « Sentry ne
  reçoit jamais » n'est pas soutenue par le code (messages d'exception et
  breadcrumbs non nettoyés) et « vos données restent dans l'UE » ignorait le
  transfert IA hors UE.
