### La surface biologie a enfin un parcours joué — LOT-02 (2026-08-20)

`WN_CB_PROPOSITION` est posé en production depuis le 2026-08-18 : proposition
de bilan et courrier médecin ancré sont servis aux praticiens, et **aucun E2E
ne les traversait**. Ce qui y casserait n'aurait été vu que par un praticien.

- **`web/e2e/biologie-proposition-courrier.spec.ts`** (neuf, mode sériel) :
  proposition servie et non vide → déclaration d'un bilan hors outil →
  courrier établi, texte rendu pour transcription, **aucun envoi** → seconde
  consignation refusée → verdict d'ancrage lu au fil. Patient fictif Jennifer
  Martin ; `web/prisma/seed.ts` **intact**, comme l'exige le lot — le modifier
  emporterait la capture pixel et deux autres bancs.
- **Les drapeaux manquaient au harnais, et c'est le vrai défaut découvert** :
  `isCbPropositionEnabled` exige `WN_CB_ENABLED` **et** `WN_CB_PROPOSITION`,
  et aucun des deux n'était posé — ni dans `wn-test-worktree.sh` (qui
  revendique pourtant la parité env du job CI), ni dans le job `verify`, ni
  dans `webServer.env` de Playwright. Sans eux la route rend 503 : un parcours
  écrit sans ce préalable serait passé au vert **en ne trouvant rien à
  cliquer**. Les trois portent désormais la paire.
- **Nettoyage marqué, pas approximatif** : la lettre se reconnaît à son
  destinataire, le panel déclaré à sa date de bilan, la passation à son
  préfixe. Un `deleteMany` sur le seul `idPatient` aurait emporté, sur la base
  partagée du Mac, des données posées à la main sur ce dossier fictif.
- **Aucun code applicatif touché.** La double consignation reste gardée côté
  écran seulement — le serveur n'en juge pas ; le spec éprouve donc le bouton
  désactivé, et la dette reste celle que la campagne nomme déjà.

**Le spec part NON JOUÉ** : les E2E sont l'exclusivité du Mac et ce conteneur
ne peut pas installer le navigateur (le proxy bloque `cdn.playwright.dev`).
Les deux runs consécutifs — la preuve du nettoyage, et le critère de done du
lot — restent à produire.
