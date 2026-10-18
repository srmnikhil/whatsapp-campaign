import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAPH_API_VERSION } from '../config/defaults.js';
import { STORAGE_KEYS } from '../constants/storageKeys.js';
import {
  EMPTY_SETTINGS,
  clearSettings,
  getMissingKeys,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  validateSettings,
} from './settings.js';

const VALID = {
  accessToken: 'EAAtoken123456',
  appId: '111',
  wabaId: '222',
  phoneNumberId: '333',
  graphApiVersion: 'v26.0',
  backendUrl: 'https://api.example.com',
  backendApiKey: 'key-123456',
};

describe('settings storage', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual({ ...EMPTY_SETTINGS });
    expect(loadSettings().graphApiVersion).toBe(DEFAULT_GRAPH_API_VERSION);
  });

  it('round-trips saved settings', () => {
    saveSettings(VALID);
    expect(loadSettings()).toEqual(VALID);
  });

  it('returns defaults when stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, '{not json');
    expect(loadSettings()).toEqual({ ...EMPTY_SETTINGS });
  });

  it('clears stored settings', () => {
    saveSettings(VALID);
    clearSettings();
    expect(localStorage.getItem(STORAGE_KEYS.SETTINGS)).toBeNull();
  });
});

describe('sanitizeSettings', () => {
  it('trims values, drops unknown keys and the trailing slash on the backend URL', () => {
    const result = sanitizeSettings({ ...VALID, appId: ' 111 ', backendUrl: 'https://api.example.com/', extra: 'x' });
    expect(result.appId).toBe('111');
    expect(result.backendUrl).toBe('https://api.example.com');
    expect(result).not.toHaveProperty('extra');
  });
});

describe('validateSettings', () => {
  it('accepts valid settings', () => {
    expect(validateSettings(VALID)).toEqual({});
  });

  it('flags non-numeric IDs, a bad version, a token with spaces and a non-https URL', () => {
    const errors = validateSettings({
      ...VALID,
      wabaId: 'abc',
      graphApiVersion: '26',
      accessToken: 'EAA token',
      backendUrl: 'http://api.example.com',
    });
    expect(Object.keys(errors).sort()).toEqual(['accessToken', 'backendUrl', 'graphApiVersion', 'wabaId']);
  });

  it('allows http for localhost', () => {
    expect(validateSettings({ ...VALID, backendUrl: 'http://localhost:3000' })).toEqual({});
  });
});

describe('getMissingKeys', () => {
  it('lists empty keys needed for Graph calls', () => {
    expect(getMissingKeys({ ...EMPTY_SETTINGS, accessToken: 'x' })).toEqual(['phoneNumberId']);
  });
});
