import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { engApi } from '../api';
import { useAuthStore, useAppStore } from '../store';
import { formatDate, statusBadgeClass, engagementTypeName, getErrorMessage } from '../utils';
import { Plus, FolderOpen, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

function CreateEngagementModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    client_name: '', financial_year: '2024-25',
    engagement_type: 'statutory-audit', is_eqcr_designated: false
  });
  const [loading, setLoading] = useState(false);

  const years = ['2025-26','2024-25','2023-24','2022-23','2021-22','2020-21'];

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await engApi.create(form);
      toast.success(`Engagement created with 5 standard sections`);
      onCreated(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-md">
        <div className="modal-header">
          <span className="modal-title">New Audit Engagement</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div className="form-group">
              <label className="form-label">Client Name <span style={{color:'var(--red)'}}>*</span></label>
              <input className="input" placeholder="e.g. ABC Industries Pvt Ltd"
                value={form.client_name} onChange={e => setForm({...form,client_name:e.target.value})} required/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Financial Year</label>
                <select className="select" value={form.financial_year} onChange={e => setForm({...form,financial_year:e.target.value})}>
                  {years.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Engagement Type</label>
                <select className="select" value={form.engagement_type} onChange={e => setForm({...form,engagement_type:e.target.value})}>
                  <option value="statutory-audit">Statutory Audit</option>
                  <option value="internal-audit">Internal Audit</option>
                  <option value="tax-audit">Tax Audit</option>
                  <option value="limited-review">Limited Review</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer' }}>
                <input type="checkbox" checked={form.is_eqcr_designated}
                  onChange={e => setForm({...form,is_eqcr_designated:e.target.checked})}/>
                <span className="form-label" style={{margin:0}}>Designate for EQCR review</span>
              </label>
            </div>
            <div style={{ background:'var(--bg-table-head)',borderRadius:'var(--r-md)',padding:'10px 14px',fontSize:12,color:'var(--text-secondary)' }}>
              Five standard sections will be auto-created: 1000 Audit Preconditions · 2000 Audit Planning · 3000 Audit Communications · 4000 Audit Execution · 5000 Audit Reporting
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Engagement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EngagementsPage() {
  const user = useAuthStore(s => s.user);
  const { setCurrentEngagement } = useAppStore();
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const canCreate = ['Audit Manager','Partner','Admin'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const res = await engApi.list({ client_name: search||undefined, status: statusFilter||undefined });
      setEngagements(res.data);
    } catch { toast.error('Failed to load engagements'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openEngagement = (eng) => {
    setCurrentEngagement(eng);
    navigate(`/engagements/${eng.engagement_id}`);
  };

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden' }}>
      {showCreate && (
        <CreateEngagementModal
          onClose={() => setShowCreate(false)}
          onCreated={(eng) => { setShowCreate(false); load(); openEngagement(eng); }}
        />
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Engagements</h1>
          <p className="page-subtitle">{engagements.length} engagement{engagements.length !== 1 ? 's' : ''} · Sections auto-created per DEC-001</p>
        </div>
        <div className="page-actions">
          <div className="searchbar" style={{ width:260 }}>
            <Search size={14} style={{ color:'var(--text-muted)',flexShrink:0 }}/>
            <input placeholder="Search client name…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="select" style={{ width:160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Active</option>
            <option>Under Review</option>
            <option>Finalised</option>
            <option>Archived</option>
          </select>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={15}/> New Engagement
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="card animate-in" style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
          {loading ? (
            <div style={{ padding:40,textAlign:'center',color:'var(--text-muted)' }}>Loading engagements…</div>
          ) : engagements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FolderOpen size={24}/></div>
              <div className="empty-state-title">No engagements found</div>
              <div className="empty-state-sub">{search ? 'Try a different search' : 'Create your first engagement'}</div>
              {canCreate && !search && (
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={14}/> Create Engagement
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap engagements-card-list" style={{ flex:1,overflowY:'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Financial Year</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>EQCR</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {engagements.map(eng => (
                    <tr key={eng.engagement_id}>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ padding:0,fontWeight:600,color:'var(--brand-navy)',justifyContent:'flex-start' }}
                          onClick={() => openEngagement(eng)}>
                          {eng.client_name}
                        </button>
                      </td>
                      <td><span className="font-mono text-sm">{eng.financial_year}</span></td>
                      <td className="text-sm text-secondary">{engagementTypeName(eng.engagement_type)}</td>
                      <td><span className={statusBadgeClass(eng.status)}>{eng.status}</span></td>
                      <td>{eng.is_eqcr_designated ? <span className="badge badge-purple">EQCR</span> : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>}</td>
                      <td className="text-sm text-muted">{formatDate(eng.created_at)}</td>
                      <td>
                        <div style={{ display:'flex',gap:6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEngagement(eng)}>Open</button>
                          {user?.role === 'Partner' && eng.status === 'Active' && (
                            <button className="btn btn-ghost btn-sm" onClick={async () => {
                              try { await engApi.archive(eng.engagement_id); load(); toast.success('Archived'); }
                              catch(err) { toast.error(getErrorMessage(err)); }
                            }}>Archive</button>
                          )}
                          {user?.role === 'Partner' && eng.status === 'Archived' && (
                            <button className="btn btn-ghost btn-sm" onClick={async () => {
                              try { await engApi.reopen(eng.engagement_id); load(); toast.success('Reopened'); }
                              catch(err) { toast.error(getErrorMessage(err)); }
                            }}>Reopen</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
