import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Store, Check, X, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { categoryApi } from '@/services/api';
import type { BusinessCategory } from '@/types/models';

const cardGradients = ['from-blue-500 via-blue-400 to-cyan-400','from-violet-500 via-purple-500 to-fuchsia-500','from-amber-400 via-orange-500 to-rose-500','from-emerald-400 via-green-500 to-teal-500','from-pink-400 via-rose-500 to-red-500','from-indigo-500 via-blue-500 to-cyan-500'];

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ category_name: '' });

  useEffect(() => { categoryApi.list().then(setCategories); }, []);

  const filtered = categories.filter(c => c.category_name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    const newCat: BusinessCategory = { category_id: crypto.randomUUID(), category_name: form.category_name, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('mkt_categories', JSON.stringify(updated));
    setForm({ category_name: '' });
    setShowAdd(false);
  };

  const handleUpdate = (id: string) => {
    const updated = categories.map(c => c.category_id === id ? { ...c, category_name: form.category_name, updated_at: new Date().toISOString() } : c);
    setCategories(updated);
    localStorage.setItem('mkt_categories', JSON.stringify(updated));
    setEditId(null);
    setForm({ category_name: '' });
  };

  const handleDelete = (id: string) => {
    const updated = categories.filter(c => c.category_id !== id);
    setCategories(updated);
    localStorage.setItem('mkt_categories', JSON.stringify(updated));
  };

  const handleToggle = (id: string) => {
    const updated = categories.map(c => c.category_id === id ? { ...c, is_active: !c.is_active, updated_at: new Date().toISOString() } : c);
    setCategories(updated);
    localStorage.setItem('mkt_categories', JSON.stringify(updated));
  };

  return (
    <div className="space-y-5 relative">
      <div className="fixed pointer-events-none z-0" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-bl from-violet-500/8 via-fuchsia-400/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-400/7 via-teal-400/4 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Business Categories</h1>
            <p className="text-sm text-muted-foreground">Master list managed by Super Admin</p>
          </div>
        </div>
        <Button onClick={() => { setShowAdd(true); setForm({ category_name: '' }); }} className="bg-gradient-to-r from-primary to-accent text-white rounded-xl h-10 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative max-w-sm z-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {filtered.map((cat, i) => {
          const grad = cardGradients[i % cardGradients.length];
          return (
            <motion.div key={cat.category_id} initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }} whileHover={{ scale: 1.02, y: -2 }}
              className={cn('glass-card rounded-2xl p-5 hover:shadow-elevated transition-all group relative overflow-hidden border border-white/40 dark:border-white/10', !cat.is_active && 'opacity-50')}>
              <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-15 bg-gradient-to-br', grad)} />
              <div className="relative z-10">
                {editId === cat.category_id ? (
                  <div className="space-y-3">
                    <Input value={form.category_name} onChange={e => setForm(p => ({ ...p, category_name: e.target.value }))} placeholder="Category name" className="h-10 rounded-xl" />
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdate(cat.category_id)} size="sm" className="bg-success text-white rounded-lg"><Check className="w-3 h-3" /></Button>
                      <Button onClick={() => setEditId(null)} size="sm" variant="outline" className="rounded-lg"><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', grad)}>
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditId(cat.category_id); setForm({ category_name: cat.category_name }); }} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cat.category_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-1">{cat.category_name}</h3>
                    <div className="flex items-center justify-between">
                      <span className={cn('px-2 py-1 rounded-lg text-[10px] font-semibold', cat.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => handleToggle(cat.category_id)} className="text-[10px] text-primary hover:underline">
                        {cat.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-md glass-card rounded-2xl p-6 shadow-elevated border border-white/30 dark:border-white/10 space-y-4 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Add Business Category</h3>
                </div>
                <Input placeholder="Category Name (e.g., Vegetables)" value={form.category_name} onChange={e => setForm(p => ({ ...p, category_name: e.target.value }))} className="h-12 rounded-xl" />
                <div className="flex gap-3">
                  <Button onClick={handleAdd} disabled={!form.category_name} className="flex-1 bg-gradient-to-r from-primary to-accent text-white rounded-xl h-11">Add Category</Button>
                  <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1 rounded-xl h-11">Cancel</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategoriesPage;
