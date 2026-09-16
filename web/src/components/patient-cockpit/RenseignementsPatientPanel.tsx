'use client';

import { useCallback, useState } from 'react';
import type { Consultation, ConsultationsApiResponse } from '@/app/api/praticien/consultations/route';
import { FICHE_SECTIONS } from '@/lib/consultation/fiche';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';

// LES RENSEIGNEMENTS DU PATIENT, RENDUS AU PRATICIEN.
//
// Le patient remplit une fiche signalétique puis une anamnèse à l'ouverture de
// son espace. Elles sont stockées en JSON sur `consultations` depuis toujours,
// et AUCUNE SURFACE PRATICIEN NE LES LISAIT : seule `lib/synthese/generation.ts`
// y touchait, pour fabriquer un texte. Trois champs d'anamnèse affleuraient
// dans `ObjectifNegociePanel` ; le reste était écrit, conservé, et invisible.
//
// CE PANNEAU AFFICHE, IL NE CALCULE RIEN. Aucun décompte, aucune synthèse,
// aucune mise en avant, aucun rapprochement entre deux réponses — `DC-19` et
// `DC-20`. Ce que le patient a écrit est rendu tel qu'il l'a écrit, sous le
// libellé de la question qui lui a été posée.
//
// LES LIBELLÉS VIENNENT DES DESCRIPTEURS, JAMAIS D'UNE COPIE. `FICHE_SECTIONS`
// et `ANAMNESE_SECTIONS` portent déjà l'ordre, les libellés, les types et les
// options. Les recopier ici les ferait dériver — et les libellés d'anamnèse ne
// sont pas décoratifs : `orientationRulesV1.ts` les apparie VERBATIM, et deux
// bancs l'exigent. Ce panneau les LIT, il n'en écrit aucun.
//
// UN CHAMP NON RENSEIGNÉ EST DIT, il n'est pas masqué. Le praticien doit
// pouvoir distinguer « la question a été posée et le patient n'a pas répondu »
// de « la question n'existe pas » — c'est la même discipline que le reste du
// cockpit, et `DC-24` la réclame : une absence n'est ni zéro, ni « rien à
// signaler ».

type Etat = 'repos' | 'chargement' | 'chargee' | 'erreur';

const ABSENCE = 'Non renseigné';

// LE MESSAGE D'ÉCHEC NOMME CE QUI A ÉCHOUÉ, et pas seulement « ça n'a pas pu
// être lu ». La zone focale « Patient » porte déjà un autre échec de lecture —
// celui des questionnaires échus — et les deux phrases se ressemblaient au mot
// près : un banc ne savait plus les distinguer, et un praticien devant deux
// alertes jumelles ne saurait pas laquelle réessayer.
const ECHEC_LECTURE = 'La fiche signalétique et l’anamnèse n’ont pas pu être lues.';

export type EtatRenseignements = {
  etat: Etat;
  consultations: Consultation[];
  erreur: string;
  charger: () => Promise<void>;
};

/**
 * Lecture partagée entre le TIROIR et la LIGNE D'ÉTAT de la zone focale.
 *
 * Une seule lecture pour les deux : la ligne d'état doit être visible sans
 * ouvrir quoi que ce soit — sinon une absence de renseignements se lirait
 * comme un silence —, et le tiroir ne doit pas relire ce qui est déjà là.
 * `'repos'` garantit qu'aucun appel ne part tant que la phase « Patient » n'est
 * pas affichée : ouvrir une fiche déclenche déjà une trentaine de requêtes.
 */
