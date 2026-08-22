# Brief compile - Socle de restitution sûre — la garde avant le récit

_Genere le 2026-08-21 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-21-socle-restitution-sure
- Fichier final : docs/claude/campagnes/2026-08-21-socle-restitution-sure/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md - Brief — Socle de restitution sûre : la garde avant le récit

## 1. Intention metier

- Toute campagne d'alliance thérapeutique à venir produira du texte adressé au (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- patient — booklet, portail, courriers, messages. L'architecture cible (§8 de (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- l'audit du 2026-08-21) pose trois verrous transverses qui conditionnent ce (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- texte AVANT qu'il n'existe : une garde de vocabulaire qui couvre tous les (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- chemins sortants, des tables cliniques protégées à l'écriture, un registre de (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- gabarits de messages versionné et signé. Cette campagne pose ces trois verrous. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Elle ne produit aucun récit : elle rend le récit possible sans qu'il puisse (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- franchir la frontière diagnostique (DC-27, DC-31, DC-32). (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- La garde de vocabulaire/orientation existe (`verifierRestitutionOrientation` (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- + `documents/vocabulaire.ts`) mais ne tient qu'UN point de passage : la (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- génération de synthèse. Le contre-audit du 2026-08-21 constate que le (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- booklet HTML, le courrier médecin et le bilan du portail sortent sans (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- passer par elle. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- 1. **Garde de vocabulaire sur TOUS les chemins sortants** : étendre (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- 2. **Tables cliniques au niveau « demande » du hook** : ajouter (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- 3. **Registre de gabarits de messages patient** : créer le registre au patron (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Aucun. Cette campagne EST le gate des suivantes : aucune campagne d'alliance (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- n'ouvre un chemin de texte patient avant que les trois verrous tiennent. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)

## 2. Probleme a resoudre

- A completer.

## 3. Utilisateurs concernes

- A completer.

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- A completer.

## 6. Donnees / modeles / integrations pressenties

- Le patron cible existe déjà dans le dépôt : `trust/contenus/registre.ts` — (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- versions hash-verrouillées, chaîne append-only, deux dates (rédaction et (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- validation), garde structurelle par test. Le banc de `relanceEmail.ts` sert (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- de référence de contrainte : aucune donnée de santé dans un email. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)

## 7. Contraintes projet

- Les hooks de sécurité ne s'affaiblissent jamais : ajouter au niveau (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- « demande » n'abaisse aucun verdict existant, ne retire aucun motif. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Toute modification de `.claude/hooks/protect-wellneuro-files.mjs` passe une (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- relecture adversariale avant merge (`.claude/rules/hooks-garde-fous.md`). (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Toute modification d'une table clinique signée = décision D-xxx + fragment (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- `changelog.d/` (DC-17, DC-18) — y compris la correction d'en-tête du lot 2, (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- déjà actée (DECISIONS.md:2832). (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Identités de fixture uniquement (Sophie Nicola, Jennifer Martin, (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Michel Dogné) ; aucune donnée patient réelle dans bancs et exemples. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Une garde qui passerait au vert en permanence sans sujet ne se pose pas : (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- chaque banc du lot 1 doit rougir quand la garde est débranchée. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)

## 8. Risques et dependances

- Le lot 1 et le lot 2 sont indépendants ; le lot 3 peut suivre l'un ou (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- l'autre. Aucune migration Prisma pressentie. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- Les campagnes d'alliance thérapeutique dépendent des trois lots — c'est le (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)
- sens de cette campagne. (docs/claude/campagnes/2026-08-21-socle-restitution-sure/sources/brief-socle-restitution-sure.md)

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
