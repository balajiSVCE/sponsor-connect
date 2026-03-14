import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, UserPlus, List, Phone, BarChart3, 
  Users, ClipboardList, LogOut, Trophy, Shield, MessageSquare, GitGraph, Copy
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/add-contact', icon: UserPlus, label: 'Add Contact' },
    { to: '/my-contacts', icon: List, label: 'My Contacts' },
    { to: '/all-contacts', icon: Users, label: 'All Contacts' },
    { to: '/call-list', icon: Phone, label: 'Call List' },
  ];

  const adminLinks = [
    { to: '/admin/contacts', icon: ClipboardList, label: 'All Contacts' },
    { to: '/admin/assign', icon: Users, label: 'Assign Calls' },
    { to: '/admin/allocations', icon: GitGraph, label: 'Allocations' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/admin/feedback', icon: MessageSquare, label: 'Call Feedback' },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive 
        ? 'bg-primary/20 text-primary neon-glow' 
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass border-r border-border/30 p-4 sticky top-0 h-screen">
        <div className="mb-6 px-4 pt-2">
          <h2 className="text-xl font-bold font-display gradient-text">SponsorHub</h2>
          <p className="text-xs text-muted-foreground mt-1">Event Sponsorship Manager</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-glass">
          {userLinks.map(link => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Shield className="w-3 h-3" />
                  Admin
                </div>
              </div>
              {adminLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={linkClass}>
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Always visible logout section */}
        <div className="border-t border-border/30 pt-3 mt-2 flex-shrink-0">
          <div className="px-4 mb-2">
            <p className="text-sm font-medium truncate">{profile?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display gradient-text">SponsorHub</h2>
          <MobileMenu 
            userLinks={userLinks} 
            adminLinks={isAdmin ? adminLinks : []} 
            onSignOut={handleSignOut} 
            profile={profile}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 lg:pt-8 pt-20 overflow-auto scrollbar-glass">
        {children}
      </main>
    </div>
  );
};

const MobileMenu: React.FC<{
  userLinks: { to: string; icon: any; label: string }[];
  adminLinks: { to: string; icon: any; label: string }[];
  onSignOut: () => void;
  profile: any;
  isAdmin: boolean;
}> = ({ userLinks, adminLinks, onSignOut, profile, isAdmin }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-muted/30">
        <div className="w-5 h-4 flex flex-col justify-between">
          <span className={`block h-0.5 bg-foreground transition-transform ${open ? 'rotate-45 translate-y-1.5' : ''}`} />
          <span className={`block h-0.5 bg-foreground transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 bg-foreground transition-transform ${open ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 glass-card p-4 space-y-1 animate-slide-up z-50 max-h-[80vh] overflow-y-auto scrollbar-glass">
          {profile && (
            <div className="px-3 py-2 mb-2 border-b border-border/30">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          )}
          {userLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`
              }
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
          {adminLinks.length > 0 && (
            <>
              <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase">Admin</div>
              {adminLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </>
          )}
          <button onClick={onSignOut} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full mt-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;
