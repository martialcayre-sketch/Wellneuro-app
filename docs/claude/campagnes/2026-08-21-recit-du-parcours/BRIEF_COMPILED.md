# Brief compile - 6.0-C — Le récit du parcours

_Genere le 2026-08-21 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-21-recit-du-parcours
- Fichier final : docs/claude/campagnes/2026-08-21-recit-du-parcours/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md - Brief — 6.0-C : Le récit du parcours

## 1. Intention metier

- La prise en charge a une histoire, et le patient participe à l'enquête. Tout (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- ce que cette campagne montre existe déjà dans des tables datées : elle (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **restitue, elle ne produit jamais** — pas de nouvelle conclusion clinique, pas (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- de diagnostic, pas de causalité inférée (DC-31, DC-32, DC-34, DC-35). Le fil (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- patient actuel est une inbox d'actions ; la campagne lui adjoint une (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- chronologie racontée, une double lecture praticien/patient et des messages au (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- moment clinique — chaque texte dérivé d'un bloc déterministe et passé par la (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- garde du Socle, jamais généré librement (DC-01, DC-02, DC-26). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- Référence d'architecture : §8 de l'audit du 2026-08-21 (architecture 6.0). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- 1. **Timeline racontée par dossier** — écran de PROJECTION depuis les tables (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- 2. **Journal des petites victoires** — objet patient léger (saisie libre (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- 3. **« Pourquoi maintenant ? » + double lecture praticien/patient** — textes (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- 4. **Hypothèses partagées à statut** — renforcée / à explorer / moins (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- 5. **Messages au moment clinique** — courts, déclenchés par la trajectoire de (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)

## 2. Probleme a resoudre

- Le fil actuel est une inbox d'actions, pas une (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- chronologie : ce lot ajoute la lecture chronologique sans créer de (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- stockage nouveau. Les trous sont rendus comme des trous (DC-24). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **Un trou dans la chronologie n'est jamais « rien à signaler »** : une (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- période sans donnée s'affiche comme absence de donnée, pas comme normalité (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- ni comme zéro (DC-24, DC-25). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)

## 3. Utilisateurs concernes

- praticien (validation explicite de chaque exposition d'hypothèse, DC-31/32) (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- patient (timeline, journal des petites victoires, registre accessible) (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- A completer.

## 6. Donnees / modeles / integrations pressenties

- **Projection, pas duplication** : la timeline se calcule depuis les tables (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- datées append-only existantes (consultations, envois, check-ins, (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- corrections, arbitrages biologiques) ; aucune table « événement » parallèle (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **Append-only chaîné** pour tout nouvel objet persistant (patron des (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **Versions hash-verrouillées** pour tout contenu servi au patient, façon (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- `trust/contenus/registre.ts` : un texte exposé est signé, versionné, et le (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- code refuse une version inconnue (DC-26). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **Deux dates** sur chaque événement projeté : date de l'événement clinique (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- et date d'enregistrement — jamais confondues. (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **Aucune donnée de santé en email** : le message invite à ouvrir le (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- portail, patron `relanceEmail` existant. (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)

## 7. Contraintes projet

- Restitution seulement : aucun moteur nouveau, aucun score nouveau, aucun (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- seuil nouveau (DC-17, DC-19, DC-20). Toute évolution qui toucherait la (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- logique clinique exige décision `D-xxx` + fragment `changelog.d/` (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- Un signal de sécurité présent dans la trajectoire prime sur tout élément (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- narratif et ne se raconte pas comme une péripétie (DC-12, DC-23). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **Garde structurelle par test** : chaque invariant est tenu par un (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- test qui échoue si on le viole, pas par une consigne (leçon D-043). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- Classe clinique/exposition patient : revue `wn-reviewer` avant de passer la (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- main sur les lots 3, 4 et 5. (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)

## 8. Risques et dependances

- **Socle** : garde étendue + registre signé livrés — les lots 3, 4 et 5 en (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- dépendent directement ; sans eux, aucun texte à deux registres ni message (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- **6.0-A** : livrée avant ouverture (dépendance de portefeuille 6.0). (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- Le lot 1 (projection pure) et le lot 2 (objet patient léger) ne dépendent (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- pas de la garde étendue et peuvent ouvrir la campagne. (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)
- Les lots 3→5 consomment le registre signé : ordre interne 1/2 avant 3/4/5. (docs/claude/campagnes/2026-08-21-recit-du-parcours/sources/brief-recit-du-parcours.md)

## 9. Decisions a prendre

- A completer.

## 10. Decoupage recommande

- R0 : audit de l'existant et clarification du perimetre, sans modification.
- R1 : contrat fonctionnel, UX et checklist E2E.
- R2 : tranche verticale minimale sur le scenario principal.
- R3 : donnees / integrations / persistance, apres validation du besoin.
- R4 : compatibilite legacy et cas limites.
- R5 : UI, durcissement, securite et accessibilite.
- R6 : tests, documentation et decision go/no-go.

## Materiau non classe a relire

- Aucun.
