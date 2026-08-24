'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
interface Network {
  ssid: string;
  rssi: number;
  authmode: number;
}

type SetupState = 'scanning' | 'idle' | 'submitting' | 'connecting' | 'success' | 'failed';

const ESP32_AP_IP = 'http://192.168.4.1';
const MAX_TEMPORARY_ERRORS = 5;
const POLL_INTERVAL_MS = 2000;
const CONNECT_TIMEOUT_MS = 30000;

// --- Signal Strength Indicator Component ---
const SignalBars = ({ rssi }: { rssi: number }) => {
  let bars = 1;
  if (rssi >= -55) bars = 4;
  else if (rssi >= -67) bars = 3;
  else if (rssi >= -80) bars = 2;

  return (
    <div className="flex items-end gap-0.5 h-4 w-5 justify-center" title={`${rssi} dBm`}>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={`w-1 rounded-sm transition-colors ${
            bar <= bars ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </div>
  );
};

export default function ESP32SetupPage() {
  const [status, setStatus] = useState<SetupState>('scanning');
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedSsid, setSelectedSsid] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [assignedIp, setAssignedIp] = useState<string>('');

  const scanningRef = useRef<boolean>(false);
  const cancelRef = useRef<boolean>(false);

  // --- Scan WiFi Networks ---
  const scanNetworks = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setStatus('scanning');
    setErrorMsg('');

    try {
      const res = await fetch(`${ESP32_AP_IP}/ap-scan`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error('Failed to fetch networks');
      const data: Network[] = await res.json();
      
      if (!cancelRef.current) {
        // Sort by signal strength
        const sorted = data.sort((a, b) => b.rssi - a.rssi);
        setNetworks(sorted);
        setStatus('idle');
      }
    } catch (err: any) {
      if (!cancelRef.current) {
        setErrorMsg('Unable to find device Wi-Fi. Ensure you are connected to the SoftAP network.');
        setStatus('idle');
      }
    } finally {
      scanningRef.current = false;
    }
  }, []);

  useEffect(() => {
    cancelRef.current = false;
    scanNetworks();
    return () => {
      cancelRef.current = true;
    };
  }, [scanNetworks]);

  // --- Select Network & Clear Stale Password ---
  const handleSelectNetwork = (ssid: string) => {
    setSelectedSsid(ssid);
    setPassword('');
    setErrorMsg('');
  };

  // --- Poll Connection Status after Submission ---
  const pollConnectionStatus = async () => {
    let errorCount = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < CONNECT_TIMEOUT_MS) {
      if (cancelRef.current) return;

      try {
        const res = await fetch(`${ESP32_AP_IP}/ap-status`, {
          signal: AbortSignal.timeout(3000),
        });

        if (res.ok) {
          const data = await res.json();
          // Expected ESP32 status structure: { status: 'GOT_IP' | 'CONNECTING' | 'FAILED', ip: '...' }
          if (data.status === 'GOT_IP' || data.connected) {
            setAssignedIp(data.ip || '');
            setStatus('success');
            return;
          } else if (data.status === 'FAILED') {
            setErrorMsg('ESP32 failed to authenticate with the network. Check your password.');
            setStatus('failed');
            return;
          }
        }
      } catch {
        errorCount++;
        // Allow temporary drop while ESP32 switches radio modes
        if (errorCount > MAX_TEMPORARY_ERRORS) {
          setErrorMsg('Lost connection to setup AP. Check if the ESP32 connected to target Wi-Fi.');
          setStatus('failed');
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    setErrorMsg('Connection timed out. Please try again.');
    setStatus('failed');
  };

  // --- Submit Credentials ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSsid) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const response = await fetch(`${ESP32_AP_IP}/ap-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: selectedSsid, password }),
      });

      if (!response.ok) throw new Error('Failed to send configuration');

      setStatus('connecting');
      await pollConnectionStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit Wi-Fi configuration.');
      setStatus('idle');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Header */}
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white">Device Wi-Fi Setup</h1>
          <p className="text-sm text-slate-400">
            Connect your ESP32 device to your local network
          </p>
        </header>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Success State */}
        {status === 'success' ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-emerald-400">Successfully Connected!</h2>
              <p className="text-sm text-slate-400">
                Device is now on your network.
              </p>
              {assignedIp && (
                <p className="text-xs font-mono text-slate-500 mt-2">
                  IP Address: {assignedIp}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setStatus('scanning');
                scanNetworks();
              }}
              className="mt-2 text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              Configure another network
            </button>
          </div>
        ) : (
          <>
            {/* Network List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Available Networks
                </span>
                <button
                  type="button"
                  onClick={scanNetworks}
                  disabled={status === 'scanning' || status === 'submitting' || status === 'connecting'}
                  className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors"
                >
                  {status === 'scanning' ? 'Scanning...' : 'Refresh'}
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-800 rounded-lg p-1">
                {networks.length === 0 && status !== 'scanning' && (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No networks found. Tap refresh to try again.
                  </p>
                )}

                {networks.map((net) => {
                  const isSelected = selectedSsid === net.ssid;
                  return (
                    <button
                      key={net.ssid}
                      type="button"
                      onClick={() => handleSelectNetwork(net.ssid)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-md text-left text-sm transition-all ${
                        isSelected
                          ? 'bg-sky-600/20 border border-sky-500/50 text-white'
                          : 'bg-slate-800/40 hover:bg-slate-800 border border-transparent text-slate-300'
                      }`}
                    >
                      <span className="font-medium truncate pr-2">{net.ssid}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {net.authmode !== 0 && (
                          <span className="text-xs text-slate-500">🔒</span>
                        )}
                        <SignalBars rssi={net.rssi} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connection Form */}
            {selectedSsid && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label htmlFor="wifi-password" className="block text-xs font-medium text-slate-300">
                    Password for <span className="text-white font-semibold">{selectedSsid}</span>
                  </label>
                  <input
                    id="wifi-password"
                    type="password"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Wi-Fi password"
                    disabled={status === 'submitting' || status === 'connecting'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting' || status === 'connecting'}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(status === 'submitting' || status === 'connecting') && (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  {status === 'submitting'
                    ? 'Sending Credentials...'
                    : status === 'connecting'
                    ? 'Connecting to Wi-Fi...'
                    : 'Connect Device'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}