### `acces_portail` v2 — l'e-mail d'ouverture d'accès dit enfin qui l'envoie (2026-09-04)

Le texte servi depuis le 2026-07-08 ouvrait un accès sans jamais nommer celui
qui l'ouvre : « Votre praticien vous ouvre l'accès » à la troisième personne,
signé « L'équipe Wellneuro » — une entreprise que le patient n'a jamais
rencontrée, sur un domaine qu'il ne connaît pas, à propos d'un service dont le
prix n'était pas dit. Les cinq dossiers ouverts entre le 2026-08-20 et le
2026-09-04 ont reçu ce message ; aucun n'a ouvert son espace. Cette lecture ne
prouve rien à elle seule — mais le texte, lui, était bel et bien ambigu.

- **Le message nomme son expéditeur** : « Je vous ouvre l'accès », signé
  Martial Cayre, Docteur en Pharmacie, praticien en santé fonctionnelle
  labellisé Neuro-Nutrition® (Institut SIIN), avec une phrase qui dit que
  `wellneuro.fr` est son site et que les
  messages venus de `noreply@wellneuro.fr` viennent de son cabinet. L'objet
  porte son nom — ce que le patient reconnaît avant d'ouvrir.
- **La gratuité est dite en toutes lettres**, avec l'engagement de ne jamais
  demander de coordonnées bancaires ni de mot de passe. Le silence du texte v1
  sur le prix était la moitié de l'ambiguïté.
- **L'adresse à taper soi-même** (`app.wellneuro.fr`) accompagne le lien : un
  message qui rassure sur l'hameçonnage et n'offre qu'un lien à cliquer se
  contredit. Et « questionnaire d'anamnèse » devient « quelques questions sur
  ce qui vous amène » — un mot du métier remplacé par un mot du patient.
- **Premier gabarit du registre à porter une validation formelle** :
  `valideLe` valait `null` sur les huit versions publiées. Le champ existait
  pour cet acte, il n'avait jamais servi. Un banc dédié échoue si une
  validation apparaît ailleurs sans décision.
- **Append-only respecté** : la v2 s'ajoute en fin de liste, la v1 reste au
  registre, inerte, et son banc de fidélité au texte inline historique est
  épinglé sur la version 1 — `getGabarit` rend désormais la v2.

- **Le canal de réponse existe pour de bon** : `sendPortailLinkEmail` pose
  désormais un `Reply-To` alimenté par `patients.praticien_email`, contrôlé de
  forme avant de devenir un en-tête (une ligne héritée porteuse d'un caractère
  de contrôle est écartée, et l'e-mail part sans l'en-tête plutôt que pas du
  tout). L'expéditeur ne bouge pas — `noreply@wellneuro.fr` reste le canal de
  service et l'alignement SPF du domaine tient sur lui ; seule la destination
  d'une réponse change. Le corps garde l'adresse en clair : l'en-tête sert le
  geste réflexe, le texte reste lisible là où le client masque le `Reply-To`.

**La qualité du praticien est écrite dans les termes de celui qui la délivre**,
vérifiés sur le site de l'Institut SIIN le 2026-09-04. « Neuro-Nutrition® »
prend un trait d'union — la page déclare son usage « strictement encadré », et
sur une marque déposée l'orthographe n'est pas une préférence. L'institut
**délivre** le label (« Label Neuro-Nutrition® (NN®) »), il n'**est** pas le
label : une première rédaction disait « label S.I.I.N. », inversant les deux.
Le texte énonce un diplôme et un label, et rien de plus — le SIIN ne revendique
aucune reconnaissance par l'État ni par les autorités de santé, sa seule
certification étant Qualiopi au titre des actions de formation. Trois bancs
gardent l'orthographe et l'attribution.

**Deux phrases retirées en revue adversariale**, toutes deux fausses et
invisibles au banc — un gabarit se relit seul, ce qu'il promet vit ailleurs.
« Vous pouvez aussi taper app.wellneuro.fr : c'est la même page » : la racine
redirige hors session vers `/login`, l'écran **praticien**, dont le seul bouton
passe par `ALLOWED_DOMAINS = ['wellneuro.fr']` et refuse tout compte Google
personnel. La phrase existait pour rassurer contre l'hameçonnage : elle envoyait
au mur le patient le plus méfiant, celui qui tape plutôt que de cliquer. Le
texte pointe désormais l'URL rendue par `{{connexion}}`, qui est bien la sienne.
« Sans échéance » : `SEGMENTS_GABARITS.dateLimite` est servi par les trois
gabarits d'assignation, et la promesse portait nommément sur les questionnaires.
Deux bancs de non-régression gardent ces formulations hors du registre.

Une dette assumée, écrite au registre : **le nom du praticien est en dur** dans
le texte. Un gabarit qui dirait `{{praticien}}` ne dirait plus « c'est moi », et
c'est tout l'objet de cette version — mais un second compte praticien imposera
la variable, alimentée par un nom d'affichage qui n'existe pas en base, les
dossiers ne portant que `praticienEmail`. L'en-tête `Reply-To`, lui, est déjà
par dossier : il n'a pas eu besoin d'attendre.

Le texte part par « Renvoyer l'accès » depuis la fiche patient, ou à la
création d'une consultation — une assignation envoie un autre gabarit
(`assignation_pack`).