export function useRenseignementsPatient(idPatient: string): EtatRenseignements {
  const [etat, setEtat] = useState<Etat>('repos');
  const [erreur, setErreur] = useState('');
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  const charger = useCallback(async () => {
    setEtat('chargement');
    setErreur('');
    try {
      const reponse = await fetch(
        `/api/praticien/consultations?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const payload = (await reponse.json()) as ConsultationsApiResponse;
      if (!reponse.ok || payload.unavailable) {
        setErreur(ECHEC_LECTURE);
        setEtat('erreur');
        return;
      }
      // LA FORME EST VÉRIFIÉE, PAS SUPPOSÉE — et ce n'est pas du zèle : le
      // type de la route promet un tableau, mais un 200 d'une forme autre
      // (proxy, version d'API décalée, charge d'erreur rendue en 200) posait
      // `undefined` dans l'état, et `phraseEtatRenseignements` faisait tomber
      // LE COCKPIT ENTIER — pas seulement ce panneau. Une réponse qui ne tient
      // pas sa promesse est une erreur, jamais une absence de renseignements.
      if (!Array.isArray(payload.consultations)) {
        setErreur(ECHEC_LECTURE);
        setEtat('erreur');
        return;
      }
      setConsultations(payload.consultations);
      setEtat('chargee');
    } catch {
      setErreur(ECHEC_LECTURE);
      setEtat('erreur');
    }
  }, [idPatient]);

  return { etat, consultations, erreur, charger };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * LA PHRASE D'ÉTAT — celle qui reste visible sans ouvrir le tiroir.
 *
 * Elle nomme ce qui existe et depuis quand, ou dit qu'il n'y a rien. Elle ne
 * dit JAMAIS « aucun renseignement » sur une lecture en échec : c'est le
 * défaut que ce dépôt a payé plusieurs fois, et l'appelant rend alors une
 * alerte à la place.
 */
export function phraseEtatRenseignements(consultations: Consultation[]): string {
  const avecFiche = consultations.find(c => c.ficheSignaletique !== null);
  const avecAnamnese = consultations.find(c => c.anamnese !== null);
  if (!avecFiche && !avecAnamnese) {
    return 'Aucun renseignement déposé : ni fiche signalétique, ni anamnèse.';
  }

  const morceaux: string[] = [];
  morceaux.push(
    avecFiche
      ? `Fiche signalétique recueillie le ${formatDate(avecFiche.createdAt)}`
      : 'Fiche signalétique non déposée',
  );
  // La DATE DE VALIDATION quand elle existe, la création sinon : l'anamnèse se
  // termine par la validation de la consultation, et c'est cette date-là qui
  // dit quand le patient a fini. Sur une consultation encore « en_cours »,
  // `dateValidation` est nul et il n'y a rien d'autre à citer.
  morceaux.push(
    avecAnamnese
      ? `anamnèse déposée le ${formatDate(avecAnamnese.dateValidation ?? avecAnamnese.createdAt)}`
      : 'anamnèse non déposée',
  );
  return `${morceaux.join(' · ')}.`;
}

/** Une valeur stockée, rendue telle quelle — les trois formes que le portail écrit. */
function Valeur({ valeur }: { valeur: unknown }) {
  if (typeof valeur === 'string' && valeur.trim()) {
    // `whitespace-pre-line` : les champs longs (`textarea`) portent les retours
    // à la ligne du patient. Les écraser réécrirait sa mise en forme.
    return <p className="whitespace-pre-line text-base text-foreground">{valeur}</p>;
  }

  if (Array.isArray(valeur) && valeur.length > 0 && valeur.every(v => typeof v === 'string')) {
    return (
      <ul className="flex flex-col gap-0.5">
        {(valeur as string[]).map(v => (
          <li key={v} className="text-base text-foreground">
            — {v}
          </li>
        ))}
      </ul>
    );
  }

  // Groupe répétable (traitements, compléments…) : une entrée = un
  // enregistrement de champs texte, rendus sur une ligne.
  if (Array.isArray(valeur) && valeur.length > 0) {
    return (
      <ul className="flex flex-col gap-1">
        {(valeur as Array<Record<string, string>>).map((entree, rang) => (
          <li key={rang} className="text-base text-foreground">
            — {Object.values(entree).filter(Boolean).join(' · ')}
          </li>
        ))}
      </ul>
    );
  }

  return <p className="text-base text-muted-foreground">{ABSENCE}</p>;
}

function Champ({ label, valeur, suffixe }: { label: string; valeur: unknown; suffixe?: string }) {
  const rendue =
    typeof valeur === 'string' && valeur.trim() && suffixe ? `${valeur} ${suffixe}` : valeur;
  return (
    <div className="border-b border-border py-2 last:border-b-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5">
        <Valeur valeur={rendue} />
      </div>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h4 className="font-display text-base font-semibold text-foreground">{titre}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function BlocConsultation({ consultation }: { consultation: Consultation }) {
  const fiche = consultation.ficheSignaletique;
  const anamnese = consultation.anamnese;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-muted p-3">
        <p className="text-base text-foreground">
          Consultation du {formatDate(consultation.createdAt)}
          {consultation.dateValidation ? ` · validée le ${formatDate(consultation.dateValidation)}` : ''}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Statut : {consultation.statut}
          {consultation.motif ? ` · motif : ${consultation.motif}` : ''}
        </p>
        {/* Le consentement n'était visible sur aucune surface praticien. Il est
            rendu tel qu'il est stocké — sa VALEUR, sa version et sa date — sans
            interprétation : ce n'est pas à cet écran de dire ce qu'il autorise. */}
        <p className="mt-1 text-xs text-muted-foreground">
          Consentement : {consultation.consentement}
          {consultation.consentementVersion ? ` (${consultation.consentementVersion})` : ''}
          {consultation.consentementHorodatage
            ? ` · le ${formatDate(consultation.consentementHorodatage)}`
            : ''}
        </p>
      </div>

      {fiche === null ? (
        <p className="text-base text-muted-foreground">
          Fiche signalétique : aucun dépôt sur cette consultation.
        </p>
      ) : (
        FICHE_SECTIONS.map(section => (
          <Section key={section.id} titre={section.titre}>
            {section.champs.map(champ => (
              <Champ key={champ.id} label={champ.label} valeur={fiche[champ.id]} />
            ))}
          </Section>
        ))
      )}

      {anamnese === null ? (
        <p className="text-base text-muted-foreground">
          Anamnèse : aucun dépôt sur cette consultation.
        </p>
      ) : (
        ANAMNESE_SECTIONS.map(section => (
          <Section key={section.id} titre={section.titre}>
            {section.description && (
              <p className="mb-2 text-xs text-muted-foreground">{section.description}</p>
            )}
            {(section.champs ?? []).map(champ => (
              <Champ
                key={champ.id}
                label={champ.label}
                valeur={anamnese[champ.id]}
                suffixe={champ.suffixe}
              />
            ))}
            {(section.groupes ?? []).map(groupe => (
              <Champ key={groupe.id} label={groupe.label} valeur={anamnese[groupe.id]} />
            ))}
          </Section>
        ))
      )}
    </div>
  );
}

/**
 * L'HISTORIQUE, ET NON LA SEULE CONSULTATION « PORTEUSE ».
 *
 * `whereConsultationPorteuse` exige `statut: 'validee'` ET une anamnèse non
 * nulle — c'est le bon filtre pour le moteur clinique, qui a besoin d'une
 * matière complète. Il ne l'est pas ici : la fiche signalétique est écrite
 * AVANT la validation, sur une consultation encore `en_cours`. Le rejouer
 * masquerait au praticien la fiche d'un patient en cours de parcours,
 * c'est-à-dire précisément celui dont il a besoin de lire les réponses.
 *
 * On rend donc ce que la route sert — le plus récent d'abord —, chaque entrée
 * nommant son statut et sa date.
 */
export function RenseignementsPatientPanel({ etat, consultations, erreur }: EtatRenseignements) {
  if (etat === 'repos' || etat === 'chargement') {
    return (
      <p role="status" className="text-base text-muted-foreground">
        Lecture des renseignements du dossier...
      </p>
    );
  }

  // UNE ERREUR DE LECTURE N'EST JAMAIS RENDUE COMME UNE ABSENCE. Ce dossier
  // peut porter une anamnèse entière que personne ne verrait.
  if (etat === 'erreur') {
    return (
      <p role="alert" className="text-base text-status-warning">
        {erreur} Ce n’est pas une absence de renseignements : le dossier peut en porter.
      </p>
    );
  }

  if (consultations.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        Aucune consultation ouverte sur ce dossier : ni fiche signalétique, ni anamnèse n’a pu être
        déposée.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {consultations.map(consultation => (
        <BlocConsultation key={consultation.idConsultation} consultation={consultation} />
      ))}
    </div>
  );
}
