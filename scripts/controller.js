/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

// Start the main app logic.
requirejs([
    '../node_modules/happyfuntimes/dist/hft',
    '../node_modules/hft-sample-ui/dist/sample-ui',
    '../node_modules/hft-game-utils/dist/game-utils',
    '../3rdparty/hft-utils/dist/audio',
    'ships',
  ], function(
    hft,
    sampleUI,
    gameUtils,
    AudioManager,
    Ships) {

  var GameClient = hft.GameClient;
  var CommonUI = sampleUI.commonUI;
  var Input = sampleUI.input;
  var Misc = sampleUI.misc;
  var MobileHacks = sampleUI.mobileHacks;
  var Touch = sampleUI.touch;

  var g_name = "";
  var g_leftRight = 0;
  var g_oldLeftRight = 0;
  var g_fire = false;
  var g_state = ""
  var g_count;
  var g_playerColor = "#00A";
  var g_playerStyle;
  var g_client;
  var g_audioManager;
  var g_clearMsgTimeoutId;
  var g_oldShowGhost;
  var g_showGhost = true;
  var g_canvas;
  var g_ctx;
  var g_shipColor = "black";
  var g_shipStyle;

  var globals = {
    messageDuration: 5,
    orientation: "landscape-primary",
  };
  Misc.applyUrlSettings(globals);
  MobileHacks.fixHeightHack();
  MobileHacks.disableContextMenu();
  MobileHacks.adjustCSSBasedOnPhone([
    {
      test: MobileHacks.isIOS8OrNewerAndiPhone4OrIPhone5,
      styles: {
        "#avatar": {
          bottom: "100px",
        },
        ".button": {
          bottom: "100px",
        },
      },
    },
  ]);

  function $(id) {
    return document.getElementById(id);
  }

  var msgElem = $("msg");
  var colorElem = $("buttons");
  var g_canvas = $("avatar");
  g_canvas.width  = g_canvas.clientWidth;
  g_canvas.height = g_canvas.clientHeight;
  g_ctx = g_canvas.getContext("2d");

  var clearMessage = function() {
    g_clearMsgTimeoutId = undefined;
    msgElem.innerHTML = g_showGhost ? "Control the ghost ship!" : "";
    msgElem.style.color = "#FFF";
    if (g_showGhost !== g_oldShowGhost) {
      g_oldShowGhost = g_showGhost;
      drawShip();
    }
  };

  var setClearMessageTimeout = function() {
    if (g_clearMsgTimeoutId !== undefined) {
      clearTimeout(g_clearMsgTimeoutId);
    }
    g_clearMsgTimeoutId = setTimeout(clearMessage, globals.messageDuration * 1000);
  };

  var setMessage = function(color, msg) {
    msgElem.innerHTML = msg;
    msgElem.style.color = color;
    setClearMessageTimeout();
  };

  var process;
  var g_states = {
    launch: function() {
      --g_count;
      if (g_count > 0) {
        colorElem.style.backgroundColor = (g_count % 2) ? "#0f0" : "#fff";
        setTimeout(process, 100);
      } else {
        colorElem.style.backgroundColor = g_playerColor;
      }
    },

    die: function() {
      --g_count;
      if (g_count > 0) {
        colorElem.style.backgroundColor = (g_count % 2) ? "#f00" : "#ff0";
        setTimeout(process, 100);
      } else {
        colorElem.style.backgroundColor = g_playerColor;
      }
    }
  };

  process = function() {
    g_states[g_state]();
  };

  function drawPlayerShip() {
    g_ctx.clearRect(0, 0, g_canvas.width, g_canvas.height);
    var xOff = g_canvas.width / 2;
    var yOff = g_canvas.height / 2;
    var styleName = Ships.styles[g_shipStyle];
    for (var yy = -2; yy <= 2; ++yy) {
      for (var xx = -2; xx <=2; ++xx) {
        Ships.drawShip(g_ctx, xx + xOff, yy + yOff, Math.PI, "#000");
      }
    }
    Ships[styleName](g_ctx, xOff, yOff, Math.PI, g_shipColor);
  }

  function drawGhostShip() {
    var xOff = g_canvas.width / 2;
    var yOff = g_canvas.height / 2;
    g_ctx.clearRect(0, 0, g_canvas.width, g_canvas.height);
    for (var ii = 0; ii < 6; ++ii) {
      var xx = Math.random() * 10 - 5 | 0;
      var yy = Math.random() * 10 - 5 | 0;
      Ships.drawShip(g_ctx, xx + xOff, yy + yOff, Math.PI, "#FFF");
    }
    Ships.drawShip(g_ctx, xOff, yOff, Math.PI, "#000");
  }

  function drawShip() {
    if (g_showGhost) {
      drawGhostShip();
    } else {
      drawPlayerShip();
    }
  }

  function handleSetColorMsg(msg) {
    g_shipColor = msg.color;
    g_shipStyle = msg.style;
    clearMessage();
  }

  function handleKillMsg(msg) {
    setMessage('#0FF', 'Killed ' + msg.killed);
  }

  function handleDieMsg(msg) {
    g_audioManager.playSound('explosion');
    setMessage('#F00', (msg.crash ? 'Crashed into ' : 'Killed by ') + msg.killer);
    g_state = "die";
    g_count = 20;
    setTimeout(process, 100);
    g_showGhost = true;
  }

  function handleLaunchMsg(msg) {
    g_audioManager.playSound('launching');
    setMessage('#FF0', 'Launch!');
    g_state = "launch";
    g_count = 30;
    setTimeout(process, 100);
    g_showGhost = false;
    drawShip();
  }

  function handleQueueMsg(msg) {
    setMessage('#FFF', msg.count > 0 ?
        (msg.count.toString() + " ahead of you") : "Next Up");
  }

  var handleLeftRight = function(pressed, bit) {
    g_leftRight = (g_leftRight & ~bit) | (pressed ? bit : 0);
    if (g_leftRight != g_oldLeftRight) {
      g_oldLeftRight = g_leftRight;
      g_client.sendCmd('turn', {
          turn: (g_leftRight & 1) ? -1 : ((g_leftRight & 2) ? 1 : 0),
      });
    }
  };

  var handleFire = function(pressed) {
    if (g_fire != pressed) {
      g_fire = pressed;
      g_client.sendCmd('fire', {
          fire: pressed,
      });
    }
  };

  var sounds = {
    explosion: {
      filename: "assets/explosion.ogg",
      samples: 1,
    },
    launching: {
      filename: "assets/launching.ogg",
      samples: 1,
    }
  };

  Ships.setShipSize(60);
  g_audioManager = new AudioManager(sounds);

  g_client = new GameClient();

  g_client.on('setColor', handleSetColorMsg);
  g_client.on('kill', handleKillMsg);
  g_client.on('die', handleDieMsg);
  g_client.on('launch', handleLaunchMsg);
  g_client.on('queue', handleQueueMsg);

  CommonUI.setupStandardControllerUI(g_client, globals);
  CommonUI.askForNameOnce();   // ask for the user's name if not set
  CommonUI.showMenu(true);     // shows the gear menu

  Touch.setupButtons({
    inputElement: $("buttons"),
    buttons: [
      { element: $("left"),  callback: function(e) { handleLeftRight(e.pressed, 0x1); }, },
      { element: $("right"), callback: function(e) { handleLeftRight(e.pressed, 0x2); }, },
      { element: $("fire"),  callback: function(e) { handleFire(e.pressed);           }, },
    ],
  });

  var haveTouch = 'ontouchstart' in document
  if (!haveTouch) {
    //var keyControls = $("keyControls");
    //var touchControls = $("touchControls");
    //keyControls.style.display = "block";
    //touchControls.style.display = "none";
  }

  var keys = { };
  keys[Input.cursorKeys.kLeft]  = function(e) { handleLeftRight(e.pressed, 0x1); }
  keys[Input.cursorKeys.kRight] = function(e) { handleLeftRight(e.pressed, 0x2); }
  keys["Z".charCodeAt(0)]       = function(e) { handleFire(e.pressed);           }
  Input.setupKeys(keys);
});


