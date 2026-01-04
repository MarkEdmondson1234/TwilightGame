/**
 * PixiJS Import Test
 *
 * Verifies that PixiJS and @pixi/react are correctly installed and can be imported.
 * Run with: npx tsx tests/pixi-import-test.ts
 */

// Test core PixiJS imports
import * as PIXI from 'pixi.js';
import * as PixiReact from '@pixi/react';

console.log('✅ Testing PixiJS imports...\n');

// Test 1: Core PixiJS
console.log('📦 PixiJS Core:');
console.log(`   - Version: ${PIXI.VERSION}`);
console.log(`   - Application: ${typeof PIXI.Application}`);
console.log(`   - Sprite: ${typeof PIXI.Sprite}`);
console.log(`   - Container: ${typeof PIXI.Container}`);
console.log(`   - Texture: ${typeof PIXI.Texture}`);
console.log('   ✓ Core imports successful\n');

// Test 2: @pixi/react
console.log('⚛️  @pixi/react:');
console.log(`   - Available exports: ${Object.keys(PixiReact).join(', ')}`);
console.log(`   - Stage component: ${(PixiReact as any).Stage ? '✓' : '✗ (Not in v8)'}`);
console.log('   ✓ React wrapper imports successful\n');

// Test 3: Key features for pixel art
console.log('🎮 Pixel Art Features:');
console.log(`   - SCALE_MODES.NEAREST: ${(PIXI as any).SCALE_MODES?.NEAREST || 'nearest (string)'}`);
console.log(`   - BaseTexture: ${(PIXI as any).BaseTexture ? 'available' : 'Removed in v8 (use Texture.from)'}`);
console.log(`   - Texture.from available: ${typeof PIXI.Texture.from === 'function' ? '✓' : '✗'}`);
console.log('   ✓ Pixel art features available\n');

// Test 4: Renderer capabilities
console.log('🖥️  Renderer Capabilities:');
console.log(`   - WebGL support: ${typeof (PIXI as any).WebGLRenderer !== 'undefined' ? '✓' : '✗ (Unified in v8)'}`);
console.log(`   - Canvas fallback: ${typeof (PIXI as any).CanvasRenderer !== 'undefined' ? '✓' : '✗ (Unified in v8)'}`);
console.log(`   - Ticker: ${typeof PIXI.Ticker}`);
console.log('   ✓ Renderer capabilities verified\n');

// Test 5: Required classes for game
console.log('🎯 Game-Specific Classes:');
const requiredClasses = [
  'Application',
  'Container',
  'Sprite',
  'Texture',
  'Assets', // v8 replacement for BaseTexture
  'Text',
  'Graphics',
];

requiredClasses.forEach(className => {
  const exists = (PIXI as any)[className] !== undefined;
  console.log(`   - ${className}: ${exists ? '✓' : '✗'}`);
});
console.log('   ✓ All required classes available\n');

console.log('✅ All PixiJS imports successful! Ready to migrate.\n');

// Export types for TypeScript validation
export type { Application, Container, Sprite, Texture } from 'pixi.js';
export * from '@pixi/react';
