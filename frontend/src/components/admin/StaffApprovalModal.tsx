import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  Hospital,
  Mail,
  BadgeCheck,
  Phone,
  AlertCircle,
  Building,
} from 'lucide-react';
import {
  fetchPendingStaff,
  fetchAllStaff,
  approveStaff,
  rejectStaff,
  StaffUserRecord,
} from '../../lib/api';

interface StaffApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffUpdated?: () => void;
}

export function StaffApprovalModal({ isOpen, onClose, onStaffUpdated }: StaffApprovalModalProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'roster'>('pending');
  const [pendingList, setPendingList] = useState<StaffUserRecord[]>([]);
  const [allStaffList, setAllStaffList] = useState<StaffUserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected roles per pending user UID: uid -> role
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  // Department assignments per user UID
  const [deptAssignments, setDeptAssignments] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [pending, all] = await Promise.all([
        fetchPendingStaff(),
        fetchAllStaff(),
      ]);
      setPendingList(pending);
      setAllStaffList(all);

      // Pre-fill role assignments default to DOCTOR
      const roles: Record<string, string> = {};
      const depts: Record<string, string> = {};
      pending.forEach((p) => {
        roles[p.uid] = 'DOCTOR';
        depts[p.uid] = 'Post-Discharge Ward 4B';
      });
      setRoleAssignments((prev) => ({ ...roles, ...prev }));
      setDeptAssignments((prev) => ({ ...depts, ...prev }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load staff records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleApprove = async (uid: string) => {
    setActionLoading(uid);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const assignedRole = roleAssignments[uid] || 'DOCTOR';
      const assignedDept = deptAssignments[uid] || 'Cardiology & Post-Discharge';
      const res = await approveStaff(uid, assignedRole, assignedDept);
      setSuccessMsg(res.message || 'Staff member approved successfully.');
      await loadData();
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve staff member.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (uid: string) => {
    setActionLoading(uid);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await rejectStaff(uid);
      setSuccessMsg(res.message || 'Staff member registration rejected.');
      await loadData();
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject staff member.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#E5E7EB] bg-white shadow-sm text-[#111827] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white/70">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D9F0FF] text-[#4A90E2] border border-[#4A90E2]/30 text-[#4A90E2]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#111827]">Hospital Staff Management</h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                  {pendingList.length} Pending
                </span>
              </div>
              <p className="text-xs text-[#4B5563]">
                Review registrations, grant clinical access, and assign staff roles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-[#F0F7FF]/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-[#E5E7EB] bg-white/30 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'pending'
                ? 'border-[#4A90E2] text-[#4A90E2]'
                : 'border-transparent text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Pending Approvals ({pendingList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'roster'
                ? 'border-[#4A90E2] text-[#4A90E2]'
                : 'border-transparent text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff Roster ({allStaffList.length})</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mx-6 mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 rounded-xl border border-[#4A90E2]/30 bg-[#D9F0FF] text-[#4A90E2] p-3 text-xs text-[#4A90E2] flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4A90E2]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-[#4B5563] text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-[#4A90E2]" />
              <span>Loading staff directory...</span>
            </div>
          ) : activeTab === 'pending' ? (
            pendingList.length === 0 ? (
              <div className="py-12 text-center text-[#4B5563] text-xs space-y-2">
                <CheckCircle2 className="h-8 w-8 text-[#4A90E2] mx-auto opacity-80" />
                <p className="font-semibold text-[#111827]">No Pending Registrations</p>
                <p className="text-[11px] text-[#4B5563]">
                  All hospital staff registrations have been reviewed and approved.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((user) => (
                  <div
                    key={user.uid}
                    className="rounded-xl border border-[#1d3145] bg-[#0a1624] p-4 transition-all hover:border-[#4A90E2]/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-[#111827]">{user.full_name}</h3>
                          <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-mono border border-amber-500/30">
                            PENDING_APPROVAL
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4B5563]">
                          <span className="flex items-center space-x-1">
                            <Hospital className="h-3.5 w-3.5 text-[#4B5563]" />
                            <span>{user.hospital_name}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Mail className="h-3.5 w-3.5 text-[#4B5563]" />
                            <span>{user.email}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <BadgeCheck className="h-3.5 w-3.5 text-[#4B5563]" />
                            <span>{user.employee_id}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3.5 w-3.5 text-[#4B5563]" />
                            <span>{user.phone_number}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-[#4B5563] shrink-0">
                        Registered:{' '}
                        {new Date(user.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Role & Department Selection */}
                    <div className="pt-2 border-t border-[#152536] flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-[#4B5563] font-medium">Assign Role:</span>
                          <select
                            value={roleAssignments[user.uid] || 'DOCTOR'}
                            onChange={(e) =>
                              setRoleAssignments({
                                ...roleAssignments,
                                [user.uid]: e.target.value,
                              })
                            }
                            className="rounded-lg border border-[#1f364d] bg-[#07111c] px-3 py-1.5 text-xs text-[#111827] font-semibold focus:border-[#4A90E2] focus:outline-none"
                          >
                            <option value="DOCTOR">DOCTOR (Physician)</option>
                            <option value="NURSE">NURSE (Clinical Nursing)</option>
                            <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN (Full Admin)</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-[#4B5563] font-medium">Department:</span>
                          <input
                            type="text"
                            value={deptAssignments[user.uid] || 'Post-Discharge Ward 4B'}
                            onChange={(e) =>
                              setDeptAssignments({
                                ...deptAssignments,
                                [user.uid]: e.target.value,
                              })
                            }
                            placeholder="Clinical Department"
                            className="rounded-lg border border-[#1f364d] bg-[#07111c] px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#4A90E2] focus:outline-none w-44"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          disabled={actionLoading === user.uid}
                          onClick={() => handleReject(user.uid)}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === user.uid}
                          onClick={() => handleApprove(user.uid)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#4A90E2] hover:bg-[#00D69A] text-slate-950 text-xs font-bold shadow-md shadow-[#4A90E2]/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === user.uid ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Approve Staff</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Staff Roster Tab */
            <div className="space-y-2">
              <div className="rounded-xl border border-[#1d3145] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#08121d] text-[#4B5563] font-semibold border-b border-[#1d3145]">
                    <tr>
                      <th className="py-2.5 px-4">Staff Member</th>
                      <th className="py-2.5 px-4">Hospital / ID</th>
                      <th className="py-2.5 px-4">Assigned Role</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#152536]">
                    {allStaffList.map((st) => (
                      <tr key={st.uid} className="hover:bg-[#0a1827]/60">
                        <td className="py-3 px-4 font-semibold text-[#111827]">
                          <div>{st.full_name}</div>
                          <div className="text-[11px] text-[#4B5563] font-normal">{st.email}</div>
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          <div>{st.hospital_name}</div>
                          <div className="text-[10px] font-mono text-[#4B5563]">{st.employee_id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              st.role === 'HOSPITAL_ADMIN'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : st.role === 'DOCTOR'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : st.role === 'NURSE'
                                ? 'bg-[#D9F0FF] text-[#4A90E2] text-[#4A90E2] border border-[#4A90E2]/30'
                                : 'bg-slate-700 text-[#4B5563]'
                            }`}
                          >
                            {st.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">{st.department || 'Clinical Care'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              st.status === 'APPROVED'
                                ? 'text-[#4A90E2]'
                                : st.status === 'PENDING_APPROVAL'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            ● {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-white/70 flex items-center justify-between text-xs text-[#4B5563]">
          <div className="flex items-center space-x-1.5">
            <Building className="h-4 w-4 text-[#4A90E2]" />
            <span>CarePulse Enterprise Hospital Staff Directory</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#122233] text-[#111827] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffApprovalModal;

