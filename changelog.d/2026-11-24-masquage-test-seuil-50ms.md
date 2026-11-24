### Masquage : le test de linéarité « ( » + 80 000 blancs mesure la meilleure de cinq passes (masquage-test-seuil-50ms, 2026-11-24)

Le test de durée de `web/src/lib/export-dossier/masquage.test.ts` (seuil de
50 ms, « ( » suivi de 80 000 blancs) a rougi une fois sous la charge d'une
suite complète le 2026-11-16 (79 ms), puis passé seul. Il retient désormais la
meilleure de cinq passes par blanc, et s'arrête dès qu'une passe tient sous le
seuil. Le seuil ne bouge pas, et la garde anti-emballement reste entière : une
régression quadratique (de l'ordre de 80 000² opérations) dépasse 50 ms à
chaque passe, donc rougit toujours. Seule la gigue d'ordonnancement est
absorbée. Test seul : aucun code de production, aucune autre assertion
modifiée. Le texte d'entrée se construit désormais hors de la mesure.
