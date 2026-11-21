### Refonte Lien, PRA-5 PR 3 : synthèses et documents disent leurs échecs de lecture, et la fiche en mode consultation ne rend plus aucun lien qui la quitte (2026-11-17)

Avant, une lecture en échec se lisait comme une absence : « Aucune synthèse
pour ce patient. » sur P51, « Aucune synthèse validée pour ce patient. … » sur
P52, et la liste des patients restait vide sans un mot. En mode consultation,
la fiche offrait encore quatre liens qui la quittaient. Désormais (D-481,
complément DOC-15, Q1, Q4 à Q8, Q10, Q11 ; T-74 à T-76 et T-17 de D-488 ;
D-354, amendement DOC-15) :

- Titres : « Synthèse IA & Booklet » et « Documents contextuels » passent en
  h1, de même classe que les autres écrans ; les zones en h2, leurs
  sous-parties en h3, sans saut.
- Échecs de lecture : les synthèses (T-74), les synthèses validées (T-75) et
  la liste des patients (T-76) disent leur échec, en alerte, suivi de
  « Réessayer », qui ne relance que cette lecture ; le focus revient au
  bouton si elle échoue encore. Une réponse non `ok` compte comme un échec ;
  le message vide ne paraît que sur une réponse saine.
- États : « Chargement... » et « Composition en cours… » sont annoncés
  (`role=status`). Le retour d'une action paraît une seule fois, sous le
  geste qui l'a produit, en `role=status` au succès et en `role=alert` à
  l'échec (il était rendu jusqu'à trois fois sur P51). Un retour arrivé
  après la fermeture du détail ou un changement de sélection paraît sous la
  sélection, jamais sous une autre synthèse. Aucun mot ne change.
- Commandes : 44 px et focus visible partout, par `ui/Button` et
  `ui/Select` ; plus d'`indigo-600` ; icônes au trait du socle. L'éditeur
  de synthèse et le compositeur suivent.
- Une action pleine par zone, en `color-primary` : « Valider la synthèse »,
  « Envoyer au patient » (booklet et documents), « Confirmer et imprimer »,
  l'avancée du compositeur. « Rejeter » passe en bordé danger ; « Enregistrer
  la note », « Prévisualiser le booklet » et « Vider la synthèse » en bordé.
  Les gestes et leurs gardes (relecture cochée, renvoi confirmé, registre,
  confirmation d'impression) ne changent pas.
- Mode consultation de la fiche : ni « Ouvrir la synthèse IA » ni « Composer
  un document » dans le tiroir de synthèse, ni le retour de l'en-tête, ni
  « Ouvrir le document » sur un document déposé par le patient, ni « Revenir
  à la liste des patients » après un effacement. On sort par
  « Quitter ». C'est une condition d'affichage : les pages restent ouvertes
  hors du mode, et la synthèse, les notes et l'e-mail restent affichés
  (D-354 §5). Le rail global et l'en-tête de l'application sont inchangés
  (Q14).
- Aucun texte neuf hors T-74 à T-76, aucun score, aucun export, aucune route,
  aucune garde serveur.
- Bancs : `SynthesePanel.lectures.test.tsx` (huit tests) ; quatre tests
  ajoutés à `DocumentsPanel.test.tsx` et un à `DocumentsDeposesPanel.test.tsx`
  ; `e2e/mode-consultation-liens.spec.ts`, inventaire des liens de la fiche
  en mode (enveloppe et tiroirs ouverts) et parcours au clavier ;
  `mode-consultation-sans-chiffre.spec.ts` rejoué.
