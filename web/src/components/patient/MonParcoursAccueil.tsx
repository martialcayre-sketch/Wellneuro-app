import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { evaluerReprise, phraseReprise } from '@/lib/patient/reprise';
import type { FilDuJour } from '@/lib/portail/filDuJour';

/*
 * Accueil « Mon parcours » (SP-SPI / LOT-01), et depuis le 2026-09-12 le FIL
 * DU JOUR.
 *
 * ── CE QUE CE BLOC PORTAIT, ET CE QU'IL PORTE MAINTENANT ───────────────────
 *
 * Il portait UNE étape du moment — une seule chose mise en avant, en réponse à
 * l'écart E11 de l'audit 5.0 : la page d'atterrissage empilait une dizaine de
 * blocs autonomes, contre le principe A6-R1 « une étape à la fois (séquentiel,
 * pas de hub empilé) » côté patient.
 *
 * Il porte maintenant LA LISTE de ce qu'il y a à faire aujourd'hui. Le
 * responsable a demandé ce renversement le 2026-09-12, après avoir vu son
 * propre écran : « plus une todo list qu'un calendrier rétrospectif ». Il faut
 * le dire franchement — C'EST UN RENVERSEMENT DE LA RÉPONSE À E11 SUR CETTE
 * PAGE, pas un aménagement. On ne peut pas à la fois ne montrer qu'une étape
 * et dire au patient tout ce qui l'attend.
 *
 * CE QUI EST GARDÉ DE E11, ET COMMENT. La hiérarchie, pas le masquage : la
 * PREMIÈRE tâche garde le bouton plein et sa phrase d'appui — c'est elle,
 * l'étape du moment — et les suivantes descendent en liste de liens discrets
 * sous « Ensuite ». Le patient voit ce qui l'attend sans que cinq boutons
 * pleins se disputent son geste. Rien n'est replié : une tâche cachée sous un
 * `<details>` ne serait pas une liste de tâches.
 *
 * Le nom : « Mon parcours », et non « Ma spirale » — « Ma spirale
 * alimentaire » désigne déjà le journal alimentaire (lib/food-observation/
 * labels.ts). Deux « spirale » sur la même surface auraient été ambigus.
 *
 * Interdits tenus ici : aucun score chiffré, aucun pourcentage, aucune
 * gamification, aucun pronostic, aucun compte à rebours, AUCUN COMPTE DE
 * TÂCHES. « 4 choses à faire » serait un chiffre fabriqué par cet écran, donc
 * interdit (`DC-19`) — et surtout ce serait une dette annoncée. La liste se
 * lit, elle ne se totalise pas. Un statut n'est jamais porté par la seule
 * couleur — chaque état porte sa phrase.
 */

export type MonParcoursAccueilProps = {
  token: string;
  prenom: string | null;
  /** Dernière réponse transmise (ISO), `null` si le patient n'a jamais répondu. */
  derniereReponseLe: string | null;
  fil: FilDuJour;
  /** Injectable pour les tests ; par défaut l'instant courant. */
  maintenant?: Date;
};

export function MonParcoursAccueil({
  token,
  prenom,
  derniereReponseLe,
  fil,
  maintenant,
}: MonParcoursAccueilProps) {
  const reprise = evaluerReprise(derniereReponseLe, maintenant ?? new Date());
  const [premiere, ...suivantes] = fil.taches;

  return (
    <PatientCard padding="lg" className="border-primary/30">
      <h1 className="font-display text-2xl font-bold leading-tight text-foreground">Mon parcours</h1>
      <p className="mt-1 text-base text-muted-foreground">
        {prenom ? `Bonjour ${prenom}.` : 'Bonjour.'}
      </p>

      {/*
        La reprise passe AVANT le fil du jour : quelqu'un qui revient après des
        mois a d'abord besoin d'être accueilli, pas mis au travail.
      */}
      {reprise.enReprise && (
        <p className="mt-4 text-base text-foreground">{phraseReprise(reprise.moisEcoules)}</p>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {reprise.enReprise ? 'Pour reprendre' : 'Ce que j’ai à faire aujourd’hui'}
        </p>

        {premiere && (
          <>
            <a
              href={premiere.href}
              className={`inline-flex items-center justify-center ${patientButtonClassName('primary')}`}
            >
              {premiere.cta}
            </a>
            {premiere.appui && <p className="mt-2 text-sm text-foreground">{premiere.appui}</p>}
            {/* La garde de verrouillage ne vaut QUE pour une transmission : noter
                une nuit ne transmet ni ne verrouille rien, et l'écrire là ferait
                différer une saisie quotidienne par prudence. Elle se décide
                maintenant sur l'ESPÈCE de la tâche, et non plus sur l'absence de
                phrase d'appui — ce dernier test était un proxy, et il se serait
                trompé le jour où une tâche de questionnaire aurait porté un
                appui. */}
            {premiere.espece === 'questionnaire' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Une fois transmis, un questionnaire est verrouillé et votre praticien en est informé.
              </p>
            )}
          </>
        )}

        {/* LES SUIVANTES. Des liens, pas des boutons : le geste du jour reste
            celui du haut. Une liste ordonnée, parce que l'ordre porte du sens —
            ce qui périme d'abord. */}
        {suivantes.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ensuite
            </p>
            <ol className="space-y-2">
              {suivantes.map(tache => (
                <li key={tache.cle}>
                  <a href={tache.href} className="text-base text-foreground underline underline-offset-2">
                    {tache.cta}
                  </a>
                  {tache.appui && <p className="text-sm text-muted-foreground">{tache.appui}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* LE REPOS — et il ne se lit QUE si la liste est vide. Un fil vide
            n'est pas une page vide : c'est une réponse, et elle doit être
            aussi explicite qu'une tâche. */}
        {fil.taches.length === 0 && <Repos repos={fil.repos} />}
      </div>
    </PatientCard>
  );
}

function Repos({ repos }: { repos: FilDuJour['repos'] }) {
  /*
   * `rien_aujourdhui` est l'état le plus fréquent d'un dossier qui va bien, et
   * c'est celui qui était le plus mal servi : un patient dont la nuit était
   * notée voyait « Consulter « Mon agenda du sommeil » » présenté comme son
   * étape du moment — une tâche là où il n'y en avait aucune. Les phrases
   * d'appui viennent telles quelles des modules de rappel : « rien à faire »
   * ne doit pas se lire « rien ne se passe ».
   */
  if (repos.kind === 'rien_aujourdhui') {
    return (
      <>
        <p className="text-base text-foreground">Rien à faire aujourd’hui.</p>
        {repos.appuis.map(appui => (
          <p key={appui} className="mt-1 text-sm text-muted-foreground">
            {appui}
          </p>
        ))}
      </>
    );
  }

  /*
   * Une correction demandée n'est PAS un appel à l'action : le patient ne peut
   * rien faire tant que le praticien ne l'a pas déverrouillée. On l'énonce, on
   * ne la met pas en bouton. Même forme pour la formulation du contrat de
   * parcours, qui décrit elle aussi un état que le patient subit.
   */
  if (repos.kind === 'attente') {
    return <p className="text-base text-muted-foreground">{repos.texte}</p>;
  }

  if (repos.kind === 'stable') {
    return (
      <p className="text-base text-muted-foreground">
        Vous avez transmis tout ce qui vous était demandé. Votre praticien vous recontactera pour la suite.
      </p>
    );
  }

  return (
    <p className="text-base text-muted-foreground">
      Aucun questionnaire pour le moment. Votre praticien les mettra à disposition prochainement.
    </p>
  );
}
