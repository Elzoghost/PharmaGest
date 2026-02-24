#!/bin/bash

# Création du dossier repo
mkdir -p app

# Création des fichiers
touch index.html
touch admin.html
touch app/index.html
touch .nojekyll

echo "Structure créée avec succès :

├── index.html
├── admin.html
├── app/
│   └── index.html
└── .nojekyll"
