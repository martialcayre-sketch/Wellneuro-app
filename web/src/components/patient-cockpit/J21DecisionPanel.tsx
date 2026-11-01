'use client';

import { optionLibelle, type PointEtape } from '@/lib/protocol/checkinDomain';
import { JOURS_DU_CYCLE } from '@/lib/protocol/jourDuCycle';
import type { ResumeJ21, ResumePointEtape } from '@/lib/protocol/resumeJ21';
import { MENTION_NATURE_INDICE_GLOBAL } from '@/lib/equilibre/natureIndiceGlobal';
import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';

// Panneau décisionnel du point d'étape J21 (C2A LOT-04) — LECTURE SEULE. Il
// affiche le « résumé J21 » (point de jonction A1 : le score a-t-il bougé ?
// l'action a-t-elle été tenue / tolérée ?) et présente les 6 labels de décision
// comme ACTIONS GUIDÉES. Le label n'est PAS persisté (décision de cadrage) :
// l'ajustement clinique passe par le versionnement existant (« Enregistrer la
// version »), continuer/explorer/stopper restent des orientations documentées.
// Aucun score prédictif, aucune interprétation diagnostique.

const LABEL_POINT: Record<PointEtape, string> = { J7: 'J7', J14: 'J14', J21: 'J21' };

const LABEL_TENDANCE: Record<'hausse' | 'stable' | 'baisse', string> = {
  hausse: 'en hausse',
  stable: 'stable',
  baisse: 'en baisse',
};

// ÉCHELLE E4 (`D-334` §2 ; J2-jourN, H52) : une marque datée par point d'étape.
// Le pictogramme suit l'ordre des quatre niveaux, sans chiffre (§1 : un ordre,
// pas une mesure) ; il est masqué au lecteur d'écran, le mot porte le sens.
// Pictogrammes et textes validés par le responsable le 2026-11-01.
const PICTO_ADHESION: Readonly<Record<string, string>> = {
  pas_encore: '○',
  quelques_jours: '◔',
  plupart_des_jours: '◕',
  tous_les_jours: '●',
};

const LIBELLE_MARQUE_SANS_REPONSE = {
  en_cours: 'en cours',
  a_venir: 'à venir',
  pas_de_reponse: 'pas de réponse',
} as const;

