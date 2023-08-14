<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core';
import { ComputedRef, onMounted, onUnmounted, ref } from 'vue';
import { add, createMap, eq, indicesToPixels, MapTile, mul, pixelsToIndices, Vec2d } from './util';

const WIDTH = 15;
const HEIGHT = 13;
const TILE_SIZE = 64;
const TICKS_PER_S = 60;

const PLAYER_START_LIVES = 3;
const PLAYER_START_BOMBS = 2;
const PLAYER_START_SPEED = 4;
const PLAYER_START_STACKING = true;
const PLAYER_START_PUSH = true;

const BOMB_START_PIERCE = 2;
const BOMB_START_RANGE = 2;
const BOMB_LIFETIME = 2 * TICKS_PER_S;
const BOMB_SPEED = 12;

const EXPLOSION_LIFETIME = 0.5 * TICKS_PER_S;

const map = ref(createMap(WIDTH, HEIGHT));

function getTile([x, y]: Vec2d) {
  return map.value[x]?.[y];
}
function setTile([x, y]: Vec2d, tile: MapTile) {
  return (map.value[x][y] = tile);
}
function createPlayer(
  name: string,
  position: Vec2d,
  keys: [up: ComputedRef<boolean>, down: ComputedRef<boolean>, left: ComputedRef<boolean>, right: ComputedRef<boolean>, bomb: ComputedRef<boolean>]
) {
  return {
    name,
    keys,
    position: indicesToPixels(position),
    lives: PLAYER_START_LIVES,
    maxBombs: PLAYER_START_BOMBS,
    speed: PLAYER_START_SPEED,
    canStackBombs: PLAYER_START_STACKING,
    canPushBombs: PLAYER_START_PUSH,
  };
}
const { ArrowUp, ArrowLeft, ArrowRight, ArrowDown, Space, w, a, s, d, y, i, k, j, l, m, t, f, g, h, v } = useMagicKeys();

const players = ref([
  createPlayer('🔵', [1, 1], [ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Space]),
  createPlayer('🔴', [WIDTH - 2, HEIGHT - 2], [w, s, a, d, y]),
  createPlayer('🟠', [WIDTH - 2, 1], [t, g, f, h, v]),
  createPlayer('🟡', [1, HEIGHT - 2], [i, k, j, l, m]),
]);

const bombs = ref<{ ticksLeft: number; playerName: string; position: Vec2d; range: number; pierce: number; movement: Vec2d }[]>([]);
const explosions = ref<{ ticksLeft: number; playerName: string; position: Vec2d }[]>([]);

const playerBombKeyLastPressed: Record<string, boolean> = {};

function gameLoop() {
  for (let player of players.value) {
    let movement: Vec2d = [0, 0];
    if (player.keys[0].value) movement[1] = -1;
    if (player.keys[1].value) movement[1] = 1;
    if (player.keys[2].value) movement[0] = -1;
    if (player.keys[3].value) movement[0] = 1;
    const positionToMoveAgainst = pixelsToIndices(add(player.position, mul(movement, TILE_SIZE / 2 + 1)));
    if (getTile(positionToMoveAgainst)?.type !== 'floor') movement = [0, 0];

    //push bombs
    if (player.canPushBombs)
      bombs.value
        .filter(
          bomb => eq(pixelsToIndices(bomb.position), positionToMoveAgainst) && !eq(pixelsToIndices(bomb.position), pixelsToIndices(player.position))
        )
        .forEach(bomb => (bomb.movement = movement));

    if (findBombs(positionToMoveAgainst, pixelsToIndices(player.position)).length > 0) movement = [0, 0];
    player.position = add(player.position, mul(movement, player.speed));

    if (
      player.keys[4].value &&
      player.keys[4].value != playerBombKeyLastPressed[player.name] &&
      bombs.value.filter(bomb => bomb.playerName === player.name).length < player.maxBombs &&
      (!findBombs(pixelsToIndices(player.position)) || player.canStackBombs)
    ) {
      bombs.value.push({
        ticksLeft: BOMB_LIFETIME,
        playerName: player.name,
        position: indicesToPixels(pixelsToIndices(player.position)),
        range: BOMB_START_RANGE,
        pierce: BOMB_START_PIERCE,
        movement: [0, 0],
      });
    }
    playerBombKeyLastPressed[player.name] = player.keys[4].value;
  }

  for (let bomb of bombs.value) {
    bomb.ticksLeft--;
    if (bomb.ticksLeft <= 0) {
      bombs.value.splice(bombs.value.indexOf(bomb), 1);
      explodeTile(bomb.playerName, pixelsToIndices(bomb.position));
      for (let dir of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as Vec2d[]) {
        let pierceLeft = bomb.pierce;
        for (let i = 1; i <= bomb.range; i++) {
          const position = add(pixelsToIndices(bomb.position), mul(dir, i));
          const tile = getTile(position);
          if (tile?.type != 'wall')
            if (tile?.type === 'brick' || tile?.type === 'floor') {
              explodeTile(bomb.playerName, position);
              if (tile?.type === 'brick') {
                setTile(position, { type: 'floor' });
                pierceLeft--;
                if (pierceLeft <= 0) break;
              }
            }
          if (tile?.type === 'wall') break;
        }
      }
    }

    const positionToMoveAgainst = pixelsToIndices(add(bomb.position, mul(bomb.movement, TILE_SIZE / 2 + 1)));
    if (getTile(positionToMoveAgainst)?.type !== 'floor') bomb.movement = [0, 0];
    if (findBombs(positionToMoveAgainst, pixelsToIndices(bomb.position)).length > 0) bomb.movement = [0, 0];
    bomb.position = add(bomb.position, mul(bomb.movement, BOMB_SPEED));
  }
  for (let explosion of explosions.value) {
    explosion.ticksLeft--;
    if (explosion.ticksLeft <= 0) explosions.value.splice(explosions.value.indexOf(explosion), 1);
    findBombs(pixelsToIndices(explosion.position)).forEach(bomb => (bomb.ticksLeft = 0));
  }
}
let gameLoopInterval = -1;
onMounted(() => (gameLoopInterval = setInterval(gameLoop, 1000 / TICKS_PER_S)));
onUnmounted(() => clearInterval(gameLoopInterval));

