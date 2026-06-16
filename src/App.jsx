import { useState, useEffect, useRef } from 'react';
import { Octokit } from '@octokit/rest';
import { Save, LogIn, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';

const REPO_OWNER = 'ZenithOrionis';
const REPO_NAME = 'MCP';
const FILE_PATH = 'src/content/data.json';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('github_pat') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [octokit, setOctokit] = useState(null);
  
  const [data, setData] = useState(null);
  const [fileSha, setFileSha] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [showToken, setShowToken] = useState(false);
  
  const [activeTab, setActiveTab] = useState('hero');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    const client = new Octokit({ auth: token });
    
    try {
      await client.rest.users.getAuthenticated();
      
      setOctokit(client);
      localStorage.setItem('github_pat', token);
      setIsAuthenticated(true);
      setMessage({ text: 'Successfully authenticated!', type: 'success' });
      
      fetchData(client);
    } catch (err) {
      setMessage({ text: 'Invalid token or insufficient permissions.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('github_pat');
    setToken('');
    setIsAuthenticated(false);
    setOctokit(null);
    setData(null);
  };

  const fetchData = async (client) => {
    setLoading(true);
    try {
      const response = await client.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: FILE_PATH,
      });

      const content = atob(response.data.content);
      setData(JSON.parse(content));
      setFileSha(response.data.sha);
      setMessage({ text: 'Data loaded successfully.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to fetch website content. Check repo access.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!octokit || !data) return;
    setSaving(true);
    setMessage({ text: 'Saving changes to website...', type: 'info' });
    
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      
      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: FILE_PATH,
        message: 'cms: update website content via CMS dashboard',
        content: content,
        sha: fileSha,
        branch: 'master',
      });
      
      setFileSha(response.data.content.sha);
      setMessage({ text: 'Changes saved! The website will update in about 60 seconds.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to save changes.', type: 'error' });
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const updateField = (section, field, value) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateArrayField = (section, arrayName, index, field, value) => {
    setData((prev) => {
      const newArray = [...prev[section][arrayName]];
      newArray[index] = { ...newArray[index], [field]: value };
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [arrayName]: newArray
        }
      };
    });
  };

  const handleImageUpload = async (file, fileName, githubFolder) => {
    if (!octokit) return null;
    setMessage({ text: `Uploading ${fileName}...`, type: 'info' });
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Content = reader.result.split(',')[1];
          const path = `public/${githubFolder}/${fileName}`;
          
          let sha = null;
          try {
            const res = await octokit.rest.repos.getContent({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              path: path
            });
            sha = res.data.sha;
          } catch (e) {
            // File doesn't exist yet, ignore
          }
          
          await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: path,
            message: `cms: upload image ${fileName}`,
            content: base64Content,
            ...(sha ? { sha } : {})
          });
          
          setMessage({ text: `Successfully uploaded ${fileName}!`, type: 'success' });
          resolve(`/${githubFolder}/${fileName}`);
        } catch (e) {
          console.error(e);
          setMessage({ text: `Failed to upload ${fileName}.`, type: 'error' });
          reject(e);
        }
      };
      reader.onerror = (e) => reject(e);
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-forest p-6 text-center">
            <h1 className="text-2xl font-bold text-cream">MCP Content Manager</h1>
            <p className="text-mint mt-2">Login with GitHub</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-forest mb-2">Personal Access Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none transition bg-cream/50"
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-3.5 text-sage hover:text-forest"
                  >
                    {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-sage mt-2">
                  Requires repo access to ZenithOrionis/MCP
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest text-cream py-3 rounded-lg font-semibold hover:bg-forest/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <LogIn size={20} />}
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
              {message.text && (
                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {message.type === 'error' ? <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> : <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />}
                  {message.text}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-forest">
          <RefreshCw className="animate-spin text-mint" size={32} />
          <p>Loading website data...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'hero', label: 'Hero Section' },
    { id: 'about', label: 'About Us' },
    { id: 'partners', label: 'Partners (Logos)' },
    { id: 'portfolio', label: 'Portfolio Images' },
    { id: 'leadership', label: 'Leadership Photos' },
    { id: 'contact', label: 'Contact Info' },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-forest text-cream flex flex-col h-auto md:h-screen sticky top-0">
        <div className="p-6 border-b border-sage/30">
          <h1 className="text-xl font-bold">MCP CMS</h1>
          <button onClick={handleLogout} className="text-mint text-sm mt-1 hover:underline">Sign out</button>
        </div>
        <div className="flex-1 py-4 overflow-y-auto flex md:flex-col gap-1 px-4 md:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-left whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-sage/40 text-mint font-medium border-l-4 border-mint' 
                  : 'text-cream/70 hover:bg-sage/20 hover:text-cream border-l-4 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full pb-24 md:pb-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-forest capitalize">{activeTab} Content</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="fixed md:static bottom-6 right-6 z-10 shadow-lg md:shadow-none bg-mint text-forest px-6 py-3 rounded-full md:rounded-lg font-bold hover:bg-mint/90 transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Saving...' : 'Publish JSON Changes'}
          </button>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-lg flex items-start gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-600' : message.type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-forest border border-mint'}`}>
            {message.type === 'error' ? <AlertCircle size={20} className="flex-shrink-0" /> : <CheckCircle size={20} className="flex-shrink-0 text-mint" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-sage/20 p-6 md:p-8 space-y-6">
          
          {activeTab === 'hero' && (
            <>
              <Field label="Main Title" value={data.hero.title} onChange={(val) => updateField('hero', 'title', val)} />
              <Field label="Subtitle" value={data.hero.subtitle} onChange={(val) => updateField('hero', 'subtitle', val)} />
              <Field label="Button Text" value={data.hero.ctaText} onChange={(val) => updateField('hero', 'ctaText', val)} />
            </>
          )}

          {activeTab === 'about' && (
            <>
              <Field label="Section Label" value={data.about.label} onChange={(val) => updateField('about', 'label', val)} />
              <Field label="Main Title" textarea value={data.about.title} onChange={(val) => updateField('about', 'title', val)} />
              <Field label="Mission Quote" value={data.about.missionQuote} onChange={(val) => updateField('about', 'missionQuote', val)} />
              
              <div className="pt-4 mt-6 border-t border-sage/20">
                <h3 className="font-semibold text-forest mb-4">Paragraphs</h3>
                {data.about.paragraphs.map((p, i) => (
                  <div key={i} className="mb-4">
                    <label className="block text-sm font-medium text-sage mb-1">Paragraph {i + 1}</label>
                    <textarea
                      value={p}
                      onChange={(e) => {
                        const newP = [...data.about.paragraphs];
                        newP[i] = e.target.value;
                        updateField('about', 'paragraphs', newP);
                      }}
                      className="w-full px-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-mint outline-none bg-cream/30 min-h-[100px]"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'partners' && (
            <div className="space-y-8">
              {data.partners.logos.map((logo, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-sage/20 rounded-xl bg-cream/10">
                  <div>
                    <Field label="Partner Name" value={logo.name} onChange={(val) => updateArrayField('partners', 'logos', index, 'name', val)} />
                    <p className="text-xs text-sage mt-2">Current path: {logo.imgSrc}</p>
                  </div>
                  <div>
                    <ImageUploadField 
                      label="Upload Logo" 
                      currentImg={logo.imgSrc}
                      onUpload={(file) => {
                        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
                        return handleImageUpload(file, safeName, 'partners').then(path => {
                          updateArrayField('partners', 'logos', index, 'imgSrc', path);
                        });
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-8">
              {data.portfolio.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-sage/20 rounded-xl bg-cream/10">
                  <div>
                    <Field label="Item Title" value={item.title} onChange={(val) => updateArrayField('portfolio', 'items', index, 'title', val)} />
                    <div className="mt-4">
                      <Field label="Category" value={item.category} onChange={(val) => updateArrayField('portfolio', 'items', index, 'category', val)} />
                    </div>
                  </div>
                  <div>
                    <ImageUploadField 
                      label="Upload Portfolio Image" 
                      currentImg={item.imgSrc}
                      onUpload={(file) => {
                        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
                        return handleImageUpload(file, `portfolio-${item.id}-${safeName}`, 'portfolio').then(path => {
                          updateArrayField('portfolio', 'items', index, 'imgSrc', path);
                        });
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'leadership' && (
            <div className="space-y-8">
              {data.leadership.items.map((person, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-sage/20 rounded-xl bg-cream/10">
                  <div className="space-y-4">
                    <Field label="Name" value={person.name} onChange={(val) => updateArrayField('leadership', 'items', index, 'name', val)} />
                    <Field label="Role" value={person.role} onChange={(val) => updateArrayField('leadership', 'items', index, 'role', val)} />
                    <Field label="Brief" textarea value={person.brief} onChange={(val) => updateArrayField('leadership', 'items', index, 'brief', val)} />
                  </div>
                  <div>
                    <ImageUploadField 
                      label="Upload Profile Photo" 
                      currentImg={person.imgSrc}
                      onUpload={(file) => {
                        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
                        return handleImageUpload(file, `leader-${index}-${safeName}`, 'leadership').then(path => {
                          updateArrayField('leadership', 'items', index, 'imgSrc', path);
                        });
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contact' && (
            <>
              <Field label="Section Title" value={data.contact.title} onChange={(val) => updateField('contact', 'title', val)} />
              <Field label="Subtitle" value={data.contact.subtitle} onChange={(val) => updateField('contact', 'subtitle', val)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-sage/20">
                <Field label="Phone Number" value={data.contact.phone} onChange={(val) => updateField('contact', 'phone', val)} />
                <Field label="Email Address" value={data.contact.email} onChange={(val) => updateField('contact', 'email', val)} />
              </div>
              <Field label="Office Address" textarea value={data.contact.address} onChange={(val) => updateField('contact', 'address', val)} />
              <Field label="Footer Text" value={data.contact.footer} onChange={(val) => updateField('contact', 'footer', val)} />
            </>
          )}
          
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea }) {
  return (
    <div>
      <label className="block text-sm font-medium text-forest mb-2">{label}</label>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none transition bg-cream/30 min-h-[120px]"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none transition bg-cream/30"
        />
      )}
    </div>
  );
}

function ImageUploadField({ label, currentImg, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const imgUrl = currentImg ? `https://zenithorionis.github.io/MCP${currentImg}` : null;

  return (
    <div>
      <label className="block text-sm font-medium text-forest mb-2">{label}</label>
      <div className="flex flex-col gap-3">
        {imgUrl ? (
          <div className="relative w-full aspect-video bg-sage/10 rounded-lg overflow-hidden border border-sage/20 flex items-center justify-center">
            <img src={imgUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className="w-full aspect-video bg-sage/10 rounded-lg border border-sage/20 border-dashed flex flex-col items-center justify-center text-sage">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <span className="text-sm">No image uploaded</span>
          </div>
        )}
        
        <label className="cursor-pointer bg-cream border border-forest text-forest px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest hover:text-cream transition flex items-center justify-center gap-2">
          {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading to GitHub...' : 'Choose New Image'}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
