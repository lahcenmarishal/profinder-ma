# Corriger la reconnexion Google d’un professeur

## Résultat attendu
- Une connexion Google depuis la page « Connexion » conserve le rôle déjà enregistré.
- Un professeur existant est redirigé vers son espace professeur ou reprend son inscription professionnelle.
- Le choix « élève » ou « professeur » ne s’applique que lors d’une inscription explicite.

## Modifications
- Séparer clairement l’intention « connexion » de l’intention « inscription » dans le lancement Google.
- Ne plus enregistrer automatiquement le rôle élève depuis la page de connexion.
- Nettoyer les anciens marqueurs de rôle avant une connexion normale.
- Au retour de Google, utiliser en priorité le rôle existant du compte lorsqu’aucun nouveau rôle n’a été choisi.
- Vérifier les deux parcours : reconnexion d’un professeur existant et nouvelle inscription avec choix du rôle.

## Détails techniques
- Rendre le rôle optionnel dans le démarrage OAuth et omettre le paramètre de retour pour une connexion normale.
- Adapter la page d’authentification pour ne marquer un rôle que lorsque son mode est « inscription ».
- Ajouter des tests ciblés autour de la résolution du rôle et de la destination après connexion.
