import { useState } from 'react';
import { folderApi } from '../../api';
import { useAuthStore } from '../../store';
import { getErrorMessage } from '../../utils';
import { X, Folder } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateFolderModal({ engagementId, sectionId, parentFolderId, sectionCode, parentIndex, onClose, onCreated }) {
  const user = useAuthStore(s => s.user);
  const [name, setName] = useState('');
  const [indexOverride, setIndexOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const canOverrideIndex = ['Audit Manager','Partner','Admin'].includes(user?.role);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload = {
        folder_name: name.trim(),
        section_id: sectionId,
        parent_folder_id: parentFolderId || null,
      };
      if (canOverrideIndex && indexOverride.trim()) payload.wp_number = indexOverride.trim();
      await folderApi.create(engagementId, payload);
      toast.success(`Folder "${name}" created`);
      onCreated();
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
          <span className="modal-title">New Folder</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Index</label>
                <input className="input" placeholder={parentIndex ? `${parentIndex}.01` : (Number.isFinite(Number(sectionCode)) ? `${Number(sectionCode) + 1}` : 'Auto')}
                  value={indexOverride}
                  onChange={e => setIndexOverride(e.target.value)}
                  disabled={!canOverrideIndex}/>
              </div>
              <div className="form-group">
                <label className="form-label">Folder Name <span style={{ color:'var(--red)' }}>*</span></label>
                <input className="input" placeholder="e.g. Audit Plan" value={name}
                  onChange={e => setName(e.target.value)} autoFocus required/>
              </div>
            </div>
            <div style={{ marginTop:12, fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
              Leave Index blank for automatic numbering. Manual index override is available to Audit Manager, Partner and Admin users.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              <Folder size={14}/> {loading ? 'Creating…' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
