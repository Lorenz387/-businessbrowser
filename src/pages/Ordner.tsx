import { useState } from 'react'
import { Folder, FolderOpen, FileText, Image, File, Plus, ChevronRight } from 'lucide-react'

interface FolderNode {
  id: string
  name: string
  children?: FolderNode[]
  files?: { id: string; name: string; type: string; size: string }[]
}

const defaultTree: FolderNode[] = [
  {
    id: '1',
    name: 'Projekte',
    children: [
      { id: '1-1', name: 'Marketing', files: [
        { id: 'f1', name: 'Brief_Q1.pdf', type: 'pdf', size: '2.4 MB' },
        { id: 'f2', name: 'Social_Plan.xlsx', type: 'sheet', size: '890 KB' },
      ]},
      { id: '1-2', name: 'Produktlaunch', files: [
        { id: 'f3', name: 'Pressemitteilung.docx', type: 'doc', size: '1.2 MB' },
      ]},
    ],
    files: [],
  },
  {
    id: '2',
    name: 'Bilder',
    files: [
      { id: 'f4', name: 'Logo_Final.png', type: 'image', size: '3.1 MB' },
      { id: 'f5', name: 'Banner_Instagram.jpg', type: 'image', size: '1.8 MB' },
      { id: 'f6', name: 'Hero_Image.png', type: 'image', size: '4.2 MB' },
    ],
  },
  {
    id: '3',
    name: 'Dokumente',
    files: [
      { id: 'f7', name: 'Vertrag_2026.pdf', type: 'pdf', size: '560 KB' },
      { id: 'f8', name: 'Meeting_Notes.txt', type: 'text', size: '12 KB' },
    ],
  },
]

const fileIcon = (type: string) => {
  if (type === 'image') return <Image size={16} className="text-blue-500" />
  if (type === 'pdf' || type === 'doc') return <FileText size={16} className="text-red-500" />
  return <File size={16} className="text-slate-400" />
}

export default function Ordner() {
  const [tree] = useState<FolderNode[]>(defaultTree)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1']))
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(defaultTree[0].children![0])

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addFolder = () => {
    // placeholder - would need state mutation
  }

  const renderTree = (nodes: FolderNode[], depth = 0): React.ReactNode => nodes.map(node => (
    <div key={node.id}>
      <button
        onClick={() => { toggleFolder(node.id); setSelectedFolder(node) }}
        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedFolder?.id === node.id ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <ChevronRight size={12} className={`transition-transform flex-shrink-0 ${expandedFolders.has(node.id) ? 'rotate-90' : ''}`} />
        {expandedFolders.has(node.id)
          ? <FolderOpen size={14} className="text-violet-500 flex-shrink-0" />
          : <Folder size={14} className="text-slate-400 flex-shrink-0" />}
        {node.name}
      </button>
      {expandedFolders.has(node.id) && node.children && (
        <div>{renderTree(node.children, depth + 1)}</div>
      )}
    </div>
  ))

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className="w-56 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">Ordner</span>
            <button onClick={addFolder} className="p-1 hover:bg-violet-50 rounded-lg">
              <Plus size={16} className="text-violet-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {renderTree(tree)}
        </div>
      </div>

      <div className="flex-1 p-6">
        {selectedFolder ? (
          <>
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen size={20} className="text-violet-500" />
              <h2 className="text-lg font-bold text-slate-800">{selectedFolder.name}</h2>
              <span className="text-sm text-slate-400">({(selectedFolder.files || []).length} Dateien)</span>
            </div>
            {(selectedFolder.files || []).length > 0 ? (
              <div className="space-y-2">
                {(selectedFolder.files || []).map(file => (
                  <div key={file.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer">
                    <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
                      {fileIcon(file.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">{file.name}</div>
                      <div className="text-xs text-slate-400">{file.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Folder size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-400 text-sm">Dieser Ordner ist leer</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Folder size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-400 text-sm">Waehle einen Ordner aus</p>
          </div>
        )}
      </div>
    </div>
  )
}
