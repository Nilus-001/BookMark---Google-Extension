# **BookMark**---Google-Extension

Extension Chrome qui permet de **placer des marque-pages directement dans le texte** d'une page web — sélectionnez du texte, marquez-le, retrouvez-le instantanément à votre prochaine visite.

---

## Info !:

Ceci est un prototype : pour le moment cette extention ne permet pas de supprimer les données enregistrer dans le storage locale de chrome 

---

## Fonctionnalités

- **Marquage de texte** : sélectionnez n'importe quel passage et posez un marque-page dessus 
- **Bouton flottant contextuel** : un bouton apparaît automatiquement à côté de votre sélection pour marquer en un clic (afin d'être utilisable sur mobile : origine du projet)
- **Liste centralisée** : retrouvez tous vos marque-pages d'une page depuis le popup de l'extension, avec un aperçu du texte marqué
- **Commenter** : éditez le libellé d'un marque-page pour ne pas vous perdre
- **Sauvegarde de la position de scroll** : reprenez votre lecture exactement là où vous l'aviez laissée en quittant une page

---

## Installation

1. Cloner ou télécharger ce dépôt
2. Ouvrir `chrome://extensions`
3. Activer le **Mode développeur** (coin supérieur droit)
4. Cliquer sur **Charger l'extension non empaquetée**
5. Sélectionner le dossier du projet

---

## Limitations connues

- Les sélections traversant plusieurs éléments de bloc (paragraphes entiers, divs) ne sont pas marquables — un message d'erreur s'affiche dans ce cas
- La restauration dépend de la stabilité du DOM entre deux visites : un site qui change radicalement sa structure peut empêcher la restauration d'un marque-page existant

--- 

## Suite du Projet

- Implémentation du bouton gérer : 
    - Panel des data + suppression manuelle
    - Blacklist url
    - Setting auto suppression
- Modifier le fonctionnement de la sauvegarde de position pour la rendre individuellement activable par pages




