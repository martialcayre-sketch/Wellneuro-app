# Lexique UX WellNeuro — HC-F

Vocabulaire canonique de l'espace praticien et du portail patient, tel
qu'implémenté à l'issue de la campagne HC-F (LOT-00 à LOT-05). Source :
grep du code réel (`web/src/app/portail/`, `web/src/components/patient/`),
`docs/claude/REGISTRE_FRONTIERES.md` (invariants projet) et
`sources/04_GOUVERNANCE_UX_FUTURE.md` §12 (cadrage initial). En cas de
divergence entre ce document et le code, le code fait foi — signaler l'écart
plutôt que le corriger silencieusement.

## Termes praticien autorisés

- « Patients », « Fiche patient », « Consultations », « Synthèse IA »,
  « Paramètres » — libellés du rail de navigation (`SidebarRail.tsx`,
  `MobileBottomNav.tsx`).
- « Mode consultation » — bascule d'affichage de la fiche patient
  (`ModeConsultation`, cf. `design-system-d1.md` §4bis).
- « Voir ce que recevra le patient » — déclencheur de `PatientPreview`.
- « recommandation », « protocole personnalisé », « indice de suivi »,
  « explorations à discuter avec le médecin traitant » — vocabulaire
  réglementaire imposé (`REGISTRE_FRONTIERES.md` §1).

## Termes patient autorisés

- « Mes questionnaires » (hub), « Accéder à mon espace » (gate email).
- « Brouillon enregistré », « Reprendre » — reprise de saisie.
- « Consulter », « Corriger » — actions sur un questionnaire selon son statut.
- « Préparation de votre bilan » — étape future sans délai promis (cf.
  `sources/04_GOUVERNANCE_UX_FUTURE.md` §12).

## Statuts (badges patient, `questionnaires/page.tsx`)

| Statut technique | Libellé affiché | Variante |
|---|---|---|
| non commencé / brouillon | `À compléter` (ou `Brouillon enregistré` si un brouillon existe) | neutre |
| `modification_demandee` | `Correction demandée` | warning |
| déverrouillé, à reprendre | `Déverrouillé par le praticien` | warning |
| transmis, non verrouillé pour correction | `Transmis au praticien` | info |

Ne jamais afficher le statut technique brut (`modification_demandee`, etc.)
côté patient — toujours passer par ce tableau.

## Sauvegarde, synchronisation, transmission (`SaveStatusIndicator.tsx`)

- **`Brouillon enregistré sur cet appareil — dernière sauvegarde à HH:MM. Il
  ne sera transmis à votre praticien qu'après validation.`** — conservation
  locale uniquement, hors erreur.
- **`Connexion interrompue — vos réponses restent conservées sur cet
  appareil.`** — erreur réseau (`error: 'network'`).
- **`Transmission non terminée — vos réponses restent conservées sur cet
  appareil.`** — échec de soumission (`error: 'submission-incomplete'`).
- **`Synchronisé`** — **n'existe pas dans l'implémentation actuelle** :
  aucune sauvegarde serveur de brouillon n'existe réellement (seule la
  transmission finale est persistante côté serveur). Ne pas l'introduire
  sans qu'une vraie persistance serveur du brouillon existe — l'afficher
  sans ce backend mentirait sur l'état réel des données (cf. commentaire
  source, `SaveStatusIndicator.tsx`).
- **`Transmis au praticien`** — état final, réponses envoyées et verrouillées
  côté serveur.

## Brouillon / validation / envoi

- **Brouillon** : saisie locale, non transmise, modifiable librement.
- **Validation** (onboarding) : action qui crée les assignations depuis le
  pack par défaut — n'implique pas encore de transmission de réponses.
- **Transmission** / **envoi** : action irréversible côté patient (verrouille
  le questionnaire), déclenche la visibilité côté praticien.
- **Correction** : réponses re-soumises après une demande de modification ou
  un déverrouillage praticien — nouvelle version, pas un nouvel objet.

## Messages d'erreur

- Toujours préciser : ce qui s'est passé, si les réponses sont conservées,
  l'action possible (cf. `PatientErrorState.tsx`, `LOT-04-portail-patient-clair.md`
  § États vides et erreurs).
- Éviter les codes techniques (`400`, `409`, noms de route API) dans le texte
  visible ; ceux-ci restent en commentaire/log serveur uniquement.

## Confirmations

- Dialogs accessibles (`PatientConfirmDialog.tsx`) pour toute action
  irréversible (transmission, reset d'un brouillon) — jamais de `confirm()`
  natif dans le portail.
- Ne jamais afficher une confirmation de succès avant que l'action serveur
  ait réellement abouti (pas d'optimistic UI trompeur sur transmission).

## Formulations à éviter

- « Enregistré » seul, si la donnée n'est que locale (interdit explicite
  LOT-04) — toujours qualifier (« sur cet appareil », « transmis »).
- « prescription », « ordonnance », « diagnostic », « NeuroScore » —
  interdits projet (`REGISTRE_FRONTIERES.md` §1), y compris en dehors du
  périmètre HC-F.
- « Dogné » (avec accent) — orthographe fautive du patient fictif ; la forme
  correcte est **Michel Dogne** (sans accent).
- Score brut, valeur clinique ou statut technique interne affiché sans
  traduction patient (cf. tableau des statuts ci-dessus).
- Délai de traitement promis et non maîtrisé (« sous 48h », etc.) pour les
  étapes futures du parcours patient.
