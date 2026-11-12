import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchBillingSummary,
  fetchBillingInvoices,
  processBillingInvoice,
  InvoiceItem,
} from '../lib/api';
import {
  DollarSign,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  LogOut,
  Building2,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function AccountantBillingPage() {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, invData] = await Promise.all([
        fetchBillingSummary(),
        fetchBillingInvoices(),
      ]);
      setSummary(sumData);
      setInvoices(invData);
    } catch (err: any) {
      setError(err.message || 'Could not load hospital billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleProcessInvoice = async (invoiceId: string, action: string = 'PROCESSED') => {
    try {
      setProcessingId(invoiceId);
      setActionSuccess(null);
      await processBillingInvoice(invoiceId, action, 'Verified by hospital accountant');
      setActionSuccess(`Invoice ${invoiceId} marked as ${action}`);
      await loadBillingData();
    } catch (err: any) {
      setError(err.message || 'Failed to process invoice');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
    const matchesSearch =
      inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.service.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col selection:bg-[#00A896] selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-4">
            <CarePulseLogo size="sm" showText={true} showTagline={false} onClick={() => navigate('/billing')} />
            <span className="px-3 py-1 text-[11px] font-bold bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4] rounded-full">
              Financial & Billing Portal
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right pr-2">
              <p className="text-xs font-bold text-[#131E3A]">{staff?.name || 'Marcus Davis, CPA'}</p>
              <p className="text-[10px] text-[#64748B]">Role: {staff?.role || 'ACCOUNTANT'}</p>
            </div>
            <button
              onClick={loadBillingData}
              className="p-2 text-[#64748B] hover:text-[#00A896] hover:bg-[#E6F7F5] rounded-full transition-colors border border-[#E2E8F0]"
              title="Refresh Billing Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E6F7F5] border border-[#B2EBE4] text-xs font-semibold text-[#067A6E]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00A896]" />
              <span>Financial Isolation Active</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 w-full">
        
        {/* Banner */}
        <div className="bg-white rounded-3xl border border-[#CCFBF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#131E3A] tracking-tight">
              Hospital Telemetry Billing & Claims
            </h1>
            <p className="text-sm text-[#64748B]">
              Reconcile patient telemetry subscriptions, insurance claims, and continuous sensor billing.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#067A6E] bg-[#E6F7F5] px-3.5 py-2 rounded-full border border-[#B2EBE4]">
            <CheckCircle2 className="h-4 w-4 text-[#00A896]" />
            <span>Claims Approval Rate: {summary?.claims_approval_rate || '94.8%'}</span>
          </div>
        </div>

        {/* Action / Error Banner */}
        {actionSuccess && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center space-x-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center space-x-2 font-medium">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Total Telemetry Billed</span>
              <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#131E3A]">
              ${summary?.total_billed ? Number(summary.total_billed).toLocaleString() : '7,100.00'}
            </div>
            <span className="text-[11px] font-medium text-[#64748B]">
              Active across {summary?.active_monitored_patients || 5} patients
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Insurance Reimbursed</span>
              <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#131E3A]">
              ${summary?.total_insurance_reimbursement ? Number(summary.total_insurance_reimbursement).toLocaleString() : '1,200.00'}
            </div>
            <span className="text-[11px] font-bold text-[#067A6E]">
              Settled by commercial & Medicare
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Pending Claims Value</span>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#131E3A]">
              ${summary?.pending_claims_value ? Number(summary.pending_claims_value).toLocaleString() : '4,900.00'}
            </div>
            <span className="text-[11px] font-bold text-amber-700">
              Awaiting payer adjudication
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Patient Co-Pay Due</span>
              <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#131E3A]">
              ${summary?.patient_co_pay_receivable ? Number(summary.patient_co_pay_receivable).toLocaleString() : '800.00'}
            </div>
            <span className="text-[11px] font-medium text-[#64748B]">
              Direct patient copays
            </span>
          </div>

        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-3xl border border-[#CCFBF1] p-6 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#131E3A] tracking-tight flex items-center space-x-2">
                <FileText className="h-5 w-5 text-[#00A896]" />
                <span>Patient Telemetry Invoices</span>
              </h2>
              <p className="text-xs text-[#64748B]">Review, submit claims, and reconcile hospital records</p>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="h-4 w-4 text-[#94A3B8] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice or patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3.5 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs text-[#131E3A] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="py-1.5 px-3 rounded-full border border-[#E2E8F0] bg-white text-xs text-[#131E3A] focus:border-[#00A896] focus:outline-none focus:ring-1 focus:ring-[#00A896]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PROCESSED">Processed</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E6F7F5] text-[#131E3A] font-bold border-y border-[#B2EBE4]">
                <tr>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Service Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Insurance Covered</th>
                  <th className="py-3 px-4">Patient Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'PAID' || inv.status === 'PROCESSED';
                  const isApproved = inv.status === 'APPROVED';
                  return (
                    <tr key={inv.invoice_id} className="hover:bg-[#F4FBF9] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#131E3A]">
                        {inv.invoice_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#131E3A] block">{inv.patient_name}</span>
                        <span className="text-[11px] text-[#64748B]">#{inv.patient_id}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] max-w-xs truncate">
                        {inv.service}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#131E3A]">
                        ${inv.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-[#067A6E] font-bold">
                        ${inv.insurance_covered.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        ${inv.patient_due.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            isPaid
                              ? 'bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4]'
                              : isApproved
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {inv.status === 'PENDING' ? (
                          <button
                            onClick={() => handleProcessInvoice(inv.invoice_id, 'PROCESSED')}
                            disabled={processingId === inv.invoice_id}
                            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#00D2C4] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <span>{processingId === inv.invoice_id ? 'Processing...' : 'Process Claim'}</span>
                            <span>&rarr;</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#64748B] font-semibold italic">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#E2E8F0] py-4 text-center text-xs text-[#64748B]">
        <p>&copy; {new Date().getFullYear()} CarePulse Hospital Administration & Financial Accounting.</p>
      </footer>
    </div>
  );
}
