'use strict';

var path = require('path');
var electron = require('electron');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var mainWindow = null;

var clippy = require('./src/clippy.js')();

electron.crashReporter.start();

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({width: 800, height: 600});

    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // console.log(clippy.status());

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
