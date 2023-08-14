export type MapTile = { type: 'floor' | 'wall' | 'brick' };

export function createMap(WIDTH: number, HEIGHT: number) {
  const map: MapTile[][] = Array(WIDTH)
    .fill(0)
    .map(() =>
      Array(HEIGHT)
        .fill(0)
        .map(() => ({ type: 'wall' }))
    );

  for (let i = 1; i < WIDTH - 1; i++) for (let j = 1; j < HEIGHT - 1; j += 2) map[i][j] = { type: 'brick' };
  for (let i = 1; i < WIDTH - 1; i += 2) for (let j = 1; j < HEIGHT - 1; j++) map[i][j] = { type: 'brick' };

  map[1][1] = { type: 'floor' };
  map[1][2] = { type: 'floor' };
  map[2][1] = { type: 'floor' };
  map[WIDTH - 2][1] = { type: 'floor' };
  map[WIDTH - 3][1] = { type: 'floor' };
  map[WIDTH - 2][2] = { type: 'floor' };
  map[WIDTH - 2][HEIGHT - 2] = { type: 'floor' };
  map[WIDTH - 3][HEIGHT - 2] = { type: 'floor' };
  map[WIDTH - 2][HEIGHT - 3] = { type: 'floor' };
  map[1][HEIGHT - 2] = { type: 'floor' };
  map[2][HEIGHT - 2] = { type: 'floor' };
  map[1][HEIGHT - 3] = { type: 'floor' };
  return map;
}

export type Vec2d = [x: number, y: number];

export function indicesToPixels([x, y]: Vec2d) {
  return [x * 64 + 32, y * 64 + 32] as Vec2d;
}
export function pixelsToIndices([x, y]: Vec2d) {
  return [Math.floor(x / 64), Math.floor(y / 64)] as Vec2d;
}

export function add([x1, y1]: Vec2d, [x2, y2]: Vec2d) {
  return [x1 + x2, y1 + y2] as Vec2d;
}
export function sub([x1, y1]: Vec2d, [x2, y2]: Vec2d) {
  return [x1 - x2, y1 - y2] as Vec2d;
}
export function mul([x1, y1]: Vec2d, s: number | Vec2d) {
  if (typeof s === 'number') return [x1 * s, y1 * s] as Vec2d;
  return [x1 * s[0], y1 * s[1]] as Vec2d;
}
export function div([x1, y1]: Vec2d, s: number | Vec2d) {
  if (typeof s === 'number') return [x1 / s, y1 / s] as Vec2d;
  return [x1 / s[0], y1 / s[1]] as Vec2d;
}
export function eq([x1, y1]: Vec2d, [x2, y2]: Vec2d) {
  return x1 === x2 && y1 === y2;
}
