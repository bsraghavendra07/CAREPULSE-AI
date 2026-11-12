import React, { useState } from 'react';
import { X, UserCheck, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export default function SymptomCheckinModal({ patient, onClose, onSubmitted }) {
  const [breathlessness, setBreathlessness] = useState('none');
  const [fever, setFever] = useState(false);
  const [dizziness, setDizziness] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/patient/${patient.patient_id}/symptom-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breathlessness,
          fever,
          dizziness,
          notes
        })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          if (onSubmitted) onSubmitted();
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to submit symptom checkin:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Patient Symptom Check-In</h3>
              <p className="text-xs text-slate-400">{patient?.name} ({patient?.patient_id})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-white">Check-In Logged Successfully</h4>
            <p className="text-xs text-slate-400">Clinical monitoring model dynamically updated with your inputs.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Breathlessness / Dyspnea */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Are you experiencing any breathlessness?</label>
              <div className="grid grid-cols-4 gap-2">
                {['none', 'mild', 'moderate', 'severe'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setBreathlessness(level)}
                    className={`py-2 px-1 rounded-xl font-semibold capitalize border transition text-center ${
                      breathlessness === level
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox symptoms */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={fever}
                  onChange={(e) => setFever(e.target.checked)}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span className="text-slate-200 font-medium">Feeling feverish or chills today</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={dizziness}
                  onChange={(e) => setDizziness(e.target.checked)}
                  className="rounded text-teal-500 focus:ring-teal-400"
                />
                <span className="text-slate-200 font-medium">Experiencing dizziness or lightheadedness</span>
              </label>
            </div>

            {/* Free-text notes */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Additional recovery comments / observations:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Mild cough in morning, took prescribed inhaler at 8:00 AM..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Recording...' : 'Submit Daily Check-In'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
