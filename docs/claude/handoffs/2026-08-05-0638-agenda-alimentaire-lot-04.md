# Handoff — Agenda alimentaire, LOT-04 (portail patient et surface de saisie)

- Date : 2026-08-05, 06:38
- Campagne : `docs/claude/campagnes/2026-08-04-agenda-alimentaire/`
- Lot : `lots/LOT-04-portail-saisie.md` (ancien « L4b ») — **livré**
- Branche : `worktree-agenda-ali-l4b`
- Décision posée : **D-023**
- Fragment de changelog : `changelog.d/2026-08-05-agenda-alimentaire-l4-portail-saisie.md`

## Où en est la campagne

Les cinq lots écrits sont livrés. Ce qui reste est **`LOT-05`, le barème**, et il est
reporté **par conception** : la production compte 0 ligne dans
`agenda_alimentaire_jours`, et calibrer avant d'avoir recueilli une journée n'aurait
rien à calibrer. C'est l'ordre « collecte d'abord, calibrage ensuite » tenu depuis
`LOT-01`. Le fichier de lot n'est pas encore écrit.

## Le geste qui reste, et il n'est pas fait

**`WN_AGENDA_ALI=true` sur Development et Preview, puis redéploiement.** Dans cet
ordre, jamais l'un sans l'autre : `IDS_SUSPENDUS` est un `const` de module calculé à
l'import, la variable seule ne suffit pas. **Jamais en Production** (D-022). Le drapeau
ne figure aujourd'hui dans aucune des 53 variables du projet Vercel.

Tant qu'il est éteint, `Q_ALI_09` disparaît du hub et de la bibliothèque praticien, et
la route agenda refuse en `409 unavailable` : le verrou tient de bout en bout.

## Les cinq choses à savoir avant de toucher à ce code

1. **L'ancre se calcule sur l'union `dates ∪ datesIllisibles`**, filtrée par
   `estDateValide`. La quarantaine porte sur le JSONB, jamais sur la colonne
   `date_jour`. L'union sert à l'**ancre seule** — jamais à `renseignee` ni à
   `nbRenseignees`, sous peine de faire franchir les seuils d'exploitabilité sur du
   vide. Le filtre `estDateValide` n'est pas décoratif : `dateDebut` sort d'un tri
   **lexicographique**, un `1900-01-01` reculerait l'ancre de 126 ans et ferait refuser
   toute écriture.
2. **La borne des 21 jours est une borne SUPÉRIEURE**, et rien d'autre
   (`estAvantFinFenetreAli`). Une date antérieure à l'ancre la **recule**, et c'est
   voulu — à ne pas confondre avec le glissement de quarantaine, qui était silencieux,
   vers l'avant et subi.
3. **Une exemption ne vaut que si les quatre portes la connaissent** :
   `patient/questionnaire`, `patient/consentement`, `patient/submit`, agenda. La revue a
   trouvé que l'exemption `deverrouille` ajoutée à la deuxième ne rouvrait rien, la
   **première** refusant en `410` avant elle. Aucune ligne du diff n'était fautive —
   c'est ce que le lot ne faisait pas qui défaisait ce qu'il annonçait.
4. **Un geste PROPOSÉ doit être possible, pas seulement un geste refusé.** La règle de
   D-015 ne portait que sur l'ordre des refus ; elle a rattrapé ici quatre promesses —
   un `ConsentScreen` sur une assignation périmée, un CTA de clôture sans route, un
   badge de hub nommant le même geste, un message de refus annonçant des corrections
   impossibles. Le garde de `rappelPortail.test.ts` porte désormais sur le CTA **et**
   sur le badge : un garde qui ne couvre qu'une des deux surfaces garde un champ, pas
   une règle.
5. **`boolean | null` ne se teste jamais par `if (x)` / `!x` / `Boolean(x)`** — `null`
   est l'abstention « je ne sais pas », `undefined` une clé absente. Et
   `soirPlusCopieux` est strict : deux boutons, jamais trois.

## Ce qui reste ouvert, nommé et non corrigé

- **La correction est bornée à J et J-1** (`estDateSaisissable`, hérité de L4a). Une
  journée fausse à J-5, dans la fenêtre et lisible, n'est corrigible par aucun chemin.
  C'est le manque le plus visible du recueil.
- **`soumisLe` estime là où `supersedesJourId` trancherait** pour décider si une date en
  quarantaine reste bloquante. Les deux sont des colonnes ; `listJours` jette la seconde
  dans son `catch`. La règle est fail-closed (surblocage à l'égalité), donc sans risque
  pour la donnée — mais c'est un refus sans geste de sortie.
- **Aucune clôture patient**, aucune **vue praticien** de l'agenda alimentaire.
- **La borne ne ferme rien d'observable** : passé `dateDebut + 20`, `statutReponses`
  reste `non_rempli` ; le praticien voit une assignation ouverte que le serveur refuse
  d'alimenter, sans trace au dossier.
- **`nbRenseignees` diverge** entre le hub et la route agenda (le hub compte les dates en
  quarantaine, ne parsant jamais le JSONB). Écart pré-existant, réduit, non fermé.
- **Le hit-test tactile de `LigneDePrises` n'est prouvé nulle part** : jsdom ne calcule
  aucune géométrie, et l'E2E passe par les chemins bouton/clavier. Les prises à 15
  minutes d'écart se recouvrent à l'écran — d'où la bascule par `Entrée` dans le spec,
  et non par un clic.

## Validation au moment du handoff

`npm run check` vert ; `npm run test:worktree` complet vert — **3 779** tests Vitest sur
deux passes de drapeau, **112** E2E passés et 2 skipés (préexistants). Revue adversariale
`wn-reviewer` passée : **GO sous réserve**, huit constats, tous traités, chacun avec un
test dont la morsure a été vérifiée par retrait réel du correctif.
