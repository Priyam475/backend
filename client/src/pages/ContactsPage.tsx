import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Plus, Search, Phone, User as UserIcon, Users, BookOpen, AlertCircle, Eye, Pencil, Trash2, X, MapPin } from 'lucide-react';
import { useDesktopMode } from '@/hooks/use-desktop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { contactApi } from '@/services/api';
import type { Contact } from '@/types/models';
import { toast } from 'sonner';

function createLedgerForContact(contact: Contact) {
  const ledgers = JSON.parse(localStorage.getItem('mkt_ledgers') || '[]');
  const exists = ledgers.find((l: any) => l.contact_id === contact.contact_id);
  if (!exists) {
    ledgers.push({
      ledger_id: crypto.randomUUID(),
      trader_id: contact.trader_id || '',
      contact_id: contact.contact_id,
      ledger_name: `${contact.name} — Ledger`,
      account_type: 'ASSET',
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('mkt_ledgers', JSON.stringify(ledgers));
  }
}

type ModalMode = 'add' | 'view' | 'edit' | null;

const ContactsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', mark: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadContacts = () => { contactApi.list().then(setContacts); };
  useEffect(() => { loadContacts(); }, []);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.mark?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setFormData({ name: '', phone: '', mark: '', address: '' });
    setErrors({});
    setModalMode('add');
  };

  const openView = (c: Contact) => {
    setSelectedContact(c);
    setModalMode('view');
  };

  const openEdit = (c: Contact) => {
    setSelectedContact(c);
    setFormData({ name: c.name, phone: c.phone, mark: c.mark || '', address: c.address || '' });
    setErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedContact(null);
    setErrors({});
  };

  const validateForm = (isEdit = false): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      errs.phone = 'Enter a valid 10-digit mobile number';
    } else if (contacts.some(c => c.phone === formData.phone.trim() && (!isEdit || c.contact_id !== selectedContact?.contact_id))) {
      errs.phone = 'This phone number is already registered';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    try {
      const created = await contactApi.create({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        mark: formData.mark.trim().toUpperCase(),
        address: formData.address.trim(),
        trader_id: '',
      });
      createLedgerForContact(created);
      setContacts(prev => [...prev, created]);
      closeModal();
      toast.success(`✅ ${created.name} registered with ledger created`);
    } catch (err) {
      console.error('Add contact error:', err);
      toast.error('Failed to register contact');
    }
  };

  const handleEdit = async () => {
    if (!selectedContact || !validateForm(true)) return;
    try {
      const updated = await contactApi.update(selectedContact.contact_id, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        mark: formData.mark.trim().toUpperCase(),
        address: formData.address.trim(),
      });
      setContacts(prev => prev.map(c => c.contact_id === updated.contact_id ? updated : c));
      closeModal();
      toast.success(`✏️ ${updated.name} updated successfully`);
    } catch (err) {
      console.error('Edit contact error:', err);
      toast.error('Failed to update contact');
    }
  };

  const handleDelete = (contactId: string) => {
    try {
      const contact = contacts.find(c => c.contact_id === contactId);
      // Remove from localStorage
      const list = JSON.parse(localStorage.getItem('mkt_contacts') || '[]');
      const remaining = list.filter((c: any) => c.contact_id !== contactId);
      localStorage.setItem('mkt_contacts', JSON.stringify(remaining));
      // Also remove ledger
      const ledgers = JSON.parse(localStorage.getItem('mkt_ledgers') || '[]');
      const remainingLedgers = ledgers.filter((l: any) => l.contact_id !== contactId);
      localStorage.setItem('mkt_ledgers', JSON.stringify(remainingLedgers));
      // Update state
      setContacts(prev => prev.filter(c => c.contact_id !== contactId));
      setDeleteConfirm(null);
      toast.success(`🗑️ ${contact?.name || 'Contact'} deleted`);
    } catch (err) {
      console.error('Delete contact error:', err);
      toast.error('Failed to delete contact');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-emerald-50/20 dark:to-emerald-950/10 pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className="bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 pt-[max(2rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-3xl mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.2)_0%,transparent_40%)]" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i} className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
                style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
                animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
            ))}
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Contacts</h1>
                  <p className="text-white/70 text-xs">{contacts.length} contacts · Unified Registry</p>
                </div>
              </div>
              <button onClick={openAdd} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input ref={searchRef} placeholder="Search by name, phone, or mark…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Contact Registry</h3>
              <p className="text-xs text-muted-foreground">{contacts.length} contacts · Unified across all transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input ref={searchRef} placeholder="Search by name, phone, or mark…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50" />
            </div>
            <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all">
              <Plus className="w-4 h-4" /> Add Contact
            </button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className={cn("mb-3", isDesktop ? "px-8" : "px-4")}>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 px-3 py-2 flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            All entries are unified <strong>Contacts</strong>. Role (Seller/Buyer/Broker) is determined automatically by transaction participation.
          </p>
        </div>
      </div>

      {/* Desktop Table View */}
      {isDesktop ? (
        <div className="px-8">
          <div className="glass-card rounded-2xl overflow-hidden border border-border/30 shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
                  <th className="text-left px-5 py-3.5 font-bold text-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 font-bold text-foreground text-xs uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3.5 font-bold text-foreground text-xs uppercase tracking-wider">Mark</th>
                  <th className="text-left px-5 py-3.5 font-bold text-foreground text-xs uppercase tracking-wider">Address</th>
                  <th className="text-right px-5 py-3.5 font-bold text-foreground text-xs uppercase tracking-wider">Balance</th>
                  <th className="text-center px-5 py-3.5 font-bold text-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.contact_id} className={cn(
                    "border-t border-border/20 hover:bg-muted/40 transition-all cursor-default group",
                    i % 2 === 0 ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03]' : ''
                  )}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm text-white text-xs font-bold shrink-0">
                          {c.mark || c.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium">{c.phone}</td>
                    <td className="px-5 py-3.5">
                      {c.mark && <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/15">{c.mark}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs max-w-[200px] truncate">{c.address || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={cn('font-bold tabular-nums', (c.current_balance ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                        ₹{Math.abs(c.current_balance ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">{(c.current_balance ?? 0) >= 0 ? 'Dr' : 'Cr'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openView(c)} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(c.contact_id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center mx-auto mb-3 border border-emerald-500/15">
                        <UserIcon className="w-7 h-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-muted-foreground font-medium">No contacts found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Try a different search or add a new contact</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile Card View */
        <div className="px-4 space-y-2">
          {filtered.map((c, i) => (
            <motion.div key={c.contact_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card rounded-2xl p-3 group hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 relative overflow-hidden shrink-0">
                  <span className="text-white font-bold text-sm relative z-10">{c.mark || c.name?.charAt(0) || '?'}</span>
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{c.phone}</span>
                    {c.mark && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">{c.mark}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-sm font-semibold tabular-nums', (c.current_balance ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                    ₹{Math.abs(c.current_balance ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{(c.current_balance ?? 0) >= 0 ? 'Receivable' : 'Payable'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-[52px]">
                <button onClick={() => openView(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:shadow-md transition-all active:scale-95">
                  <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">View</span>
                </button>
                <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:shadow-md transition-all active:scale-95">
                  <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Edit</span>
                </button>
                <button onClick={() => setDeleteConfirm(c.contact_id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20 hover:shadow-md transition-all active:scale-95">
                  <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                  <span className="text-[11px] font-medium text-red-500 dark:text-red-400">Delete</span>
                </button>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <UserIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No contacts found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Tap + to register a new contact</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
            onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-card rounded-2xl p-5 shadow-2xl border border-border/50">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center text-foreground mb-1">Delete Contact?</h3>
              <p className="text-sm text-center text-muted-foreground mb-5">
                This will permanently remove <strong>{contacts.find(c => c.contact_id === deleteConfirm)?.name}</strong> and their ledger data.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 h-12 rounded-xl">Cancel</Button>
                <Button onClick={() => handleDelete(deleteConfirm)} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600">
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View / Add / Edit Bottom Sheet */}
      <AnimatePresence>
        {modalMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: 'spring', damping: 30 }}
              className="w-full max-w-lg rounded-t-3xl lg:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border border-border/30"
              style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
              
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-1 lg:hidden" />

              {/* VIEW MODE */}
              {modalMode === 'view' && selectedContact && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Contact Details</h3>
                    <button onClick={closeModal} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_50%)]" />
                    <div className="relative z-10 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                        <span className="text-2xl font-bold">{selectedContact.mark || selectedContact.name?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{selectedContact.name}</h2>
                        <div className="flex items-center gap-1.5 mt-1 text-white/80 text-sm">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedContact.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedContact.mark && (
                      <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mark / Alias</p>
                          <p className="text-sm font-semibold text-foreground">{selectedContact.mark}</p>
                        </div>
                      </div>
                    )}
                    {selectedContact.address && (
                      <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Address</p>
                          <p className="text-sm font-semibold text-foreground">{selectedContact.address}</p>
                        </div>
                      </div>
                    )}
                    <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border",
                        (selectedContact.current_balance ?? 0) >= 0
                          ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20"
                          : "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20"
                      )}>
                        <span className="text-sm font-bold">₹</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
                        <p className={cn("text-sm font-semibold", (selectedContact.current_balance ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                          ₹{Math.abs(selectedContact.current_balance ?? 0).toLocaleString()} {(selectedContact.current_balance ?? 0) >= 0 ? 'Receivable' : 'Payable'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => { const sc = selectedContact; closeModal(); setTimeout(() => openEdit(sc), 150); }}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20">
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button onClick={() => { const id = selectedContact.contact_id; closeModal(); setTimeout(() => setDeleteConfirm(id), 150); }}
                      variant="outline" className="flex-1 h-12 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </>
              )}

              {/* ADD / EDIT MODE */}
              {(modalMode === 'add' || modalMode === 'edit') && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-foreground">{modalMode === 'add' ? 'Register Contact' : 'Edit Contact'}</h3>
                    <button onClick={closeModal} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Full Name *</label>
                    <Input placeholder="e.g., Ramesh Kumar" value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className={cn("h-12 rounded-xl", errors.name && "border-destructive")} />
                    {errors.name && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Phone Number * <span className="text-emerald-500 font-normal">(Primary ID)</span></label>
                    <Input placeholder="e.g., 9876543210" value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      className={cn("h-12 rounded-xl", errors.phone && "border-destructive")}
                      type="tel" maxLength={10} />
                    {errors.phone && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Mark <span className="text-muted-foreground/60 font-normal">(Short Code)</span></label>
                    <Input placeholder="e.g., VT, ML, AB" value={formData.mark}
                      onChange={e => setFormData(p => ({ ...p, mark: e.target.value.toUpperCase().slice(0, 4) }))}
                      className="h-12 rounded-xl" maxLength={4} />
                    <p className="text-[10px] text-muted-foreground mt-1">Used for quick auto-complete in transaction screens</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Address</label>
                    <Input placeholder="e.g., Village Pune, Market Yard" value={formData.address}
                      onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                      className="h-12 rounded-xl" />
                  </div>

                  {modalMode === 'add' && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 px-3 py-2 flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">A financial ledger will be <strong>automatically created</strong> for this contact upon registration.</p>
                    </div>
                  )}

                  <Button onClick={modalMode === 'add' ? handleAdd : handleEdit}
                    className="w-full h-14 rounded-xl text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600">
                    {modalMode === 'add' ? 'Register Contact' : 'Save Changes'}
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default ContactsPage;
