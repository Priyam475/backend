import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, Edit2, Search, UserCheck, UserX, Eye, ArrowLeft, Mail, Phone, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import type { Profile, Role, UserRole } from '@/types/rbac';
import { traderRbacApi } from '@/services/api';

type ProfileWithRoles = Profile & { roles: string[]; mappingActive?: boolean };

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState<ProfileWithRoles | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formMobileError, setFormMobileError] = useState('');
  const [formEmailError, setFormEmailError] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [restorePendingUserId, setRestorePendingUserId] = useState<string | null>(null);
  const [restorePendingMobile, setRestorePendingMobile] = useState<string | null>(null);
  const MOBILE_REGEX = /^\d{10}$/;
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const fetchProfiles = async (includeRemoved = false) => {
    try {
      setLoading(true);
      const [profilesData, userRoles, roles] = await Promise.all([
        traderRbacApi.listProfiles(includeRemoved),
        traderRbacApi.listUserRoles(),
        traderRbacApi.listRoles(),
      ]);

      const roleMap = new Map(roles.map((r: Role) => [r.id, r.name]));
      const userRolesMap = new Map<string, string[]>();
      (userRoles || []).forEach((ur: UserRole) => {
        const arr = userRolesMap.get(ur.user_id) || [];
        arr.push(roleMap.get(ur.role_id) || 'Unknown');
        userRolesMap.set(ur.user_id, arr);
      });

      setProfiles((profilesData || []).map((p) => ({
        ...p,
        roles: userRolesMap.get(p.id) || [],
      })) as ProfileWithRoles[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch with includeRemoved so we have accurate count for "Show removed users"
    fetchProfiles(true);
  }, []);

  const openCreate = () => {
    setEditingProfile(null);
    setFormName(''); setFormEmail(''); setFormMobile(''); setFormPassword(''); setFormMobileError(''); setFormEmailError('');
    setDialogOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormName(profile.full_name);
    setFormEmail(profile.email);
    setFormMobile(profile.mobile || '');
    setFormMobileError('');
    setFormEmailError('');
    setFormPassword('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) { toast.error('Name and email are required'); return; }

    const emailTrimmed = formEmail.trim();
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setFormEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    setFormEmailError('');

    const mobileTrimmed = formMobile.trim();
    if (mobileTrimmed && !MOBILE_REGEX.test(mobileTrimmed)) {
      setFormMobileError('Mobile must be exactly 10 digits (digits only)');
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setFormMobileError('');
    setSaving(true);
    try {
      if (editingProfile) {
        await traderRbacApi.updateProfile(editingProfile.id, {
          full_name: formName.trim(),
          email: formEmail.trim(),
          mobile: mobileTrimmed || null,
        });
        toast.success('User updated');
      } else {
        if (!formPassword || formPassword.length < 6) {
          toast.error('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await traderRbacApi.createProfile({
          full_name: formName.trim(),
          email: formEmail.trim(),
          mobile: mobileTrimmed || null,
          password: formPassword,
        });
        toast.success('User created successfully');
      }
      setDialogOpen(false);
      fetchProfiles(true);
    } catch (error: any) {
      const msg = error?.message || '';
      const isRestoreCase = msg.includes('previously removed') || msg.includes('usermobileexistsinactive');
      if (!editingProfile && isRestoreCase && mobileTrimmed) {
        const restoredUser = await traderRbacApi.getProfileByMobile(mobileTrimmed);
        if (restoredUser) {
          setRestorePendingUserId(restoredUser.id);
          setRestorePendingMobile(mobileTrimmed);
          return;
        }
      }
      console.error(error);
      // Map backend errors to user-friendly messages
      let userMsg = 'Failed to save user';
      if (msg.includes('emailinuse') || (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('already in use'))) {
        userMsg = 'This email is already in use.';
      } else if (msg.includes('mobileinuse') || (msg.toLowerCase().includes('mobile') && msg.toLowerCase().includes('already in use'))) {
        userMsg = 'This mobile number is already in use.';
      } else if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) {
        userMsg = 'Please enter a valid email address.';
        setFormEmailError('Please enter a valid email address');
      } else if (msg.includes('previously removed') || msg.includes('usermobileexistsinactive')) {
        userMsg = msg; // Keep for restore flow
      } else if (msg && msg.length < 120 && !msg.includes('Exception') && !msg.includes('at ')) {
        userMsg = msg;
      }
      toast.error(userMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreFromCreate = async () => {
    if (!restorePendingUserId) return;
    try {
      await traderRbacApi.restoreProfile(restorePendingUserId);
      toast.success('User restored successfully');
      setRestorePendingUserId(null);
      setRestorePendingMobile(null);
      setDialogOpen(false);
      fetchProfiles(true);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to restore user');
    }
  };

  const toggleStatus = async (profile: Profile) => {
    const newStatus = profile.status === 'active' ? 'inactive' : 'active';
    try {
      await traderRbacApi.setProfileStatus(profile.id, newStatus);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchProfiles(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (profileId: string) => {
    try {
      await traderRbacApi.deleteProfile(profileId);
      toast.success('User removed from this organisation. You can restore them later.');
      setDeleteConfirm(null);
      fetchProfiles(true);
    } catch (error: any) {
      const msg = error?.message || 'Failed to remove user';
      if (msg.includes('already been removed') || msg.includes('useralreadyremoved')) {
        toast.error('This user has already been removed.');
      } else {
        toast.error(msg);
      }
      setDeleteConfirm(null);
    }
  };

  const handleRestore = async (profileId: string) => {
    try {
      await traderRbacApi.restoreProfile(profileId);
      toast.success('User restored successfully');
      fetchProfiles(true);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to restore user');
    }
  };

  const activeProfiles = profiles.filter(p => p.mappingActive !== false);
  const removedProfiles = profiles.filter(p => p.mappingActive === false);
  const filtered = activeProfiles.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const avatarGradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      <div className="px-4 md:px-8 pt-4 lg:pt-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} aria-label="Back to settings" className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass flex items-center justify-center hover:bg-muted/50 transition-colors border border-border/30">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-white/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Create, edit, and manage system users</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create</span> User</Button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-3 flex-wrap">
          <div className="glass-card rounded-xl px-4 py-2.5 border border-border/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <span className="text-xs font-semibold text-foreground">{activeProfiles.length}</span>
            <span className="text-xs text-muted-foreground">In organisation</span>
          </div>
          <div className="glass-card rounded-xl px-4 py-2.5 border border-border/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span className="text-xs font-semibold text-foreground">{removedProfiles.length}</span>
            <span className="text-xs text-muted-foreground">Removed</span>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 glass border-border/30" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-foreground">No users found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block rounded-2xl border border-border/40 overflow-hidden glass-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-muted/40 to-muted/20">
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">User</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">Email</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">Roles</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-t border-border/20 hover:bg-muted/15 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md border border-white/20', avatarGradients[i % avatarGradients.length])}>
                              <span className="text-xs font-bold text-white">{p.full_name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{p.full_name || 'Unnamed'}</p>
                              {p.mobile && <p className="text-[10px] text-muted-foreground">{p.mobile}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{p.email}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1 flex-wrap">
                            {p.roles.length ? p.roles.map(r => (
                              <Badge key={r} variant="secondary" className="text-[10px] capitalize bg-primary/10 text-primary border border-primary/15">{r}</Badge>
                            )) : <span className="text-xs text-muted-foreground italic">No roles</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => toggleStatus(p)} className="inline-flex items-center gap-1.5" aria-label="Toggle status">
                            {p.status === 'active' ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 gap-1 border border-emerald-500/20"><UserCheck className="w-3 h-3" /> Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 gap-1 border border-red-500/15"><UserX className="w-3 h-3" /> Inactive</Badge>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setViewDialog(p)} aria-label="View user" className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-muted/50 transition-colors border border-border/20">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => openEdit(p)} aria-label="Edit user" className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors border border-primary/15">
                              <Edit2 className="w-3.5 h-3.5 text-primary" />
                            </button>
                            <button onClick={() => setDeleteConfirm(p.id)} aria-label="Remove user" className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors border border-destructive/15">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-2xl p-4 border border-border/40 relative overflow-hidden"
                >
                  <div className={cn('absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-15 bg-gradient-to-br pointer-events-none', avatarGradients[i % avatarGradients.length])} />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md border border-white/20', avatarGradients[i % avatarGradients.length])}>
                        <span className="text-sm font-bold text-white">{p.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{p.full_name || 'Unnamed'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                      </div>
                      <button onClick={() => toggleStatus(p)} aria-label="Toggle status">
                        {p.status === 'active' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] border border-emerald-500/20"><UserCheck className="w-3 h-3" /></Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-[10px] border border-red-500/15"><UserX className="w-3 h-3" /></Badge>
                        )}
                      </button>
                    </div>

                    <div className="flex gap-1 flex-wrap mb-3 min-h-[20px]">
                      {p.roles.length ? p.roles.map(r => (
                        <Badge key={r} variant="secondary" className="text-[10px] capitalize bg-primary/10 text-primary">{r}</Badge>
                      )) : <span className="text-[10px] text-muted-foreground italic">No roles</span>}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewDialog(p)} className="flex-1 gap-1.5 h-9">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="flex-1 gap-1.5 h-9">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(p.id)} className="gap-1.5 h-9 text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md border border-white/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <DialogTitle>{editingProfile ? 'Edit User' : 'Create New User'}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Full Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="John Doe" className="mt-1.5 glass border-border/30" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Email *</Label>
                <Input type="email" value={formEmail} onChange={e => { setFormEmail(e.target.value); setFormEmailError(''); }} placeholder="john@example.com" className="mt-1.5 glass border-border/30" disabled={!!editingProfile} />
                {formEmailError && <p className="text-xs text-destructive mt-1">{formEmailError}</p>}
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Mobile</Label>
                <Input
                  value={formMobile}
                  onChange={e => setFormMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  inputMode="numeric"
                  className="mt-1.5 glass border-border/30"
                />
                {formMobileError && <p className="text-xs text-destructive mt-1">{formMobileError}</p>}
              </div>
              {!editingProfile && (
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Password *</Label>
                  <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1.5 glass border-border/30" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="shadow-lg shadow-primary/20">
                {saving ? 'Saving...' : editingProfile ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
            {viewDialog && (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg border border-white/20">
                    <span className="text-xl font-bold text-white">{viewDialog.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">{viewDialog.full_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {viewDialog.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl glass border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><Phone className="w-3 h-3" /> Mobile</p>
                    <p className="text-sm font-medium text-foreground mt-1">{viewDialog.mobile || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl glass border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status</p>
                    <p className={cn("text-sm font-bold capitalize mt-1", viewDialog.status === 'active' ? 'text-emerald-600' : 'text-red-500')}>{viewDialog.status}</p>
                  </div>
                  <div className="p-3 rounded-xl glass border border-border/30 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1.5">Roles</p>
                    <div className="flex gap-1 flex-wrap">
                      {viewDialog.roles.length ? viewDialog.roles.map(r => (
                        <Badge key={r} variant="secondary" className="capitalize bg-primary/10 text-primary border border-primary/15">{r}</Badge>
                      )) : <span className="text-sm text-muted-foreground italic">No roles assigned</span>}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl glass border border-border/30 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Joined</p>
                    <p className="text-sm font-medium text-foreground mt-1">{new Date(viewDialog.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDeleteDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
          title="Remove user?"
          description={
            deleteConfirm
              ? `This will remove "${profiles.find(p => p.id === deleteConfirm)?.full_name || 'this user'}" from your organisation. They can be restored later from the removed users list.`
              : 'This will remove the user from your organisation. They can be restored later.'
          }
          confirmLabel="Remove"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        />

        {/* Restore previously removed user (create failed with same mobile) */}
        <Dialog open={!!restorePendingUserId} onOpenChange={(open) => { if (!open) { setRestorePendingUserId(null); setRestorePendingMobile(null); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle>Restore user?</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              A user with mobile <strong>{restorePendingMobile}</strong> was previously removed from this organisation. Restore them instead of creating a new one?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRestorePendingUserId(null); setRestorePendingMobile(null); }}>Cancel</Button>
              <Button onClick={handleRestoreFromCreate}>Restore</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Show removed users */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowRemoved(!showRemoved)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            {showRemoved ? 'Hide' : 'Show'} removed users ({removedProfiles.length})
          </button>
          {showRemoved && removedProfiles.length > 0 && (
            <div className="rounded-2xl border border-border/40 overflow-hidden glass-card">
              <div className="px-4 py-2 bg-muted/20 border-b border-border/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Removed users — restore to add back</p>
              </div>
              <div className="divide-y divide-border/20">
                {removedProfiles.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex-shrink-0 flex items-center justify-center', avatarGradients[removedProfiles.indexOf(p) % avatarGradients.length])}>
                        <span className="text-xs font-bold text-white">{p.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{p.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRestore(p.id)} className="gap-1.5 shrink-0">
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default UserManagementPage;
