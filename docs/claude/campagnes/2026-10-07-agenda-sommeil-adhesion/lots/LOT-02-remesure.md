---
id: "LOT-02"
titre: "Re-mesure de l'adhésion, par cohortes avant / après"
statut: "en_cours (2026-10-08) — requête prête, première lecture au 2026-10-29"
dépend_de: "LOT-04"
---

# LOT-02 — Re-mesure de l'adhésion

## But

Dire, chiffres en main, si les patients notent davantage de nuits depuis les
changements de la campagne : déblocage de la saisie (LOT-01, 2026-10-07),
sélecteurs et trois écrans (LOT-03), rappel posé sur l'appareil (LOT-05), et
contrat v4 (LOT-04) — ces trois derniers déployés le 2026-10-08. Lecture
seule, agrégats seuls.

## La requête

[`REMESURE_ADHESION.sql`](../REMESURE_ADHESION.sql), à jouer comme
`CONSTAT_ADHESION.sql` : depuis un conteneur `scalingo run -d`, encodée en
base64 puis passée à `psql -f -`. Elle range chaque agenda selon ce que le
patient a vu pendant sa fenêtre :

| Cohorte | Définition | Rôle |
|---|---|---|
| `a_avant` | fenêtre close avant le 2026-10-07 | référence |
| `b_transition` | fenêtre à cheval | comptée, jamais mêlée |
| `c_apres` | première nuit le 2026-10-09 ou après | tout vu dès la première nuit |

**La référence (LOT-00) n'est pas perdue** : les nuits d'avant sont en base, la
cohorte `a_avant` la reconstitue après coup.

Sorties : entonnoir et démarrage (R01), taux de réponse des fenêtres échues
(R02) et en cours (R03), décrochage (R04), délai de démarrage (R05),
corrections et rattrapages (R06), contrat écrit par cohorte — contrôle des
bornes (R07), usage de « je ne sais pas » (R08), heure de saisie (R09).

## Calendrier

- **Première lecture : 2026-10-29**, date où les premières fenêtres de la
  cohorte `c_apres` (première nuit le 2026-10-09) sont échues. R03 se lit plus
  tôt, mais sur des fenêtres incomplètes.
- **Seconde lecture : 2026-11-12**, pour que `c_apres` compte davantage de
  fenêtres échues.

## Comment la lire

- **Des comptes, pas des tests.** Les effectifs sont ceux d'un cabinet : un
  écart se rapporte avec ses effectifs, sans test statistique ni seuil de
  « succès » posé après coup.
- **Aucun lot n'est isolé** : LOT-01, LOT-03, LOT-05 et LOT-04 sont arrivés en
  deux jours ; la mesure porte sur l'ensemble (arbitrage du 2026-10-07).
- **Agrégat cabinet seulement** : jamais un taux par patient (un « score de
  décrochage » est hors doctrine), jamais un identifiant dans un fichier
  durable — un dossier de test se désigne comme tel.
- **R07 d'abord** : une cohorte `c_apres` qui porterait du v3, ou `a_avant` du
  v4, signale une borne mal placée ; corriger `-v av=… -v ap=…` avant de lire
  le reste.
- **Refus de saisie** : ils ne sont pas en base. Depuis le LOT-01, la route les
  journalise (`PORTAIL_PATIENT.AGENDA_SOMMEIL.NUIT_REJETEE`, motif seul) ; leur
  compte se lit dans les journaux Scalingo, dans la limite de leur rétention.

## Correction apportée au constat

`CONSTAT_ADHESION.sql` lisait `soumis_le` — un TIMESTAMP sans fuseau qui porte
l'heure UTC — comme une heure de Paris : ses requêtes 09 (saisies le
lendemain) et 10 (heure de saisie) étaient décalées de deux heures. Corrigé
dans ce lot ; `REMESURE_ADHESION.sql` applique la conversion correcte partout.

## Validation

Les deux requêtes ont été jouées sur une base PostgreSQL 16 locale, sur des
données fabriquées (schéma réduit aux colonnes lues, types de production,
identifiants neutres) ; chaque compte a été vérifié à la main, fuseau compris.
Aucune lecture de production depuis une session distante.
