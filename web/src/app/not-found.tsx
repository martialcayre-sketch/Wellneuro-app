import Link from 'next/link';

// L'écran des adresses qui ne mènent nulle part, pour TOUT le site.
//
// Next distingue deux cas que l'on confond facilement : un `notFound()` appelé
// dans une page est traité par le `not-found.tsx` de son segment — celui du
// portail existe et dit ce qu'il faut — tandis qu'une URL qui ne correspond à
// AUCUNE route ne remonte qu'ici, à la racine. Sans ce fichier, ce second cas,
// le plus banal des deux (une adresse mal recopiée depuis un e-mail), rendait
// la page par défaut de Next : « This page could not be found », en anglais,
// sans rien du produit. Constaté en production le 2026-09-03 sur
// `/portail/connexion/…` inexistant, 404 en anglais.
//
// POURQUOI DEUX LIENS ET PAS UN BOUTON « ACCUEIL ». Cette page est servie
// aussi bien à un praticien qu'à une personne suivie, et `/` redirige selon la
// session : un patient égaré, sans session praticien, y serait envoyé vers
// l'écran de connexion praticien — une deuxième impasse après la première. Les
// deux entrées sont donc nommées, et chacune choisit la sienne. Elles sont
// toutes deux publiques : nommer leur existence n'apprend rien à personne.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-lg p-8 space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold text-primary">
          Cette page n’existe pas
        </h1>
        <p className="text-sm text-muted-foreground">
          L’adresse que vous avez suivie ne mène à rien. Elle a peut-être été
          mal recopiée, ou tronquée par votre messagerie.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/portail/connexion"
            className="w-full block text-center px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Accéder à mon espace
          </Link>
          <Link
            href="/login"
            className="w-full block text-center px-4 py-3 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition"
          >
            Espace praticien
          </Link>
        </div>
      </div>
    </div>
  );
}