function explodeTile(playerName: string, position: Vec2d) {
  explosions.value.push({
    ticksLeft: EXPLOSION_LIFETIME,
    playerName,
    position: indicesToPixels(position),
  });

  const tile = getTile(position);
  if (tile?.type === 'brick') {
    setTile(position, { type: 'floor' });
  }
  //dmg player
  players.value.filter(p => eq(pixelsToIndices(p.position), position)).forEach(p => p.lives--);
  players.value = players.value.filter(p => p.lives >= 0);
}

function findBombs(targetPosition: Vec2d, excludedPosition: Vec2d = [-1, -1]) {
  return bombs.value.filter(b => eq(pixelsToIndices(b.position), targetPosition) && !eq(pixelsToIndices(b.position), excludedPosition));
}
</script>

<template>
  <div style="height: 100hv">
    <div style="position: relative">
      <div style="display: flex; flex-direction: row; align-items: center; justify-content: center">
        <div v-for="row in map" style="display: flex; flex-direction: column">
          <div v-for="tile in row" class="maptile" :class="tile.type"></div>
        </div>
      </div>
      <div
        v-for="player in players"
        :style="{
          fontSize: '50px',
          position: 'absolute',
          left: player.position[0] + 'px',
          top: player.position[1] + 'px',
          translate: '-50% -50%',
        }"
      >
        {{ player.name }}
        <span style="font-size: 12px; position: absolute; top: -6px; left: 8px" v-if="player.lives > 0">{{ '❤️'.repeat(player.lives) }}</span>
        <span style="font-size: 12px; position: absolute; top: 31px; left: 18px">
          {{ '💣'.repeat(player.maxBombs - bombs.filter(b => b.playerName == player.name).length) }}
        </span>
        <span style="font-size: 12px; position: absolute; top: 16px; left: 26px" v-if="player.canPushBombs">➡️</span>
        <span style="font-size: 12px; position: absolute; top: 46px; left: 26px" v-if="player.canStackBombs">🔝</span>
      </div>
      <div
        v-for="bomb in bombs"
        :style="{
          fontSize: '50px',
          position: 'absolute',
          left: bomb.position[0] + 'px',
          top: bomb.position[1] + 'px',
          translate: '-50% -50%',
        }"
      >
        💣
      </div>
      <div
        v-for="explosion in explosions"
        :style="{
          fontSize: '50px',
          position: 'absolute',
          left: explosion.position[0] + 'px',
          top: explosion.position[1] + 'px',
          translate: '-50% -50%',
        }"
      >
        💥
      </div>
    </div>
  </div>
</template>

<style scoped>
.maptile {
  width: 64px;
  height: 64px;
}
.brick {
  background-image: url(./assets/brick.png);
}
.wall {
  background-image: url(./assets/wall.png);
}
.floor {
  background-image: url(./assets/floor.png);
}
</style>
