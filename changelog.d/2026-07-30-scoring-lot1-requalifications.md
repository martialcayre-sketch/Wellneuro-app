### Scoring — sept fausses critiques annulées, quatre artefacts écartés, six conduites déclarées

Campagne du 2026-07-30 (« tous les scoring exacts et validés »), lot 1. Aucune
valeur servie ne change : les trois gestes sont des gestes de registre, adossés au
dossier `2026-07-30-divergences-scoring` (#469) où chaque cas est vérifié dans le
catalogue servi.

- **Sept divergences « critiques » requalifiées en défaut de lecture du banc.** Six
  `echelle_de_cotation` à `source: "null–null"` — une absence de lecture, pas un
  écart — et le barème du HAD, reproché « undefined–undefined » alors que les
  bandes servies sont 0–7/8–10/11–21 par sous-échelle, soit le barème publié.
  Chaque annulation est consignée dans `verdictScoring.revision`, datée : le
  prochain passage du banc doit retrouver ces notes, sinon il rétablira les
  divergences annulées — la correction de l'extraction reste à faire côté banc.
- **Quatre artefacts écartés**, vérifiés et non supposés : le seuil `> 21` du
  Karasek est servi (`seuilDir: 'gt'`), `>= 0` du DASS-21 est une borne, les 5 mots
  de Dubois sont servis en deux phases par protocole, et l'IPSS est plus fidèle que
  le banc ne le crédite (7 items + qualité de vie `horsTotal`). Seul ce qui est
  établi est annulé : l'échelle 0–5/0–6 de l'IPSS reste à re-vérifier, son seuil
  manquant reste ouvert.
- **Six conduites déclarées** (Tinetti, SARC-F, AQ, MADRS, MMT SIIN, IRLS) :
  `statutContenu: adapte` et une description qui distingue la bande publiée de la
  conduite ajoutée par le cabinet. La conduite ne va déjà pas au prompt de synthèse
  (`scoresPourPrompt`) ; ce qui manquait était la déclaration.

Effet mesuré : les instruments porteurs d'une divergence critique passent de 21 à
**13**, dont 4 en état terminal. Rien ne monte encore : la montée des barreaux est
le lot 2, après re-mesure.
