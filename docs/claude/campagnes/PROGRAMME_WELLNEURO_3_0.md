# Synthèse du programme WellNeuro 3.0

> Révision du 2026-07-12 — intègre les arbitrages du brainstorm (registre de
> frontières §2) : scission Hybrid Clinical / QX, redistribution du métier
> vers C1/C2, compilation N+1, abandon du double mode Jour/Nuit (tout clair).
> `docs/claude/REGISTRE_FRONTIERES.md` fait foi sur les frontières et
> décisions actées ; ce fichier fait foi sur la séquence.

## Décision stratégique (inchangée)

Ne pas recoder WellNeuro. Recomposer progressivement l'UX et le moteur
clinique autour d'un MVP décisionnel, organisé en cycle commun :

```text
Patient → Données fiables → Compréhension → Décision 21 jours
→ Actions patient → Suivi → Réévaluation
```

Répartition des rôles : HC-F fournit la grammaire visuelle ; C1 la décision ;
C2 le temps et la trajectoire ; C3 la restitution ; C4 et C5 les bibliothèques
d'intervention ; QX l'expérience de saisie ; WN-AUTO les garde-fous
d'exécution.

## Ce que WellNeuro 3.0 doit prouver (inchangé)

- Le praticien comprend la situation en moins de deux minutes.
- Il prépare une phase 1 en moins de dix minutes.
- La phase 1 reste supportable : trois actions maximum.
- Les données manquantes et discordances empêchent la surinterprétation.
- Le patient reçoit une version calme et concrète.
- Le suivi distingue effet, tolérance et adhésion.

## Convention d’exécution

Chaque campagne est exécutée sur une branche d’intégration dédiée. Les lots de la campagne sont menés sur des branches dérivées de cette branche, et leurs PR visent d’abord la branche de campagne avant la PR finale vers `main`.

## Programme de campagnes

| Ordre | Campagne | Dossier | Résultat | Statut | Dépendance |
|---|---|---|---|---|---|
| C0 | Alignement documentaire | `2026-07-11-alignement-documentaire-etat-reel` | Livré | terminée | — |
| C0-UX | Shell praticien 3.0 | `2026-07-11-refonte-ux-shell-3-0` | Socle technique livré — direction visuelle remplacée par HC-F | terminée | C0 |
| **HC-F** | Hybrid Clinical Foundation | `2026-07-12-hybrid-clinical-experience-questionnaires` | Tokens clairs, shell premium, mécanismes, charte patient, gouvernance | à_faire (PR #31 amendée) | C0-UX |
| **C1** | Décision clinique 21 jours V1 | `2026-07-11-decision-clinique-21-jours-v1` | Cockpit → décision → 3 actions → prévisualisation → validation | compilée, à_faire | HC-F LOT-02 |
| **QX** | Expérience questionnaires | `2026-07-12-qx-experience-questionnaires` | Profils de rendu sur pilotes audités, intégrité psychométrique | compilée, à_faire | HC-F LOT-01 + LOT-04 ; parallèle à C1 |
| C3 | Documents contextuels multi-destinataires V1 | `2026-07-11-fiches-conseils-contextuelles-v1` | Moteur de composition documentaire | cadrée (compiler N+1) | C1 |
| C2A | Points d'étape et persistance minimale | `2026-07-11-suivi-j7-j14-j21-et-persistance` | Check-ins J7/J14/J21, résumé J21 | cadrée (compiler N+1) | C1 + **gate migration** |
| C2B | Trajectoire et aide à l'ajustement | idem | Momentum explicable, comparateur | cadrée | C2A + données réelles |
| C4A / C5A | Catalogue compléments / Action alimentaire | `…complements…` / `…boussole…` | Data-first parallélisables | cadrées | C4B/C5B : C1 |

> Le chemin C1 est corrigé partout : `2026-07-11-decision-clinique-21-jours-v1`
> (l'ancien alias `…-21j-v1` était erroné).

## Gates

- **Migration** : C2A contient un lot `bloqué_confirmation`. Aucun agent ne
  démarre une migration Prisma/SQL sans confirmation explicite.
- **Pilotes questionnaires** : QX et OCR restent bornés aux familles
  auditées (ALI_01, ALI_03, NEU_03, MOD_02) tant que le chantier de
  certification n'est pas étendu.
- **Séquencement E0** : `feat/e0-patients-pagination` se livre avant tout
  restylage de l'annuaire patients (HC-F/C1).

## Modules différés

Voir « Différés » du registre : Hybrid Patient, auth inter-assignations,
biologie réelle (HDS), OCR papier (R10), scanner alimentaire / panier / photo
repas, messagerie, copilotes IA.
