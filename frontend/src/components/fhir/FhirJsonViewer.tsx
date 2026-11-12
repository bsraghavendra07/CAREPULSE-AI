import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { FHIRBundle } from '../../types/fhir';
import { fetchFhirBundle } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileJson, Copy, Check, ShieldCheck, Download, ExternalLink } from 'lucide-react';

interface FhirJsonViewerProps {
  patients: PatientProfile[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
}

export function FhirJsonViewer({
  patients,
  selectedPatientId,
  onSelectPatient,
}: FhirJsonViewerProps) {
  const [bundle, setBundle] = useState<FHIRBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const handleFetchBundle = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFhirBundle(selectedPatient.id);
      setBundle(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch FHIR bundle');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!bundle) return;
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <FileJson className="h-5 w-5 text-primary" />
                <span>HL7 FHIR R4 Resource & LOINC Observation Inspector</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Examine standardized FHIR R4 Vital Signs Observations with full metadata & data provenance tags
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                <ShieldCheck className="h-3 w-3 mr-1 inline" />
                Synthetic Synthea Data Only
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Patient Selector */}
            <div className="flex flex-wrap gap-2">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    p.id === selectedPatient?.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {p.name} ({p.id})
                </button>
              ))}
            </div>

            <Button
              onClick={handleFetchBundle}
              disabled={loading}
              className="text-xs space-x-2 shrink-0"
            >
              <FileJson className="h-4 w-4" />
              <span>{loading ? 'Fetching...' : `Load ${selectedPatient?.id} FHIR Bundle`}</span>
            </Button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standard LOINC Mapping Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Heart Rate</div>
          <div className="font-mono font-bold text-foreground mt-0.5">LOINC 8867-4</div>
          <div className="text-[10px] text-muted-foreground">beats/minute</div>
        </div>

        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Oxygen Saturation</div>
          <div className="font-mono font-bold text-foreground mt-0.5">LOINC 2708-6</div>
          <div className="text-[10px] text-muted-foreground">% SpO₂</div>
        </div>

        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Respiration Rate</div>
          <div className="font-mono font-bold text-foreground mt-0.5">LOINC 9279-1</div>
          <div className="text-[10px] text-muted-foreground">breaths/minute</div>
        </div>

        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Systolic BP</div>
          <div className="font-mono font-bold text-foreground mt-0.5">LOINC 8480-6</div>
          <div className="text-[10px] text-muted-foreground">mmHg</div>
        </div>

        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <div className="text-muted-foreground text-[10px] uppercase font-semibold">Body Temperature</div>
          <div className="font-mono font-bold text-foreground mt-0.5">LOINC 8310-5</div>
          <div className="text-[10px] text-muted-foreground">degrees Celsius</div>
        </div>
      </div>

      {/* JSON Viewer */}
      <Card>
        <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-semibold">
              FHIR R4 Bundle Payload {bundle?.total !== undefined ? `(${bundle.total} entries)` : ''}
            </CardTitle>
          </div>

          {bundle && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-7 text-xs space-x-1"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4 pt-2">
          {bundle ? (
            <div className="relative">
              <pre className="p-4 rounded-lg bg-slate-950 border border-border text-slate-100 font-mono text-xs overflow-auto max-h-[500px] leading-relaxed">
                {JSON.stringify(bundle, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Click "Load FHIR Bundle" above to fetch and inspect the live FHIR R4 Bundle for {selectedPatient?.name}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

