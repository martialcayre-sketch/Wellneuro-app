---
id: "2026-07-11-fiches-conseils-contextuelles-v1"
titre: "C3 — Documents contextuels multi-destinataires V1"
statut: "terminée — V1 + montage (LOT-00 à LOT-05 en prod, sans migration ; fil médecin 5.0 et persistance (b) reportés)"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-18"
lot_courant: "LOT-05"
---

# C3 — Documents contextuels multi-destinataires V1

> Cadrage réel du 2026-07-12. **Renommage acté** : l'ancien titre « Fiches
> conseils contextuelles » ne correspondait pas au contenu — C3 est un moteur
> de composition documentaire multi-destinataires. Le dossier conserve son id
> pour ne pas casser les références ; le titre fait foi.

## Objectif

Une même source clinique validée, des rendus différents selon le
destinataire (patient, médecin traitant, praticien), avec chaîne d'états
brouillon → relu → validé → envoyé, validation humaine obligatoire,
versionnage et impression HTML (PDF natif différé).

## Frontière fondatrice (registre A2)

**C3 ne possède aucun contenu clinique source.** Il reçoit des blocs validés :

- snapshot, décision et protocole validés → C1 ;
- événements et revue de phase persistés → C2 ;
- fiches compléments → C4 ;
- fiches alimentaires → C5 ;
- synthèse IA existante (validée praticien).

C3 possède : modèles documentaires, composants de sections, adaptation au
destinataire, affichage de provenance, états de validation, aperçu avant
envoi, versionnage et comparaison de versions, impression.

## Décisions actées

- Vue de composition **deux colonnes** (innovation retenue de l'audit) :

```text
Sources praticien             Aperçu destinataire
─────────────────             ────────────────────
Donnée déclarée               Ce que vous avez décrit
Score calculé                 Ce que cela suggère
Décision validée              Votre priorité actuelle
Action 21 jours               Ce que vous allez essayer
```

- L'aperçu destinataire est une **instanciation du mécanisme
  `PrévisualisationPatient`** de HC-F (frontière de données : aucune donnée
  interne praticien dans un rendu patient ; adaptation de la règle pour le
  destinataire médecin).
- Vocabulaire réglementaire strict dans tous les rendus ; le rendu médecin
  utilise « explorations à discuter », jamais de terminologie prescriptive.
- Deux régimes de contenu jamais mélangés : statique validé (affichable sans
  IA) / généré par IA (validation praticien obligatoire avant diffusion).
- Badge « validé par votre praticien » sur tout document patient.

## Frontières

**Consomme** : blocs C1/C2/C4/C5, mécanisme HC-F, booklet existant (dont C3 est
l'évolution — auditer l'existant `BookletEnvoi` avant de créer, ne pas
empiler).
**Ne possède pas** : contenu clinique, scoring, envoi email (réutilise
l'infrastructure existante), signature électronique (différée).

## Esquisse de lots (à compiler N+1)

LOT-00 audit de l'existant booklet/synthèse + inventaire des blocs
disponibles à la fin de C1 → LOT-01 modèles et contrat de bloc (provenance,
état, version) → LOT-02 composition deux colonnes + états →
LOT-03 rendus par destinataire + impression → LOT-04 validation et handoff
(C4/C5 comme futurs fournisseurs de blocs).

## Compilation (2026-07-18)

Les lots détaillés sont compilés dans `lots/` depuis l'esquisse ci-dessus et le
registre **A2** (les squelettes auto-générés LOT-00-cadrage…LOT-04-validation
sont remplacés). **Documentaire — aucun code, aucune migration.** L'audit
d'existant (LOT-00) est ancré sur les briques réelles réutilisables :
`booklet/route.ts` + `buildBookletHTML`, `SyntheseIA` + `synthese/route.ts`,
`PatientPreview` + route patient-safe `apercu-patient/reponses`, infra nodemailer,
et les blocs C1 (`cockpit`) / C2 (`ProtocolDraft`, `ProtocolDiffusionApproval`,
`ProtocolCheckin`, `trajectoire`).

| Lot | Objet | Statut |
|---|---|---|
| LOT-00 | Audit de l'existant documentaire + inventaire des blocs | **à_faire** |
| LOT-01 | Modèles documentaires et contrat de bloc (provenance/état/version) | **à_faire** |
| LOT-02 | Composition deux colonnes + machine d'états | **à_faire** |
| LOT-03 | Rendus par destinataire + impression HTML | **à_faire** |
| LOT-04 | Validation, tests de bout en bout et handoff | **à_faire** |

Décisions de compilation :

- **Réutiliser, ne pas empiler** : C3 étend le pipeline synthèse→booklet vers un
  moteur de composition multi-destinataires (frontière A2 : aucun contenu clinique
  source).
- **Question persistance V1 à trancher en LOT-00/LOT-01** : viser **(a) sans
  persistance** (document recomposé à la demande, versionnage par tuple des
  versions de blocs déjà persistés) ; la variante **(b) persistée** ouvre un lot
  `bloqué_confirmation` (migration Prisma sous confirmation explicite et distincte).
- **PDF natif différé** (impression HTML seule en V1) ; signature et
  authentification médecin différées.
- **Discordance 5.0 portée au handoff** : le programme recadre C3 en **« fil de
  correspondance »** (réponse du médecin dans le fil, sans pièces jointes
  biologiques = sans HDS). La compilation livre le **rendu sortant** multi-
  destinataires ; le **fil bidirectionnel médecin** est une extension à arbitrer
  (LOT-03/LOT-04), non improvisée.

Exécution : au fil de l'eau, **un lot = une PR** (règle N+1), migration-free sauf
gate explicite.

## Direction UX 5.0 — poste de pilotage & A5-R2 (aligné le 2026-07-18)

> Alignement additif. Voir `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`
> et le registre (A6-R1 poste de pilotage, A5-R2 canvas mid-tone).
> **Aucun contrat clinique figé de cette campagne n'est modifié.**

- Composeur documentaire en **instrument focalisé** ; correspondance accessible depuis le poste de pilotage ; aperçu deux colonnes et chaîne brouillon→relu→validé→envoyé **inchangés**.
- Canvas **ardoise** praticien / restitution patient sable — différés au lot d'implémentation.
