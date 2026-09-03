## 2026-09-04 — docs(clinique) : la répétition de la mention de nature est portante — le lot Densité ne la factorise pas

Le lot Densité du cadrage (2026-09-02) proposait un « composant unique pour la
mention *Repère de suivi…* (×4) ». **Vérifié : à ne pas faire.**

La garde `D-106` (`natureIndiceGlobal.guard.test.ts`, cas « chaque surface
déclarée porte la mention de nature ») exige que le **fichier** de chaque
surface contienne littéralement `MENTION_NATURE_INDICE_GLOBAL`. Extraire un
composant partagé retirerait l'identifiant des surfaces et ferait tomber la
garde — dont le remède apparent serait d'assouplir le détecteur, c'est-à-dire
de désarmer `D-106` pour un gain cosmétique. C'est précisément le mécanisme qui
avait produit le NO-GO B1 de la contre-revue du lot 3.

Les quatre sites ne sont d'ailleurs pas identiques : deux rendent le même `<p>`,
un troisième un `<span>` ajusté à un badge de tendance, le quatrième passe la
chaîne en prop. La duplication réelle se limite à deux lignes.

Le motif est désormais écrit **dans la garde elle-même**, à l'endroit exact où
quiconque tentera le regroupement la verra rougir.

Le reste du lot Densité — cycles anciens repliables, gabarit unique de
non-comparabilité, valeur et motif condensés, lignes de `PropositionBilanPanel`
en « une ligne visible + repli » — reste à faire : ces changements déplacent ce
que le praticien lit à côté d'un indice clinique, en territoire de vocabulaire
verrouillé, et le cadrage exige pour eux une revue renforcée.
