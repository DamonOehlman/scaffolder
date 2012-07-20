.. _how-it-works:

How Scaffolder Works
====================

Scaffolder works by looking for all the files that are located in with the ``lib/commands`` folder within your project.  A simple command handler is shown below:
    
.. code-block:: javascript
    
    // action description
    exports.desc = 'Description for your command';

    // any command specified nopt args
    exports.args = {
    };

    // export runner
    exports.run = function(opts, callback) {
        // do stuff here - "this" is bound to a Scaffolder instance
    };

As an example, if the above file was located in the ``lib/commands`` folder with the name ``build.js`` then when your command was run specifying the ``build`` command (e.g. ``yourcommand build``) the above action would be invoked.

As denoted by the comments above, the ``desc`` export is used to give the task a description and the ``args`` export is used to specify types (as per `nopt`_ documentation) that are specifically related to this command.

.. include:: links.txt