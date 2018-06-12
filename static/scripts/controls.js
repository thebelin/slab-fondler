/**
 * For operating user controls
 */
"use strict";
window._Controls = function (el) {
  // whether to console debug
  const dbg = false;

  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (!el) return dbg && console.log('no element for _Controls');

  // Minimum number of miiliseconds to wait between each tilt transmission
  const transmissionRate = 50;

  // The display context
  const ctx = el.getContext("2d");
  
  // The body element
  const body = document.getElementsByTagName('body')[0];

  // The symbol indicator
  const symbol = document.getElementById('user-symbol');

  // The socket transporter
  const socket = io.connect('/controls');

  // Something to explore, but not currently used
  const EnterFullscreen  = () => {
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  };

  // Fill the screen with the el
  const FillScreen = () => {
    dbg && console.log("FillScreen");
    el.setAttribute('width', document.documentElement.clientWidth + 'px');
    el.setAttribute('height', document.documentElement.clientHeight + 'px');
  };

  // A vibration wrapper
  const Vibe = function (vibeTime) {
    if (window.navigator && window.navigator.vibrate) {
      // Shake that device!
      navigator.vibrate(vibeTime);
    }
  };

  // touch copier makes all touches have the same profile
  const CopyTouch = touch => {
    dbg && console.log('touch: ', touch);
    return {
      // by using which as the default, mouse buttons are correctly profiled with an identifier
      identifier: touch.which >= 0 ? touch.which : touch.identifier,
      pageX: touch.pageX,
      pageY: touch.pageY,
      force: touch.force || 0,
      radiusX: touch.radiusX || 0,
      radiusY: touch.radiusY || 0};
  };

  // Assign a color to each touch
  const ColorForTouch = touch => !touch || isNaN(touch.identifier) ? '#111' : '#' +
    (touch.identifier % 16).toString(16) +
    (Math.floor(touch.identifier / 3) % 16).toString(16) + 
    (Math.floor(touch.identifier / 7) % 16).toString(16);

  // Draw a touch event
  const DrawTouch = touch => {
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, touch.radiusX ? touch.radiusX / 2 : 10, 0, 2 * Math.PI, false);  // a circle at the start
    ctx.fillStyle = ColorForTouch(touch);
    ctx.fill();
  };

  // Draw a move event
  const DrawMove = (touch, idx) => {
    ctx.beginPath();
    dbg && console.log("ctx.moveTo(" + ongoingTouches[idx].pageX + ", " + ongoingTouches[idx].pageY + ");");
    ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY);
    dbg && console.log("ctx.lineTo(" + touch.pageX + ", " + touch.pageY + ");");
    ctx.lineTo(touch.pageX, touch.pageY);
    ctx.lineWidth = touch.force ? touch.force * 15 : 4;
    ctx.strokeStyle = ColorForTouch(touch);
    ctx.stroke();
  };

  // Get the index of the specified touch in ongoingTouches
  const OngoingTouchIndexById = (idToFind)  => {
    for (let i = 0; i < ongoingTouches.length; i++) {
      if (ongoingTouches[i].identifier == idToFind) {
        return i;
      }
    }
    return -1;    // not found
  };

  // Send the touches to the server
  const SendTouches = fields => {
    let g = document.getElementsByTagName('body')[0];
    socket.emit('control', Object.assign({}, {
      touches: ongoingTouches,
      screen: {
        width: window.outerWidth || el.clientWidth || g.clientWidth,
        height: window.outerHeight|| el.clientHeight|| g.clientHeight
      }}, fields));
  };

  const fadeOut = () => {
    ctx.fillStyle = "rgba(50,50,50,0.05)";
    ctx.fillRect(0, 0, el.width, el.height);
    setTimeout(fadeOut,100);
  };


  /**
   * These event listeners will be attached to the event they are named after
   */
  const listeners = {
    touchstart: evt => {
      // evt.preventDefault();
      let touches = evt.changedTouches;
  
      // Debug the touches
      Object.keys(touches).forEach(touchId => {
        ongoingTouches.push(CopyTouch(touches[touchId]));
        DrawTouch(touches[touchId]);
        Vibe(touches[touchId].force ? touches[touchId].force * 2 : 4)
      });

      SendTouches({type: 'touchstart'});
    },

    touchend: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      let ended = [];

      Object.keys(touches).forEach(touchId => {
        let idx = OngoingTouchIndexById(touches[touchId].identifier);
        if (idx >= 0)
          ongoingTouches.splice(idx, 1);  // remove it; we're done

        Vibe(touches[touchId].force ? touches[touchId].force : 2)
        ended.push(CopyTouch(touches[touchId]));
      });

      SendTouches({type: 'touchend', ended: ended});
    },

    touchcancel: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      touches && touches.length && touches.forEach(touch => ongoingTouches.splice(OngoingTouchIndexById(touch.identifier), 1));
      SendTouches({type: 'touchcancel'});
    },

    touchmove: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      Object.keys(touches).forEach(touchId => {
        let idx = OngoingTouchIndexById(touches[touchId].identifier);
        if (idx >= 0) {
          // Draw the line
          DrawMove(touches[touchId], idx);
          // swap in the new touch record
          ongoingTouches.splice(idx, 1, CopyTouch(touches[touchId]));          
        }
      });
      SendTouches({type: 'touchmove'});
    },

    mousedown: evt => {
      evt.preventDefault();
      let touch = CopyTouch(evt);
      let idx = OngoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1, touch);
      } else {
        ongoingTouches.push(touch)
      }
      DrawTouch(touch)
      SendTouches({type: 'mousedown'});
    },

    mouseup: evt => {
      evt.preventDefault();
      let touch = CopyTouch(evt);
      let idx = OngoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1);
        SendTouches({type: 'mouseup'});
      }
    },

    mousemove: evt => {
      evt.preventDefault();
      let touch = CopyTouch(evt);
      let idx = OngoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        // Draw the line
        DrawMove(touch, idx);
        ongoingTouches.splice(idx, 1, touch);
        SendTouches({type: 'mousemove'});
      }
    }
  };
  
  const deviceorientationHandler = evt => {
    // Make orientation data easier to interpret in Unity:
    let orientation = iOS ? {
      x: evt.beta,
      y: evt.gamma,
      z: evt.alpha - 90,
      w: 1
    } :  {
      x: evt.beta,
      y: evt.gamma,
      z: evt.alpha,
      w: 1
    };
    socket.emit('control', {type:'tilt', tilt: orientation});
  }

  // Records the current touch profile
  let ongoingTouches = [];

  if (el) {
    // monitor for all listener events and send them as they happen
    Object.keys(listeners).forEach(listener => {
      dbg && console.log("start listener: " + listener);
      el.addEventListener(listener, listeners[listener], false)
    });

    if (window.DeviceOrientationEvent) {
      dbg && console.log("Orientation supported");
      window.addEventListener('deviceorientation', deviceorientationHandler, false);
    }

    // monitor for window resize
    window.addEventListener('resize', () => setTimeout(() => FillScreen, 250));
    FillScreen();
  }

  // Subscribe to server side events
  const eventRouter = {
    // The server has sent a color indicator, update the overlay
    color: color => {
      el.style.cssText = "border-color: " + color;
      symbol.style.cssText = "color: " + color;
    },

    // The server has sent a symbol indicator, update the overlay
    symbol: sym => symbol.innerHTML = sym,

    // The server has indicated that a vibe for a specific amount of time should be done
    vibe: time => Vibe(time)
  };
  
  socket.on('event', data => {
    console.log("event", data);
    if (data.eventType && eventRouter[data.eventType])
      eventRouter[data.eventType](data.eventData);
    else
      console.log('player event data not routed: ', data);
  });

  // Fade the touch display
  fadeOut();
};

// Execute the Controls function with an argument of the DOM element to monitor
_Controls(document.getElementById('body-ctx'));