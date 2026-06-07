import { useEffect, useState } from 'react';
import { engApi } from '../../api';
import { getErrorMessage } from '../../utils';
import { X, CheckCircle, XCircle, Archive, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClosureChecklistModal({ engagementId, onClose, onArchived }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    engApi.closureChecklist(engagementId)
      .then(r => setData(r.data.data))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [engagementId]);

  const handleArchive = async () => {
    if (!data?.can_archive) return;
    setArchiving(true);
    try {
      await engApi.archive(engagementId);
      toast.success('Engagement archived successfully');
      onArchived();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setArchiving(false);
    }
  };

  const passCount = data?.items?.filter(i => i.status === 'Pass').length || 0;
  const failCount = data?.items?.filter(i => i.status === 'Fail').length || 0;

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Engagement Closure Checklist</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Checking checklist…</div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display:'flex', gap:12, marginBottom:20 }}>
                <div style={{ flex:1, padding:'14px 16px', background:'var(--green-bg)', border:'1px solid rgba(26,158,94,.2)', borderRadius:'var(--r-md)' }}>
                  <div style={{ fontSize:24, fontWeight:700, color:'var(--green)' }}>{passCount}</div>
                  <div style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>PASSED</div>
                </div>
                <div style={{ flex:1, padding:'14px 16px', background: failCount > 0 ? 'var(--red-bg)' : 'var(--green-bg)', border:`1px solid ${failCount > 0 ? 'rgba(208,53,69,.2)' : 'rgba(26,158,94,.2)'}`, borderRadius:'var(--r-md)' }}>
                  <div style={{ fontSize:24, fontWeight:700, color: failCount > 0 ? 'var(--red)' : 'var(--green)' }}>{failCount}</div>
                  <div style={{ fontSize:11, color: failCount > 0 ? 'var(--red)' : 'var(--green)', fontWeight:600 }}>FAILED</div>
                </div>
                <div style={{ flex:1, padding:'14px 16px', background: data?.open_notes_count > 0 ? 'var(--red-bg)' : 'var(--green-bg)', border:`1px solid ${data?.open_notes_count > 0 ? 'rgba(208,53,69,.2)' : 'rgba(26,158,94,.2)'}`, borderRadius:'var(--r-md)' }}>
                  <div style={{ fontSize:24, fontWeight:700, color: data?.open_notes_count > 0 ? 'var(--red)' : 'var(--green)' }}>{data?.open_notes_count}</div>
                  <div style={{ fontSize:11, color: data?.open_notes_count > 0 ? 'var(--red)' : 'var(--green)', fontWeight:600 }}>OPEN NOTES</div>
                </div>
              </div>

              {!data?.can_archive && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'12px 16px', background:'var(--amber-bg)', border:'1px solid rgba(212,131,10,.2)', borderRadius:'var(--r-md)', marginBottom:16 }}>
                  <AlertTriangle size={16} style={{ color:'var(--amber)', flexShrink:0, marginTop:1 }}/>
                  <div style={{ fontSize:12, color:'var(--amber)', fontWeight:500 }}>
                    All checklist items must pass and all review notes must be closed before archiving (FR-061, FR-062)
                  </div>
                </div>
              )}

              {/* Checklist items */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {data?.items?.map(item => (
                  <div key={item.item_id} className={`checklist-item ${item.status.toLowerCase()}`}>
                    <div className="checklist-icon">
                      {item.status === 'Pass'
                        ? <CheckCircle size={16} style={{ color:'var(--green)' }}/>
                        : <XCircle size={16} style={{ color:'var(--red)' }}/>
                      }
                    </div>
                    <div>
                      <div className="checklist-desc" style={{ color: item.status === 'Pass' ? 'var(--text-primary)' : 'var(--red)' }}>
                        {item.description}
                      </div>
                      {item.detail && (
                        <div className="checklist-detail">{item.detail}</div>
                      )}
                    </div>
                    <span style={{ fontSize:10, fontFamily:'monospace', color:'var(--text-muted)', flexShrink:0 }}>{item.item_id}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button
            className="btn btn-danger"
            onClick={handleArchive}
            disabled={!data?.can_archive || archiving || loading}
          >
            <Archive size={14}/>
            {archiving ? 'Archiving…' : 'Archive Engagement'}
          </button>
        </div>
      </div>
    </div>
  );
}
