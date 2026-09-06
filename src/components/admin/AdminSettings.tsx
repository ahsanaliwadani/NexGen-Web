import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { authFetch } from '../../lib/api.ts';
import {
  Settings,
  Save,
  Bell,
  Building,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { SiteSettings } from '../../types.ts';

export const AdminSettings: React.FC = () => {
  const { settings, refreshData, addToast } = useApp();
  const [formData, setFormData] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);

  if (!formData) {
    return <div className="p-8 text-center text-slate-400">Loading website settings...</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to save settings');

      addToast('Website settings and content updated successfully!', 'success');
      await refreshData();
    } catch (err: any) {
      addToast(err.message || 'Error updating settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Website Content &amp; Global Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify live branding statements, announcement banners, metrics counters, and contact channels.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-950 text-white text-xs font-bold hover:bg-indigo-900 transition-colors shadow-md cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4 text-amber-400" />
          <span>{saving ? 'Saving Live Changes...' : 'Save & Publish Live'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Announcement Banner */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <h3 className="font-serif font-bold text-base text-slate-900">Top Announcement Banner</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.announcementBanner?.enabled ?? formData.announcementBannerEnabled ?? false}
                onChange={e =>
                  setFormData({
                    ...formData,
                    announcementBannerEnabled: e.target.checked,
                    announcementBanner: {
                      enabled: e.target.checked,
                      text: formData.announcementBanner?.text || formData.announcementBannerText || ''
                    }
                  })
                }
                className="w-4 h-4 rounded text-indigo-950"
              />
              <span className="font-semibold text-slate-700">Display on Public Site</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Banner Announcement Text</label>
            <input
              type="text"
              value={formData.announcementBanner?.text ?? formData.announcementBannerText ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  announcementBannerText: e.target.value,
                  announcementBanner: {
                    enabled: formData.announcementBanner?.enabled ?? formData.announcementBannerEnabled ?? true,
                    text: e.target.value
                  }
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* Hero & Identity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-indigo-950" />
            <h3 className="font-serif font-bold text-base text-slate-900">Hero Section &amp; Tagline</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organization Legal Name</label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={e => setFormData({ ...formData, organizationName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Public Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Display Headline</label>
            <input
              type="text"
              value={formData.heroTitle || formData.heroHeading || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  heroTitle: e.target.value,
                  heroHeading: e.target.value
                })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Subtitle Paragraph</label>
            <textarea
              rows={3}
              value={formData.heroSubtitle || formData.heroSubheading || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  heroSubtitle: e.target.value,
                  heroSubheading: e.target.value
                })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 leading-relaxed"
            />
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-indigo-950" />
            <h3 className="font-serif font-bold text-base text-slate-900">Charter Statements</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Mission Statement</label>
              <textarea
                rows={4}
                value={formData.missionStatement || ''}
                onChange={e => setFormData({ ...formData, missionStatement: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 leading-relaxed"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Strategic Vision 2030</label>
              <textarea
                rows={4}
                value={formData.visionStatement || ''}
                onChange={e => setFormData({ ...formData, visionStatement: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Impact Statistics Counters */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <h3 className="font-serif font-bold text-base text-slate-900">Impact Metrics Counter</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Volunteers Trained</label>
              <input
                type="text"
                value={formData.stats.volunteersCount || String(formData.stats.volunteersTrained || '1,200+')}
                onChange={e =>
                  setFormData({
                    ...formData,
                    stats: {
                      ...formData.stats,
                      volunteersCount: e.target.value,
                      volunteersTrained: parseInt(e.target.value.replace(/\D/g, '')) || 0
                    }
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Communities Reached</label>
              <input
                type="text"
                value={formData.stats.communitiesCount || String(formData.stats.communitiesReached || '48')}
                onChange={e =>
                  setFormData({
                    ...formData,
                    stats: {
                      ...formData.stats,
                      communitiesCount: e.target.value,
                      communitiesReached: parseInt(e.target.value.replace(/\D/g, '')) || 0
                    }
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Programs Active</label>
              <input
                type="text"
                value={formData.stats.programsCount || String(formData.stats.programsActive || '12')}
                onChange={e =>
                  setFormData({
                    ...formData,
                    stats: {
                      ...formData.stats,
                      programsCount: e.target.value,
                      programsActive: parseInt(e.target.value.replace(/\D/g, '')) || 0
                    }
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Partner Institutions</label>
              <input
                type="text"
                value={formData.stats.beneficiariesCount || String(formData.stats.partnerInstitutions || '25+')}
                onChange={e =>
                  setFormData({
                    ...formData,
                    stats: {
                      ...formData.stats,
                      beneficiariesCount: e.target.value,
                      partnerInstitutions: parseInt(e.target.value.replace(/\D/g, '')) || 0
                    }
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Contact Channels */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail className="w-4 h-4 text-indigo-950" />
            <h3 className="font-serif font-bold text-base text-slate-900">Public Contact Secretariat</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Public Contact Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Helpline Phone Number</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Physical Office / Secretariat Address</label>
            <input
              type="text"
              value={formData.officeAddress}
              onChange={e => setFormData({ ...formData, officeAddress: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-950 text-white font-bold text-xs hover:bg-indigo-900 transition-colors shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving Live Changes...' : 'Save & Publish Live'}
          </button>
        </div>
      </form>
    </div>
  );
};
