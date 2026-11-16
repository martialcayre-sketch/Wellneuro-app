### Refonte Lien, PAT-7a : cibles de 44 px au portail patient — listes déroulantes, cases du carnet, liens isolés, rail (2026-11-16)

Troisième lot de correction issu du constat de PAT-7 en partie
(`pat7-constat-partiel.md` §3.1, §3.2, §3.6), après PAT-7b et PAT-7c, sur le
choix du responsable du 2026-11-16 (`20261116-0948-d`, puis
`20261116-1509-d`). Aucun texte neuf : des classes seules.

La mesure demandée d'abord a été faite : la zone cliquable de chaque contrôle
natif, libellé compris. Les cases de consentement (U11, U12), les radios et le
champ fichier du dépôt (U33) et les radios de la fiche de renseignements
(U35) atteignent déjà 44 px par leur libellé : ils restent tels quels.

- **Champs du portail** : `patientInputClassName` porte une hauteur minimale
  de 44 px ; les listes déroulantes (la classe commune et celle des
  questionnaires) une hauteur de 44 px, car WebKit ignore `min-height` sur un
  `<select>` natif. Sous WebKit, au téléphone, les sept listes du carnet
  alimentaire (U22) faisaient 24 px ; le libellé d'une liste ne l'ouvre pas, il
  ne compte pas.
- **Carnet alimentaire (U22)** : les cases dont le libellé faisait 23 px
  passent à 44 px.
- **Liens isolés** : « Ensuite » au hub (« Commencer… », « Lire ce que mon
  praticien a compris »), « Consulter les informations détaillées » à
  l'entrée, « Répondre à ce texte » et « Déposer ce qui compte pour moi
  aujourd'hui » au dossier (U25), « ← Mon parcours » et « ← Mon espace »
  (U37, U38), et les lignes du journal des échanges (U36, 41 px) : 44 px de
  haut, comme les autres liens de retour du portail.
- **Rail « Mon espace »** : ses entrées gardent leur `py-1` sans le drapeau des
  icônes ; deux entrées de deux lignes ne se touchent plus.

Reste hors du lot : les liens du pied d'urgence et « Confidentialité et
droits », dans une phrase (exception de WCAG 2.2, texte de sécurité) ; les
débordements à 195 px, au lot PAT-7e. Aucune route, garde, drapeau, schéma ni
règle clinique modifiés ; aucun texte de consentement, de droits ni de
sécurité modifié ; aucun décor avant COM-1.