/** Une date au calendrier de Paris, JJ/MM/AAAA. */
function formatJourParis(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function ligneJourDuCycle(suivi: NonNullable<ResumeJ21['suivi']>): string {
  const diffusion = formatJourParis(suivi.jourZero);
  return suivi.jour <= JOURS_DU_CYCLE
    ? `Jour ${suivi.jour} sur ${JOURS_DU_CYCLE} — protocole diffusé le ${diffusion}`
    : `Jour ${suivi.jour} — au-delà des ${JOURS_DU_CYCLE} jours du cycle (protocole diffusé le ${diffusion})`;
}

function AutresReponses({ reponses }: { reponses: NonNullable<ResumePointEtape['reponses']> }) {
  return (
    <>
      {' · tolérance : '}
      {optionLibelle('tolerance', reponses.tolerance)}
      {' · énergie : '}
      {optionLibelle('energie', reponses.energie)}
      {' · sommeil : '}
      {optionLibelle('sommeil', reponses.sommeil)}
    </>
  );
}

function MarqueE4({ point }: { point: ResumePointEtape }) {
  if (point.marque === 'repondu' && point.reponses) {
    const picto = PICTO_ADHESION[point.reponses.adhesion];
    return (
      <>
        {'· '}
        {picto && <span aria-hidden="true">{picto} </span>}
        {optionLibelle('adhesion', point.reponses.adhesion)}
        {point.soumisLe && <> · le {formatJourParis(point.soumisLe)}</>}
        <AutresReponses reponses={point.reponses} />
      </>
    );
  }
  if (point.marque && point.marque !== 'repondu') return <>{`· ${LIBELLE_MARQUE_SANS_REPONSE[point.marque]}`}</>;
  return null;
}

const AJUSTEMENTS: { titre: string; description: string }[] = [
  { titre: 'Alléger', description: "Réduire la charge de l'action principale." },
  { titre: 'Densifier', description: 'Renforcer ou ajouter une action.' },
  { titre: 'Pivoter', description: "Changer d'axe prioritaire." },
];

const AUTRES: { titre: string; description: string }[] = [
  { titre: 'Continuer', description: 'Poursuivre le protocole tel quel (aucun changement).' },
  { titre: 'Explorer', description: 'Investiguer avant de décider.' },
  { titre: 'Stopper', description: 'Arrêter le protocole.' },
];

export function J21DecisionPanel({
  resume,
  onAjuster,
  suiviOuvert = null,
}: {
  resume: ResumeJ21 | null;
  // Renvoie vers le flux de versionnement existant (« Enregistrer la version »).
  onAjuster?: () => void;
  /**
   * Le cycle courant porte-t-il une diffusion ? ([[D-255]], lot 4) `null` =
   * pas encore su : le panneau garde sa forme habituelle.
   */
  suiviOuvert?: boolean | null;
}) {
  const chiffresMasques = useChiffresMasques();
  // SANS DIFFUSION, AUCUN POINT D'ÉTAPE NE COURT ([[D-255]]). Le panneau
  // affichait « en attente du patient » sur un protocole qui n'existait pas, et
  // offrait d'alléger ou de pivoter un protocole jamais servi.
  if (suiviOuvert === false) {
    return (
      <section aria-labelledby="j21-decision-title" className="rounded-xl border border-border bg-surface p-4">
        <h3 id="j21-decision-title" className="text-sm font-semibold text-foreground">
          Point d’étape J21 — résumé et décision
        </h3>
        <p role="status" className="mt-3 text-base text-muted-foreground">
          Aucun protocole n’a été diffusé sur ce cycle : les points d’étape J7, J14 et J21 ne courent pas encore.
          Ils partiront de la diffusion du protocole (phase Actions).
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="j21-decision-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="j21-decision-title" className="text-sm font-semibold text-foreground">
        Point d’étape J21 — résumé et décision
      </h3>
      {/* J2-jourN (H52) : le jour du cycle, compté depuis le jour 0 du momentum
          et des jalons. Sans jour 0, rien : aucun jour n'est inventé. */}
      {resume?.suivi && <p className="mt-1 text-sm text-foreground">{ligneJourDuCycle(resume.suivi)}</p>}

      {/* Point de jonction : score (momentum) + action (check-ins). */}
      <div className="mt-3 space-y-1 text-base">
        {/* [[D-108]] — la tendance ci-dessous est celle du total de « Mon
            équilibre », sans interprétation clinique ([[D-106]], `DC-22`). */}
        <p className="text-xs text-muted-foreground">{MENTION_NATURE_INDICE_GLOBAL}</p>
        <p className="text-foreground">
          Score « Mon équilibre » :{' '}
          {/* La tendance du total se lit comme son écart : masquée en mode
              consultation ([[D-354]] §2). */}
          {resume?.score && chiffresMasques ? (
            <ValeurMasquee />
          ) : resume?.score ? (
            <span className="font-medium">{LABEL_TENDANCE[resume.score.tendance]}</span>
          ) : (
            <span className="text-muted-foreground">non disponible pour l’instant</span>
          )}
        </p>
        <ul className="mt-1 space-y-1">
          {(resume?.points ?? []).map((point) => (
            <li key={point.pointEtape} className="text-muted-foreground">
              <span className="font-medium text-foreground">{LABEL_POINT[point.pointEtape]}</span>{' '}
              {point.marque ? (
                <MarqueE4 point={point} />
              ) : point.renseigne && point.reponses ? (
                <>
                  · action : {optionLibelle('adhesion', point.reponses.adhesion)} · tolérance :{' '}
                  {optionLibelle('tolerance', point.reponses.tolerance)} · énergie :{' '}
                  {optionLibelle('energie', point.reponses.energie)} · sommeil :{' '}
                  {optionLibelle('sommeil', point.reponses.sommeil)}
                </>
              ) : (
                <>· en attente du patient</>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Décision : ajuster (via versionnement) vs orientations documentées. */}
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ajuster le protocole</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AJUSTEMENTS.map((item) => (
              <button
                key={item.titre}
                type="button"
                onClick={onAjuster}
                title={item.description}
                className="rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                {item.titre}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Un ajustement crée une nouvelle version du protocole (« Enregistrer la version » ci-dessus). Rien n’est
            envoyé au patient sans votre validation « pour diffusion ».
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Autres décisions</p>
          <ul className="mt-2 space-y-1 text-base text-muted-foreground">
            {AUTRES.map((item) => (
              <li key={item.titre}>
                <span className="font-medium text-foreground">{item.titre}</span> — {item.description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
