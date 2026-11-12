### Refonte Lien, PAT-2 : entrée dans le parcours (D-488, D-481, D-333, 2026-11-12)

Troisième lot du plan patient de la refonte Lien / Empreinte, sur le prototype de la famille, itération 2, arbitré le 2026-11-12 (`Q1a — Q2a — Q3b — Q4a`, puis `Q5a — Q6b — Q7a`, [[D-481]] compléments DOC-3 et DOC-4). C'est un habillage : les routes, les gardes, l'ordre des étapes et les questions restent les mêmes. Aucune migration, aucun drapeau, aucun texte hors de [[D-488]].

- **Textes** ([[D-488]]) :
  - T-31a « Parler de votre situation » devient le titre de l'étape d'entrée, à la place de « Anamnèse ».
  - T-31b « Continuer vers votre situation » devient le libellé du bouton qui y mène.
  - Le reste du vocabulaire du dépôt, côté praticien et dans les gabarits, garde « anamnèse ».
- **Session expirée** (Q5a, T-36) : sous « Session expirée. Reconnectez-vous. », un lien « Me reconnecter » mène à la page de connexion, dans le même onglet.
  - Il paraît sur les réponses 401 de `/api/portail/consentement`, `/fiche` et `/valider`.
  - Par Google, le retour se fait sur `/portail/<idPatient>`, dans ce même onglet, et le brouillon est restauré.
  - Par un lien reçu par e-mail, ouvert en général dans un nouvel onglet, le brouillon ne revient pas.
- **Brouillon de l'entrée** (Q6b, T-37 à T-39) : correctif de comportement.
  - `writeWizardDraft` ne masque plus ses échecs : il rend l'heure de l'écriture réussie, ou rien.
  - La mention de conservation ne paraît qu'après une écriture réussie, avec l'heure de cette écriture. Après un échec, aucune confirmation ne paraît et aucune heure antérieure n'est affichée.
  - La fiche et la situation emploient les formulations « dans cet onglet ». `SaveStatusIndicator` reçoit ses textes par une prop ; ses textes par défaut, « sur cet appareil », restent ceux des questionnaires et des plaintes.
- **Message de sécurité** (Q7a, [[D-277]] §1) : inchangé. Il reste sous la liste des signaux tant que la case est cochée, avec `role="alert"`, sans déplacement ni défilement.
- **Habillage** :
  - Repères « Section i / N » et « Étape n sur 4 » en surtitre, gardés dans l'entrée seule ([[D-333]] §1, famille 1).
  - Consentement présenté sur un fond sable ; son texte ne change pas.
  - Fin de l'entrée : pastille sable avec une coche pétrole, et un bouton principal.
  - Connexion : quand Google et le lien par e-mail sont servis tous les deux, ils ont le même poids et sont séparés d'un filet.
- **Décor** : aucun. `LienDecor` (COM-1) n'existe pas encore sur `main`, et PAT-2 ne crée pas de décor de lui-même ([[D-481]] §1 quater).
