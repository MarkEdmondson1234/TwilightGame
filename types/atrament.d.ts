/**
 * Type declarations for atrament v5.x
 * Atrament — tiny JS library for beautiful drawing and handwriting on HTML Canvas
 */
declare module 'atrament' {
  export const MODE_DRAW: 'draw';
  export const MODE_ERASE: 'erase';
  export const MODE_FILL: 'fill';
  export const MODE_DISABLED: 'disabled';

  export type AtramentMode = 'draw' | 'erase' | 'fill' | 'disabled';

  export interface AtramentStrokeSegment {
    point: { x: number; y: number };
    time: number;
    pressure: number;
  }

  export interface AtramentStroke {
    segments: AtramentStrokeSegment[];
    mode: AtramentMode;
    weight: number;
    smoothing: number;
    color: string;
    adaptiveStroke: boolean;
  }

  export interface AtramentOptions {
    width?: number;
    height?: number;
    color?: string;
    weight?: number;
    smoothing?: number;
    adaptiveStroke?: boolean;
    mode?: AtramentMode;
    secondaryMouseButton?: boolean;
    ignoreModifiers?: boolean;
    pressureLow?: number;
    pressureHigh?: number;
    pressureSmoothing?: number;
    fill?: new () => Worker;
  }

  export default class Atrament {
    constructor(canvas: HTMLCanvasElement | string, options?: AtramentOptions);

    canvas: HTMLCanvasElement;
    recordStrokes: boolean;
    adaptiveStroke: boolean;
    smoothing: number;
    thickness: number;

    color: string;
    weight: number;
    mode: AtramentMode;
    dirty: boolean;
    currentStroke: AtramentStroke;

    beginStroke(x: number, y: number): void;
    draw(
      x: number,
      y: number,
      prevX?: number,
      prevY?: number,
      pressure?: number
    ): { x: number; y: number };
    endStroke(x: number, y: number): void;

    clear(): void;
    destroy(): void;

    addEventListener(
      event: 'strokerecorded',
      listener: (data: { stroke: AtramentStroke }) => void
    ): void;
    addEventListener(
      event: 'strokestart' | 'strokeend',
      listener: (data: { x: number; y: number }) => void
    ): void;
    addEventListener(event: 'dirty' | 'clean', listener: () => void): void;
    addEventListener(
      event: 'segmentdrawn',
      listener: (data: { stroke: AtramentStroke }) => void
    ): void;

    removeEventListener(event: string, listener: (...args: unknown[]) => void): void;
  }
}
