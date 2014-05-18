# Scaffolder

Scaffolder is a node package that is designed to make the process of making
node CLI applications simpler.  The project is a work in
progress, and pull requests are definitely welcome.


[![NPM](https://nodei.co/npm/scaffolder.png)](https://nodei.co/npm/scaffolder/)

[![unstable](https://img.shields.io/badge/stability-unstable-yellowgreen.svg)](https://github.com/badges/stability-badges) [![Build Status](https://img.shields.io/travis/DamonOehlman/scaffolder.svg?branch=master)](https://travis-ci.org/DamonOehlman/scaffolder) 

## Overview

I've written quite a few cli tools using node now, and initially I used
[commander](https://github.com/visionmedia/commander.js) a bit and then
experimented with
[my own cli focused library](https://github.com/DamonOehlman/climate).
Once I came across [nopt](https://github.com/isaacs/nopt) though everything
changed, and I've been pretty much using it exclusively since.

While nopt provides amazing option parsing functionality, there are things
I do find myself doing again and again when writing cli apps.


Things such as:

- copying particular files from one place to another
- running blocks of code in response to the user requesting a particular
  action from the command line

Scaffolder is designed to ease the process of making CLI apps using node
by adopting some conventions for writing your CLI app.

## Writing a CLI application using Scaffolder

The first thing you should probably do if you are writing a CLI application
in node, is to create a simple shell script that will run your application.
For my applications that make use of scaffolder such a script looks
something like this:

```
#!/usr/bin/env node
require('scaffolder')();
```

This code is significantly less than what you would see in most shell
scripts that kick off a node process and this is because of the
conventions that Scaffolder uses.

## Scaffolder Conventions

Before reading this section, I would encourage you to read the README
for the [nopt](https://github.com/isaacs/nopt) package as some understanding
of how nopt works will be helpful.

### Command Handlers

A CLI application built using scaffolder will likely be powered by a number
of command handlers.  A command handler is simply a node module (usually
located in the `./commands` folder for the project) that provides a
number of exports that make the command work.  In the simplest case a
command handler will look like this:

```js
exports.description = 'A test action';
exports.run = function(opts, callback) {
    callback(null, 'ok');
};
```

Typically, though a command handler will use a variety of command-line
flags to modify it's behaviour and these can be configured by providing
an `args` export, e.g.

```js
exports.args = {
    url:    'url',
    path:   path
};
```

These arguments are defined as per standard
[nopt](https://github.com/isaacs/nopt) options and an optional `shorthand`
export can also be provided to provide shorthand equivalents for the
defined options.

Once defined in the `args` export, any arguments that are parsed
successfully from `process.argv` will be provided as part of the `opts`
object that is passed into the `run` function declared in the command
handler.

## Overriding Scaffolder Defaults

When scaffolder is run (using `require('scaffolder')()`) a number of
default options are passed through, but these can be overriden by providing
an options object.  The defaults of this options object are shown below:

```js
require('scaffolder')({
  // an array of default command strings that will attempt to
  // be invoked if no options are provided
  defaultCommands: [],  

  // provide any default args that individual commands 
  // will incorporate / overwrite
  defaultArgs: {},

  // default nopt shorthand options 
  defaultShorthand: {},

  // the path the scaffolder commands will be loaded from
  commandPath: '', // defaults to the commands/ folder of the project
});
```

## Scaffolder Helpers

When running an action, scaffolder provides a number of helper methods
for performing common tasks.

### Copying Files

```js
scaffolder.copy(src, dst, callback);
```

The `copy` method provides an interface to the really useful
[ncp](https://github.com/AvianFlu/ncp) which can be used to copy all
the files in `src` to `dst`.  The scaffolder `copy` method also ensures
that the `dst` directory exists before starting the copy operation.

__NOTE:__ The `src` path is relative to the npm package that has
incorporated scaffolder (unless absolute), but `dst` path is relative
to the cwd.

## Reference

### Scaffolder(opts)

#### getPath(callback)

Get the path the scaffolder considers the source path

#### loadActions(opts, callback)

#### loadPackage(opts, callback)

#### main(opts, handler)

#### read(prompts, callback)

Request either a single prompt from the user, or a series of prompts and
then return the results from the prompt.

#### run(name, opts?, callback)

Run the requested command with the supplied opts (if provided).  Upon
completion of the command the callback will be triggered.

#### squirrel(requirements, opts, callback)

__deprecated__

## License(s)

### MIT

Copyright (c) 2014 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
