# Scaffolder

Scaffolder is a node package that is designed to make the process of making node CLI applications simpler.  The project is definitely a work in progress, and pull requests are definitely welcome.

<a href="http://travis-ci.org/#!/DamonOehlman/scaffolder"><img src="https://secure.travis-ci.org/DamonOehlman/scaffolder.png" alt="Build Status"></a>

## Overview

I've written quite a few cli tools using node now, and initially I used [commander](https://github.com/visionmedia/commander.js) a bit and then experimented with [my own cli focused library](https://github.com/DamonOehlman/climate).  Once I came across [nopt](https://github.com/isaacs/nopt) though everything changed, and I've been pretty much using it exclusively since.

While nopt provides amazing option parsing functionality, there are things I do find myself doing again and again when writing cli apps.  Things such as:

- copying particular files from one place to another
- running blocks of code in response to the user requesting a particular action from the command line

Scaffolder is designed to ease the process of making CLI apps using node by adopting some conventions for writing your CLI app.

## Writing a CLI application using Scaffolder

The first thing you should probably do if you are writing a CLI application in node, is to create a simple shell script that will run your application.  For my applications that make use of scaffolder such a script looks something like this:

```
#!/usr/bin/env node
require('scaffolder')();
```

This code is significantly less than what you would see in most shell scripts that kick off a node process and this is because of the conventions that Scaffolder uses.

## Scaffolder Conventions

Before reading this section, I would encourage you to read the README for the [nopt](https://github.com/isaacs/nopt) package as some understanding of how nopt works will be helpful.

### Command Handlers

A CLI application built using scaffolder will likely be powered by a number of command handlers.  A command handler is simply a node module (usually located in the `lib/commands` folder for the project) that provides a number of exports that make the command work.  In the simplest case a command handler will look like this:

```js
exports.description = 'A test action';
exports.run = function(opts, callback) {
    callback(null, 'ok');
};
```

Typically, though a command handler will use a variety of command-line flags to modify it's behaviour and these can be configured by providing an `args` export, e.g.

```js
exports.args = {
    url:    'url',
    path:   path
};
```

These arguments are defined as per standard [nopt](https://github.com/isaacs/nopt) options and an optional `shorthand` export can also be provided to provide shorthand equivalents for the defined options.

Once defined in the `args` export, any arguments that are parsed successfully from `process.argv` will be provided as part of the `opts` object that is passed into the `run` function declared in the command handler.

## Similar Projects

Some other projects providing similar functionality are:

- [scaffoldit](https://github.com/crcn/node-scaffoldit) - Really solid looking project - may well retire scaffolder in favour of this one...