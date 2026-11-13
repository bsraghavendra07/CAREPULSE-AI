import React, { useState } from 'react';
import {
  Users,
  Mail,
  Phone,
  Globe,
  Bell,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  AlertContact,
  AlertRole,
  NotificationLanguage,
  savePatientContacts,
} from '../../lib/multiChannelAlertEngine';

interface AlertContactsManagerProps {
  patientId: string;
  patientName: string;
  contacts: AlertContact[];
  onContactsChange: (updated: AlertContact[]) => void;
}

export function AlertContactsManager({
  patientId,
  patientName,
  contacts,
  onContactsChange,
}: AlertContactsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State for New/Editing Contact
  const [name, setName] = useState('');
  const [role, setRole] = useState<AlertRole>('Parent / Caregiver');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<NotificationLanguage>('Kannada');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setRole('Parent / Caregiver');
    setEmail('');
    setPhone('');
    setLanguage('Kannada');
    setEmailAlerts(true);
    setSmsAlerts(true);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartEdit = (contact: AlertContact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setRole(contact.role);
    setEmail(contact.email);
    setPhone(contact.phone);
    setLanguage(contact.language);
    setEmailAlerts(contact.emailAlerts);
    setSmsAlerts(contact.smsAlerts);
    setIsAdding(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    let updated: AlertContact[];
    if (editingId) {
      updated = contacts.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: name.trim(),
              role,
              email: email.trim(),
              phone: phone.trim() || '+91 98450 00000',
              language,
              emailAlerts,
              smsAlerts,
            }
          : c
      );
      setFeedbackMsg(`Updated alert contact "${name}".`);
    } else {
      const newContact: AlertContact = {
        id: `contact-${Date.now()}`,
        patientId,
        name: name.trim(),
        role,
        email: email.trim(),
        phone: phone.trim() || '+91 98450 00000',
        language,
        emailAlerts,
        smsAlerts,
      };
      updated = [...contacts, newContact];
      setFeedbackMsg(`Added alert contact "${name}".`);
    }

    onContactsChange(updated);
    savePatientContacts(patientId, updated);
    resetForm();
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    onContactsChange(updated);
    savePatientContacts(patientId, updated);
    setFeedbackMsg('Contact removed.');
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleToggleEmail = (contact: AlertContact) => {
    const updated = contacts.map((c) =>
      c.id === contact.id ? { ...c, emailAlerts: !c.emailAlerts } : c
    );
    onContactsChange(updated);
    savePatientContacts(patientId, updated);
  };

  const handleToggleSms = (contact: AlertContact) => {
    const updated = contacts.map((c) =>
      c.id === contact.id ? { ...c, smsAlerts: !c.smsAlerts } : c
    );
    onContactsChange(updated);
    savePatientContacts(patientId, updated);
  };

  const handleChangeLanguage = (contact: AlertContact, newLang: NotificationLanguage) => {
    const updated = contacts.map((c) =>
      c.id === contact.id ? { ...c, language: newLang } : c
    );
    onContactsChange(updated);
    savePatientContacts(patientId, updated);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 sm:p-7 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-[#00A896]" />
            <h3 className="text-lg font-black text-[#131E3A] tracking-tight">
              Alert Contacts
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F7F5] text-[#067A6E]">
              {contacts.length} Registered
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Registered family members and doctors receive automatic multi-channel clinical alerts.
          </p>
        </div>

        {/* Action Button */}
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="self-start sm:self-auto py-2 px-4 rounded-full bg-[#E6F7F5] hover:bg-[#D4F3EE] text-[#067A6E] font-bold text-xs flex items-center space-x-1.5 transition-colors border border-[#B2EBE4] shadow-2xs"
          >
            <Plus className="h-4 w-4 text-[#00A896]" />
            <span>Add Alert Contact</span>
          </button>
        )}
      </div>

      {/* ── FEEDBACK NOTIFICATION ── */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ── ADD / EDIT CONTACT FORM (INLINE) ── */}
      {isAdding && (
        <form
          onSubmit={handleSaveContact}
          className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-5 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#131E3A]">
              {editingId ? 'Edit Alert Contact' : 'Register New Alert Contact'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="text-[#94A3B8] hover:text-[#64748B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anitha Sharma"
                required
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs text-[#131E3A] focus:outline-none focus:border-[#00A896]"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AlertRole)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs text-[#131E3A] focus:outline-none focus:border-[#00A896]"
              >
                <option value="Parent / Caregiver">Parent / Caregiver</option>
                <option value="Doctor">Doctor</option>
                <option value="Emergency Contact">Emergency Contact</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Preferred Notification Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as NotificationLanguage)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs text-[#131E3A] focus:outline-none focus:border-[#00A896]"
              >
                <option value="English">English</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. anitha@example.com"
                required
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs text-[#131E3A] focus:outline-none focus:border-[#00A896]"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98450 12345"
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs text-[#131E3A] focus:outline-none focus:border-[#00A896]"
              />
            </div>

            {/* Alert Channel Toggles */}
            <div className="flex items-center space-x-6 pt-5">
              <label className="flex items-center space-x-2 text-xs font-semibold text-[#334155] cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#00A896] focus:ring-[#00A896]"
                />
                <span>Email Alerts</span>
              </label>
              <label className="flex items-center space-x-2 text-xs font-semibold text-[#334155] cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#00A896] focus:ring-[#00A896]"
                />
                <span>SMS Alerts</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="py-1.5 px-4 rounded-full border border-[#CBD5E1] bg-white text-xs font-semibold text-[#64748B] hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-1.5 px-5 rounded-full bg-[#00A896] hover:bg-[#008f80] text-white text-xs font-bold shadow-xs transition-colors"
            >
              {editingId ? 'Update Contact' : 'Register Contact'}
            </button>
          </div>
        </form>
      )}

      {/* ── REGISTERED CONTACTS LIST ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] bg-[#FAFDFD] hover:border-[#00A896]/40 transition-all flex flex-col justify-between space-y-4"
          >
            {/* Top: Role Badge & Name */}
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    contact.role === 'Parent / Caregiver'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : contact.role === 'Doctor'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                >
                  {contact.role}
                </span>

                {/* Edit & Delete actions */}
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(contact)}
                    title="Edit Contact"
                    className="p-1 text-[#94A3B8] hover:text-[#00A896] transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact.id)}
                    title="Delete Contact"
                    className="p-1 text-[#94A3B8] hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="text-sm font-bold text-[#131E3A] mt-2">
                {contact.name}
              </h4>

              {/* Contact Meta */}
              <div className="mt-2 space-y-1 text-xs text-[#64748B]">
                <div className="flex items-center space-x-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              </div>
            </div>

            {/* Bottom: Language Selector & Alert Switches */}
            <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
              {/* Preferred Language selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B] flex items-center space-x-1">
                  <Globe className="h-3.5 w-3.5 text-[#00A896]" />
                  <span>Language:</span>
                </span>
                <select
                  value={contact.language}
                  onChange={(e) =>
                    handleChangeLanguage(contact, e.target.value as NotificationLanguage)
                  }
                  className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-0.5 text-xs font-semibold text-[#131E3A] focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                </select>
              </div>

              {/* Notification Toggles */}
              <div className="flex items-center justify-between pt-1 text-xs">
                {/* Email Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleEmail(contact)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1 transition-all ${
                    contact.emailAlerts
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  <Bell className="h-3 w-3" />
                  <span>Email: {contact.emailAlerts ? 'ON' : 'OFF'}</span>
                </button>

                {/* SMS Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleSms(contact)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1 transition-all ${
                    contact.smsAlerts
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>SMS: {contact.smsAlerts ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

