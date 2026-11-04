### Portail patient : les routes de saisie refusent un dossier clos (2026-11-04)

Dette laissée par #1846 : le hub ne proposait plus rien à un dossier clos, mais
`api/patient/questionnaire`, `api/patient/submit` et les agendas ne gardaient que l'âge. Un
appel direct d'un majeur clos pouvait encore soumettre ; un mineur clos recevait le refus du
circuit des mineurs, qui lui promettait une saisie à venir.

Arbitrage du responsable du 2026-11-04, option A : sur un dossier clos, les routes de saisie
refusent `dossier_cloture` (409), avec un message pour le patient : « Votre suivi est clôturé :
vous ne pouvez plus répondre à ce questionnaire. » Les affectations en cours restent en l'état
et redeviennent remplissables à la reprise ; rien n'est annulé à la clôture.

- Garde `refusClotureSuiviPour` (`lib/patient/gardeClotureServeur.ts`), qui applique
  `accepteNouvelEnvoi`. Elle passe AVANT la garde d'âge, pour qu'un mineur clos lise la clôture.
- Routes gardées : `api/patient/submit`, `api/patient/questionnaire` (GET, sauf `verrouille`
  et `modification_demandee`, qui restent consultables), les POST de
  `api/portail/agenda-sommeil`, `api/portail/agenda-sommeil/cloture` et
  `api/portail/agenda-alimentaire`. Les GET des agendas restent ouverts aux archives.
- `api/portail/valider` assignait le pack de base sur un dossier clos dont la consultation
  avait été ouverte avant la clôture, contre la règle « aucune assignation » de la clôture
  (D4 de LOT-01 IDP2). Il refuse désormais de la même façon.
- Banc sentinelle `lib/patient/gardeCloture.routes.guard.test.ts` : toute route d'écriture
  patient est classée, fermée au dossier clos ou ouverte avec son motif. Trois routes y sont
  ouvertes faute d'arbitrage (`portail/fiche`, `portail/ja/observations`,
  `portail/protocole/checkin`).

Le menu « Autres espaces » et `/api/portail/session` ne sont pas touchés. Pas de migration.
