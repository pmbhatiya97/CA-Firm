import { useState } from 'react';
import { engApi } from '../../api';
import { getErrorMessage } from '../../utils';
import { X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RollForwardModal({ engagement, onClose, onCreated }) {
  const currentYear = engagement?.financial_year || '2024-25';
  const [newYear, setNewYear] = useState(() => {
    const parts = currentYear.split('-');
    if (parts.length === 2) {
      return `${parseInt(parts[0]) + 1}-${parseInt(parts[1]) + 1}`;
    }
    return '';
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await engApi.rollforward(engagement.engagement_id, newYear);
      toast.success('Roll-forward complete. Folder structure copied — no files transferred.');
      onCreated(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title">Roll Forward Engagement</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
              Creates a new engagement for <strong>{engagement?.client_name}</strong> copying the folder structure from FY {currentYear}.
            </div>
            <div className="form-group">
              <label className="form-label">New Financial Year <span style={{ color:'var(--red)' }}>*</span></label>
              <input className="input" placeholder="e.g. 2025-26" value={newYear}
                onChange={e => setNewYear(e.target.value)} required/>
            </div>
            <div style={{ background:'var(--bg-table-head)', borderRadius:'var(--r-md)', padding:'10px 14px', fontSize:12, color:'var(--text-secondary)' }}>
              ✓ Folder structure copied · ✗ No WP files transferred · Missing WP alerts generated (FR-006)
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !newYear.trim()}>
              <RotateCcw size={14}/> {loading ? 'Creating…' : 'Roll Forward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
