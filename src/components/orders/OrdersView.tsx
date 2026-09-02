import React, { useState } from 'react';
import { Receipt, Search, Download, RefreshCw, CheckCircle2, ShieldCheck, ExternalLink, RotateCcw, FileText, Printer } from 'lucide-react';
import { store } from '../../services/store';
import { billingService } from '../../services/billingService';
import { Order } from '../../types';

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(store.getOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleSimulateRefund = (orderId: string) => {
    if (window.confirm('Simulate 100% Stripe refund for this order?')) {
      store.refundOrder(orderId);
      setOrders(store.getOrders());
      setSelectedOrder(null);
    }
  };

  const handleReissueToken = (orderId: string) => {
    store.regenerateOrderToken(orderId);
    setOrders(store.getOrders());
    alert('Security download token re-generated with a fresh 48-hour expiration window.');
  };

  const filteredOrders = orders.filter(ord => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customer.email.toLowerCase().includes(q) ||
      ord.customer.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Orders & Digital Delivery Vault</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {orders.length} Verified Transactions
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Stripe webhooks, tokenized digital delivery, max download limits, and automated receipt emails.
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer name, email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Order ID & Date</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Products</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Downloads</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.map(ord => (
                <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-slate-200">{ord.orderNumber}</div>
                    <div className="text-[11px] text-slate-500">{new Date(ord.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{ord.customer.name}</div>
                    <div className="text-[11px] text-slate-400">{ord.customer.email}</div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="text-slate-200 truncate">{ord.items.map(i => i.productTitle).join(', ')}</div>
                    <div className="text-[10px] text-indigo-400">{ord.items.length} item(s)</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-white">€{ord.totalAmount}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Stripe OK</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {ord.downloadCount} / {ord.maxDownloads} downloads
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {ord.status === 'completed' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Completed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Refunded
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        const inv = billingService.generateInvoiceForOrder(ord);
                        billingService.printOrDownloadInvoice(inv);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 inline-flex items-center gap-1"
                      title="Imprimer Facture Conforme (PDF)"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Facture PDF</span>
                    </button>
                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                    >
                      Inspect Vault
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Vault Inspector Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Order Vault & Token Inspector</h3>
                <p className="text-slate-400">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <strong className="text-white">{selectedOrder.customer.name} ({selectedOrder.customer.email})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stripe Payment Intent:</span>
                <span className="font-mono text-indigo-400">{selectedOrder.stripeSessionId || 'pi_live_99814421'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Security Access Token:</span>
                <span className="font-mono text-emerald-400 truncate max-w-xs">{selectedOrder.downloadToken}</span>
              </div>
            </div>

            {/* Delivery logs */}
            <div>
              <div className="font-bold text-slate-300 mb-2">Download Audit Trail ({(selectedOrder.deliveryLogs || []).length})</div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400">
                {(selectedOrder.deliveryLogs || []).map((log, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{new Date(log.timestamp).toLocaleTimeString()} - IP: {log.ipAddress}</span>
                    <span className="text-emerald-400">HTTP 200 OK</span>
                  </div>
                ))}
                {(!selectedOrder.deliveryLogs || selectedOrder.deliveryLogs.length === 0) && (
                  <div className="text-slate-500 italic">Token généré et actif ({selectedOrder.downloadCount} / {selectedOrder.maxDownloads} téléchargements consommés).</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {selectedOrder.paymentStatus !== 'refunded' && (
                  <button
                    onClick={() => handleSimulateRefund(selectedOrder.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-xs font-semibold"
                  >
                    Rembourser
                  </button>
                )}
                <button
                  onClick={() => {
                    const inv = billingService.generateInvoiceForOrder(selectedOrder);
                    billingService.printOrDownloadInvoice(inv);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Facture Conforme</span>
                </button>
              </div>
              <button
                onClick={() => handleReissueToken(selectedOrder.id)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Re-generate 48h Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
