import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, User, Phone, Building } from 'lucide-react';

const Register: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', department: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      name: form.name, phone: form.phone, department: form.department,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Please check your email to verify, or sign in directly.');
      navigate('/login');
    }
  };

  const fields = [
    { key: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe' },
    { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '+91 9876543210' },
    { key: 'department', label: 'Department', icon: Building, type: 'text', placeholder: 'Computer Science' },
    { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••' },
    { key: 'confirmPassword', label: 'Confirm Password', icon: Lock, type: 'password', placeholder: '••••••••' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
            <UserPlus className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join the sponsorship team</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => update(key, e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                  placeholder={placeholder}
                  required
                />
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-neon w-full py-3 text-sm disabled:opacity-50 mt-2">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
