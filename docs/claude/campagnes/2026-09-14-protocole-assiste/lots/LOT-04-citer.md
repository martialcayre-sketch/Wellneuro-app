---
id: "LOT-04"
titre: "Citer — l'écran désigne, le serveur recopie"
statut: "terminé"
dépend_de: "LOT-00, LOT-02"
---

# LOT-04 — Citer (étage 1)

## But

`purpose` — la raison d'être que le patient lit en sous-titre — est aujourd'hui du
**texte libre non gardé** : le navigateur l'écrit, la route le persiste tel quel
(`purpose: submission.purpose ?? ''`), le seul contrôle est « non vide », et il part
au patient. Ce chemin sortant **n'est pas inscrit à la carte de `vocabulaire.ts`**.

Ce lot fait deux choses indissociables, et `D-160` §4 explique pourquoi elles ne se
séparent pas : ouvrir la citation **et** poser la garde. « Sinon la citation devient
le chemin sûr et la frappe le chemin sale : on aurait déplacé le défaut au lieu de
le fermer. »

## Résultat observable

1. Le praticien **désigne** une source pour la raison d'être ; le serveur la
   **recopie**. Le texte cité ne transite jamais par le navigateur.
2. La provenance est portée par la version, et **tombe au premier caractère réécrit**.
3. Tout champ servi au patient passe la garde de registre anxiogène, en **refus
   confirmable** — et le bouton de confirmation existe à l'écran.

## Périmètre

- **`app/api/praticien/protocoles/versions/route.ts`** — la soumission porte des
  **identifiants de source**, jamais de texte cité. Le serveur recopie depuis le
  registre signé (`resoudreRegleSignee`) et depuis `objectifs_negocies` (tête
  **active**, via `tetesActives`), puis **constate** la provenance en comparant les
  textes — patron `provenanceVerifiee.ts` : `citeExactement` sur un `trim()` seul,
  jamais de repli d'espaces ni de casse, et `catch { return {} }` — une provenance
  non constatable n'est pas posée, l'enregistrement ne lève pas.
- **Le GET des versions** (ou une route sœur bornée) expose les candidats citables,
  pour que l'écran ait de quoi proposer un choix. **Aucune modification du rail** :
  `objectifs/etat-phase/route.ts` refuse de servir la prose — « une route qui
  servirait la prose ouvrirait une seconde surface de lecture là où le cockpit en a
  déjà une » — et ce refus tient. La route des versions, elle, est serveur : elle lit
  la table directement.
- **`ProtocolMiniBuilder.tsx`** — le geste de désignation, et le bouton de
  confirmation de registre.
- **`web/src/lib/documents/vocabulaire.ts`** — la ligne du chemin ajoutée à la carte,
  **dans cette PR**, avec sa garde, son régime et son banc de câblage.
- La garde : `termeAnxiogene` sur `purpose`, `followUpCriterion`, et par action
  `title` et `minimalPlan` ; 409 `REGISTRE_ANXIOGENE` nommant le terme **tel qu'il
  est écrit** ; jeton `texteSha256` **préfixé par domaine** — patron du document
  patient biologie — pour qu'une confirmation ne vaille que pour ce texte-ci.

## Hors périmètre

- **Le critère J21 ne reçoit aucune source** : il s'écrit avec le patient.
- Le motif praticien de sélection et le `rationale` du moteur : affichés, jamais cités.
- Toute troisième source. La clause de fermeture du LOT-00 s'applique.

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- **Ne jamais faire confiance au texte reçu** : l'écran transmet un identifiant, et
  rien d'autre. `D-115` a été écrite pour exactement ce défaut — une règle inventée
  mais syntaxiquement valide servie « comme citée d'une table signée ».
- Aucun seuil inventé.

## Étapes

- [ ] Ouvrir la lecture des candidats citables au GET.
- [ ] Recopie serveur + constat de provenance à l'écriture.
- [ ] Geste de désignation à l'écran.
- [ ] Garde de registre + bouton de confirmation, dans le même diff.
- [ ] Ligne à la carte de `vocabulaire.ts`.
- [ ] Bancs ; fragment `changelog.d/`.

## Tests

