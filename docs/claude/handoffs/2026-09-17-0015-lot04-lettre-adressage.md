# Handoff — 2026-09-17 — LOT-04 : la lettre d'adressage, cœur de la campagne

Le geste manquant entre un blocage et sa sortie. Décision [[D-216]].

## Branche et état Git

`correspondance-lot04-lettre-adressage`, branchée sur `origin/main` (`ab47a582`).
**Aucune migration, aucun `schema.prisma`, aucune table signée touchée.** Un
drapeau neuf, éteint : `WN_ADRESSAGE_COURRIER`.

## Objectif, et pourquoi il existe

Un signal d'alerte de rang `adressage` inhibe la chaîne C1 — plus de priorité
proposée, aucun protocole diffusable — et le texte de conduite signé dit « avis
médical à évaluer en priorité ». C'est la **seule raison cliniquement obligatoire**
d'écrire à un médecin dans tout le produit, et elle n'avait aucun chemin : aucune
surface n'offrait le geste, rien ne consignait qu'il avait eu lieu. Six dossiers sur
vingt-cinq sont concernés (production, 2026-08-23).

## Décisions prises

Aucun arbitrage clinique nouveau : la cotation de [[D-099]] n'est ni relue, ni
retouchée, ni re-signée. Six choix techniques, écrits dans [[D-216]] :

- le geste se monte **dans** le bloc « Ce qui suspend la décision », pas dans
  l'onglet Correspondance ;
- la route relit les signaux par `signauxDeclares` — **la fonction du runtime
  clinique** : deux lectures feraient diverger la lettre du blocage ;
- le filtrage suit le producteur de constats, **cas inconnu compris** : retenu,
  marqué `(†)`, et la lettre le dit ;
- **cotation non signée ⇒ 409**, jamais de lettre sans blocage derrière elle ;
- ancrage patron [[D-073]] — SHA vivant, littéral estampillé, entrée ajoutée à
  `SHA_ATTENDU_PAR_VERSION` (ce que [[D-215]] avait préparé) ;
- un **drapeau**, là où le fil médecin n'en a aucun : cette route *produit* un
  document qui nomme des signaux et part vers un tiers.

## Fichiers modifiés

- `lib/clinical/courrierAdressage.ts` et son banc — **neufs**, le générateur.
- `lib/clinical/adressageFeatureFlag.ts` — **neuf**, le drapeau.
- `app/api/praticien/adressage/courrier/route.ts` et son banc — **neufs**.
- `components/patient-cockpit/AdressagePanel.tsx` et son banc — **neufs**.
- `components/patient-cockpit/ClinicalRuntimeSection.tsx` et son banc — montage,
  disponibilité, geste.
- `lib/documents/modele.ts`, `lib/documents/types.ts`,
  `components/patient-cockpit/DocumentComposer.tsx` — le modèle et sa source.
- `lib/praticien/ancrageCorrespondance.ts` — le second écrivain enregistré.
- `app/api/praticien/correspondance-medecin/route.test.ts` — le banc du verrou,
  réécrit : le second écrivain n'est plus hypothétique.
- `docs/FEATURE_FLAGS.md`, `docs/DECISIONS.md`, `changelog.d/`,
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée).

## Validations exécutées

T1 vert. T2 joué. **Deux mutations, deux mutants tués** : retirer l'entrée
`safety-signals-nnpp2-v1` de la table des ancrages fait lire `reference_inconnue`
là où le banc du fil attend `concordante` ; remplacer `signauxDeclares` par une
liste vide fait rougir le banc qui épingle les signaux servis au générateur.

**Un banc-sentinelle a fait exactement son travail** : la prose du générateur cite
`evaluerAbstention` — parce que c'est ce blocage-là qui fonde l'existence de la
lettre — et le balayage textuel d'`evaluerAbstentionImporteurs.guard.test.ts` l'a
vu. Le fichier est inscrit à la liste des mentions, avec son motif, plutôt que le
commentaire reformulé pour esquiver. **T1 ne l'avait pas vu** : il ne joue pas la
suite entière, et ce banc n'était pas dans les fichiers touchés.

**Deux bancs du cockpit ont trouvé un défaut pendant l'écriture** : le GET de
disponibilité partait sur CHAQUE dossier — dont les 19 sur 25 sans signal — et
jusque sur la fixture ergonomique, qui promet de ne contacter aucun serveur. Il ne
part plus que là où le geste pourrait s'afficher. Le harnais du cockpit a aussi
exigé que la route soit **nommée** : non déclarée, elle consommait une réponse dans
la file générique, le défaut même que ce routage avait fermé.

## Problèmes ouverts

**Aucun E2E ne voit ce geste**, et c'est un trou nommé, pas un oubli : la fixture
de consultation partagée (`CONSULTATION_VALIDEE_FIXTURE`) ne porte aucun
`signaux_alerte`, et lui en ajouter suspendrait la décision du dossier de référence
— donc casserait les parcours qui l'utilisent. Le couvrir demande **son propre
dossier de fixture**, dans une PR d'une autre finalité.

Réserves de campagne inchangées : `supersedes_*` (migration, non faite), la
journalisation de `/recentes`, l'énoncé de la pastille sans banc, la nav mobile.

## Prochaine action

`LOT-05` — le registre rattrape le code (sans code), puis `LOT-06` — la mesure.

## Interdits encore actifs

Inchangés : aucun canal sortant réel, aucune pièce jointe ([[D-122]]), aucun lien
signé médecin, aucune messagerie de santé. Et surtout : **la lettre consignée trace
l'adressage, elle ne le vaut pas**. Lever l'abstention sur preuve d'adressage reste
un arbitrage clinique **non rendu** — il touche la chaîne C1.
