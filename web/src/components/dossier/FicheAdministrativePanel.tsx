'use client';

import { useState } from 'react';
import type { PatchPatientResponse, PatientsApiResponse } from '@/app/api/praticien/patients/route';
import { erreurLisible } from '@/lib/praticien/messagesDossier';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * LA FICHE ADMINISTRATIVE DU DOSSIER, ENFIN MODIFIABLE (LOT-05).
 *
 * CE QUI EXISTAIT AVANT, ET POURQUOI C'ÉTAIT UN DÉFAUT. Le seul formulaire
 * d'édition du rayon ne portait QU'UN CHAMP : le téléphone. Prénom, nom, date
 * de naissance et e-mail étaient saisis à la création et ne se corrigeaient
 * plus jamais — une faute de frappe sur un nom était définitive, et le
 * praticien n'avait d'autre recours que de recréer un dossier, c'est-à-dire
 * d'en abandonner l'historique.
 *
 * CE PANNEAU N'EST PAS UNE SURFACE PATIENT. Il vit dans `components/dossier/`
 * et non `components/patient/` — ce dernier est l'arbre du PORTAIL, gardé par
 * `PanneauSuperpose.guard.test.ts`, et un panneau praticien qui s'y égare fait
 * rougir le banc. Le rayon Patients le monte, et le cockpit le montera.
 */

export type PatientDossier = PatientsApiResponse['patients'][number];

type Champ = {
  cle: keyof Formulaire;
  libelle: string;
  type?: 'date' | 'email';
  max?: number;
  /** Ce que le praticien doit savoir AVANT de remplir, jamais après. */
  aide?: string;
};

type Formulaire = {
  prenom: string;
  nom: string;
  dateNaissance: string;
  email: string;
  telephone: string;
  adresse: string;
  nir: string;
  medecinTraitantNom: string;
  medecinTraitantCoordonnees: string;
};

// LES GROUPES SUIVENT LE DOSSIER, PAS LA TABLE. Un praticien cherche « le
// médecin traitant », pas « les colonnes nullables ajoutées en septembre ».
const GROUPES: { titre: string; note?: string; champs: Champ[] }[] = [
  {
    titre: 'Identité',
    champs: [
      { cle: 'prenom', libelle: 'Prénom', max: 100 },
      { cle: 'nom', libelle: 'Nom', max: 100 },
      { cle: 'dateNaissance', libelle: 'Date de naissance', type: 'date' },
    ],
  },
  {
    titre: 'Contact',
    champs: [
      {
        cle: 'email',
        libelle: 'Adresse e-mail',
        type: 'email',
        max: 254,
        // CE N'EST PAS UN CHAMP DE CONTACT COMME LES AUTRES. C'est par cette
        // adresse que le patient reçoit ses liens d'accès : la changer déplace
        // sa porte d'entrée. Le dire ici, pas dans un message d'erreur après
        // coup.
        aide: 'C’est l’adresse à laquelle le patient reçoit ses liens d’accès. La changer déplace sa porte d’entrée ; les liens déjà envoyés restent sur l’ancienne.',
      },
      { cle: 'telephone', libelle: 'Téléphone', max: 30 },
      { cle: 'adresse', libelle: 'Adresse postale', max: 500 },
    ],
  },
  {
    titre: 'Sécurité sociale',
    champs: [
      {
        cle: 'nir',
        libelle: 'Numéro de sécurité sociale',
        max: 21,
        aide: 'Recopiable tel qu’il est imprimé, espaces compris. La clé de contrôle est vérifiée : un numéro mal recopié est refusé plutôt qu’enregistré.',
      },
    ],
  },
  {
    titre: 'Médecin traitant',
    // LA PHRASE QUI ÉVITE UNE CONFUSION GRAVE, et c'est la même que celle
    // servie au patient dans « Vos données personnelles » : noter un médecin
    // n'est pas lui écrire. Deux formulations différentes pour un même fait
    // laisseraient croire qu'il y a deux faits.
    note: 'Noter un médecin traitant ne lui adresse rien. L’envoi d’un courrier reste un geste distinct, au rayon Correspondance.',
    champs: [
      { cle: 'medecinTraitantNom', libelle: 'Nom du médecin', max: 200 },
      { cle: 'medecinTraitantCoordonnees', libelle: 'Coordonnées', max: 500 },
    ],
  },
];

