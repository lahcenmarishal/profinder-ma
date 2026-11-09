# ProFinder

Plateforme de mise en relation entre élèves et professeurs particuliers au Maroc, disponible en français et en arabe.

Site en ligne : profinder.ma

![Page d'accueil](./docs/accueil.png)

## Le problème

Au Maroc, trouver un professeur particulier se fait surtout par le bouche-à-oreille ou sur les réseaux sociaux : peu de fiabilité, pas d'avis, pas de comparaison possible.

## La solution

ProFinder réunit élèves, parents et professeurs sur une seule plateforme :

1. L'élève décrit son besoin (niveau, type de cours, ville, disponibilité, budget).
2. Les professeurs reçoivent les demandes qui leur correspondent et proposent un tarif et un créneau.
3. L'élève compare les propositions, réserve et laisse un avis après le cours.

## Aperçu

![Liste des professeurs](./docs/professeurs.png)

![Publication d'une demande](./docs/publier-demande.png)

![Interface en arabe](./docs/version-arabe.png)

## Fonctionnalités

- Publication d'une demande de cours
- Classement des professeurs par matière, niveau, disponibilité, distance et budget
- Profils professeurs avec tarif, expérience et avis
- Messagerie intégrée, réservation et évaluation
- Deux rôles : client et professeur
- Interface bilingue français / arabe (affichage RTL)
- Offre PRO pour les professeurs

## Technologies

- React
- TypeScript
- Node.js
- Supabase (base de données et authentification)

## Installation

```bash
git clone https://github.com/lahcenmarishal/profinder-ma.git
cd profinder-ma
npm install
cp .env.example .env
npm run dev
```

Variables à renseigner dans le fichier `.env` :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_publique_anon
```

## Auteur

Lahcen, développeur IA.
