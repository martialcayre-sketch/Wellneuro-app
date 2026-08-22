### La synthèse cesse d'être coupée avant l'accolade finale (2026-08-22)

Deux bornes **techniques** élargies sur `POST /api/praticien/synthese` — ni
seuil, ni poids, ni règle clinique (`DC-19`/`DC-20` : un chiffre purement
technique est identifié comme tel).

- **Fenêtre de génération 8 192 → 16 384 tokens.** Un dossier cumulant de
  nombreux questionnaires dépassait la borne précédente : le modèle produisait
  un JSON par ailleurs valide, coupé avant l'accolade finale, et la synthèse
  échouait au parsing. La nouvelle borne reste sous le seuil au-delà duquel un
  appel non streamé risque le délai HTTP du SDK ; le plafond de sortie du
  modèle est très supérieur.
- **Transport SSE : borne de travail 2 → 4 min**, une reprise inchangée. Le
  heartbeat tient déjà le routeur ; la borne existe pour ne pas laisser une
  requête pendre après une déconnexion client, et deux minutes coupaient des
  générations légitimement longues. Le transport JSON (défaut) n'a pas de
  borne explicite et n'est pas touché.

Aucune donnée d'entrée, aucun prompt et aucune logique de restitution ne
changent : à dossier identique, la synthèse produite est la même — elle va
seulement jusqu'au bout.
