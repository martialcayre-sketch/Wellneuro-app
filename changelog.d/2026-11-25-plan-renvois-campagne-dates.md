### Plan unique : les renvois par numéro de ligne vers `CAMPAGNE.md` de BIO-PARCOURS portent leur sha de lecture (plan-renvois-campagne-dates, 2026-11-25)

Les 21 lignes de `docs/claude/PLAN_WELLNEURO.md` qui citent
`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md` par numéro de
ligne (fiches BP-03 à BP-27, phase 5, lettre a du §1, table des campagnes)
visaient une version du fichier décalée depuis le 2026-10-14 (`d671945b` y
insère le renvoi au plan, puis la table grandit) : BP-07 était dit en ligne
117, il est en ligne 139. Tous ces numéros sont exacts ensemble sur une seule
version, la dernière avant ce décalage : `09bd86b1` (fichier identique à
`5111e365`, 2026-10-10). Chaque renvoi reçoit, selon la convention déjà écrite
du plan, la mention « se lit sur 09bd86b1 » (ou « se lisent sur ») ; aucun
numéro ni aucun fond ne change. `CAMPAGNE.md`, les fiches et les autres renvois
du plan ne sont pas touchés.
