---
id: "LOT-00"
titre: "Doctrine — le régime de la proposition citée"
statut: "terminé"
dépend_de: "—"
---

# LOT-00 — Doctrine : le régime de la proposition citée

## But

Fonder la campagne par une décision `D-xxx` (réservée dans `main`) qui fixe
le régime de la proposition d'objectif : **la machine cite, elle n'invente
pas**. Trancher les quatre questions ouvertes de la campagne avant qu'aucun
code n'existe.

## Résultat observable

- Une décision `D-xxx` au registre, actée par le responsable, qui définit :
  1. les **sources admissibles** d'un fragment (anamnèse verbatim /
     restitution d'instrument certifié / règle signée + SHA) et
     l'inconstructibilité d'un fragment non sourcé ;
  2. le **verbe patient « le dire autrement »** (principe ; sa forme
     technique est arbitrée ici, son implémentation au LOT-04) ;
  3. l'**interrupteur de repli** (`WN_OBJECTIF_PROPOSE_PATIENTS`, vide =
     tous) et le drapeau `WN_OBJECTIF_PROPOSE` ;
  4. le **nombre maximal de propositions simultanées et leur ordre
     d'affichage** — en tenant compte du fait que l'ordre des candidats C1
     n'est pas signé ;
  5. le choix **déterministe d'abord** (LLM d'assemblage en extension
     ultérieure, jamais au LOT-02).
- Un fragment `changelog.d/` (`DC-17`, `DC-18`).
- Le point de conception G6/G7 arbitré par écrit : le module de proposition
  est distinct du module objectif, alimenté par la sortie du cockpit, sans
  import du moteur clinique.

## Périmètre

- `docs/DECISIONS.md` (réservation dans `main`, jamais dans une branche —
  deux sessions actives sur la copie principale).
- `changelog.d/`.
- Ce dossier de campagne (mise à jour des questions ouvertes tranchées).

## Hors périmètre

- Tout code applicatif, toute migration, tout drapeau posé.
- La levée ou la modification de [[D-093]].

## Fichiers probables

- `docs/DECISIONS.md`
- `changelog.d/2026-XX-XX-objectif-trois-voix-doctrine.md`
- `docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/CAMPAGNE.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot.
- Aucun seuil, dose, poids ou borne inventé (`DC-19`).

## Étapes

- [x] Vérifier le prochain numéro `D-xxx` libre dans `main` (sessions
      concurrentes — coordination avec doctrine-executable).
- [x] Rédiger la décision avec les cinq arbitrages ci-dessus.
- [x] Poser le fragment `changelog.d/`.
- [x] Reporter les arbitrages dans CAMPAGNE.md (questions ouvertes → décisions).
- [x] Relire le diff.

## Tests

Aucun code — la validation est documentaire : la décision porte les cinq
arbitrages, datée, signée du responsable.

## Critères de done

- `D-xxx` actée au registre avec les cinq arbitrages.
- Fragment changelog posé.
- CAMPAGNE.md sans question ouverte non tranchée pour les LOT-01 à LOT-03.

## Résultats

Clos le 2026-08-23. `D-094` actée (numéro vérifié libre dans `main` après le
merge doctrine-executable #766) : régime de la proposition citée, cinq
arbitrages tranchés. Conséquence structurante pour le LOT-01 : « le dire
autrement » est une **table d'événement propre** — la migration porte donc
deux tables (`propositions_objectif` + l'événement d'amendement), aucun CHECK
existant n'est élargi. Fragment `changelog.d/` posé ; CAMPAGNE.md mis à
l'état atteint (une seule question ouverte demeure : l'instrument GAS,
renvoyée au LOT-05).
