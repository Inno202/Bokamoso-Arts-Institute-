import { useState, useEffect } from 'react';
import { Users, Music, Star, Edit2, Save, X, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { workController, WorkContent, INITIAL_WORK_DATA } from '../../controllers/workController';
import { cloudinaryService } from '../../services/cloudinaryService';
import { ManagedImage } from '../components/ManagedImage';
import ImageCropperModal from '../components/ImageCropperModal';

export default function Programs() {
  const { role } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<WorkContent>(INITIAL_WORK_DATA);
  const [draft, setDraft] = useState<WorkContent>(INITIAL_WORK_DATA);
  const [saving, setSaving] = useState(false);

  // Cropper State
  const [pendingImage, setPendingImage] = useState<{
    url: string;
    type: 'project' | 'outreach';
    index?: number;
  } | null>(null);

  const isAdmin = role === 'SUPER_ADMIN' || role === 'PRO' || role === 'CEO' || role === 'FINANCE_MANAGER';

  useEffect(() => {
    const unsubscribe = workController.subscribeToWork((data) => {
      if (data && data.hero) {
        const mergedData = { 
          ...INITIAL_WORK_DATA, 
          ...data,
          hero: { ...INITIAL_WORK_DATA.hero, ...(data.hero || {}) },
          pillars: data.pillars || INITIAL_WORK_DATA.pillars,
          projects: data.projects || INITIAL_WORK_DATA.projects,
          outreach: { ...INITIAL_WORK_DATA.outreach, ...(data.outreach || {}) }
        };
        if (mergedData.outreach) {
          mergedData.outreach.stats = mergedData.outreach.stats || INITIAL_WORK_DATA.outreach.stats;
        }
        setContent(mergedData);
        if (!isEditing) setDraft(mergedData);
      } else {
        setContent(INITIAL_WORK_DATA);
        setDraft(INITIAL_WORK_DATA);
      }
    });
    return () => unsubscribe();
  }, [isEditing]);

  const handleToggleEdit = () => {
    if (isEditing) {
      setDraft(content);
    } else {
      setDraft(JSON.parse(JSON.stringify(content)));
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await workController.updateWork(draft);
      setContent(draft);
      setIsEditing(false);
      alert('Changes saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (file: File, type: 'project' | 'outreach', index?: number) => {
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
    setPendingImage(null);

    try {
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      const res = await cloudinaryService.upload(file, 'programs');
      const url = res.url || res.publicId;

      if (draft) {
        if (type === 'project' && index !== undefined) {
          const newProjects = [...draft.projects];
          newProjects[index] = { ...newProjects[index], imageUrl: url };
          setDraft({ ...draft, projects: newProjects });
        } else if (type === 'outreach') {
          setDraft({ ...draft, outreach: { ...draft.outreach, imageUrl: url } });
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Image upload failed.');
    }
  };


  return (
    <div className="pb-24 bg-bai-bone">
      {/* Hero */}
      <section className="bg-bai-black py-16 md:py-32 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-4xl mx-auto relative z-10">
          {isEditing ? (
            <input 
              className="w-full font-display font-bold uppercase tracking-[0.4em] text-bai-red text-center text-xs mb-4 bg-transparent outline-none border-b border-bai-red/30"
              value={draft.hero.tagline}
              onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, tagline: e.target.value } })}
            />
          ) : (
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-xs mb-4 block">{content.hero.tagline}</span>
          )}
          
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-7xl text-white tracking-tighter mb-4 md:mb-8 leading-tight italic uppercase">
            OUR <br /> <span className="text-bai-blue">WORK</span>
          </h1>
          
          {isEditing ? (
            <textarea 
              className="w-full text-white/50 text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto italic font-serif bg-transparent text-center outline-none border border-white/10 p-2"
              rows={2}
              value={draft.hero.description}
              onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, description: e.target.value } })}
            />
          ) : (
            <p className="text-white/50 text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto italic font-serif">
              {content.hero.description}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Edit Toggle */}
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

        {/* Pillars */}
        <section className="py-16 md:py-32 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {draft.pillars.map((pillar, idx) => (
            <div key={`pillar-${idx}`} className="group relative">
              <div className={`mb-8 p-6 w-fit bg-bai-bone transition-all duration-300 border-b-8 ${
                 pillar.type === 'choral' ? 'border-bai-red' : 
                 pillar.type === 'coaching' ? 'border-bai-blue' : 
                 'border-bai-black'
              }`}>
                 {pillar.type === 'choral' ? <Music className="text-bai-red" size={32} /> : 
                  pillar.type === 'coaching' ? <Star className="text-bai-blue" size={32} /> : 
                  <Users className="text-bai-black" size={32} />}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <input 
                    className="w-full font-display font-bold text-2xl mb-2 text-bai-black italic uppercase tracking-tight bg-transparent border-b border-bai-black/10 outline-none"
                    value={pillar.title}
                    onChange={(e) => {
                      const p = [...draft.pillars]; p[idx].title = e.target.value; setDraft({ ...draft, pillars: p });
                    }}
                  />
                  <textarea 
                    className="w-full text-bai-black/60 leading-relaxed bg-transparent border border-bai-black/10 p-2 outline-none"
                    rows={3}
                    value={pillar.desc}
                    onChange={(e) => {
                      const p = [...draft.pillars]; p[idx].desc = e.target.value; setDraft({ ...draft, pillars: p });
                    }}
                  />
                </div>
              ) : (
                <>
                  <h3 className="font-display font-bold text-2xl mb-6 text-bai-black italic uppercase tracking-tight">{pillar.title}</h3>
                  <p className="text-bai-black/60 leading-relaxed">
                    {pillar.desc}
                  </p>
                </>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Project Gallery */}
      <section className="py-24 bg-bai-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-end mb-20 gap-8">
              <div className="space-y-4">
                 <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px]">Project Archive</span>
                 <h2 className="font-display font-black text-4xl md:text-7xl tracking-tighter uppercase italic leading-none">
                    LIVING <br /> <span className="text-bai-blue">ENGAGEMENT</span>
                 </h2>
              </div>
              {isEditing && (
                <button 
                  onClick={() => {
                    const newProj = [...draft.projects, { id: Date.now(), title: 'New Activity', file: '' }];
                    setDraft({ ...draft, projects: newProj });
                  }}
                  className="bg-bai-blue text-white p-4 rounded-full"
                >
                  <Plus size={24} />
                </button>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {draft.projects.map((project, i) => (
                <div key={project.id} className="group relative aspect-[4/5] bg-bai-bone/10 overflow-hidden rounded-xl">
                   <ManagedImage 
                    src={project.imageUrl || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800&sig=${project.id}`} 
                    alt={project.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-60 group-hover:opacity-100" 
                   />
                   
                   {isEditing && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-bai-black/60 z-20 space-y-4">
                        <label className="bg-white/10 p-3 rounded-full cursor-pointer hover:bg-white/20 transition-all">
                           <Upload size={20} />
                           <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'project', i)} />
                        </label>
                        <input 
                          className="bg-transparent border-b border-white/30 text-center uppercase font-display font-bold text-sm w-full outline-none"
                          value={project.title}
                          onChange={(e) => {
                            const p = [...draft.projects]; p[i].title = e.target.value; setDraft({ ...draft, projects: p });
                          }}
                        />
                        <button 
                          onClick={() => {
                            const p = draft.projects.filter((_, idx) => idx !== i);
                            setDraft({ ...draft, projects: p });
                          }}
                          className="text-bai-red"
                        >
                          <Trash2 size={20} />
                        </button>
                     </div>
                   )}

                   {!isEditing && (
                     <>
                        <div className="absolute inset-0 bg-gradient-to-t from-bai-black to-transparent opacity-80" />
                        <div className="absolute bottom-0 left-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                           <span className="text-[10px] text-bai-red font-bold uppercase tracking-widest">{(i+1).toString().padStart(2, '0')}</span>
                           <h4 className="text-xl font-display font-black uppercase italic">{project.title}</h4>
                        </div>
                     </>
                   )}
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Community Engagement / School & Orphanage Visits */}
      <section className="bg-bai-bone py-16 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-6 md:p-24 shadow-2xl border-4 border-bai-black flex flex-col lg:flex-row gap-12 md:gap-20 items-center">
          <div className="w-full lg:w-1/2">
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-bai-red w-12 h-12 flex items-center justify-center rounded-sm text-white">
                <Users size={28} />
              </div>
              <span className="font-display font-bold uppercase tracking-widest text-[10px]">Community Engagement</span>
            </div>
            
            {isEditing ? (
              <div className="space-y-6">
                <input 
                  className="w-full font-display font-black text-3xl sm:text-4xl md:text-6xl tracking-tighter mb-4 md:mb-8 leading-none italic uppercase bg-transparent border-b border-bai-black/10 outline-none"
                  value={draft.outreach.title}
                  onChange={(e) => setDraft({ ...draft, outreach: { ...draft.outreach, title: e.target.value } })}
                />
                <textarea 
                  className="w-full text-bai-black/60 text-xl leading-relaxed mb-6 font-serif italic bg-transparent border border-bai-black/10 p-4 rounded-xl outline-none"
                  rows={4}
                  value={draft.outreach.description}
                  onChange={(e) => setDraft({ ...draft, outreach: { ...draft.outreach, description: e.target.value } })}
                />
                <div className="grid grid-cols-2 gap-8 md:gap-12 mb-12">
                   {draft.outreach.stats.map((stat, i) => (
                     <div key={i}>
                        <input className="font-display font-black text-4xl md:text-5xl text-bai-black italic bg-transparent w-full" value={stat.value} onChange={(e) => {
                          const s = [...draft.outreach.stats]; s[i].value = e.target.value; setDraft({ ...draft, outreach: { ...draft.outreach, stats: s } });
                        }} />
                        <input className="text-[10px] uppercase tracking-widest font-black text-bai-red mt-2 bg-transparent w-full" value={stat.label} onChange={(e) => {
                          const s = [...draft.outreach.stats]; s[i].label = e.target.value; setDraft({ ...draft, outreach: { ...draft.outreach, stats: s } });
                        }} />
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display font-black text-3xl sm:text-4xl md:text-6xl tracking-tighter mb-4 md:mb-8 leading-none italic uppercase">
                  {content.outreach.title}
                </h2>
                <p className="text-bai-black/60 text-xl leading-relaxed mb-10 font-serif italic">
                   {content.outreach.description}
                </p>
                <div className="grid grid-cols-2 gap-8 md:gap-12 mb-12">
                   {content.outreach.stats.map((stat, i) => (
                     <div key={i}>
                        <div className="font-display font-black text-4xl md:text-5xl text-bai-black italic">{stat.value}</div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-bai-red mt-2">{stat.label}</div>
                     </div>
                   ))}
                </div>
              </>
            )}
          </div>
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute -top-4 -right-4 md:-top-10 md:-right-10 w-full h-full border-4 border-bai-blue/20 -z-10" />
             <div className="aspect-square bg-bai-black overflow-hidden relative shadow-2xl group">
               <ManagedImage 
                 src={draft.outreach.imageUrl} 
                 alt="Community outreach performance" 
                 className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
               />
               {isEditing && (
                 <label className="absolute inset-0 bg-bai-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Upload className="text-white" size={32} />
                    <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'outreach')} />
                 </label>
               )}
               <div className="absolute inset-0 piano-key-pattern opacity-10 pointer-events-none" />
               <div className="absolute bottom-0 left-0 p-10 bg-bai-red/90 text-white max-w-xs">
                  <div className="font-display font-black uppercase text-xl leading-none">COMMUNITY IMPACT</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {pendingImage && (
        <ImageCropperModal 
          image={pendingImage.url}
          onConfirm={handleCroppedConfirm}
          onCancel={() => setPendingImage(null)}
          aspect={1}
        />
      )}
    </div>
  );
}

