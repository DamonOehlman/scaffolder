.. _getting-started:

Getting Started with Scaffolder
===============================

To get started with scaffolder, the first thing you should do is include it into your package dependencies.  If you are unfamiliar with how to do this then I'd recommend checking out `this presentation <http://www.webdirections.org/resources/nodes-personal-manservant-jed-schmidt/>`_ which covers using NPM in some detail.

Once you have scaffolder available, the next thing to do is to create a small script that will be serve as the entry point to your application from a CLI perspective.  The best place to create this is usually within a `bin` folder in your project structure::
    
    - bin
        |- yourcommand
    - index.js
    - README.md

Your `package.json` file also needs to include some information that will tell `NPM`_ that the command should be made available on the path.  As an example a copy of the `package.json` file from `docstar`_ is shown below:

.. code-block:: js
   :emphasize-lines: 12-14

    {
      "name": "docstar",
      "description": "Sphinx Documentation Helpers for JS devs",
      "author": "Damon Oehlman <damon.oehlman@sidelab.com>",
      "tags": [
        "documentation",
        "docs",
        "sphinx"
      ],
      "version": "0.2.1",
      "main": "index.js",
      "bin": {
        "docstar": "./bin/docstar"
      },
      "engines": {
        "node": ">= 0.6.x < 0.9.0"
      },
      "dependencies": {
        "async": "0.1.x",
        "debug": "*",
        "glob": "3.1.x",
        "mkdirp": "0.3.x",
        "ncp": "0.2.x",
        "pkginfo": "0.2.x",
        "scaffolder": "0.6.x",
        "underscore": "1.3.x"
      },
      "devDependencies": {},
      "repository": {
        "type": "git",
        "url": "git://github.com/DamonOehlman/docstar.git"
      },
      "bugs": {
        "url": "http://github.com/DamonOehlman/docstar/issues"
      },
      "scripts": {
        "test": "mocha --reporter spec -t 3000"
      },
      "contributors": []
    }

Now, in terms of the contents of the actual command file, it's really, really simple:

.. code-block:: javascript

    #!/usr/bin/env node
    require('scaffolder')();
    
Which tells scaffolder to run using it's default behaviour.  Continue on in the documentation to read more about how scaffolder works.

.. include:: links.txt


    