### Tests : banc DeclarationsPatient stabilisé (BP-13)

- **`DeclarationsPatient.test.tsx`** : le rappel `onLectureEchouee` part d'un
  effet passif, après le rendu de l'alerte ; ses trois assertions qui
  suivaient `findByRole('alert')` sont désormais attendues (`waitFor`). Le
  banc avait rougi le CI de main une fois sous charge.
- Test seul : ni composant, ni règle clinique, ni migration, ni D-xxx.
