import { useState, type FormEvent } from 'react';
import {
  DEFAULT_AZURE_API_VERSION,
  isAiReady,
  parseAzureTarget,
  saveAiConfig,
  type AiConfig,
  type AiProvider,
} from '../ai/config';
import { Icon } from '../components/Icon';

interface Props {
  initial: AiConfig | null;
  submitLabel: string;
  onSaved: (cfg: AiConfig) => void;
}

/** Pick the AI provider and paste its credentials. Azure: the portal's Target URI + key is enough. */
export function AiSetupForm({ initial, submitLabel, onSaved }: Props) {
  const [provider, setProvider] = useState<AiProvider>(initial?.provider ?? 'azure');
  const [target, setTarget] = useState('');
  const [endpoint, setEndpoint] = useState(initial?.azure?.endpoint ?? '');
  const [deployment, setDeployment] = useState(initial?.azure?.deployment ?? '');
  const [apiVersion, setApiVersion] = useState(initial?.azure?.apiVersion ?? DEFAULT_AZURE_API_VERSION);
  const [azureKey, setAzureKey] = useState(initial?.azure?.key ?? '');
  const [anthropicKey, setAnthropicKey] = useState(initial?.anthropicKey ?? '');
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetParsed = target.trim() ? parseAzureTarget(target) : null;

  function onTarget(value: string) {
    setTarget(value);
    const p = parseAzureTarget(value);
    if (!p) return;
    if (p.endpoint) setEndpoint(p.endpoint);
    if (p.deployment) setDeployment(p.deployment);
    if (p.apiVersion) setApiVersion(p.apiVersion);
    if (!p.deployment) setShowManual(true);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const cfg: AiConfig =
      provider === 'azure'
        ? {
            provider,
            azure: {
              endpoint: endpoint.trim().replace(/\/+$/, ''),
              deployment: deployment.trim(),
              apiVersion: apiVersion.trim(),
              key: azureKey.trim(),
            },
          }
        : { provider, anthropicKey: anthropicKey.trim() };
    if (!isAiReady(cfg)) {
      return setError(provider === 'azure' ? 'Lengkapi Target URI (atau endpoint + deployment) dan key.' : 'Isi API key.');
    }
    setError(null);
    saveAiConfig(cfg);
    onSaved(cfg);
  }

  return (
    <form className="stack ai-form" onSubmit={submit}>
      <div className="seg small-seg" role="tablist" aria-label="Penyedia AI">
        {(['azure', 'anthropic'] as const).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={provider === p} className={provider === p ? 'on' : ''} onClick={() => setProvider(p)}>
            {p === 'azure' ? 'Azure OpenAI' : 'Claude'}
          </button>
        ))}
      </div>

      {provider === 'azure' ? (
        <>
          <label className="field-label">
            Target URI
            <input
              placeholder="https://…/openai/deployments/…/chat/completions?api-version=…"
              value={target}
              onChange={(e) => onTarget(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {(endpoint || deployment) && !showManual && (
            <p className="muted small status-line">
              <Icon name="check" size={16} tone="var(--accent)" />
              {deployment || 'deployment ?'} · {apiVersion} · {endpoint.replace(/^https:\/\//, '') || 'endpoint ?'}
            </p>
          )}
          {target.trim() && !targetParsed && <p className="error">Bukan URL https yang valid.</p>}
          <label className="field-label">
            Key
            <input
              type="password"
              placeholder="Key dari halaman deployment Azure"
              value={azureKey}
              onChange={(e) => setAzureKey(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button type="button" className="link-btn" onClick={() => setShowManual((s) => !s)}>
            <Icon name="settings" size={16} />
            {showManual ? 'Sembunyikan detail' : 'Isi detail manual'}
          </button>
          {showManual && (
            <div className="stack">
              <input placeholder="Endpoint, mis. https://nama.cognitiveservices.azure.com" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} autoComplete="off" spellCheck={false} />
              <input placeholder="Nama deployment" value={deployment} onChange={(e) => setDeployment(e.target.value)} autoComplete="off" spellCheck={false} />
              <input placeholder="API version" value={apiVersion} onChange={(e) => setApiVersion(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
          )}
        </>
      ) : (
        <label className="field-label">
          API key Anthropic
          <input
            type="password"
            placeholder="sk-ant-…"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            autoComplete="off"
          />
        </label>
      )}

      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
