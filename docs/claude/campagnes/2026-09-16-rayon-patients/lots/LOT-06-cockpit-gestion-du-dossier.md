---
id: "LOT-06"
titre: "Le cockpit porte la gestion du dossier"
statut: "à faire"
dépend_de: "LOT-02, LOT-05"
---

# LOT-06 — Le cockpit porte la gestion du dossier

## But

La phase « Patient » du poste de pilotage porte enfin le dossier : identité
complète, état, et les gestes qui pèsent sur l'accès et la fin de parcours.
C'est la demande d'origine du responsable.

## Périmètre

- `FichePatientPanel.tsx`, branche `phaseActive === 'patient'` (l. 1588-1605) :
  la carte nom/e-mail cède la place à `FicheAdministrativePanel`, puis à l'état
  du dossier (actif / suivi clôturé / accès révoqué) et à ses gestes. La ligne
  d'état des renseignements (LOT-02) et les deux blocs existants — demandes de
  correction, questionnaires échus — **restent en place** : ils y sont chez eux.
- Extraire de `PatientsPanel` un hook `usePatientGestesDossier(patient)` :
  - accès portail — `POST`/`DELETE /api/praticien/token` : renvoyer, copier,
    lien à usage unique, révoquer ;
  - fin de parcours — `/api/praticien/patients/cycle-de-vie` : clôturer,
    rouvrir, effacer ; `PATCH` pour désactiver / réactiver.
  `MenuActions` et `DossierConfirmDialog` restent inchangés.
- Rayon Patients et cockpit consomment le **même** hook : une seule
  implémentation des gestes irréversibles, et non deux qui dériveront.

## Contraintes dites

- La fiche du cockpit lit le dossier par `GET /api/praticien/patients`, pas par
  un élargissement du DTO de `/api/praticien/equilibre`, qui sert le clinique.
- Les trois actions d'accès restent **fermées sur un dossier désactivé** et
  **ouvertes sur un dossier clos** : la clôture interdit les assignations et les
  envois, pas la lecture. Règle déjà tenue par `PatientRow`, à ne pas perdre au
  passage.
- `D-126` : désactiver ferme les liens en vol, geste irréversible. Aucun chemin
  ne doit permettre de le déclencher sans dialogue de confirmation — c'est
  précisément le défaut que le formulaire d'édition avait, et qui a été corrigé.

## Done

- Banc de composant sur la zone focale : les gestes sont présents, le dialogue
  s'interpose, un dossier désactivé n'offre pas les actions d'accès.
- Aucun cas perdu des bancs de `PatientsPanel` sur le cycle de vie.
- T2 vert ; baseline `fiche-cockpit` régénérée.
