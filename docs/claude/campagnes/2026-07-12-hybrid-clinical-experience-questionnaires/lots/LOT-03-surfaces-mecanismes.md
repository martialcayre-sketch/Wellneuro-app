---
id: "LOT-03-surfaces-mecanismes"
titre: "Surfaces praticien génériques et mécanismes transverses"
statut: "à_faire"
dépend_de: ["LOT-02"]
---

# LOT-03 — Surfaces praticien génériques et mécanismes transverses

> Rédigé par LOT-00 à partir de `ARBITRAGES_LOT_00.md` et
> `CONTRATS_UX_P1.md` (ce fichier n'existait pas avant l'amendement de
> `CAMPAGNE.md` — contenu supprimé, jamais réécrit). **Validé par
> l'utilisateur le 2026-07-12** comme base de travail ; l'exécution reste
> conditionnée à l'autorisation explicite de LOT-01 puis LOT-02 au préalable.

## But

Livrer les coquilles des surfaces praticien génériques restantes (dashboard,
annuaire patients) dans le shell premium de LOT-02, et livrer les 3
mécanismes transverses HC-F (`ModeConsultation`, double niveau de lecture,
`PrévisualisationPatient`) **vides et testés**, chacun avec son contrat
d'instanciation documenté dans `CONTRATS_UX_P1.md`.

## Prérequis

- `feat/e0-patients-pagination` doit être mergée avant tout restylage de
  l'annuaire patients (`/dashboard/patients`) — séquencement E0 déjà acté
  dans `PROGRAMME_WELLNEURO_3_0.md`.
- LOT-02 (shell premium) terminé.

## Périmètre proposé

- Coquilles restylées : `/dashboard` (accueil), `/dashboard/patients`
  (annuaire, sous réserve du prérequis E0), `/dashboard/parametres`.
- Mécanisme `ModeConsultation` : enveloppe de bascule de mise en page sur
  `dashboard/patients/[idPatient]`, sans logique clinique (contrat §1 de
  `CONTRATS_UX_P1.md`).
- Mécanisme double niveau de lecture : composant générique résumé/détail,
  testé avec un contenu factice neutre (contrat §2).
- Mécanisme `PrévisualisationPatient` : réutilisation des composants du
  portail réel en lecture seule (contrat §3) — **dépend de la correction du
  point de risque de frontière de données signalé en `AUDIT_UI_REEL.md` §4**
  si la prévisualisation doit s'appuyer sur les mêmes routes API.

## Hors périmètre

- Restylage de `FichePatientPanel.tsx` en tant que futur cockpit (différé,
  cf. `ARBITRAGES_LOT_00.md` §1 — attend le contrat de données C1).
- Tout contenu clinique instancié dans les mécanismes (→ C1).
- Palette de commandes (différée, cf. `ARBITRAGES_LOT_00.md` §4).

## Interdits

- Aucune migration Prisma/SQL.
- Aucune modification de la logique de scoring ou des routes API patient
  (le point de risque `api/patient/reponses` est un correctif séparé, pas
  ce lot).
- Aucun contenu clinique inventé dans les mécanismes livrés.

## Done (brouillon)

- [ ] Contenu de ce lot validé explicitement par l'utilisateur.
- [ ] Coquilles restylées sans régression fonctionnelle.
- [ ] 3 mécanismes livrés vides, testés, avec contrat d'instanciation.
- [ ] Prérequis E0 vérifié avant restylage de l'annuaire.
- [ ] LOT-04 et LOT-05 autorisés.
