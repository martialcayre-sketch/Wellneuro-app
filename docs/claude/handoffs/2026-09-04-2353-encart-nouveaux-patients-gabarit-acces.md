# Handoff — 2026-09-04 — Mise en service des dossiers neufs : l'encart et le courrier

## Branche et état Git

`main` à `e38d07c8` (#869) puis `1d2fcb0f`. Deux PR ouvertes et mergées dans la
session : **#868** (`f840cfb6`) et **#869** (`e38d07c8`). Branches distantes
supprimées. Aucun travail en cours.

## Objectif

Question praticien : cinq dossiers ouverts depuis le 2026-08-20 ont-ils reçu
leur e-mail d'accès et leur pack de base ? (« je n'ai pas de retour »)

## Ce que la production a dit

Lecture par one-off Scalingo (`psql`, e-mails masqués). **Les cinq e-mails
`acces_portail` sont partis, statut `Envoye`, aucune erreur SMTP. Aucun des
cinq n'est jamais entré dans le portail** — zéro lien magique consommé, zéro
connexion Google. Les cinq consultations sont restées `statut = creee`,
`consentement = non_donne`. Donc aucun pack : il n'est assigné qu'à
`api/portail/valider`, c'est-à-dire quand le PATIENT valide son onboarding.

Le produit fonctionnait comme spécifié. C'est la spécification qui ne rendait
compte de rien.

## Décisions prises

- **Trois portes séparent la création d'un dossier de son existence clinique**
  (e-mail à la création de la CONSULTATION, entrée au portail, pack à la
  validation patient). Un dossier resté derrière l'une d'elles est
  indiscernable d'un dossier qui commence. → encart `NouveauxPatientsAside`,
  qui nomme la PREMIÈRE porte fermée (#868).
- **L'encart montre, il n'agit pas** : renvoyer un accès et assigner un pack
  restent au dossier. Aucune surface d'action dupliquée.
- **Gabarit `acces_portail` v2** (#869) : le texte nomme son expéditeur et sa
  qualité, dit la gratuité, invite à taper soi-même l'adresse de connexion.
  Premier gabarit du registre à porter un `valideLe` — le champ existait depuis
  huit versions sans avoir jamais servi.
- **`Reply-To` alimenté par `patients.praticien_email`**, contrôlé de forme et
  borné à 254. L'expéditeur ne bouge pas (`noreply@`, alignement SPF).
- **Deux PR et non une** : « un diff d'une seule finalité ».

## Options écartées, et pourquoi

- **Un e-mail ponctuel aux cinq patients** (rédigé, non envoyé) : arbitrage
  praticien — reformuler le gabarit sert aussi tous les patients à venir.
- **`{{praticien}}` en variable** : un gabarit qui dirait ça ne dirait plus
  « c'est moi ». Nom en dur, dette écrite au registre ; un second compte
  praticien imposera la variable (les dossiers ne portent que `praticienEmail`,
  pas de nom d'affichage).
- **Restaurer le CRLF de `consultations/route.ts`** : `.gitattributes` impose
  `text=auto eol=lf`, toute écriture renormalise. Diff de 380 lignes assumé et
  documenté dans la PR.

## Ce que la revue adversariale a trouvé (verdict initial NO-GO)

Passe exigée par `REGLES_PR_MERGE.md` (chemin session/token). Aucun défaut de
sécurité — injection d'en-tête non exploitable, garde d'appartenance et
append-only intacts. **Deux promesses fausses**, invisibles à tout banc :

- « taper app.wellneuro.fr : c'est la même page » — la racine redirige hors
  session vers `/login`, l'écran PRATICIEN, qui refuse tout compte Google
  personnel. La phrase existait pour rassurer contre l'hameçonnage : elle
  envoyait au mur le patient le plus méfiant.
- « sans échéance » — `SEGMENTS_GABARITS.dateLimite` est servi par les trois
  gabarits d'assignation.

Corrigées, avec bancs de non-régression. La leçon : **un gabarit se relit seul,
ce qu'il promet vit ailleurs dans le dépôt.**

## Fichiers

#868 — `lib/fil/nouveauxPatients.ts`, `api/praticien/nouveaux-patients/`,
`components/fil/NouveauxPatientsAside.tsx`, `app/dashboard/page.tsx` (+ bancs).
#869 — `lib/correspondance/registreGabarits.ts`, `lib/consultation/email.ts`,
`api/praticien/{consultations,token}/route.ts`,
`lib/doctrine/seuilsLitterauxMotives.guard.test.ts` (+ bancs).

## Validations exécutées

T1 vert ; T2 vert (477/480 fichiers selon la branche, 6326 tests) ;
`next build` exit 0 ; `wn-attendre-ci.mjs` sortie `0` sur les deux PR, `verify`
constaté réellement tourné. Trois drapeaux d'entrée portail contrôlés en
production : `WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`,
`WN_G5_GOOGLE_PATIENT` — tous à `true`.

## Problèmes ouverts

- **Le sujet du gabarit v2 quitte la convention `— Wellneuro`** du dépôt
  (`relanceEmail.test.ts` l'impose pour lui-même). Aucun banc ne l'applique au
  registre ; la convention n'est plus vraie pour autant.
- **La déclaration `donneesSante: 'conforme'` reste auto-déclarative** : aucun
  banc de CONTENU sur le registre, alors que `relanceEmail.test.ts` en porte un.
- **Première `valideLe` du registre sans `D-xxx`** — arbitrage praticien daté,
  pas de numéro de décision.
- **Délivrabilité non écartée** : si les cinq ne bougent pas après le renvoi,
  regarder SPF/DKIM sur `noreply@wellneuro.fr`.

## Prochaine action exacte

Après déploiement : **« Renvoyer l'accès » depuis la fiche de chacun des cinq
dossiers** — c'est le seul geste qui rejoue `acces_portail`. Une assignation
enverrait `assignation_pack` ; une nouvelle consultation ouvrirait un second
onboarding.

## Interdits encore actifs

Aucune identité patient dans le dépôt. Lecture de la production par conteneur
one-off uniquement, e-mails masqués. Pas de migration ni de `schema.prisma` —
aucune n'a été touchée de la session.
