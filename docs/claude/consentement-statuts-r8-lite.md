# Consentement patient & schéma des statuts — R8-lite (test réel)

> Document de travail pour la branche `experiment/r8-consent-flow-early-test`.
> À valider par Martial avant intégration au code, puis à copier dans
> `docs/claude/` une fois figé.

---

## 1. Texte de consentement (écran patient, avant tout questionnaire)

**Titre**
Avant de commencer

**Corps**

Vous avez été invité·e par [Nom du praticien] à répondre à un ou plusieurs
questionnaires dans le cadre de WellNeuro, un outil d'accompagnement
bien-être et de suivi personnalisé.

**Ce que nous collectons**
Vos réponses aux questionnaires (habitudes de sommeil, énergie, stress,
et selon les cas d'autres axes de suivi), ainsi que la date de vos
réponses.

**Pourquoi**
Ces réponses permettent à [Nom du praticien] de mieux comprendre votre
situation et de vous proposer des recommandations et un protocole
personnalisé adaptés. Il ne s'agit pas d'un outil de diagnostic médical :
les résultats constituent un indice de suivi destiné à accompagner
l'échange avec votre praticien, pas à le remplacer.

**Qui peut voir vos réponses**
Seul·e [Nom du praticien] a accès à vos réponses. Elles ne sont partagées
avec aucun tiers.

**Combien de temps sont-elles conservées**
Vos réponses sont conservées le temps de votre suivi avec [Nom du
praticien]. Vous pouvez en demander la suppression à tout moment.

**Vos droits**
- Vous pouvez consulter vos réponses à tout moment via ce même lien.
- Vous pouvez demander une modification de vos réponses ; elle sera
  effective après accord de votre praticien.
- Vous pouvez demander la suppression de vos données à tout moment, en
  contactant [Nom du praticien].
- Vous pouvez retirer votre consentement à tout moment, ce qui arrêtera
  la collecte sans affecter les réponses déjà nécessaires au suivi en
  cours.

**Note phase de test**
Cet outil est actuellement en phase de test. Vos retours sur l'usage de
l'outil (pas seulement vos réponses cliniques) sont les bienvenus auprès
de [Nom du praticien].

**Case à cocher (obligatoire)**
☐ J'ai lu ces informations et j'accepte que mes réponses soient
collectées et utilisées dans les conditions décrites ci-dessus.

**Bouton**
[Continuer vers le questionnaire] — désactivé tant que la case n'est pas
cochée.

---

## 2. Schéma des statuts

Deux champs distincts sur l'assignation, indépendants l'un de l'autre.

### `consentement`

| État | Déclencheur | Données tracées |
|---|---|---|
| `non_donne` | Défaut, avant clic sur "Continuer" | — |
| `donne` | Patient coche la case + clique "Continuer" | `horodatage`, `version_texte_consentement`, `email_patient` |
| `retire` | Patient demande le retrait (via contact praticien, saisi manuellement pour ce test) | `horodatage_retrait` |

Le passage à `donne` est un prérequis strict pour accéder au questionnaire.
Pas de retour en arrière automatique : `retire` est saisi manuellement par
le praticien suite à une demande, pas par le patient lui-même (cohérent
avec le workflow manuel retenu).

### `statut_reponses`

| État | Déclencheur | Effet |
|---|---|---|
| `non_rempli` | Défaut, avant soumission | Accès en écriture au questionnaire |
| `verrouille` | Défaut après soumission | Lecture seule ; le patient peut consulter mais pas modifier |
| `modification_demandee` | Patient clique "Demander une modification" sur l'écran de consultation | Notifie visuellement le praticien dans son dashboard (badge, pas d'email pour ce test) |
| `deverrouille` | Praticien change le statut manuellement (aucune interface dédiée nécessaire pour le test — mise à jour directe en base ou petit bouton dashboard) | Le patient peut modifier ses réponses via son lien existant |

**Transition après modification** : une fois le patient re-soumis en
`deverrouille`, le statut repasse automatiquement à `verrouille`. On garde
`date_derniere_modification` pour la traçabilité, dans le même esprit que
`versionPrompt`/`versionScore`.

**Ce qu'on ne construit pas pour ce test** : pas de file d'attente de
demandes, pas de notification email au praticien, pas d'historique complet
des versions de réponses (une seule version vivante à la fois suffit pour
valider le retour d'expérience).

---

## 3. Questions encore ouvertes avant la branche

- Nom du praticien à afficher dans le texte : en dur pour le test (un seul
  praticien testeur) ou dynamique depuis la table `patients`/`assignations` ?
- Le badge "demande de modification" côté praticien : sur la liste des
  patients (PatientsPanel) ou sur la fiche patient uniquement ?