function formulaireDepuis(p: PatientDossier): Formulaire {
  return {
    prenom: p.prenom,
    nom: p.nom,
    // `null` côté DTO, `''` côté `<input type="date">` : un champ date ne sait
    // pas afficher `null`, et lui passer `null` rend le champ non contrôlé.
    dateNaissance: p.dateNaissance ?? '',
    email: p.email,
    telephone: p.telephone,
    adresse: p.adresse,
    nir: p.nir,
    medecinTraitantNom: p.medecinTraitantNom,
    medecinTraitantCoordonnees: p.medecinTraitantCoordonnees,
  };
}

export function FicheAdministrativePanel({
  patient,
  onEnregistre,
  onFermer,
}: {
  patient: PatientDossier;
  onEnregistre: () => void | Promise<void>;
  onFermer: () => void;
}) {
  const [form, setForm] = useState<Formulaire>(() => formulaireDepuis(patient));
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);

  const enregistrer = async () => {
    setEnvoi(true);
    setRetour(null);
    try {
      // ON N'ENVOIE QUE CE QUI A CHANGÉ, et ce n'est pas une optimisation. La
      // route lit `undefined` comme « ne touche pas » : envoyer tout le
      // formulaire à chaque fois ferait réécrire les quatre copies de l'e-mail
      // dès qu'on corrige un téléphone, et ferait repasser le NIR par sa
      // validation alors qu'il n'a pas bougé.
      const initial = formulaireDepuis(patient);
      const modifie: Partial<Formulaire> & { idPatient: string } = { idPatient: patient.idPatient };
      for (const cle of Object.keys(form) as (keyof Formulaire)[]) {
        if (form[cle] !== initial[cle]) modifie[cle] = form[cle];
      }

      if (Object.keys(modifie).length === 1) {
        setRetour({ ok: true, msg: 'Aucune modification à enregistrer.' });
        setEnvoi(false);
        return;
      }

      const r = await fetch('/api/praticien/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifie),
      });
      const json = (await r.json()) as PatchPatientResponse;
      if (!r.ok || !json.success) {
        // LE REFUS QUI FAIT FOI EST CELUI DE LA ROUTE. Le message vient d'elle
        // — clé de NIR fausse, adresse déjà prise — et non d'une validation
        // recopiée ici, qui dériverait de la sienne au premier changement.
        setRetour({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setRetour({ ok: true, msg: 'Fiche enregistrée.' });
      await onEnregistre();
    } catch {
      setRetour({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section
      className="bg-surface border border-accent rounded-xl p-4 space-y-4"
      aria-labelledby="fiche-administrative-titre"
    >
      <h3
        id="fiche-administrative-titre"
        className="font-display text-lg font-semibold text-foreground"
      >
        Fiche administrative{' '}
        <span className="font-normal text-muted-foreground">{patient.idPatient}</span>
      </h3>

      {GROUPES.map(groupe => (
        <fieldset key={groupe.titre} className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {groupe.titre}
          </legend>
          {groupe.note && <p className="text-13 text-muted-foreground">{groupe.note}</p>}
          <div className="flex flex-wrap gap-3">
            {groupe.champs.map(champ => (
              <div key={champ.cle} className="flex flex-col gap-1 min-w-[14rem] flex-1">
                <label className="text-xs text-muted-foreground" htmlFor={`fa-${champ.cle}`}>
                  {champ.libelle}
                </label>
                <Input
                  id={`fa-${champ.cle}`}
                  type={champ.type ?? 'text'}
                  value={form[champ.cle]}
                  maxLength={champ.max}
                  onChange={e => setForm(f => ({ ...f, [champ.cle]: e.target.value }))}
                />
                {champ.aide && <p className="text-xs text-muted-foreground">{champ.aide}</p>}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {/* L'état du dossier ne se change PAS ici, et le rappeler évite qu'on
          l'ajoute : désactiver ferme les liens en vol — geste irréversible qui
          passe par un dialogue (`D-126`).

          « DEPUIS « GÉRER LE DOSSIER » » ET NON « AU MENU DE LA LIGNE » : ce
          panneau est monté sur DEUX surfaces depuis le LOT-06, et le cockpit
          patient n'a pas de ligne de tableau. La phrase pointait vers quelque
          chose qui n'existe pas là-bas ; le menu, lui, porte le même libellé
          aux deux endroits. */}
      <p className="text-13 text-muted-foreground">
        L’état du dossier (actif, clôturé, accès au portail) se change depuis « Gérer le dossier »,
        derrière une confirmation.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={enregistrer} disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button variant="outline" onClick={onFermer}>
          Annuler
        </Button>
        {retour && (
          <span
            role={retour.ok ? 'status' : 'alert'}
            className={`text-sm ${retour.ok ? 'text-status-success' : 'text-status-danger'}`}
          >
            {retour.msg}
          </span>
        )}
      </div>
    </section>
  );
}
