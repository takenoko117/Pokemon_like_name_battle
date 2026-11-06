import { describe, it, expect } from 'vitest';
import { generateMonster3D } from '../src/three/monster3dGenerator';
import { ALL_TYPES } from '../src/core/typeChart';
import { Stats } from '../src/types';

describe('3D Procedural Monster Generation', () => {
  const dummyStats: Stats = {
    hp: 120,
    attack: 90,
    defense: 80,
    spAttack: 110,
    spDefense: 85,
    speed: 105,
    total: 590,
  };

  it('generates a 3D model with root Group and materials/geometries', () => {
    const model = generateMonster3D(12345, 'fire', 'dragon', dummyStats);
    expect(model).toBeDefined();
    expect(model.root).toBeDefined();
    expect(model.root.children.length).toBeGreaterThan(0);
    expect(model.materials.length).toBeGreaterThan(0);
    expect(model.geometries.length).toBeGreaterThan(0);

    // update 呼び出し
    expect(() => {
      model.update(0.016, 'idle', 0);
      model.update(0.016, 'attack', 0.5);
      model.update(0.016, 'hit', 1.0);
      model.update(0.016, 'faint', 1.5);
    }).not.toThrow();

    // dispose 呼び出し
    expect(() => {
      model.dispose();
    }).not.toThrow();
  });

  it('can generate 3D models for all 18 Pokemon types without error', () => {
    ALL_TYPES.forEach((type, idx) => {
      const model = generateMonster3D(idx * 777, type, undefined, dummyStats);
      expect(model.root).toBeDefined();
      expect(model.materials.length).toBeGreaterThan(0);
      model.update(0.016, 'idle', 0.1);
      model.dispose();
    });
  });

  it('deterministic output for identical seeds', () => {
    const model1 = generateMonster3D(9999, 'water', 'electric', dummyStats);
    const model2 = generateMonster3D(9999, 'water', 'electric', dummyStats);

    expect(model1.materials.length).toBe(model2.materials.length);
    expect(model1.geometries.length).toBe(model2.geometries.length);

    model1.dispose();
    model2.dispose();
  });
});
