import { LIBELLE_GESTE_MOTIF, ligneMotif, type MotifNonMesureServi } from '@/lib/praticien/motifNonMesure';
import { questionnairesACompleter } from '@/lib/protocol/repassationCiblee';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import {
  BoutonAjoutFileEnvoi,
  ErreurAjoutFileEnvoi,
  PHRASE_AJOUT_SANS_ENVOI,
  useAjoutFileEnvoi,
} from '@/components/patient-cockpit/AjoutFileEnvoi';

// Le motif d'un besoin non mesuré, sous son tiret (r3_08, Q3) : `<details>`
// natif, ouvrable d'un geste au clavier comme au toucher, sans survol — le
// même geste que la provenance d'un chiffre. Le tiret reste ([[D-301]] §1).
//
// « Compléter la mesure » ([[D-352]] §2) se lit DANS le motif déplié, sous la
// ligne « aucune passation exploitable » et pour elle seule : aucun bouton
// n'est visible sans geste, rien ne se lit comme une consigne. Il n'apparaît
// que si l'écran passe l'e-mail du patient affiché — les tableaux de l'onglet
// et du tiroir ; la liste des cercles, figure de compréhension, n'en passe pas.
export function DetailMotifNonMesure({
  besoin,
  motifs,
  emailPatient,
}: {
  besoin: string;
  motifs: MotifNonMesureServi[];
  emailPatient?: string;
}) {
  const aCompleter = emailPatient ? questionnairesACompleter(motifs) : [];
  return (
    <details className="mt-0.5 text-xs text-muted-foreground">
      {/* Un geste par ligne porte le même mot : le nom accessible dit de quel
          besoin il s'agit, en gardant le mot visible en tête. */}
      <summary
        aria-label={`${LIBELLE_GESTE_MOTIF} — ${besoin}`}
        className="cursor-pointer py-0.5 underline underline-offset-2"
      >
        {LIBELLE_GESTE_MOTIF}
      </summary>
      <ul className="mt-0.5 space-y-0.5">
        {motifs.map(m => {
          const ligne = ligneMotif(m);
          return (
            <li key={ligne}>
              {ligne}
              {m.motif === 'aucune_passation' && emailPatient && aCompleter.length > 0 && (
                <CompleterLaMesure qids={aCompleter} emailPatient={emailPatient} />
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// Monté seulement quand il y a quelque chose à proposer : ni les cercles ni
// les besoins sans « aucune passation exploitable » ne portent l'état d'ajout.
function CompleterLaMesure({ qids, emailPatient }: { qids: string[]; emailPatient: string }) {
  const { ajouts, erreursAjout, ajouterALaFile } = useAjoutFileEnvoi(emailPatient);
  return (
    <div className="mt-1">
      <p className="font-semibold text-foreground">Compléter la mesure</p>
      <ul className="mt-0.5 space-y-1">
        {qids.map(qid => (
          <li key={qid}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground">{CATALOGUE_DEFINITIONS[qid]?.titre ?? qid}</span>
              <BoutonAjoutFileEnvoi qid={qid} etat={ajouts[qid]} onAjouter={q => void ajouterALaFile(q)} />
            </div>
            <ErreurAjoutFileEnvoi etat={ajouts[qid]} erreur={erreursAjout[qid]} />
          </li>
        ))}
      </ul>
      <p className="mt-0.5">{PHRASE_AJOUT_SANS_ENVOI}</p>
    </div>
  );
}
