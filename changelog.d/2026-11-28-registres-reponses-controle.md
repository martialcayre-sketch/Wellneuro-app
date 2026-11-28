### Le contrôle des registres lit aussi les réponses du cockpit (2026-11-28)

`scripts/wn-registres.mjs` et `scripts/lib/registres.mjs` lisent la
collection `reponses` quand elle est exportée (lot `registres-reponses-controle`).
Ils contrôlent chaque ligne : identifiant `<question>--<horodatage UTC>-<suffixe>`,
champs, file, nature, état. Une ligne `reportee` sans `reportee_le` ni
`reportee_par`, sans `par`, d'une autre source que `cockpit`, de nature
`migration` ou dont la question est encore ouverte est une anomalie. Les
lignes encore `envoyee` donnent des actions dues : `reponse_sans_report`
quand la question ouverte ne reflète pas la réponse, `reponse_a_ecarter`,
`reponse_remplacee`, `reponse_reportee_non_marquee` et `reponse_a_verifier`.
Tout est transcrit de `docs/ROLES_MACHINES.md` (« Réponse depuis le
cockpit »), rien n'y est ajouté. La collection est facultative : un export
ou un manifeste d'avant reste conforme. Les constantes et fonctions
qu'importe `wn-orchestrateur-passe.mjs` ne changent pas. Le banc
`scripts/lib/registres.test.mjs` compte 4 cas neufs, rouges sous quatre
mutations.
