/**
 * For operating user controls
 */
"use strict";
window._Controls = ctx => {
  this.socket = socket.connect('player');
  this.socket
    .on('event', data => console.log('player event data: ', data));

  // monitor for all touch events and send them to the server
  
  // monitor for all tilt events and send them too
};
