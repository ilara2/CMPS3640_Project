import React, { useCallback, useRef, useEffect, useState } from "react";

// PIXI
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

import io from "socket.io-client";

// Styles
import classes from "./styles.scss";
import Player from "./player";
import movementController from "./../movementController";
import Bomb from "./bomb";

const socket = io.connect("http://localhost:3000");
const movement = movementController(socket);

socket.on("userid", function(message: any) {
  console.log(message);
});

const graphic = new PIXI.Graphics();
graphic.zIndex = -1;
const blockSize = 128;
const gridSize = 15;
const players: Player[] = [];
const playerPositions: number[][] = [
  [blockSize * 1, blockSize * 1 - 16],
  [blockSize * (gridSize - 2), blockSize * 1 - 16],
  [blockSize * 1, blockSize * (gridSize - 2) - 16],
  [blockSize * (gridSize - 2), blockSize * (gridSize - 2) - 16]
];

function PixiApp(props: any): JSX.Element {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState(
    new PIXI.Application({
      resolution: 1,
      transparent: true,
      antialias: true,
      backgroundColor: 0x555555
    })
  );
  const [vp, setVp] = useState(
    new Viewport({
      screenWidth: app.view.width,
      screenHeight: app.view.height,
      // the interaction module is important for wheel to work
      // properly when renderer.view is placed or scaled
      interaction: app.renderer.plugins.interaction
    })
  );

  const updateResolution = useCallback((): void => {
    setTimeout(() => {
      if (app && pixiContainerRef.current) {
        const width = app.view.width;
        const height = app.view.height;
        const ratio = Math.min(width / 1920, height / 1080);
        vp.scale.set(ratio);
      }
    }, 100);
  }, [app]);

  useEffect(() => {
    socket.on("updateGamestate", function(msg: any) {
      // console.log(msg);
      msg = JSON.parse(msg);
      updateGameboard(msg.gameboard);
      updatePlayerPositions(msg.playerPositions);
    });
  }, []);

  function updateGameboard(gameboard: number[][]) {
    graphic.clear();
    graphic.lineStyle(8, 0x000000);
    for (var row = 0; row < gameboard.length; ++row) {
      for (var col = 0; col < gameboard[row].length; ++col) {
        switch (gameboard[row][col]) {
          case 2:
            graphic.beginFill(0x00ffff);
            break;
          case 1:
            graphic.beginFill(0xffffff);
            break;
          case 3:
            const sprite = new Bomb(app);
            sprite.position.set(blockSize * row, blockSize * col);
            vp.addChild(sprite);
          case 0:
          default:
            graphic.beginFill(0x000000);
            break;
        }
        graphic.drawRect(
          blockSize * row,
          blockSize * col,
          blockSize,
          blockSize
        );
      }
    }
    graphic.endFill();
  }

  function updatePlayerPositions(playerPositions: number[][]) {
    let i = 0;
    for (const p of players) {
      p.position.set(
        blockSize * playerPositions[i][0],
        blockSize * playerPositions[i][1] - 16
      );
      ++i;
    }
  }

  useEffect(() => {
    updateResolution();
    $(window).resize(updateResolution);
    // Specify how to clean up after this effect:
    return function cleanup(): void {
      $(window).off("resize", updateResolution);
    };
  }, [updateResolution]);

  useEffect(() => {
    if (pixiContainerRef.current) {
      if (app.resizeTo !== pixiContainerRef.current) {
        app.resizeTo = pixiContainerRef.current;
        pixiContainerRef.current.appendChild(app.view);
        app.stage.addChild(vp);
        vp.addChild(graphic);
        var paths = [
          "src/assets/sprites/player1.json",
          "src/assets/sprites/player2.json",
          "src/assets/sprites/player3.json",
          "src/assets/sprites/player4.json"
        ];
        app.loader
          .add(paths[0])
          .add(paths[1])
          .add(paths[2])
          .add(paths[3])
          .add("bomb", "src/assets/sprites/bomb.json")
          .load((loader, res) => {
            for (var i = 0; i < paths.length; ++i) {
              const player = res[paths[i]];
              if (player && player.textures) {
                const down = [
                  player.textures[`${i + 1}_image01.png`],
                  player.textures[`${i + 1}_image02.png`],
                  player.textures[`${i + 1}_image03.png`],
                  player.textures[`${i + 1}_image04.png`]
                ];
                const left = [
                  player.textures[`${i + 1}_image05.png`],
                  player.textures[`${i + 1}_image06.png`],
                  player.textures[`${i + 1}_image07.png`],
                  player.textures[`${i + 1}_image08.png`]
                ];
                const right = [
                  player.textures[`${i + 1}_image09.png`],
                  player.textures[`${i + 1}_image10.png`],
                  player.textures[`${i + 1}_image11.png`],
                  player.textures[`${i + 1}_image12.png`]
                ];
                const up = [
                  player.textures[`${i + 1}_image13.png`],
                  player.textures[`${i + 1}_image14.png`],
                  player.textures[`${i + 1}_image15.png`],
                  player.textures[`${i + 1}_image16.png`]
                ];
                const spritePack = {
                  up: new PIXI.AnimatedSprite(up),
                  down: new PIXI.AnimatedSprite(down),
                  left: new PIXI.AnimatedSprite(left),
                  right: new PIXI.AnimatedSprite(right)
                };
                players[i] = new Player(spritePack);
                players[i].zIndex = 1;
                players[i].position.set(
                  playerPositions[i][0],
                  playerPositions[i][1]
                );
                if (i > 1) {
                  players[i].set("up");
                }
                vp.addChild(players[i]);
              }
            }
          });
      }
    }
  }, [app]);

  return (
    <div className={classes["wrapper"]}>
      <div className={classes["pixi"]} ref={pixiContainerRef} />
    </div>
  );
}

export default PixiApp;
