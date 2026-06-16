import { useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';
import { Save, LogIn, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
      // Verify token works by getting user
      await client.rest.users.getAuthenticated();
      
      setOctokit(client);
      localStorage.setItem('github_pat', token);
      setIsAuthenticated(true);
      setMessage({ text: 'Successfully authenticated!', type: 'success' });
      
      // Fetch data
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

      // GitHub returns base64 encoded content
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
            {saving ? 'Saving...' : 'Publish Changes'}
          </button>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-lg flex items-start gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-600' : message.type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-forest border border-mint'}`}>
            {message.type === 'error' ? <AlertCircle size={20} className="flex-shrink-0" /> : <CheckCircle size={20} className="flex-shrink-0 text-mint" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-sage/20 p-6 md:p-8 space-y-6">
          {/* Form Fields base on activeTab */}
          
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

          {/* Note: In a real complete app, we'd add tabs for Services, Products, etc. For this prototype, I'm just showing Hero, About, and Contact. */}
          
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none transition bg-cream/30 min-h-[120px]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-sage/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none transition bg-cream/30"
        />
      )}
    </div>
  );
}