T1, T2, T3. Deux bancs sont attendus :
- un **banc textuel de liste fermée** sur le patron de
  `propositionObjectif.guard.test.ts` — les fabriques sont les seules à fabriquer, la
  liste des clés est épinglée, et **le détecteur mord** (un test qui prouve que le
  garde trouve ce qu'il cherche là où il est) ;
- un **banc de débranchement de la garde**, vu ROUGE avant d'être déclaré vert, comme
  l'exige la carte de `vocabulaire.ts` pour chaque chemin qu'elle inscrit.

## Critères de done

Aucun texte cité ne traverse le navigateur ; la marque tombe à la réécriture ; le
chemin figure à la carte avec son banc ; la confirmation est atteignable à l'écran.

## Avancement — la garde d'abord (2026-09-15)

**Le lot se livre en deux PR, et l'ordre n'est pas indifférent.** [[D-160]] §4
interdit de livrer **la citation sans la garde** — « sinon la citation devient le
chemin sûr et la frappe le chemin sale ». Elle n'interdit pas l'inverse : livrer la
garde seule est strictement plus sûr, et elle referme une **infraction en cours**.

### PR 1 — la garde de registre : LIVRÉE

- `termeAnxiogene` sur les **quatre champs servis au patient** — `purpose`,
  `followUpCriterion`, et `title` + `minimalPlan` de **chaque** action. Garder ce
  que le portail sert *aujourd'hui* (une action) ferait de la garde une dette au
  jour où il en servira trois.
- **Refus confirmable** (`409 REGISTRE_ANXIOGENE`), le terme nommé **tel qu'il est
  écrit**, et un **jeton lié au texte** — préfixé par domaine, patron du document
  patient biologie : deux gardes qui hacheraient le même texte deviendraient
  interchangeables.
- **La commande d'écran part avec la garde.** Celle du booklet était confirmable
  « depuis toujours » et aucun écran ne l'envoyait.
- **Un piège fermé** : le refus de registre partage son code `409` avec
  `version_stale`. Sans branchement sur `reason`, un texte signalé aurait dit au
  praticien « rechargez l'historique » — ce qui n'y change rien et ne nomme pas le
  terme.
- **La ligne du chemin est inscrite à la carte de `vocabulaire.ts`**, dans la PR qui
  le crée, comme cette carte l'exige.
- **Banc de débranchement vérifié, pas affirmé** : la garde neutralisée fait rougir
  **trois** bancs (mutation appliquée, constatée, puis restaurée depuis une copie).

### PR 2 — la citation : ARBITRÉE ET LIVRÉE (2026-09-15)

**La question posée était bâtie sur une prémisse fausse, et elle a été reposée.**
[[D-189]] §1 écrivait « la provenance est portée par la version » — phrase posée par
analogie avec `objectifs_negocies`, **dont la provenance vit dans neuf colonnes
ajoutées par une migration**. `protocol_drafts` n'en a aucune. L'arbitrage rendu sur
cette base ne valait pas.

**Trois voies ont été reposées, vérifiées en code :** un contrat V5 (le patron du
dépôt — chaque référence ajoutée au payload a reçu le sien : V2, V3, V4 — mais une
décision qui étend [[D-130]] et engage toute la chaîne, pour une marque
d'affichage) ; un **constat à la lecture** sans persistance ; ou différer.

**Tranché : le constat à la lecture** ([[D-193]]). Le serveur relit les sources et
compare les textes ; la marque tombe au premier caractère réécrit **par
construction**. C'est le mécanisme même que le responsable venait de trancher pour la
vue patient du LOT-03 — pas un pis-aller, le style de ce chemin.

## Ce qui est livré

- **`lib/protocol/provenancePurpose.ts`** — pur, lisible des deux côtés de la
  frontière client/serveur : les trois marques, la liste FERMÉE des sources, et la
  comparaison stricte au `trim` près.
- **`lib/praticien/teteObjectifCitable.ts`** — la lecture partagée de la tête active,
  **plutôt qu'une troisième copie de `SELECTION_OBJECTIF`** (il en existe déjà deux,
  et un `route.ts` Next.js ne peut pas exporter de valeur). Zéro ou plusieurs têtes
  ⇒ rien de citable : deux têtes sont une discordance que le dépôt refuse de moyenner.
- **Le GET des versions** sert `sourcesCitables` et, sur la version active,
  `provenancePurpose` — constaté, jamais persisté.
- **Le constructeur** propose « Reprendre », recopie le texte tel quel, et affiche ce
  que la version active cite. **Le clic ne transmet rien** : c'est le texte qui fait
  foi, pas le geste ([[D-164]]).
- **Le marquage « votre patient la lit »** sur la raison d'être, reporté du LOT-03 et
  posé ici, sur le champ effectivement servi.

## Un défaut trouvé en chemin

**Une commodité emportait le chemin principal.** La lecture des sources est appelée
depuis le GET qui porte l'historique du protocole : une erreur de base y aurait fait
tomber toute la page pour un bouton « Reprendre ». Elle ne lève plus — patron de
`constaterProvenance`, qui rend une provenance vide plutôt que de faire échouer
l'enregistrement.

## Bancs

Banc textuel de **liste fermée** (les trois marques épinglées), six bancs sur le
constat — dont « la marque tombe au premier caractère » —, trois sur la route (tête
active, discordance à deux têtes, échec de lecture qui n'emporte pas l'historique) et
cinq sur l'écran. **Mutation vue ROUGE** avant de déclarer vert : comparaison élargie
à la casse et aux espaces internes → banc rouge, restauration depuis une copie.
