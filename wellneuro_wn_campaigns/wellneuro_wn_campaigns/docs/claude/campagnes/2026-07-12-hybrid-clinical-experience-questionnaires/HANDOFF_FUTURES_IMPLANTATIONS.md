# Handoff HC-F → campagnes futures

Ce document est la checklist de conformité **opposable** à tout module
futur qui se réclame « Hybrid Clinical » (shell praticien, portail patient,
ou toute nouvelle surface UI de WellNeuro). Il consolide les livrables
LOT-00 à LOT-05 ; en cas de doute, la source canonique reste
`docs/design-system-d1.md`.

## Composants obligatoires

Toute nouvelle page/surface doit réutiliser, sans dupliquer :

- **Tokens** : sémantiques (`background`, `surface`, `foreground`,
  `muted*`, `border`, `primary*`, `accent*`, `status-*`, `focus-ring`) et,
  pour toute UI de navigation praticien, le namespace `--rail-*` dédié
  (jamais `data-theme` seul) — `design-system-d1.md` §1.
- **Primitives patient** : `PatientCard`, `PatientButton`, `PatientField`,
  `PatientInlineMessage`, `PatientPageHeader` (`web/src/components/patient/ui/`)
  pour toute nouvelle page du portail — pas de nouvelle primitive concurrente
  sans justification documentée.
- **Enveloppe patient commune** posée par `web/src/app/portail/layout.tsx`.
- **Primitives Radix/shadcn sélectionnées** pour tout comportement accessible
  complexe (dialog, sheet, dropdown, tabs, tooltip) — jamais d'overlay fait
  main. **Piège obligatoire à reproduire** : poser `data-theme="praticien"`
  directement sur `Dialog.Overlay`/`Dialog.Content` (les portails Radix
  rendent hors du conteneur thème) — `design-system-d1.md` §4.
- **Lucide React** pour les icônes ; **Motion** uniquement si une transition
  explique un changement d'état (jamais décoratif permanent).

## Contrats d'instanciation des 3 mécanismes

Référence unique : `docs/design-system-d1.md` §4bis (ne pas dupliquer les
signatures ailleurs). Résumé :

| Mécanisme | Composant | Contenu clinique fourni par |
|---|---|---|
| Mode consultation | `web/src/components/ui/ModeConsultation.tsx` | l'appelant (`children`), état géré par l'appelant |
| Double niveau de lecture | `web/src/components/ui/TwoLevelReading.tsx` | l'appelant (`summary`/`detail`) |
| Prévisualisation patient | `web/src/components/PatientPreview.tsx` | rendu par réutilisation stricte de `ConsultationScreen.tsx` (aucun contenu propre) |

Garde-fou : toute divergence entre `PatientPreview` et le portail réel doit
être documentée et testée avant merge.

## Capacités réellement livrées (HC-F)

- Shell praticien premium (rail sombre structurel + espace de travail
  clair), navigation desktop/tablette/mobile accessible (focus trap, Escape,
  retour de focus).
- Portail patient clair fixe : onboarding (fiche, anamnèse), hub orienté
  action, lecture seule/correction, résumé de session fondé sur des faits,
  distinction conservation locale / transmission (« Synchronisé » n'existe
  pas encore, cf. `LEXIQUE_UX_WELLNEURO.md`), confort de lecture, états
  vides/erreurs actionnables.
- 3 mécanismes transverses livrés vides et testés (voir tableau ci-dessus).
- Lexique UX praticien/patient (`LEXIQUE_UX_WELLNEURO.md`).
- Palette de commandes praticien : **différée**, non livrée (arbitrage
  LOT-00, confirmé non révisé en LOT-02).

## Capacités différées et prérequis

- **Comparateur avant/maintenant, timeline, carte de décision, constructeur
  21 jours** : hors périmètre HC-F par construction (`CAMPAGNE.md` § Hors
  périmètre). Prérequis pour C1/C2 : consommer les tokens/primitives ci-dessus
  et, pour tout contenu à deux niveaux de lecture, `TwoLevelReading` plutôt
  qu'un composant ad hoc.
- **Mode consultation *rempli*** (contenu cockpit/carte de décision) :
  HC-F livre l'enveloppe vide (`ModeConsultation`) ; le contenu est un
  intrant C1/C2 (registre `REGISTRE_FRONTIERES.md` §A2).
- **`MonEquilibreAccueil`/`Detail`** : même problème d'auto-fetch patient-only
  que `ConsultationScreen.tsx` avant LOT-03, non résolu par `PatientPreview`
  — classé Vague 2 dans `MATRICE_ECRANS_MIGRATION.md`, à traiter avant toute
  prévisualisation praticien de ces écrans.
- **Palette de commandes praticien** : arbitrage différé, aucun prérequis
  technique bloquant identifié si un futur lot souhaite la livrer.
- **Persistance serveur du brouillon patient** (« Synchronisé ») : n'existe
  pas ; tout module qui en aurait besoin doit la construire (hors HC-F,
  potentiel intrant C2) et ne doit pas afficher « Synchronisé » sans elle.

## Dépendances avec les campagnes suivantes

- **C1** (Décision clinique 21 jours V1) : consomme `ModeConsultation` et
  `TwoLevelReading` comme enveloppes pour son propre contenu (cockpit, carte
  de décision). Aucune dépendance technique bloquante restante côté HC-F.
- **QX** (moteur de rendu des questionnaires) : consomme les primitives
  patient (`web/src/components/patient/ui/`) et l'enveloppe portail
  (`portail/layout.tsx`) pour tout nouveau rendu de questionnaire. Aucune
  dépendance technique bloquante restante côté HC-F ; `GenericQuestionnaire.tsx`
  reste le point d'entrée actuel, à faire évoluer par QX plutôt que dupliquer.
- **C3** (documents multi-destinataires) : hors périmètre HC-F, aucun contrat
  préparé — à cadrer entièrement par C3.

## Checklist de conformité opposable (critères vérifiables)

Un futur module ne peut se réclamer « Hybrid Clinical » que s'il satisfait,
mesurablement :

- [ ] Aucun token de couleur en dur — uniquement les tokens sémantiques ou
      `--rail-*` listés dans `design-system-d1.md` §1/§1bis.
- [ ] Aucune nouvelle primitive d'overlay faite main si Radix/shadcn couvre
      le besoin.
- [ ] `data-theme="praticien"` posé sur tout contenu porté par un portail
      Radix consommant les tokens `--rail-*`.
- [ ] Aucun texte visible utilisateur hors français.
- [ ] Aucun statut technique interne affiché tel quel côté patient (passer
      par une table de traduction comme `LEXIQUE_UX_WELLNEURO.md`).
- [ ] Tout seuil/zone clinique signalé par autre chose que la seule couleur.
- [ ] Zones tactiles ≥ 44×44px, navigation clavier complète, focus visible.
- [ ] `bash scripts/check_no_secrets.sh`, `type-check`, `lint`, tests
      unitaires et e2e exécutés et consignés (résultats réels, jamais
      supposés) avant toute clôture de lot.

## Campagne suivante recommandée

**C1** (Décision clinique 21 jours V1) peut démarrer immédiatement — sa
dépendance HC-F LOT-02 est satisfaite depuis LOT-02. **QX** peut démarrer
immédiatement — sa dépendance HC-F LOT-01 + LOT-04 est satisfaite. Les deux
sont parallélisables entre elles (`README.md` de la campagne active).
