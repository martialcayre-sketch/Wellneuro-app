---
description: Transforme une demande brute en demande exécutable — objectif, résultat observable, hors périmètre, questions bloquantes — avant tout routage ou cadrage. Lecture seule, contexte isolé. À NE DÉCLENCHER que si deux lectures de la demande mèneraient à deux travaux différents ; sinon ne pas invoquer — sur une demande déjà exécutable, ce skill rend PASSE et le tour est perdu.
argument-hint: "<demande brute>"
# EXCEPTION DÉLIBÉRÉE — ne pas rétablir `disable-model-invocation: true` ici.
# Deuxième exemption de la famille `wn` après `wn-route`, et pour la même raison.
# Six skills — `wn-route`, `wn`, `wn-plan`, `wn-lot`, `wn-campaign`, `wn-debug` —
# demandent de passer par ce skill avant de router, cadrer ou ouvrir une campagne.
# Le drapeau rendait ces six consignes inapplicables : un skill qu'il porte n'est
# pas exposé à l'outil `Skill`, donc l'invocation demandée ne peut pas avoir lieu
# et la consigne se lit sans jamais pouvoir s'exécuter. C'est exactement la panne
# déjà constatée sur `wn-route`. Uniformiser la suite sur ce point remettrait les
# six branchements en panne, silencieusement — aucun test ne voit une prose qui
# désigne une capacité absente.
# Le garde-fou n'est pas le drapeau, c'est le seuil : la `description` ci-dessus
# porte la condition de déclenchement, et le corps rend `PASSE` par défaut.
context: fork
agent: Explore
effort: medium
---

# WellNeuro — reformulation d'une demande

Demande : `$ARGUMENTS`

## Pourquoi ce skill existe — et pourquoi il refuse de tourner la moitié du temps

Mesuré le 2026-08-01 sur 35 194 appels : une requête relit **~202 000 tokens** pour
en produire ~600. Une demande mal cadrée ne coûte donc pas une réponse à côté : elle
coûte **les tours qu'il faut pour la rattraper**, chacun repayant tout le contexte.
C'est là, et nulle part ailleurs, que se mesure la valeur de ce skill — en **tours
évités**, jamais en qualité rédactionnelle du prompt.

D'où la conséquence gênante, qui est la règle principale : **un reformulage inutile
coûte exactement ce qu'il prétend économiser — un tour complet.** Sur une demande déjà
exécutable, ce skill rend `PASSE` et rien d'autre. Ne pas produire de reformulation
« pour la forme » : ce serait dépenser pour rien.

Cette règle porte plus de poids qu'une consigne de style : ce skill étant invocable
automatiquement (voir le commentaire du frontmatter), **elle est le seul frein au
déclenchement**. Le drapeau qui l'aurait fourni rendait les six branchements
inopérants ; l'abstention le remplace, et c'est à elle de tenir.

## Le seuil — trois signaux, un seul suffit

Reformuler si l'un au moins est présent :

1. **Aucun résultat observable.** En lisant la demande, on ne peut pas dire ce qui
   aura changé quand ce sera fait.
2. **Un terme ambigu dans ce dépôt.** Un `R6` nu en désigne trois sans rapport
   (technique, produit, réserves d'audit) ; « le rayon », « le lot », « la campagne »
   sans qualificatif ; « valider » — palier de test, statut de claim, ou geste
   clinique ?
3. **Deux lectures produisent deux travaux différents.** C'est le test décisif, et il
   est falsifiable : si l'hypothèse A et l'hypothèse B mènent au **même diff**, il n'y
   a rien à lever — `PASSE`.

`PASSE` également si la demande nomme déjà son périmètre et son résultat, si c'est une
question conversationnelle, ou si la spécification existe déjà par écrit (fichier de
lot, ticket).

## Ce qui se vérifie contre le dépôt — et ce qui s'arrête là

Une reformulation qui invente un chemin ou suppose un fichier disparu est pire que la
demande brute. Vérifier, donc — mais sous plafond :

- `Grep` / `Glob` pour localiser **avant** tout `Read` ;
- **trois `Read` ciblés au maximum**, avec `offset`/`limit` ;
- au-delà, s'arrêter : le fait qu'il faille lire davantage **est** la conclusion —
  rendre la question plutôt que continuer à lire.

## La doctrine d'économie, appliquée à ce skill précis

Trois règles structurelles, pas des recommandations :

- **Contexte isolé.** `context: fork` : ce que ce skill lit meurt avec lui et n'est
  jamais repayé par la session. C'est ce qui rend l'étape rentable — 28 fois moins
  cher par appel qu'une lecture faite en session (mesure du 2026-08-01).
- **Sortie plafonnée à ~180 mots.** Elle, en revanche, entre dans la session et sera
  relue à chaque tour suivant. Une reformulation bavarde annule son propre gain.
- **Une passe par demande.** Pas de reformulation d'une reformulation, pas de
  ping-pong. Si une passe ne suffit pas, la sortie est une question, pas un
  deuxième tour.

## Interdits

- **Ne jamais élargir le périmètre.** Ajouter du travail n'est pas clarifier : une
  reformulation qui grossit la demande est une réécriture, et elle se refuse.
- Ne rien décider de clinique, ne rien autoriser — migration, écriture Supabase,
  déploiement, auth restent sous les gardes de `CLAUDE.md`.
- Ne pas remplacer le mode Plan ni `/wn-plan` : ce skill rend une **demande**, pas un
  plan technique.
- Ne remonter aucun extrait de fichier. Nommer `chemin:ligne` et s'arrêter là.

## Sortie

Si `PASSE` : une seule ligne — « PASSE — demande déjà exécutable » suivie du motif en
une demi-phrase, et la route suggérée. Rien d'autre.

Sinon, ces six points, dans cet ordre, ~180 mots au total :

1. **Demande reformulée** — une à trois phrases à l'impératif, périmètre nommé.
2. **Résultat observable** — ce qui aura changé, et comment on le vérifie.
3. **Hors périmètre** — ce que la reformulation exclut explicitement.
4. **Hypothèses tranchées** — les ambiguïtés qu'un défaut raisonnable règle, écrites
   comme hypothèses assumées plutôt que posées en questions.
5. **Questions bloquantes** — zéro à deux, et **seulement** celles dont toute
   hypothèse rendrait le travail inutile ou dangereux. Une question qu'un défaut
   tranche n'est pas bloquante : elle appartient au point 4.
6. **Route** — le skill suivant (`/wn-plan`, `/wn-lot`, `/wn-campaign`, `/wn-debug`…),
   et le passage en mode Plan s'il est envisagé des éditions.
