# Corriger l’email de bienvenue Google

## Objectif
Permettre au site `profinder.ma` d’appeler correctement le service d’envoi ProFinder après une inscription Google.

## Changements
- Autoriser les requêtes provenant de `profinder.ma`, `www.profinder.ma` et des adresses officielles du projet.
- Répondre correctement au contrôle préalable effectué par le navigateur.
- Conserver le refus pour toute origine inconnue.
- Tester le relais publié et vérifier que la requête d’envoi n’est plus bloquée.

## Point technique
La requête de contrôle arrive actuellement, mais l’appel d’envoi qui suit est bloqué par le navigateur faute d’autorisation inter-domaines.
