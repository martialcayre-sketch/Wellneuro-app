'use client';

// L'ONGLET « ÉVOLUTION » (OF-2, planche A sans K-11) — [[D-560]].
//
// Des valeurs datées côte à côte, et rien d'autre : aucun écart, aucune
// flèche, aucune couleur qui juge, aucun mot qui qualifie. Le praticien
// interprète ; l'écran montre. Les passations se rangent par jalon ; la
// biologie, à la date de prélèvement, une ligne par analyte et par unité.

import { useEffect, useState } from 'react';
import { EncartRefusD560 } from '@/components/patient-cockpit/EncartRefusD560';
import { LIBELLES_MOTIF_NON_COMPARABILITE } from '@/components/patient-cockpit/EstimeMesurePanel';
import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';
import { formaterPoints } from '@/lib/scoring/comparaisonPassations';
import { ETIQUETTE_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import {
  construirePlancheBiologie,
  type LigneBiologie,
  type PassationAffichee,
  type PlanchePassations,
  type SerieBiologieLue,
} from '@/lib/praticien/plancheEvolution';

type Etat<T> = { lecture: 'chargement' } | { lecture: 'erreur' } | { lecture: 'ok'; donnees: T };
type EtatBiologie = Etat<LigneBiologie[]> | { lecture: 'desactivee' };

const LIBELLES_STATUT_EXCLU: Record<NonNullable<PassationAffichee['statutExclu']>, string> = {
  INVALID: 'Passation invalidée',
  SUPERSEDED: 'Passation remplacée',
  HISTORICAL_ONLY: 'Passation historique seulement',
};

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

function Passation({ passation, masques }: { passation: PassationAffichee; masques: boolean }) {
  return (
    <li className="grid gap-0.5" data-passation-evolution="">
      <span className="text-foreground">
        {passation.nonInterpretable ? (
          <span className="text-status-danger" title={passation.nonInterpretable}>
            {ETIQUETTE_NON_INTERPRETABLE}
          </span>
        ) : passation.score === null ? (
          'Non scorée'
        ) : masques ? (
          <ValeurMasquee />
        ) : (
          formaterPoints(passation.score)
        )}{' '}
        <span className="text-muted-foreground">le {formaterDate(passation.dateReponse)}</span>
      </span>
      {passation.interpretation && !masques && (
        <span className="text-xs text-muted-foreground">({passation.interpretation})</span>
      )}
      {passation.ambigue && <span className="text-xs text-muted-foreground">Passation ambiguë</span>}
      {passation.statutExclu && (
        <span className="text-xs text-muted-foreground">{LIBELLES_STATUT_EXCLU[passation.statutExclu]}</span>
      )}
    </li>
  );
}

function PlancheDesPassations({ planche, masques }: { planche: PlanchePassations; masques: boolean }) {
  if (planche.colonnes.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">Aucun épisode confirmé pour l’instant.</p>;
  }
  return (
    <>
      {planche.lignes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucune passation retenue par les épisodes confirmés.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <caption className="sr-only">Passations retenues par chaque épisode confirmé, par jalon</caption>
            <thead>
              <tr className="text-left align-bottom">
                <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                  Instrument
                </th>
                {planche.colonnes.map((colonne) => (
                  <th key={colonne.idEpisode} scope="col" className="px-3 py-2 font-medium text-foreground">
                    <span className="block">{colonne.milestone}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      confirmé le {formaterDate(colonne.confirmeLe)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planche.lignes.map((ligne) => (
                <tr key={ligne.idQuestionnaire} className="border-t border-border align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                    {ligne.titre}
                  </th>
                  {ligne.cases.map((contenu, rang) => (
                    <td key={planche.colonnes[rang].idEpisode} className="px-3 py-2">
                      {contenu.length === 0 ? (
                        <span className="text-xs italic text-muted-foreground">jalon non mesuré</span>
                      ) : (
                        <ul className="grid gap-2">
                          {contenu.map((passation) => (
                            <Passation key={passation.idReponse} passation={passation} masques={masques} />
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {planche.introuvablesParColonne.some((n) => n > 0) && (
        <ul className="mt-2 grid gap-1 text-xs text-status-warning">
          {planche.introuvablesParColonne.map((n, rang) =>
            n > 0 ? (
              <li key={planche.colonnes[rang].idEpisode}>
                {planche.colonnes[rang].milestone} : {n} passation{n > 1 ? 's' : ''} retenue{n > 1 ? 's' : ''}{' '}
                introuvable{n > 1 ? 's' : ''} dans le dossier.
              </li>
            ) : null,
          )}
        </ul>
      )}
    </>
  );
}

function PlancheDeLaBiologie({ lignes, masques }: { lignes: LigneBiologie[]; masques: boolean }) {
  if (lignes.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">Aucun résultat biologique consigné.</p>;
  }
  return (
    <ul className="mt-3 grid gap-3">
      {lignes.map((ligne) => (
        <li key={ligne.cle} className="border-t border-border pt-2" data-ligne-biologie-evolution="">
          <p className="text-sm font-medium text-foreground">
            {ligne.libelle}{' '}
            <span className="font-normal text-muted-foreground">({ligne.unite ?? 'unité non renseignée'})</span>
          </p>
          {ligne.unitesMelees && (
            <p className="text-xs text-muted-foreground">Unités différentes : valeurs non converties.</p>
          )}
          {ligne.motifs.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Non comparables en l’état :{' '}
              {ligne.motifs.map((motif) => LIBELLES_MOTIF_NON_COMPARABILITE[motif] ?? motif).join(', ')}.
            </p>
          ) : (
            // Aux unités mêlées, la mention ci-dessus EST un motif : « aucun
            // motif connu » la contredirait (remarque PR-Agent sur #2354).
            !ligne.unitesMelees &&
            ligne.points.length > 1 && (
              // Le silence se lirait « comparable » : la série ne l'est jamais
              // déclarée ([[D-497]] §5, DC-24).
              <p className="text-xs text-muted-foreground">
                Aucun motif connu de non-comparabilité ; la série n’est pas déclarée comparable.
              </p>
            )
          )}
          <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {ligne.points.map((point) => (
              <li key={point.idResultat}>
                {masques ? <ValeurMasquee /> : <span className="text-foreground">{point.valeur}</span>}{' '}
                <span className="text-muted-foreground">prélevé le {formaterDate(point.preleveLe)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function EvolutionPanel({ idPatient }: { idPatient: string }) {
  const masques = useChiffresMasques();
  const [passations, setPassations] = useState<Etat<PlanchePassations>>({ lecture: 'chargement' });
  const [biologie, setBiologie] = useState<EtatBiologie>({ lecture: 'chargement' });

  // UNE LECTURE PAR DOSSIER, ET SEULEMENT LA SIENNE. Le panneau peut rester
  // monté d'un dossier à l'autre : l'état repart à « chargement », et une
  // réponse arrivée après le changement de dossier est ignorée — sans quoi
  // les valeurs du dossier précédent s'afficheraient sous le nouveau.
  useEffect(() => {
    let perimee = false;
    setPassations({ lecture: 'chargement' });
    setBiologie({ lecture: 'chargement' });
    const id = encodeURIComponent(idPatient);
    const lirePassations = async () => {
      try {
        const reponse = await fetch(`/api/praticien/evolution?idPatient=${id}`);
        const corps = (await reponse.json()) as { ok: boolean; planche?: PlanchePassations };
        if (perimee) return;
        setPassations(reponse.ok && corps.ok && corps.planche ? { lecture: 'ok', donnees: corps.planche } : { lecture: 'erreur' });
      } catch {
        if (!perimee) setPassations({ lecture: 'erreur' });
      }
    };
    const lireBiologie = async () => {
      try {
        const reponse = await fetch(`/api/praticien/biologie/resultats?idPatient=${id}`);
        const corps = (await reponse.json()) as {
          ok: boolean;
          reason?: string;
          resultats?: { analyteCode: string; analyteLibelle: string }[];
          series?: SerieBiologieLue[];
        };
        if (perimee) return;
        if (!reponse.ok && corps.reason === 'cb_resultats_desactives') {
          setBiologie({ lecture: 'desactivee' });
          return;
        }
        if (!reponse.ok || !corps.ok) {
          setBiologie({ lecture: 'erreur' });
          return;
        }
        const libelles = new Map((corps.resultats ?? []).map((r) => [r.analyteCode, r.analyteLibelle]));
        setBiologie({ lecture: 'ok', donnees: construirePlancheBiologie(corps.series ?? [], libelles) });
      } catch {
        if (!perimee) setBiologie({ lecture: 'erreur' });
      }
    };
    void lirePassations();
    void lireBiologie();
    return () => {
      perimee = true;
    };
  }, [idPatient]);

  return (
    <section aria-labelledby="evolution-titre" className="grid gap-4">
      <h2 id="evolution-titre" className="text-base font-semibold text-foreground">
        Évolution
      </h2>
      <EncartRefusD560 />

      <section aria-labelledby="evolution-passations-titre" className="rounded-xl border border-border bg-surface p-4">
        <h3 id="evolution-passations-titre" className="text-sm font-semibold text-foreground">
          Passations, par jalon
        </h3>
        {passations.lecture === 'chargement' ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Chargement des passations...
          </p>
        ) : passations.lecture === 'erreur' ? (
          // Un échec n'est jamais présenté comme « aucune passation ».
          <p role="alert" className="mt-3 text-sm text-status-warning">
            Les passations n’ont pas pu être lues.
          </p>
        ) : (
          <PlancheDesPassations planche={passations.donnees} masques={masques} />
        )}
      </section>

      <section aria-labelledby="evolution-biologie-titre" className="rounded-xl border border-border bg-surface p-4">
        <h3 id="evolution-biologie-titre" className="text-sm font-semibold text-foreground">
          Biologie, par date de prélèvement
        </h3>
        {biologie.lecture === 'chargement' ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Chargement de la biologie...
          </p>
        ) : biologie.lecture === 'desactivee' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Les résultats biologiques ne sont pas activés sur cet environnement.
          </p>
        ) : biologie.lecture === 'erreur' ? (
          <p role="alert" className="mt-3 text-sm text-status-warning">
            La biologie n’a pas pu être lue.
          </p>
        ) : (
          <PlancheDeLaBiologie lignes={biologie.donnees} masques={masques} />
        )}
      </section>
    </section>
  );
}
