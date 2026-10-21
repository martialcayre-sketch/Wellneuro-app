import { PIED_URGENCE_PORTAIL } from '@/lib/securite/urgenceSuicide';

// L'aide permanente du portail ([[D-293]] §3, amendement du 2026-10-21) : au
// pied de toutes les pages de `/portail`, les numéros d'urgence, chacun
// cliquable pour appeler, sans page intermédiaire. Texte validé tel quel par le
// responsable. Le texte courant reste lisible : le pied de page est pâle, cette
// ligne ne l'est pas.

const lien = 'font-semibold underline underline-offset-2 text-foreground';

export function PiedDePageUrgence() {
  return (
    <p className="text-sm text-foreground">
      <span className="font-semibold">{PIED_URGENCE_PORTAIL.titre}</span>{' '}
      {PIED_URGENCE_PORTAIL.lignes.map((ligne, i) => (
        <span key={ligne.libelle}>
          {i > 0 && ' · '}
          {ligne.libelle} :{' '}
          {ligne.numeros.map((numero, j) => (
            <span key={numero}>
              {j > 0 && ' ou '}
              <a href={`tel:${numero}`} className={lien}>
                {numero}
              </a>
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}
