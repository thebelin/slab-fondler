/**
 * For operating user controls
 */
"use strict";
window._Controls = function (el) {
  // The display context
  const ctx = el.getContext("2d");
  
  // The body element
  const body = document.getElementsByTagName('body')[0];

  // The socket transporter
  const socket = io.connect('/controls');

  // touch copier
  const copyTouch = touch => {
    console.log('touch: ', touch);
    return {
      identifier: touch.which >= 0 ? touch.which : touch.identifier,
      pageX: touch.pageX,
      pageY: touch.pageY,
      force: touch.force || 0,
      radiusX: touch.radiusX || 0,
      radiusY: touch.radiusY || 0};
  };

  // Assign a color to each touch
  const colorForTouch = touch => !touch || isNaN(touch.identifier) ? '#000' : '#' +
    (touch.identifier % 16).toString(16) +
    (Math.floor(touch.identifier / 3) % 16).toString(16) + 
    (Math.floor(touch.identifier / 7) % 16).toString(16);

  // Draw a touch event
  const DrawTouch = touch => {
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, touch.force ? touch.force * 10 : 4, 0, 2 * Math.PI, false);  // a circle at the start
    ctx.fillStyle = colorForTouch(touch);
    ctx.fill();
  };

  // Draw a move event
  const DrawMove = (touch, idx) => {
    ctx.beginPath();
    console.log("ctx.moveTo(" + ongoingTouches[idx].pageX + ", " + ongoingTouches[idx].pageY + ");");
    ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY);
    console.log("ctx.lineTo(" + touch.pageX + ", " + touch.pageY + ");");
    ctx.lineTo(touch.pageX, touch.pageY);
    ctx.lineWidth = touch.force ? touch.force * 10 : 4;
    ctx.strokeStyle = colorForTouch(touch);
    ctx.stroke();
  };

  const ongoingTouchIndexById = (idToFind)  => {
    for (let i = 0; i < ongoingTouches.length; i++) {
      if (ongoingTouches[i].identifier == idToFind) {
        return i;
      }
    }
    return -1;    // not found
  };

  const SendTouches = fields => {
    let g = document.getElementsByTagName('body')[0];
    socket.emit('control', Object.assign({}, fields, {
      touches: ongoingTouches,
      screen: {
        width: window.innerWidth || el.clientWidth || g.clientWidth,
        height: window.innerHeight|| el.clientHeight|| g.clientHeight
      }
    }));
  };

  /**
   * These event listeners will be attached to the event they are named after
   */
  const listeners = {
    touchstart: evt => {
      //evt.preventDefault();
      let touches = evt.changedTouches;
      // Debug the touches
      Object.keys(touches).forEach(touchId => {
        ongoingTouches.push(copyTouch(touches[touchId]));
        DrawTouch(touches[touchId]);
      });

      SendTouches();
    },

    touchend: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;

      Object.keys(touches).forEach(touchId => {
        let idx = ongoingTouchIndexById(touches[touchId].identifier);
        if (idx >= 0)
          ongoingTouches.splice(idx, 1);  // remove it; we're done
      });

      SendTouches();
    },

    touchcancel: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      touches.forEach(touch => ongoingTouches.splice(ongoingTouchIndexById(touch.identifier), 1));
      SendTouches({otherTouch: evt.touches});
    },

    touchmove: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      Object.keys(touches).forEach(touchId => {
        let idx = ongoingTouchIndexById(touches[touchId].identifier);
        if (idx >= 0) {
          // Draw the line
          DrawMove(touches[touchId], idx);
          // swap in the new touch record
          ongoingTouches.splice(idx, 1, copyTouch(touches[touchId]));          
        }
      });
      SendTouches();
    },

    mousedown: evt => {
      evt.preventDefault();
      let touch = copyTouch(evt);
      let idx = ongoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1, touch);
      } else {
        ongoingTouches.push(touch)
      }
      DrawTouch(touch)
      SendTouches();
    },

    mouseup: evt => {
      evt.preventDefault();
      let touch = copyTouch(evt);
      let idx = ongoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1);
        SendTouches();
      }
    },

    mousemove: evt => {
      evt.preventDefault();
      let touch = copyTouch(evt);
      let idx = ongoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        // Draw the line
        DrawMove(touch, idx);
        ongoingTouches.splice(idx, 1, touch);
        SendTouches();
      }
    }
  };

  // Records the current touch profile
  let ongoingTouches = [];

  // records the current tilt profile
  let tilt = null;

  // fill the screen with the canvas
  if (el) {
    el.setAttribute('width', window.innerWidth || el.clientWidth || body.clientWidth + 'px');
    el.setAttribute('height', window.innerHeight|| el.clientHeight|| body.clientHeight + 'px');

    // monitor for all listener events and send them as they happen
    Object.keys(listeners).forEach(listener => el.addEventListener(listener, listeners[listener]));
  }

  // Subscribe to server side events (not yet used)
  socket.on('event', data => console.log('player event data: ', data));

  //@todo monitor for all tilt events and send them as they happen

};

// Execute the Controls function with an argument of the DOM element to monitor
_Controls(document.getElementById('body-ctx'));