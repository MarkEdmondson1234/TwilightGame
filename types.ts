import React from 'react';

export enum TileType {
  GRASS,
  ROCK,
  WATER,
  PATH,
  SHOP_DOOR,
  MINE_ENTRANCE,
}

export interface Position {
  x: number;
  y: number;
}

export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export interface TileData {
    type: TileType;
    name: string;
    color: string;
    isSolid: boolean;
    image?: string[];
}