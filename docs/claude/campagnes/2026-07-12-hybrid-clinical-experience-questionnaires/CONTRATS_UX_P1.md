# CONTRATS_UX_P1 — LOT-00 HC-F

Brouillon des contrats d'instanciation des 3 mécanismes transverses que
HC-F doit livrer **vides et testés** (aucun contenu clinique, cf.
`CAMPAGNE.md` : « HC-F ne conçoit aucun contenu clinique »). **À valider par
l'utilisateur avant LOT-02** — ce sont des propositions, pas des décisions
actées.

## 1. `ModeConsultation`

**Périmètre minimal proposé** (audit §2/§5) : un mode d'affichage de la
fiche patient qui bascule l'espace de travail vers une mise en page pensée
pour l'entretien (moins de densité, actions rapides), sans dupliquer
`FichePatientPanel.tsx` — c'est une variante de présentation du même
contrat de données, pas un nouveau composant de données.

Contrat d'instanciation proposé :

```ts
type ConsultationModeProps = {
  active: boolean;
  onToggle: () => void;
  // Le contenu instancié (cockpit, carte de décision) est fourni par
  // l'appelant (C1) — HC-F ne fournit que l'enveloppe et la bascule.
  children: React.ReactNode;
};
```

Page d'instanciation de référence : `dashboard/patients/[idPatient]`
(la seule où le mode a un sens aujourd'hui, cf. `FichePatientPanel.tsx`).

**Question ouverte pour arbitrage** : le déclenchement se fait-il par un
bouton dans le header de fiche patient, ou par un raccourci clavier
également ? (cf. `ARBITRAGES_LOT_00.md`)

## 2. Double niveau de lecture

**Périmètre minimal proposé** : un mécanisme générique permettant d'afficher
une information à deux niveaux de détail (résumé visible par défaut, détail
accessible sur demande), réutilisable pour n'importe quel futur contenu
(carte de décision, momentum, etc.) sans connaître leur contenu clinique.

Contrat d'instanciation proposé :

```ts
type TwoLevelReadingProps = {
  summary: React.ReactNode;
  detail: React.ReactNode;
  defaultExpanded?: boolean;
  label: string; // libellé accessible du contrôle d'expansion
};
```

Page d'instanciation de référence : à définir par C1 (pas de page HC-F
propre — mécanisme pur, testé isolément avec un contenu factice neutre,
p. ex. « Résumé » / « Détail » sans donnée patient).

## 3. `PrévisualisationPatient`

**Périmètre minimal proposé** (audit §3, cohérence avec portail) : un
rendu qui réutilise les **mêmes composants/tokens** que le portail patient
réel, pour que « Voir ce que recevra le patient » ne soit jamais un rendu
divergent. S'appuie sur le contrat déjà présent côté portail
(`ConsultationScreen.tsx` : lecture seule, pas de score brut affiché — cf.
point de risque audit §4, qui montre que la route API, elle, expose déjà
plus que l'UI n'affiche : la prévisualisation doit répliquer l'UI patient
réelle, pas l'API brute).

Contrat d'instanciation proposé :

```ts
type PatientPreviewProps = {
  patientId: string;
  assignationId: string;
  // Rend le même composant que `portail/[token]/questionnaires/[idAssignation]`
  // en mode lecture seule, avec les mêmes garde-fous patient-safe.
};
```

Page d'instanciation de référence : `dashboard/patients/[idPatient]`
(bouton « Voir ce que recevra le patient »).

**Garde-fou explicite** : toute divergence entre la prévisualisation et le
portail réel doit être documentée et testée (déjà exigé par `CAMPAGNE.md`
LOT-04).
