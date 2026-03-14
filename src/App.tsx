import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddContact from "./pages/AddContact";
import MyContacts from "./pages/MyContacts";
import CallList from "./pages/CallList";
import AllContacts from "./pages/AllContacts";
import AdminContacts from "./pages/admin/AdminContacts";
import AssignCalls from "./pages/admin/AssignCalls";
import Analytics from "./pages/admin/Analytics";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminCallFeedback from "./pages/admin/AdminCallFeedback";
import AdminAllocations from "./pages/admin/AdminAllocations";
import AdminDuplicates from "./pages/admin/AdminDuplicates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/add-contact" element={<ProtectedRoute><AddContact /></ProtectedRoute>} />
            <Route path="/my-contacts" element={<ProtectedRoute><MyContacts /></ProtectedRoute>} />
            <Route path="/all-contacts" element={<ProtectedRoute><AllContacts /></ProtectedRoute>} />
            <Route path="/call-list" element={<ProtectedRoute><CallList /></ProtectedRoute>} />
            <Route path="/admin/contacts" element={<ProtectedRoute><AdminContacts /></ProtectedRoute>} />
            <Route path="/admin/assign" element={<ProtectedRoute><AssignCalls /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/admin/leaderboard" element={<ProtectedRoute><AdminLeaderboard /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute><AdminCallFeedback /></ProtectedRoute>} />
            <Route path="/admin/allocations" element={<ProtectedRoute><AdminAllocations /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
