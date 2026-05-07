import { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { aboutController, AboutContent, INITIAL_ABOUT_DATA } from '../../controllers/aboutController';
import { cloudinaryService } from '../../services/cloudinaryService';
import { ManagedImage } from '../components/ManagedImage';
import ImageCropperModal from '../components/ImageCropperModal';

export default function About() {
  const { role } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<AboutContent | null>(null);
  const [draft, setDraft] = useState<AboutContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  
  // Cropper State
  const [pendingImage, setPendingImage] = useState<{
    url: string;
    type: 'management' | 'choir';
    index?: number;
  } | null>(null);

  const isAdmin = role === 'SUPER_ADMIN' || role === 'PRO' || role === 'CEO' || role === 'FINANCE_MANAGER';

  useEffect(() => {
    const unsubscribe = aboutController.subscribeToAbout((data) => {
      console.log('About data received:', data);
      if (data && data.story) {
        setContent(data);
        if (!isEditing) setDraft(data);
      } else {
        console.log('No about data or invalid structure, falling back to initial data...');
        setContent(INITIAL_ABOUT_DATA);
        setDraft(INITIAL_ABOUT_DATA);
      }
    });
    return () => unsubscribe();
  }, [isEditing]);

  const handleToggleEdit = () => {
    if (isEditing) {
      setDraft(content); // Reset draft on cancel
    } else {
      setDraft(JSON.parse(JSON.stringify(content))); // Deep clone for editing
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!draft) return;
    
    setSaving(true);
    try {
      await aboutController.updateAbout(draft);
      setContent(draft);
      setIsEditing(false);
      alert('Changes saved successfully!');
      console.log('Changes saved successfully to Firebase');
    } catch (err) {
      console.error('Save failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('permission-denied')) {
        alert('Permission Denied: You do not have permission to edit this content.');
      } else {
        alert('Failed to save changes. Please check the console for details.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (file: File, type: 'management' | 'choir', index?: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage({
        url: reader.result as string,
        type,
        index
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedConfirm = async (blob: Blob) => {
    if (!pendingImage) return;
    
    const { type, index } = pendingImage;
    if (type === 'management' && index !== undefined) setUploadingIndex(index);
    
    setPendingImage(null);

    try {
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      const folder = type === 'choir' ? 'choir' : 'staff';
      const res = await cloudinaryService.upload(file, folder);
      const url = res.url || res.publicId;

      if (draft) {
        if (type === 'management' && index !== undefined) {
          const newManagement = [...draft.management];
          newManagement[index] = { ...newManagement[index], image: url };
          setDraft({ ...draft, management: newManagement });
        } else if (type === 'choir') {
          setDraft({ ...draft, choirPictures: [...draft.choirPictures, url] });
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Image upload failed. Please try again.');
    } finally {
      if (type === 'management') setUploadingIndex(null);
    }
  };

  if (!content || !draft || !content.story) return <div className="min-h-screen flex items-center justify-center font-display font-black text-4xl animate-pulse italic uppercase tracking-tighter">BULA PELO...</div>;

  return (
    <div className="pb-24 relative bg-bai-bone">
      {/* Hero Header */}
      <section className="bg-bai-black text-white py-20 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=1600')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <span className="bula-pelo-text text-white text-2xl mb-4 block">The BAI Rhythm</span>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[1] mb-8 italic uppercase">
            ABOUT <br /> <span className="text-bai-red">BOKAMOSO.</span>
          </h1>
          <p className="max-w-2xl text-white/60 text-lg md:text-2xl font-light leading-relaxed font-serif italic">
            "We are not just a choir; we are the guardians of the community's soul."
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Edit Controls - Below Hero */}
        {isAdmin && (
          <div className="flex flex-col items-end pt-8 pb-4">
            <button
              onClick={handleToggleEdit}
              className={`${isEditing ? 'bg-bai-red' : 'bg-bai-black'} text-white px-6 py-3 rounded-full shadow-xl hover:scale-105 transition-all flex items-center space-x-3 border-2 border-white`}
            >
              {isEditing ? <X size={20} /> : <Edit2 size={20} />}
              <span className="font-bold uppercase tracking-widest text-[10px]">{isEditing ? 'Cancel' : 'Edit Content'}</span>
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 bg-green-600 text-white px-8 py-3 rounded-full shadow-xl hover:bg-green-700 transition-all flex items-center justify-center space-x-3 border-2 border-white"
              >
                <Save size={20} />
                <span className="font-bold uppercase tracking-widest text-[10px]">{saving ? 'Saving...' : 'Save All'}</span>
              </button>
            )}
          </div>
        )}

        {/* Section 1: Our Story */}
        <section className="py-20 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-block px-3 py-1 bg-bai-red text-white text-[10px] font-black uppercase tracking-widest rounded-sm">
              Since 2022
            </div>
            {isEditing ? (
              <input
                className="w-full font-display font-black text-4xl md:text-6xl uppercase tracking-tighter italic bg-transparent border-b border-bai-black/10 outline-none"
                value={draft.story.title}
                onChange={(e) => setDraft({ ...draft, story: { ...draft.story, title: e.target.value } })}
              />
            ) : (
              <h2 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tighter italic">{content.story.title}</h2>
            )}
            
            {isEditing ? (
              <textarea
                className="w-full text-bai-black/70 text-lg md:text-xl leading-relaxed bg-transparent border border-bai-black/10 p-4 rounded-xl outline-none"
                rows={6}
                value={draft.story.description}
                onChange={(e) => setDraft({ ...draft, story: { ...draft.story, description: e.target.value } })}
              />
            ) : (
              <p className="text-bai-black/70 text-lg md:text-xl leading-relaxed">
                {content.story.description}
              </p>
            )}

            <div className="flex items-center space-x-12 pt-8 border-t border-bai-black/5">
              {draft.story.stats.map((stat, i) => (
                <div key={`stat-${i}`}>
                  {isEditing ? (
                    <>
                      <input className="text-4xl font-display font-black bg-transparent w-24" value={stat.value} onChange={(e) => {
                        const s = [...draft.story.stats]; s[i].value = e.target.value; setDraft({ ...draft, story: { ...draft.story, stats: s } });
                      }} />
                      <input className="block text-[10px] font-bold uppercase tracking-widest text-bai-red bg-transparent" value={stat.label} onChange={(e) => {
                        const s = [...draft.story.stats]; s[i].label = e.target.value; setDraft({ ...draft, story: { ...draft.story, stats: s } });
                      }} />
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-display font-black">{stat.value}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-bai-red">{stat.label}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] bg-bai-black rounded-3xl overflow-hidden shadow-2xl relative group">
              <ManagedImage src={draft.choirPictures[0] || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81'} publicId="" alt="Story" className="w-full h-full object-cover transition-all duration-700" />
              {isEditing && (
                <label className="absolute inset-0 bg-bai-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload className="text-white" />
                  <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'choir')} />
                </label>
              )}
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-bai-red rounded-full blur-3xl opacity-20 -z-10" />
          </div>
        </section>

        {/* Section 2: Values */}
        <section className="py-20 bg-bai-black text-white rounded-[3rem] px-8 md:px-16 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 piano-key-pattern opacity-10" />
          <h2 className="font-display font-black text-3xl md:text-5xl uppercase italic mb-16 text-bai-blue">Our Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {draft.values.map((v, i) => (
              <div key={`value-${i}`} className="space-y-4 group">
                {isEditing ? (
                  <>
                    <input className="w-full font-display font-bold text-xl uppercase tracking-wider bg-transparent border-b border-white/10 outline-none text-bai-red" value={v.title} onChange={(e) => {
                      const vals = [...draft.values]; vals[i].title = e.target.value; setDraft({ ...draft, values: vals });
                    }} />
                    <textarea className="w-full text-white/40 text-sm bg-transparent outline-none" rows={3} value={v.desc} onChange={(e) => {
                      const vals = [...draft.values]; vals[i].desc = e.target.value; setDraft({ ...draft, values: vals });
                    }} />
                  </>
                ) : (
                  <>
                    <h3 className="font-display font-bold text-xl uppercase tracking-wider text-bai-red group-hover:translate-x-2 transition-transform">{v.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{v.desc}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Management */}
        <section className="py-20 md:py-32">
          <div className="flex flex-col md:flex-row justify-between items-center mb-20 gap-8">
            <h2 className="font-display font-black text-4xl md:text-7xl uppercase italic tracking-tighter">MANAGEMENT <span className="text-bai-red">TEAM.</span></h2>
            {isEditing && (
              <button 
                onClick={() => {
                  if (draft) {
                    const newM = [...draft.management, { 
                      role: 'New Position', 
                      name: 'Leader Name', 
                      desc: 'Description regarding their impact and role within the institute.', 
                      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400' 
                    }];
                    setDraft({ ...draft, management: newM });
                  }
                }}
                className="bg-bai-black text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs flex items-center space-x-3 hover:bg-bai-blue transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                <span>Add New Leader</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
             {draft.management.map((m, i) => (
               <div key={`member-${i}`} className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl border border-bai-black/5 group relative">
                 {isEditing && (
                   <button 
                    onClick={() => {
                      if (draft) {
                        const newM = draft.management.filter((_, idx) => idx !== i);
                        setDraft({ ...draft, management: newM });
                      }
                    }}
                    className="absolute top-4 right-4 z-30 bg-bai-red text-white p-2 rounded-full hover:scale-110 transition-all shadow-lg"
                   >
                     <Trash2 size={16} />
                   </button>
                 )}
                 <div className="w-full aspect-square relative overflow-hidden">
                   <ManagedImage 
                    src={m.image} 
                    alt={m.name} 
                    className="w-full h-full object-cover transition-all duration-700" 
                   />
                   {isEditing && (
                     <label className={`absolute inset-0 bg-bai-black/60 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-opacity ${uploadingIndex === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                       {uploadingIndex === i ? (
                         <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                       ) : (
                         <Upload className="text-white" />
                       )}
                       <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                         {uploadingIndex === i ? 'Uploading...' : 'Change Photo'}
                       </span>
                       <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'management', i)} />
                     </label>
                   )}
                 </div>
                 <div className="p-8 flex flex-col">
                    {isEditing ? (
                      <div className="space-y-4">
                        <input className="font-display font-bold uppercase text-xs text-bai-red tracking-widest bg-transparent border-b border-bai-black/10 w-full" value={m.role} onChange={(e) => {
                          const ms = [...draft.management]; ms[i].role = e.target.value; setDraft({ ...draft, management: ms });
                        }} />
                        <input className="font-display font-black text-2xl uppercase bg-transparent border-b border-bai-black/10 w-full" value={m.name} onChange={(e) => {
                          const ms = [...draft.management]; ms[i].name = e.target.value; setDraft({ ...draft, management: ms });
                        }} />
                        <textarea className="text-bai-black/60 text-sm bg-transparent border-b border-bai-black/10 w-full" rows={3} value={m.desc} onChange={(e) => {
                          const ms = [...draft.management]; ms[i].desc = e.target.value; setDraft({ ...draft, management: ms });
                        }} />
                      </div>
                    ) : (
                      <>
                        <span className="font-display font-bold uppercase text-[10px] text-bai-red tracking-widest mb-2 block">{m.role}</span>
                        <h3 className="font-display font-black text-2xl uppercase mb-4 leading-none">{m.name}</h3>
                        <p className="text-bai-black/60 text-sm leading-relaxed line-clamp-4">{m.desc}</p>
                      </>
                    )}
                 </div>
               </div>
             ))}
          </div>
        </section>

        {/* Section 4: Choir */}
        <section className="py-20 md:py-32">
          <div className="mb-12">
            <h2 className="font-display font-black text-3xl md:text-5xl uppercase italic tracking-tight">CHOIR.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {draft.choirPictures.map((img, i) => (
              <div key={`choir-pic-${i}`} className="aspect-square rounded-2xl overflow-hidden bg-bai-bone relative group">
                <ManagedImage src={img} publicId="" alt="Choir" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                {isEditing && (
                  <button onClick={() => {
                    const p = draft.choirPictures.filter((_, idx) => idx !== i); setDraft({ ...draft, choirPictures: p });
                  }} className="absolute top-2 right-2 bg-bai-red text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <label className="aspect-square flex flex-col items-center justify-center border-4 border-dashed border-bai-black/10 rounded-2xl cursor-pointer hover:border-bai-red transition-all group">
                <Plus className="text-bai-black/10 group-hover:text-bai-red transition-all" size={40} />
                <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'choir')} />
              </label>
            )}
          </div>
        </section>
      </div>

      {pendingImage && (
        <ImageCropperModal 
          image={pendingImage.url}
          onConfirm={handleCroppedConfirm}
          onCancel={() => setPendingImage(null)}
          aspect={pendingImage.type === 'management' ? 1 : 1}
        />
      )}
    </div>
  );
}
