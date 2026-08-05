# Handoff — LOT-08, le recueil dit son état

**Date** : 2026-08-05, 15:30
**Campagne** : `2026-08-04-agenda-alimentaire`
**Lot** : `LOT-08` — Le recueil dit son état
**Branche** : `worktree-agenda-ali-l08`

## Pourquoi ce lot, et pas LOT-06

`LOT-06` est le **barème**, et il reste fermé pour une raison mesurée :
`MIN_JOURS_AGREGATS = 7`, `calculerAgregatsAli` rend `null` en dessous, et le
recueil pilote en est à **une journée sur vingt et une**. Rien à calibrer avant
J+7 au plus tôt, la clôture à J+21 pour un barème honnête.

`LOT-08` prend les reliquats de lecture — **trois, pas deux.** `CAMPAGNE.md` n'en
nommait que deux ; le troisième vivait dans la section « ce que ce lot ne fait
pas » de `LOT-07`. C'est exactement le rôle de cette section, et la raison de la
relire avant d'ouvrir le lot suivant plutôt que de se fier au tableau de la
campagne.

## Ce qui a changé

1. **Bannière « recueil fermé »** quand `WN_AGENDA_ALI` est éteint. Le panneau
   *rapporte* la position du drapeau, il ne s'y garde pas : `D-027` tient tout
   entier, la route praticien n'est pas touchée.
2. **`JourneeCard` reçoit la ligne entière** et affiche `soumisLe` (heure de
   Paris), la mention de correction quand `supersedesJourId` est non nul, et
   `canal` seulement s'il sort du portail.
3. **`nbJourneesAgenda`** transporté par `GET /api/praticien/patients` jusqu'à la
   modale d'annulation, qui dit enfin ce qu'elle emporte.

## Les trois choses à savoir avant de toucher à ce code

### Le drapeau passe par un provider, jamais par la route

`web/src/app/dashboard/patients/[idPatient]/page.tsx` est un composant serveur et
porte déjà ce motif pour `WN_C5_ENABLED`. Le réutiliser évite d'appeler
`isAgendaAlimentaireEnabled` dans `api/praticien/agenda-alimentaire/route.ts`,
dont un commentaire l'interdit nommément sans rouvrir `D-027`. Décision : `D-028`.

### Le contexte a TROIS états, et son défaut n'est pas `false`

Le réflexe fail-closed vient des **gardes** : refuser par défaut ne coûte qu'un
accès. Ce contexte-ci alimente un **énoncé**, et le drapeau est **allumé en
production** — un défaut `false` aurait donc été la valeur fausse cent pour cent
du temps, affirmant en silence « recueil fermé » sur un recueil ouvert dès qu'un
provider serait oublié. `null` = position inconnue, et le panneau n'affirme rien.
Le rendu teste `=== false`, jamais `!drapeau`.

**C'est la revue adversariale qui l'a retourné**, pas l'écriture. Poser la
question « fail-closed protège quoi, ici ? » a suffi.

### Un test de câblage peut ne pas mordre, et il faut le vérifier

Le premier test de `page.tsx` passait sur un mutant : `isAgendaAlimentaireEnabled`
est déclarée `(value = process.env.WN_AGENDA_ALI)`, si bien qu'une faute de frappe
au point de montage transmet `undefined`, **déclenche le paramètre par défaut** et
relit la bonne variable. L'argument explicite y est décoratif — le même angle mort
vaut pour `isC5Enabled(process.env.WN_C5_ENABLED)` deux lignes plus haut. Le test
a été refait sur ce qui casse vraiment (provider présent, alimenté par la fonction
et non par une constante) et **vérifié par mutation** : `enabled={true}` en dur le
fait passer au rouge.

## Ce qui reste ouvert

- **La modale promet un geste impossible.** « Vous pourrez réassigner ce
  questionnaire si besoin » est faux drapeau éteint (`IDS_SUSPENDUS` retire
  `Q_ALI_09` de la bibliothèque *et* de la route d'assignation). La modale vit sur
  la liste des patients, où le provider n'est pas monté. Classe déjà connue :
  *un écran ne doit pas proposer un geste impossible*.
- **Deux comptages, deux définitions.** « N journées notées » sur la fiche =
  `fenetre.nbRenseignees`, lignes relues seulement. `nbJourneesAgenda` = dates
  distinctes de toutes les lignes, quarantaine comprise. Libellés rendus distincts
  (« journée de saisie »), divergence non résolue.
- **La déduplication côté base n'est prouvée par rien** — le `Set` applicatif
  porte la correction, et c'est lui seul que le test couvre.
- **La profondeur de correction ne se voit pas** : deux corrections successives se
  lisent comme une. À dire quand `LOT-06` s'en servira.
- **L'agenda du sommeil n'a pas le geste symétrique** : la modale ne dit rien des
  nuits notées de `Q_SOM_09`.

## Validation

**T1 vert** : 4 062 tests unitaires sur 368 fichiers, lint et anti-secrets verts.
Audit de campagnes : 0 erreur, 1 avertissement préexistant.

**T2 vert à la troisième passe** : 4 062 unitaires, **120 E2E passés, aucun
échec**. Les deux premières, jouées avant les correctifs de revue et à code
identique entre elles, avaient rendu deux jeux d'échecs **différents** —
`portail-lien-magique.spec.ts:48` (gigue d'horloge, 819 et 1 032 ms contre un
seuil de 800) sur les deux projets, puis `portail-parcours.spec.ts:281` (fixture
`PAT_SEED_03`) sur un seul. Aucun ne se reproduit, aucun ne touche une surface de
ce lot, et la revue a cherché un chemin causal sans en trouver.

**La leçon à garder, elle, ne dépend pas de l'issue** : un jeu d'échecs qui se
*déplace* à code figé n'est pas une régression, c'est la signature d'un second
poste jouant Playwright sur la base partagée. Un `pgrep` préalable est nécessaire
et pas suffisant — le voisin peut redémarrer en cours de passe.

**CI vert sur la PR #590**, `verify` ayant réellement tourné
(`node scripts/wn-attendre-ci.mjs 590` → code `0`, le seul qui autorise à
l'annoncer prête).
