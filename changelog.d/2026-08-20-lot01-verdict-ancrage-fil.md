### Le fil relit l'ancre des courriers biologiques, et dit si elle tient (2026-08-20)

`D-073` avait posé deux colonnes d'ancrage sur `correspondances_medecin` et un
contrat SQL qui refuse une ancre à moitié. Mais `SELECTION`, dans la route du
fil, ne les portait pas : elles étaient **en écriture seule**, et la garde
qu'elles promettaient n'existait nulle part.

- **Trois états, pas deux** — `concordante`, `perimee`, et **`sans_ancrage`**
  qui n'affiche **rien**. C'est le cœur du lot (`DC-24`) : une lettre sans
  ancre est antérieure à `D-073` ou n'est pas un courrier biologique ; la
  marquer « périmée » ferait porter un soupçon à tout l'historique. Une ancre à
  moitié — que le CHECK SQL interdit en base — retombe sur `sans_ancrage`, pas
  sur un défaut affiché.
- **Le verdict se rend sur les deux termes, jamais sur le seul SHA** : une
  table re-signée sous une version neuve doit se voir. Un banc l'épingle, et la
  mutation « comparer le seul `ancrageSha256` » a été **jouée** : elle rougit.
- **Seul le verdict traverse HTTP.** Ni le SHA ni la version ne sont servis :
  exposés, ils inviteraient le navigateur à recomparer — et à le faire mal.
- **La copie de la version est épinglée sur sa source.** `courrier.ts` est une
  table signée : son littéral `'indications-biologie-v1'` ne peut pas être
  exporté sans modification clinique, la route en détient donc une copie. Le
  banc de concordance ne recopie pas la chaîne : il **génère un vrai courrier**
  et sert sa provenance telle quelle. Si l'un des deux littéraux dérive, il
  rougit.
- **Une mention sobre**, dans la ligne de métadonnées déjà là, sur le patron de
  « synthèse référencée » — pas de badge, pas de couleur : un marqueur de plus
  par ligne serait du bruit.
- **La matrice de consommation a bougé d'elle-même** : le nouvel import fait
  entrer la route du fil dans les consommateurs indirects du corpus clinique.
  Fichier régénéré par son script, jamais édité à la main.

Aucune table signée modifiée, aucune migration : les colonnes existaient déjà.
