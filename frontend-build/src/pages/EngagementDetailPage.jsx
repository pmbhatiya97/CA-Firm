import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { engApi, folderApi, wpApi } from '../api';
import { useAuthStore, useAppStore } from '../store';
import { formatDate, statusBadgeClass, getErrorMessage, formatBytes } from '../utils';
import {
  ChevronDown, ChevronRight, Folder, FolderOpen, FileText,
  Upload, Plus, RotateCcw, Archive, CheckSquare, Activity,
  X, Edit2, Trash2, Download, Eye, MessageSquare, MoreHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import WPDetailPanel from '../components/wps/WPDetailPanel';
import UploadModal from '../components/wps/UploadModal';
import CreateFolderModal from '../components/folders/CreateFolderModal';
import ClosureChecklistModal from '../components/closure/ClosureChecklistModal';
import RollForwardModal from '../components/engagements/RollForwardModal';

const SECTION_COLORS = {};

function FolderNode({ folder, depth = 0, engagementId, onSelectWP, onRefresh, archived }) {
  const [open, setOpen] = useState(depth === 0);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const user = useAuthStore(s => s.user);
  const canUpload = !archived && !['EQCR Reviewer'].includes(user?.role);

  const indent = depth * 20;

  return (
    <div>
      {showUpload && (
        <UploadModal
          engagementId={engagementId}
          folderId={folder.folder_id}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); onRefresh(); toast.success('File uploaded'); }}
        />
      )}
      {showCreateFolder && (
        <CreateFolderModal
          engagementId={engagementId}
          sectionId={folder.section_id}
          parentFolderId={folder.folder_id}
          parentIndex={folder.wp_number}
          onClose={() => setShowCreateFolder(false)}
          onCreated={() => { setShowCreateFolder(false); onRefresh(); }}
        />
      )}

      {/* Folder row */}
      <div className="tree-folder-row" style={{ paddingLeft: 14 + indent }}>
        <button style={{ background:'none',border:'none',cursor:'pointer',padding:0,color:'var(--text-muted)',display:'flex',alignItems:'center' }}
          onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </button>
        {open ? <FolderOpen size={15} style={{ color:'var(--text-secondary)',flexShrink:0 }}/> : <Folder size={15} style={{ color:'var(--text-secondary)',flexShrink:0 }}/>}
        {folder.wp_number && (
          <span className="wp-number" style={{ fontSize:10 }}>{folder.wp_number}</span>
        )}
        <span style={{ flex:1,fontSize:13,fontWeight:500,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}
          onClick={() => setOpen(!open)}>
          {folder.folder_name}
        </span>
        {canUpload && open && (
          <div style={{ display:'flex',gap:4 }}>
            <button className="btn btn-icon-sm btn-ghost" title="Upload file" onClick={(e) => { e.stopPropagation(); setShowUpload(true); }}>
              <Upload size={12}/>
            </button>
            {depth < 8 && (
              <button className="btn btn-icon-sm btn-ghost" title="New subfolder" onClick={(e) => { e.stopPropagation(); setShowCreateFolder(true); }}>
                <Plus size={12}/>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {open && (
        <div>
          {/* Sub-folders */}
          {folder.children?.map(child => (
            <FolderNode key={child.folder_id} folder={child} depth={depth + 1}
              engagementId={engagementId} onSelectWP={onSelectWP} onRefresh={onRefresh} archived={archived}/>
          ))}
          {/* WPs in this folder */}
          {folder.working_papers?.map(wp => (
            <WPRow key={wp.wp_id} wp={wp} indent={indent + 20}
              onSelect={() => onSelectWP(wp)} archived={archived}/>
          ))}
          {folder.children?.length === 0 && folder.working_papers?.length === 0 && (
            <div style={{ paddingLeft: 14 + indent + 20, padding:'6px 0 6px ' + (14 + indent + 36) + 'px', fontSize:11, color:'var(--text-muted)' }}>
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WPRow({ wp, indent, onSelect, archived }) {
  const statusColors = {
    'Draft': 'var(--text-muted)', 'Submitted': 'var(--blue)',
    'Under Review': 'var(--amber)', 'Review Notes Raised': 'var(--red)', 'Finalised': 'var(--green)'
  };

  return (
    <div className="tree-wp-row" style={{ paddingLeft: 14 + indent }} onClick={onSelect}>
      <FileText size={13} style={{ color:'var(--text-muted)',flexShrink:0 }}/>
      <span className="wp-number">{wp.wp_number}</span>
      <span className="wp-name">{wp.filename}</span>
      <div className="wp-meta">
        <span className="signoff-chip" title="Preparer">{wp.prepared_by_initials || 'P-'}</span>
        <span className="signoff-chip" title="Reviewer 1">{wp.reviewer1_initials || 'R1-'}</span>
        <span className="signoff-chip" title="Reviewer 2">{wp.reviewer2_initials || 'R2-'}</span>
        {wp.open_notes_count > 0 && (
          <span className="badge badge-red" style={{ fontSize:10 }}>{wp.open_notes_count} note{wp.open_notes_count > 1 ? 's' : ''}</span>
        )}
        <span style={{ fontSize:10, color: statusColors[wp.review_status] || 'var(--text-muted)', whiteSpace:'nowrap' }}>
          {wp.review_status}
        </span>
      </div>
    </div>
  );
}

export default function EngagementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { setCurrentEngagement } = useAppStore();

  const [engagement, setEngagement] = useState(null);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWP, setSelectedWP] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [showClosure, setShowClosure] = useState(false);
  const [showRollForward, setShowRollForward] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createFolderSection, setCreateFolderSection] = useState(null);

  const load = useCallback(async () => {
    try {
      const [engRes, treeRes] = await Promise.all([
        engApi.get(id),
        folderApi.tree(id)
      ]);
      setEngagement(engRes.data);
      setCurrentEngagement(engRes.data);
      setTree(treeRes.data.data || {});
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate('/engagements');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const archived = engagement?.status === 'Archived';
  const isPartner = user?.role === 'Partner';
  const canCreateFolder = !archived && !['EQCR Reviewer'].includes(user?.role);

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text-muted)' }}>
      Loading engagement…
    </div>
  );

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden' }}>
      {showClosure && (
        <ClosureChecklistModal
          engagementId={id}
          onClose={() => setShowClosure(false)}
          onArchived={() => { setShowClosure(false); load(); }}
        />
      )}
      {showRollForward && (
        <RollForwardModal
          engagement={engagement}
          onClose={() => setShowRollForward(false)}
          onCreated={(newEng) => { setShowRollForward(false); navigate(`/engagements/${newEng.engagement_id}`); }}
        />
      )}
      {showCreateFolder && createFolderSection && (
        <CreateFolderModal
          engagementId={id}
          sectionId={createFolderSection.section_id}
          sectionCode={createFolderSection.section_code}
          parentFolderId={null}
          onClose={() => setShowCreateFolder(false)}
          onCreated={() => { setShowCreateFolder(false); load(); }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{engagement?.client_name}</h1>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:3 }}>
            <span style={{ fontFamily:'monospace',fontSize:12,color:'var(--text-secondary)' }}>FY {engagement?.financial_year}</span>
            <span className={statusBadgeClass(engagement?.status)}>{engagement?.status}</span>
            {engagement?.is_eqcr_designated && <span className="badge badge-purple">EQCR</span>}
          </div>
        </div>
        <div className="page-actions">
          {isPartner && !archived && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowClosure(true)}>
              <CheckSquare size={14}/> Close Engagement
            </button>
          )}
          {isPartner && archived && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              try { await engApi.reopen(id); load(); toast.success('Engagement reopened'); }
              catch(err) { toast.error(getErrorMessage(err)); }
            }}>
              <RotateCcw size={14}/> Reopen
            </button>
          )}
          {['Audit Manager','Partner'].includes(user?.role) && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowRollForward(true)}>
              <RotateCcw size={14}/> Roll Forward
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/engagements')}>
            ← Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'var(--bg-card)',borderBottom:'1px solid var(--border)',paddingLeft:28,flexShrink:0 }}>
        <div className="tabs" style={{ borderBottom:'none' }}>
          {['files','activity'].map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'files' ? 'File Explorer' : 'Activity Log'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
        {activeTab === 'files' && (
          <>
            {/* Folder tree */}
            <div style={{ width: selectedWP ? '55%' : '100%', overflow:'hidden', display:'flex', flexDirection:'column', transition:'width .2s', borderRight: selectedWP ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {archived && (
                  <div style={{ background:'var(--amber-bg)',border:'1px solid rgba(212,131,10,.2)',borderRadius:'var(--r-md)',padding:'10px 14px',fontSize:12,color:'var(--amber)',display:'flex',alignItems:'center',gap:8 }}>
                    <Archive size={14}/> This engagement is archived — all working papers are locked
                  </div>
                )}

                <div className="folder-tree">
                  {Object.entries(tree).map(([code, section]) => (
                    <SectionBlock
                      key={code}
                      code={code}
                      section={section}
                      color={SECTION_COLORS[code]}
                      engagementId={id}
                      onSelectWP={setSelectedWP}
                      onRefresh={load}
                      archived={archived}
                      canCreateFolder={canCreateFolder}
                      onCreateFolderInSection={() => {
                        setCreateFolderSection(section);
                        setShowCreateFolder(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* WP detail panel */}
            {selectedWP && (
              <WPDetailPanel
                wp={selectedWP}
                engagementId={id}
                archived={archived}
                onClose={() => setSelectedWP(null)}
                onRefresh={load}
              />
            )}
          </>
        )}

        {activeTab === 'activity' && (
          <ActivityLog engagementId={id}/>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ code, section, color, engagementId, onSelectWP, onRefresh, archived, canCreateFolder, onCreateFolderInSection }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="tree-section">
      <div className="tree-section-header" onClick={() => setOpen(!open)}>
        <span className="tree-section-code">{code}</span>
        <span className="tree-section-name">{section.section_name}</span>
        {canCreateFolder && open && (
          <button className="btn btn-icon-sm btn-ghost"
            title="New folder in section" onClick={(e) => { e.stopPropagation(); onCreateFolderInSection(); }}>
            <Plus size={12}/>
          </button>
        )}
        {open ? <ChevronDown size={16} style={{ color:'var(--text-muted)' }}/> : <ChevronRight size={16} style={{ color:'var(--text-muted)' }}/>}
      </div>

      {open && (
        <div>
          {section.folders?.length === 0 ? (
            <div style={{ padding:'16px',fontSize:12,color:'var(--text-muted)',textAlign:'center' }}>
              No folders yet — add a folder to start organising working papers
            </div>
          ) : (
            section.folders?.map(folder => (
              <FolderNode
                key={folder.folder_id}
                folder={folder}
                depth={0}
                engagementId={engagementId}
                onSelectWP={onSelectWP}
                onRefresh={onRefresh}
                archived={archived}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ActivityLog({ engagementId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    engApi.events(engagementId).then(r => setEvents(r.data.data || [])).finally(() => setLoading(false));
  }, [engagementId]);

  const eventLabel = (type) => {
    const map = {
      'engagement.created': '🟢 Engagement created',
      'wp.uploaded': '📄 Working paper uploaded',
      'review.submitted': '📤 Submitted for review',
      'note.raised': '🔴 Review note raised',
      'note.closed': '✅ Review note closed',
      'review.finalised': '✅ WP finalised',
      'engagement.archived': '📦 Engagement archived',
      'engagement.reopened': '🔓 Engagement reopened',
      'engagement.rollforward': '🔄 Roll-forward created',
      'signoff.recorded': '✍️ Sign-off recorded',
      'user.assigned': '👤 User assigned',
    };
    return map[type] || type;
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, marginBottom:16 }}>Activity Log</div>
      {loading ? (
        <div style={{ color:'var(--text-muted)',fontSize:13 }}>Loading…</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Activity size={24}/></div>
          <div className="empty-state-title">No activity yet</div>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:1 }}>
          {events.map(ev => (
            <div key={ev.event_id} style={{ display:'flex',gap:14,padding:'10px 0',borderBottom:'1px solid var(--border)',alignItems:'flex-start' }}>
              <div style={{ fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap',minWidth:130,marginTop:1 }}>
                {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,color:'var(--text-primary)',fontWeight:500 }}>{eventLabel(ev.event_type)}</div>
                {ev.actor_name && <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>by {ev.actor_name}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
