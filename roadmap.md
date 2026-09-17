# Roadmap ProFinder

## Fait
- [x] Retour Google corrigé vers `profinder.ma` avec conservation du rôle choisi ;
      l'ancienne adresse publiée relaie immédiatement les retours OAuth vers le domaine officiel
- [x] Inscription Google finalisée : création idempotente du profil élève ou de
      la fiche professeur brouillon, puis reprise automatique à l'étape 2
- [x] Données de référence réinjectées après le remix (villes + noms arabes complets,
      catégories, niveaux, spécialités, matières, plans d'abonnement, réglages)
- [x] Architecture SEO locale dynamique pour tout le Maroc
  - [x] Villes en base (source de vérité) : `slug` auto + `name_ar` + 161 villes/localités semées
  - [x] Registre de villes chargé depuis la base (`src/lib/seo-cities.ts`), catalogue statique en repli
  - [x] Éligibilité calculée sur les données réelles (`src/lib/seo-eligibility.ts`)
  - [x] Combinaisons ville × matière × niveau indexées uniquement si offre réelle
  - [x] Pages arabes indexées uniquement si le nom arabe existe réellement
  - [x] Sitemap et maillage interne dérivés des mêmes règles
- [x] Système SEO centralisé (`src/lib/seo.ts`) : un descripteur de page génère
      title, description, H1, canonical, hreflang, Open Graph et JSON-LD
      (routes, fiches professeurs et blog passent par le même moteur)
- [x] SEO multilingue FR/AR finalisé
  - [x] `<html lang="fr-MA|ar-MA" dir="ltr|rtl">` dérivé de l'URL dès le rendu serveur
  - [x] L'URL est la source de vérité de la langue : plus aucune redirection
        automatique fondée sur le navigateur ou un choix mémorisé
  - [x] Sélecteur de langue : vrai lien vers la page équivalente (contexte conservé)
  - [x] Contrôle interne hreflang/canonical : `/api/public/seo-hreflang` (`?http=1` vérifie les 200)

- [x] Audit SEO complet (indexation, on-page, multilingue, technique, données
      structurées, réseaux sociaux) — voir corrections ci-dessous
  - [x] Anciennes adresses sans langue : `/` canonique vers `/fr`
  - [x] Pages outils (`/professeurs`, `/publier`, ancienne fiche `/professeurs/[id]`)
        passées en `noindex,follow`
  - [x] Canonical auto-référent sur `/devenir-professeur`, `/conditions`,
        `/confidentialite` + ajout au sitemap

## À faire ensuite
- [x] Corriger la reconnexion Google : conserver le rôle professeur existant et ne pas lancer le parcours élève depuis la page Connexion
- [x] Données de référence réinjectées après ce remix via `scripts/seed-reference.ts`
      (161 villes dont 156 avec nom arabe, 1 catégorie, 23 niveaux, 91 spécialités,
      351 matières, 3 formules d'abonnement, fourchette de tarifs et pondérations)
- [x] Inscription email rendue compatible avec Netlify même lorsque la clé privée
      du backend n'est pas transmise à ses fonctions
- [x] Déployer et valider le relais d'emails ProFinder pour les inscriptions élève et professeur sur profinder.ma
- [x] Relais étendu aux autres emails ProFinder : bienvenue (une seule fois après
      confirmation), notifications (nouvelle demande, proposition reçue) et
      réinitialisation du mot de passe
- [ ] Il manque encore de vrais professeurs en base : les pages ville/matière/niveau
      restent en `noindex` tant qu'aucune fiche complète n'existe
- [ ] Avertissements sécurité préexistants : fonctions SECURITY DEFINER exécutables publiquement

