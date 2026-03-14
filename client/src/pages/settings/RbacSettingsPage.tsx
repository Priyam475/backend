import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, UserCog, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/permissions';
import ForbiddenPage from '@/components/ForbiddenPage';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';

const rbacCards = [
  {
    icon: Shield,
    title: 'Role Management',
    desc: 'Create roles, define module-level & feature-level permissions',
    path: '/settings/roles',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/20',
  },
  {
    icon: Users,
    title: 'User Management',
    desc: 'Create, edit, activate/deactivate users',
    path: '/settings/users',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
  },
  {
    icon: UserCog,
    title: 'Role Allocation',
    desc: 'Assign and manage roles for users',
    path: '/settings/role-allocation',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
  },
];

const RbacSettingsPage = () => {
  const navigate = useNavigate();
  const { canAccessModule, can } = usePermissions();

  const canViewSettings = canAccessModule('Settings');
  const canManageRoles = can('Settings', 'Manage Roles');
  const canManageUsers = can('Settings', 'Manage Users');

  if (!canViewSettings) {
    return <ForbiddenPage moduleName="Settings" />;
  }

  const visibleCards = rbacCards.filter(card => {
    if (card.path === '/settings/roles' || card.path === '/settings/role-allocation') return canManageRoles;
    if (card.path === '/settings/users') return canManageUsers;
    return true;
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      <div className="px-4 md:px-8 pt-4 lg:pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">RBAC (Role-based Access Control)</h1>
            <p className="text-sm text-muted-foreground">Roles, users, and role allocation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card, i) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02, y: -3 }}
              onClick={() => navigate(card.path)}
              className="glass-card rounded-2xl p-6 text-left hover:shadow-elevated transition-all border border-border/50 group relative overflow-hidden"
            >
              <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-15 bg-gradient-to-br', card.gradient)} />
              <div className="relative z-10">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-4', card.gradient, card.glow)}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{card.desc}</p>
                <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                  Open <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default RbacSettingsPage;
