import { motion } from 'framer-motion';
import { Shield, Bell, Database, Globe, Palette, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsSections = [
  { icon: Shield, title: 'Security', desc: 'Authentication, roles, and access control', items: ['Two-factor authentication', 'Session timeout', 'Password policy'], gradient: 'from-blue-500 via-blue-400 to-cyan-400', glow: 'shadow-blue-500/20' },
  { icon: Bell, title: 'Notifications', desc: 'Email and push notification preferences', items: ['New trader alerts', 'System updates', 'Payment reminders'], gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', glow: 'shadow-violet-500/20' },
  { icon: Database, title: 'Data Management', desc: 'Backup, export, and data retention', items: ['Auto backup schedule', 'Export data', 'Purge old records'], gradient: 'from-amber-400 via-orange-500 to-rose-500', glow: 'shadow-amber-500/20' },
  { icon: Globe, title: 'Regional', desc: 'Language, currency, and timezone settings', items: ['Language: English', 'Currency: INR (₹)', 'Timezone: IST (UTC+5:30)'], gradient: 'from-emerald-400 via-green-500 to-teal-500', glow: 'shadow-emerald-500/20' },
  { icon: Palette, title: 'Appearance', desc: 'Theme and display preferences', items: ['Dark/Light mode', 'Compact view', 'Sidebar position'], gradient: 'from-pink-400 via-rose-500 to-red-500', glow: 'shadow-pink-500/20' },
];

const AdminSettingsPage = () => (
  <div className="space-y-6 relative">
    {/* Background gradient blobs */}
    <div className="fixed pointer-events-none z-0" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
      <div className="absolute top-0 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-blue-500/8 via-cyan-400/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-violet-500/7 via-purple-400/4 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-pink-400/6 to-transparent rounded-full blur-3xl" />
    </div>

    {/* Header */}
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <Cog className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure system-wide preferences</p>
      </div>
    </motion.div>

    {/* Settings Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
      {settingsSections.map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card rounded-2xl p-5 hover:shadow-elevated transition-all relative overflow-hidden border border-white/40 dark:border-white/10"
        >
          {/* Card corner glow */}
          <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-15 bg-gradient-to-br', section.gradient)} />
          <div className={cn('absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-10 bg-gradient-to-tr', section.gradient)} />
          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-4">
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0', section.gradient, section.glow)}>
                <section.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.desc}</p>
              </div>
            </div>
            <div className="space-y-2 pl-16">
              {section.items.map((item) => (
                <div key={item} className="flex items-center justify-between py-2.5 px-3 rounded-xl glass-card text-xs">
                  <span className="text-foreground">{item}</span>
                  <div className="w-9 h-5 rounded-full bg-primary/20 flex items-center px-0.5 cursor-pointer hover:bg-primary/30 transition-colors">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-accent shadow-sm ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default AdminSettingsPage;
