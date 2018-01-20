/**
 * Slab-Fondler server
 *
 * A static server for content
 * and a socket.io module for data transfer
 * 
 * @author Belin Fieldson @thebelin
 * @copyright GPL-V3
 *
 * ENV vars:
 * COOKIE_SECRET
 * HTTP_PORT
 */
"use strict";
// Express Framework
const express = require('express');

// App object is express library as a function
const app = express();

// Filesystem object
const fs = require('fs');

// socketio module
const socket = require('socket.io');

// Set the port to env setting or default
const port = process.env.PORT || 80;

// Express http server
const httpServer = require('http');

// Compression middleware
const compression = require('compression');

// The logger object
const morgan = require('morgan');

// Parsers for incoming data
const bodyParser = require('body-parser');

// set up express application logging
app.use(morgan('dev'));

// Read form vars
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '1024mb',
  parameterLimit: 1000000
}));

// get information from html forms
app.use(bodyParser.json({limit: '1024mb'}));

// set up ejs for server side templating
app.set('view engine', 'ejs');

// Compression module speeds requests
app.use(compression());

// Make the http folder available as the root, to deliver the static content
app.use('/', require('express').static('static'));

// make the screenfull dist folder available to the user
app.use('/screenfull', require('express').static('node_modules/screenfull/dist'));

// make the screenfull dist folder available to the user
app.use('/webvr-polyfill', require('express').static('node_modules/webvr-polyfill/build'));

console.log('starting http server on port ' + port);

// Start the HTTP listener on http
const server = httpServer.Server(app);
const io = require('socket.io')(server);
server.listen(port);

// Run the socketio interface
require ('./socketservice.js')(io);
