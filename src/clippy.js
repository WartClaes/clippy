'use strict'

var shell = require('shelljs');

module.exports = function() {
    console.log('Hello from Clippy!');

    return {
        init: init,
        status: status
    }

    // ===================================



    function init() {
        if(!shell.which('git')) {
          shell.echo('Sorry, this script requires git');
        }
    }

    function status() {
        if(shell.exec('git status').code !== 0) {
          shell.echo('Error: Git commit failed');
        }
    }
};
