'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { documentsRequerantAccuse } from '@/lib/trust/avantDeCommencer';

/**
 * Séquence « Avant de commencer » (TRUST LOT-02) — quatre écrans courts
 * présentés après la vérification d'identité et avant tout recueil de
 * données de santé. Le bouton final enregistre un accusé « j'ai pris
 * connaissance » (jamais « j'accepte tout ») sur les documents que
 * `documentsRequerantAccuse()` désigne, dans leur version courante résolue
 * côté serveur. Reprise possible : tant que l'accusé n'existe pas, la séquence
 * se représente au prochain accès — sans jamais bloquer la consultation des
 * réponses existantes.
 *
 * LES DOCUMENTS NE SONT PLUS ÉCRITS EN DUR ICI (2026-09-16). Ils l'étaient —
 * cadre et limites & sécurité —, tandis que la porte du portail n'en regardait
 * qu'un. Un document pouvait donc réclamer un accusé sans que rien ne le pose,
 * et c'est ce qui arrivait à « Vos données personnelles ».
 */
export function AvantDeCommencer({ token, onDone }: { token: string; onDone: () => void }) {
  const [ecran, setEcran] = useState(0);
  const [confirmations, setConfirmations] = useState([false, false, false]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  // Trace de présentation (idempotente, non bloquante) dès le premier écran.
  useEffect(() => {
    void fetch('/api/portail/trust/lecture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, documentKey: 'cadre_accompagnement', type: 'presente' }),
    }).catch(() => undefined);
  }, [token]);

  const terminer = async () => {
    setErreur('');
    setEnvoi(true);
    try {
      // LA MÊME LISTE QUE LA PORTE, et jamais une copie (2026-09-16). Deux
      // documents étaient écrits en dur ici pendant que la porte n'en regardait
      // qu'un : le troisième — « Vos données personnelles » — pouvait réclamer
      // un accusé sans que rien ne le pose ni ne le vérifie.
      //
      // Si cette liste et celle de la porte divergeaient, le patient boucherait
      // sans fin : quatre écrans, une validation, un retour, et les quatre
      // écrans à nouveau. `documentsRequerantAccuse` est leur unique source.
      for (const documentKey of documentsRequerantAccuse()) {
        const res = await fetch('/api/portail/trust/lecture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, documentKey, type: 'pris_connaissance' }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!data.ok) {
          setErreur(data.error ?? 'Erreur. Réessayez.');
          setEnvoi(false);
          return;
        }
      }
      onDone();
    } catch {
      setErreur('Erreur réseau. Réessayez.');
      setEnvoi(false);
    }
  };

  const lienCentre = (
    <Link href={`/portail/${token}/informations`} className="text-sm text-primary hover:underline">
      Consulter les informations détaillées
    </Link>
  );

  const progression = (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      Étape {ecran + 1} sur 4
    </p>
  );

  if (ecran === 0) {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Bienvenue dans votre espace Wellneuro" />
        {progression}
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Wellneuro est un espace sécurisé de préparation et de suivi de votre accompagnement en
            neuronutrition.
          </p>
          <p>
            Il vous permet de transmettre les informations utiles, de compléter vos questionnaires,
            de consulter les documents validés par votre praticien et de suivre les étapes de votre
            accompagnement.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Vos réponses servent à préparer un accompagnement personnalisé.</li>
            <li>Vous retrouvez ici les informations et documents qui vous concernent.</li>
            <li>Vous restez libre de poser des questions et de demander une correction.</li>
          </ul>
        </div>
        <PatientButton variant="primary" onClick={() => setEcran(1)} className="w-full">
          Continuer
        </PatientButton>
        <div className="text-center">{lienCentre}</div>
      </PatientCard>
    );
  }

  if (ecran === 1) {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Un outil d’accompagnement, pas un service d’urgence" />
        {progression}
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Wellneuro aide à organiser vos réponses, à mieux comprendre les facteurs qui peuvent
            influencer votre quotidien et à préparer les échanges avec votre praticien.
          </p>
          <p>
            Les questionnaires, scores et profils sont des outils d’orientation. Ils ne suffisent
            pas à établir une conclusion médicale et ne remplacent pas l’avis de votre médecin.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ne modifiez pas un traitement prescrit sans l’accord du prescripteur.</li>
            <li>Signalez vos traitements, allergies, grossesse éventuelle et changements importants.</li>
            <li>Vos réponses et messages ne sont pas surveillés en continu.</li>
            <li>
              En cas de symptôme aigu ou inquiétant, utilisez les services médicaux habituels ou les
              numéros d’urgence adaptés à votre situation.
            </li>
          </ul>
        </div>
        <PatientButton variant="primary" onClick={() => setEcran(2)} className="w-full">
          Je comprends le cadre
        </PatientButton>
      </PatientCard>
    );
  }

  if (ecran === 2) {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Vos informations et leur utilisation" />
        {progression}
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Nous recueillons uniquement les informations nécessaires à votre accompagnement et à son
            suivi.
          </p>
          <p>
            Selon les fonctions utilisées, certaines tâches peuvent être préparées avec une
            assistance d’intelligence artificielle. Une synthèse destinée au patient est toujours
            relue et validée par le praticien avant publication.
          </p>
          <p>
            Votre praticien tient aussi, dans votre dossier, des renseignements administratifs
            qu’il saisit lui-même : votre adresse postale, votre numéro de sécurité sociale, et le
            nom et les coordonnées de votre médecin traitant. Aucun n’est obligatoire, et noter le
            nom de votre médecin traitant ne veut pas dire lui écrire.
          </p>
          {/*
            CE PARAGRAPHE EST LA CONTREPARTIE DE L'ACCUSÉ DEMANDÉ PLUS LOIN.
            Jusqu'au 2026-09-17, cet écran affirmait la promesse que le logiciel
            ne tenait pas — et le bouton final la faisait reconnaître. Faire
            accuser réception d'un texte faux est pire que ne rien faire signer.
            Le fond suit `donnees_confidentialite@v9` mot pour mot ([[D-222]]
            amendé) ; la prose est en dur ici, donc elle se vérifie par banc.
          */}
          <p>
            L’application n’envoie rien à un médecin : si un document doit lui parvenir, c’est
            votre praticien qui le transmet, et votre choix l’engage. Une seule situation s’en
            écarte — lorsqu’un signe repéré dans votre suivi impose d’écrire à un médecin pour
            votre sécurité ; votre praticien vous en informe alors.
          </p>
          <p>
            Vous pouvez consulter à tout moment le détail : données utilisées, finalités,
            prestataires, durées de conservation, usage de l’IA, vos droits et vos choix.
          </p>
        </div>
        <PatientButton variant="primary" onClick={() => setEcran(3)} className="w-full">
          Continuer
        </PatientButton>
        <div className="text-center">{lienCentre}</div>
      </PatientCard>
    );
  }

  const toutConfirme = confirmations.every(Boolean);
  const LIBELLES = [
    'Je comprends que Wellneuro ne remplace pas un service d’urgence.',
    'Je comprends que les questionnaires et indicateurs ne constituent pas à eux seuls une conclusion médicale.',
    'Je sais où retrouver les informations concernant mes données et mes choix.',
  ];

  return (
    <PatientCard className="space-y-4">
      <PatientPageHeader title="Avant de commencer" />
      {progression}
      <div className="space-y-3">
        {LIBELLES.map((libelle, index) => (
          <label key={libelle} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmations[index]}
              onChange={e =>
                setConfirmations(c => c.map((v, i) => (i === index ? e.target.checked : v)))
              }
              className="mt-1 accent-primary"
            />
            <span className="text-sm text-foreground">{libelle}</span>
          </label>
        ))}
      </div>
      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
      <PatientButton
        variant="primary"
        disabled={!toutConfirme}
        loading={envoi}
        loadingLabel="Enregistrement…"
        onClick={terminer}
        className="w-full"
      >
        J’ai pris connaissance de ces informations
      </PatientButton>
      <p className="text-xs text-muted-foreground text-center">
        Cet accusé de lecture n’est pas une autorisation : vos choix facultatifs restent gérés
        séparément dans « Informations, confidentialité et droits ».
      </p>
    </PatientCard>
  );
}
