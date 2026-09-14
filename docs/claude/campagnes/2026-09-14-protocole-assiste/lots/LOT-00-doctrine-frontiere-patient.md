---
id: "LOT-00"
titre: "Doctrine — la frontière patient du protocole 21 jours"
statut: "à faire"
dépend_de: "—"
---

# LOT-00 — Doctrine : la frontière patient du protocole 21 jours

## But

Fonder la campagne par **une** décision `D-xxx` qui répond à une seule question :
*qu'est-ce que le protocole 21 jours dit au patient, et qui a le droit de l'écrire ?*
Elle gate le LOT-03 et le LOT-04, et se rend **avant la première ligne de code**.

Patron : `CADRAGE_SOURCES_CITABLES_2026-09-09.md` → `D-160`, qui a tenu exactement
ce raisonnement pour l'objectif négocié six jours plus tôt.

## Les cinq points de la décision

1. **La vue patient est un contrat, pas un filtrage écrit à la main dans une route.**
   `c1-patient-protocol-view-v1` devient le seul producteur. Il porte le libellé
   d'axe, la raison d'être, le critère J21, **les trois actions** (intitulé + plan
   minimal), la phrase d'attente d'une intervention non ferme, les limitations
   patient — et il **refuse un statut inconnu**. Le motif est déjà écrit au dépôt :
   `docs/RELATION_PRATICIEN_PATIENT_SOURCE.md:148-160` pose la frontière patient-safe
   comme « un contrat, pas un filtrage visuel tardif ». La route actuelle est
   précisément un filtrage ad hoc, recopié à la main dans deux routes.
2. **Le libellé d'axe se re-dérive au serveur** depuis `selected_priority_id`, par
   `resoudreRegleSignee` — registre non signé ⇒ 503 ; règle non publiée ⇒ pas de
   libellé, jamais de texte fabriqué (`D-115`). Cela lève la raison du « différé »
   inscrite en `portail/protocole/route.ts:20-22` (« DecisionCard NON persistée ») :
   la **sélection**, elle, est persistée depuis `D-127`.
3. **Liste FERMÉE des sources citables dans `purpose`, à deux entrées** — le libellé
   d'axe signé (§2), et la tête de l'objectif négocié **actif** (`priorite`,
   `reformulationPraticien`), citée par identifiant, recopiée au serveur, la marque
   de provenance portée par la version et **tombant au premier caractère réécrit**
   (`D-167` §6 ; mécanisme de `provenanceVerifiee.ts` : le serveur relit et compare,
   aucune déclaration du corps n'est lue, `citeExactement` sur un `trim()` seul).
   **Jamais citables** : le motif praticien de sélection et le `rationale` du moteur
   (« Déclencheur atteint — score 8 ≥ 7 »). Ils s'affichent ; ils ne se citent pas.
   **Aucune source pour le critère J21** : il s'écrit avec le patient ; un axe n'est
   pas un critère.
4. **La garde de registre anxiogène se pose EN MÊME TEMPS** — `D-160` §4 : « sinon la
   citation devient le chemin sûr et la frappe le chemin sale ». Régime : **refus
   confirmable** (409 `REGISTRE_ANXIOGENE` + `confirmerRegistre: true`, patron
   `D-090`), sur **tout champ qu'une route patient sert** : `purpose`,
   `followUpCriterion`, et par action `title` et `minimalPlan`.
   **Leçon du booklet, non négociable** : sa garde était confirmable « depuis
   toujours » et **aucun écran n'envoyait `confirmerRegistre`** — trois tentatives
   d'envoi sur un dossier réel l'ont découvert. Une garde confirmable sans commande
   d'écran est une garde bloquante déguisée.
5. **Clause de fermeture** : toute extension de la liste est une `D-xxx` neuve, pas
   un champ de plus.

## Résultat observable

- Une décision `D-xxx` au registre, numéro pris au merge.
- Un fragment `changelog.d/`.
- Un cadrage `CADRAGE_FRONTIERE_PATIENT_2026-09-14.md` au dossier de campagne,
  portant le raisonnement et le texte de décision.
- La ligne du chemin ajoutée à la carte de `web/src/lib/documents/vocabulaire.ts`
  (colonnes : chemin, garde, régime, banc de câblage) — **au LOT-04, dans la PR du
  chemin**, comme la carte l'exige d'elle-même.

## Périmètre

`docs/DECISIONS.md`, `changelog.d/`, le dossier de campagne.

## Hors périmètre

Tout code applicatif. Le contenu de la vue patient au-delà de ce que le contrat
porte déjà. Le critère J21, qui ne reçoit aucune source.

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- Aucun seuil, dose, poids ou borne inventé (`DC-19`, `DC-20`).
- Ne pas réserver un numéro `D-xxx` d'avance : deux sessions concurrentes tournent,
  et sept collisions ont été constatées les 2026-09-08 et 09.

## Étapes

- [ ] Écrire le cadrage avec son raisonnement (patron `D-160`).
- [ ] Rédiger le texte de décision, cinq points.
- [ ] Poser le fragment `changelog.d/`.
- [ ] Vérifier le prochain numéro libre **au moment du merge**.

## Tests

Aucun code — validation documentaire.

## Critères de done

`D-xxx` actée avec ses cinq points ; fragment posé ; le LOT-03 et le LOT-04 n'ont
plus de question ouverte.
