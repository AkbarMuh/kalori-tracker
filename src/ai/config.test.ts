import { describe, expect, it } from 'vitest';
import { azureChatUrl, isAiReady, parseAzureTarget, readSetupHash, setupLink, type AiConfig } from './config';

describe('parseAzureTarget', () => {
  it('reads endpoint, deployment and API version from a portal Target URI', () => {
    expect(
      parseAzureTarget(
        ' https://res-1.cognitiveservices.azure.com/openai/deployments/gpt-4.1-nano-x/chat/completions?api-version=2025-01-01-preview ',
      ),
    ).toEqual({
      endpoint: 'https://res-1.cognitiveservices.azure.com',
      deployment: 'gpt-4.1-nano-x',
      apiVersion: '2025-01-01-preview',
    });
  });

  it('accepts a bare endpoint', () => {
    expect(parseAzureTarget('https://res.openai.azure.com/')).toEqual({ endpoint: 'https://res.openai.azure.com' });
  });

  it('rejects non-URLs and plain http', () => {
    expect(parseAzureTarget('gpt-4.1-nano')).toBeNull();
    expect(parseAzureTarget('http://res.openai.azure.com')).toBeNull();
  });
});

describe('azureChatUrl', () => {
  it('builds the chat completions URL', () => {
    expect(azureChatUrl({ endpoint: 'https://res.openai.azure.com/', deployment: 'dep', apiVersion: 'v1' })).toBe(
      'https://res.openai.azure.com/openai/deployments/dep/chat/completions?api-version=v1',
    );
  });
});

describe('setup link', () => {
  const cfg: AiConfig = {
    provider: 'azure',
    azure: { endpoint: 'https://res.openai.azure.com', deployment: 'dep', apiVersion: 'v1', key: 'k3y/+=é' },
  };

  it('round-trips the config through the URL fragment', () => {
    const link = setupLink(cfg, 'https://me.github.io/kalori-tracker/#old');
    expect(link.startsWith('https://me.github.io/kalori-tracker/#ai=')).toBe(true);
    expect(link).not.toContain('k3y');
    expect(readSetupHash(link.slice(link.indexOf('#')))).toEqual(cfg);
  });

  it('ignores other or broken fragments', () => {
    expect(readSetupHash('')).toBeNull();
    expect(readSetupHash('#today')).toBeNull();
    expect(readSetupHash('#ai=not-base64!')).toBeNull();
  });
});

describe('isAiReady', () => {
  it('requires every field for the chosen provider', () => {
    expect(isAiReady({ provider: 'anthropic', anthropicKey: 'x' })).toBe(true);
    expect(isAiReady({ provider: 'azure', anthropicKey: 'x' })).toBe(false);
    expect(isAiReady({ provider: 'azure', azure: { endpoint: 'e', deployment: 'd', apiVersion: 'v', key: '' } })).toBe(false);
  });
});
