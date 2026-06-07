import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import { getErrorMessage } from '../utils';
import { Brain, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { token, user } = res.data;
      setAuth(token, user);
      toast.success(`Welcome back, ${user.full_name}`);
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-in">
        <section className="login-hero">
          <div className="login-ai-mark"><Brain size={28}/></div>
          <div className="login-kicker"><Sparkles size={14}/> AI based audit workspace</div>
          <h1>Specentra AI AuditOS</h1>
          <p>
            A structured workspace for CA teams to manage engagement-wise files,
            review notes, signoffs and on-premise audit documentation.
          </p>
          <div className="login-hero-grid">
            <div><ShieldCheck size={18}/><span>Client files isolated by engagement</span></div>
            <div><Sparkles size={18}/><span>AI-ready audit workflow foundation</span></div>
          </div>
        </section>

        <div className="login-card">
          <div className="login-logo">
            <div className="logo-mark" style={{ width:44,height:44,fontSize:22 }}>S</div>
            <div>
              <div className="logo-name" style={{ color:'var(--text-primary)', fontSize:20 }}>Specentra</div>
              <div className="logo-sub" style={{ color:'var(--text-muted)' }}>Secure CA Workspace</div>
            </div>
          </div>

          <div className="login-heading">Sign in</div>
          <div className="login-sub">Access your client engagement workspace</div>

          <form onSubmit={handleLogin} style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position:'relative' }}>
                <Mail size={15} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft:36 }}
                  type="email"
                  placeholder="you@firm.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={15} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft:36,paddingRight:40 }}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0 }}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <div className="login-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ minWidth:132,height:42,fontSize:14 }}>
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </div>
          </form>

          <div style={{ marginTop:24,padding:'14px 16px',background:'var(--bg-table-head)',borderRadius:'var(--r-md)',fontSize:12 }}>
            <div style={{ fontWeight:600,color:'var(--text-secondary)',marginBottom:6 }}>Default credentials</div>
            <div style={{ color:'var(--text-muted)',display:'flex',flexDirection:'column',gap:4 }}>
              <div><span style={{ fontFamily:'monospace' }}>admin@specentra.com</span> / <span style={{ fontFamily:'monospace' }}>Admin@123</span></div>
              <div><span style={{ fontFamily:'monospace' }}>partner@specentra.com</span> / <span style={{ fontFamily:'monospace' }}>Partner@123</span></div>
            </div>
          </div>

          <p style={{ textAlign:'center',fontSize:11,color:'var(--text-muted)',marginTop:20 }}>
            On-premise. Engagement-wise. ICAI-ready.
          </p>
        </div>
      </div>
    </div>
  );
}
