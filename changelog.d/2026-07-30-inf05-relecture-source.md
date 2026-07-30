### Q_INF_05 — la relecture de source demandée tranche seule

La dernière divergence critique de l'auto-évaluation de l'anxiété
(« total_numerique_absent 0–11 ») est **annulée sans modifier le servi**. Les deux
lectures de source du banc donnent `bornesTotal {min:0, max:11}` et portent
**toutes** leurs frontières sur « nombre de questions cotées 3 ou 4 » — le
comptage, jamais une somme des cotations (qui irait à 44). Le moteur
`count_threshold` rend exactement ce nombre ; le banc le cherchait sous la clé
`total` et ne l'a pas trouvé sous la clé `count`. Même classe d'aveuglement
d'extraction que les 17 divergences requalifiées le même jour.

**Résidu déclaré, pas corrigé** : la source laisse la valeur 6 sans bande
(« important <= 5 », « critique > 6 ») ; le servi la rattache à « critique » par
arbitrage praticien du 23/06/2026, déjà consigné dans le code. Comblement de trou,
pas alignement — même famille qu'Epworth 6 et 15.

L'instrument monte à `scoring_verifie` : **52 sur 64**.
