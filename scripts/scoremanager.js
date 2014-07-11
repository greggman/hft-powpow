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

define(["./plistmanager"], function(PListManager) {
  /**
   * Manages the high score list.
   */

  function ScoreManager(services, element) {
    this.services = services;
    this.element_ = element;
    this.maxScores_ = 10;
    this.orderedPlayers_ = [];
    this.zeros_ = "";
    this.plist = new PListManager();
  }

  ScoreManager.prototype.createScoreLine = function(player, color) {
    return this.plist.createElement(player, color);
  };

  ScoreManager.prototype.deleteScoreLine = function(scoreLine) {
    this.plist.deleteElement(scoreLine);
  };

  ScoreManager.prototype.calculateScores = function() {
    var orderedPlayers = [];
    var maxScore = 0;
    this.services.playerManager.forEachPlayer(function(player) {
      orderedPlayers.push(player);
      maxScore = Math.max(maxScore, player.score);
    });

    orderedPlayers.sort(function(a, b) {
      if (a.score > b.score)
        return -1;
      else if (a.score < b.score)
        return 1;
      else if (a.playerName < b.playerName)
        return -1;
      else
        return 1;
    });

    if (orderedPlayers.length > this.maxScores_) {
      orderedPlayers.length = this.maxScores_;
    }

    var numDigits = maxScore.toString().length;
    if (numDigits < this.zeros_.length) {
      this.zeros_ = this.zeros_.substr(0, numDigits);
    } else {
      while (this.zeros_.length < numDigits) {
        this.zeros_ += "0";
      }
    }

    this.orderedPlayers_ = orderedPlayers;
  };

  ScoreManager.prototype.drawScores = function() {
    // remove all the elements.
    while (this.element_.firstChild) {
      this.element_.removeChild(this.element_.firstChild);
    }

    // Add back all the elements in the current order
    for (var ii = 0; ii < this.orderedPlayers_.length; ++ii) {
      var player = this.orderedPlayers_[ii];
      this.element_.appendChild(player.scoreLine.line);
    }
  };

  ScoreManager.prototype.update = function() {
    this.calculateScores();
    this.drawScores();
  };

  ScoreManager.prototype.draw = function(renderer) {
    if (this.orderedPlayers_.length > 1 &&
        this.orderedPlayers_[0].score > this.orderedPlayers_[1].score) {
      var lead = this.orderedPlayers_[0];
      if (lead.state == 'fly') {
        renderer.drawLeadMark(
            lead.position, lead.direction,
            {glColor: new Float32Array([1,0,0,1]), canvasColor:"rgb(255,0,0)"});
      }
    }
  };

  return ScoreManager;
});

