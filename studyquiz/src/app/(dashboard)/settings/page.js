'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Copy } from '@phosphor-icons/react/dist/ssr/Copy';
import { Envelope } from '@phosphor-icons/react/dist/ssr/Envelope';
import { Moon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Sun } from '@phosphor-icons/react/dist/ssr/Sun';
import { SignOut } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UploadSimple } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Lock } from '@phosphor-icons/react/dist/ssr/Lock';
import { Eye } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash } from '@phosphor-icons/react/dist/ssr/EyeSlash';

const icons = {
  copy: <Copy size={16} />,
  check: <Check size={16} />,
  mail: <Envelope size={16} />,
  moon: <Moon size={18} />,
  sun: <Sun size={18} />,
  logout: <SignOut size={16} />,
  upload: <UploadSimple size={24} color="white" />,
  lock: <Lock size={16} />,
};

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const [isDark, setIsDark] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Password change fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFullName(user.user_metadata?.full_name || '');
        setDisplayName(user.user_metadata?.display_name || '');
        setAvatarUrl(user.user_metadata?.avatar_url || '');

        // Load friend code from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('friend_code')
          .eq('id', user.id)
          .single();
        setFriendCode(profile?.friend_code || '');
      }
    } catch (err) {
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showMessage('Image must be under 2MB.', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('Avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Avatars')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: urlWithCacheBust },
      });

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      showMessage('Profile picture updated!');
    } catch (err) {
      console.error('Avatar upload error:', err);
      showMessage(`Failed to upload picture: ${err.message}`, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: '' },
      });
      if (error) throw error;
      setAvatarUrl('');
      showMessage('Profile picture removed.');
    } catch (err) {
      console.error('Remove avatar error:', err);
      showMessage('Failed to remove picture.', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          display_name: displayName.trim(),
        },
      });

      if (error) throw error;
      showMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Save profile error:', err);
      showMessage('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showMessage('Please fill in both password fields.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      showMessage('Password updated successfully!');
    } catch (err) {
      console.error('Change password error:', err);
      showMessage(err.message || 'Failed to update password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
      showMessage('Theme changed to Light Mode');
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
      showMessage('Theme changed to Dark Mode');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const initials = fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="type-title1 mb-2">Settings</h1>
        <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>
          Manage your profile and account preferences.
        </p>
      </div>

      {/* Toast Message (Liquid Glass styling) */}
      {message && (
        <div
          className="px-4 py-3 rounded-xl type-footnote font-medium flex items-center gap-2 animate-slide-up glass-badge"
          style={{
            background: message.type === 'error'
              ? 'color-mix(in srgb, var(--danger) 15%, var(--glass-ultra-thin-bg))'
              : 'color-mix(in srgb, var(--success) 15%, var(--glass-ultra-thin-bg))',
            color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
            border: `0.5px solid color-mix(in srgb, ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'} 30%, transparent)`,
          }}
        >
          <span className="flex items-center justify-center">{message.type === 'error' ? <Warning weight="fill" /> : <Check weight="bold" />}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* HIG Grouped List Pattern */}
      <div className="space-y-8">

        {/* SECTION 1: Avatar & Profile Info */}
        <div>
          <h2 className="section-header mb-3 px-2">Account</h2>
          <div className="hig-grouped-section space-y-6">

            {/* Profile Picture */}
            <div className="flex items-center gap-6 pb-6" style={{ borderBottom: '0.5px solid var(--glass-regular-border)' }}>
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300"
                  style={{
                    background: avatarUrl
                      ? 'var(--glass-ultra-thin-bg)'
                      : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    border: '0.5px solid var(--glass-ultra-thin-border)',
                    boxShadow: 'var(--specular-inner), var(--shadow-sm)'
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="type-title1 text-white">{initials}</span>
                  )}
                </div>
                {/* Upload overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
                  ) : icons.upload}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover-lift depth-press"
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)'
                  }}
                >
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>
                {avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="block px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--muted)] cursor-pointer"
                    style={{ color: 'var(--danger)' }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="type-footnote font-semibold px-1" style={{ color: 'var(--foreground)' }}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-4 py-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="type-footnote font-semibold px-1" style={{ color: 'var(--foreground)' }}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Choose a display name"
                    className="w-full px-4 py-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="type-footnote font-semibold px-1" style={{ color: 'var(--foreground)' }}>Email</label>
                <div
                  className="w-full px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
                  style={{
                    background: 'var(--glass-ultra-thin-bg)',
                    border: '0.5px solid var(--glass-ultra-thin-border)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {icons.mail}
                  {user?.email}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover-lift depth-press"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: 'var(--primary-foreground)',
                    boxShadow: 'var(--shadow-md), inset 0 0.5px 0 0 rgba(255,255,255,0.4)',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
          <p className="section-subtitle px-2">These details help your study group members identify you.</p>
        </div>

        {/* SECTION 2: Friend Code */}
        <div>
          <h2 className="section-header mb-3 px-2">Your Friend Code</h2>
          <div className="hig-grouped-section flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="type-body" style={{ color: 'var(--foreground)' }}>Share this code</p>
              <p className="type-footnote mt-1" style={{ color: 'var(--muted-foreground)' }}>Others can use this to add you as a friend.</p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="px-4 py-2 rounded-xl text-lg font-mono font-bold tracking-widest"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                  color: 'var(--primary)',
                  border: '1px dashed var(--primary)',
                }}
              >
                {friendCode || '...'}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(friendCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 depth-press ${codeCopied ? 'copy-flash' : ''}`}
                style={{
                  background: codeCopied ? 'var(--success)' : 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)'
                }}
                disabled={!friendCode}
              >
                {codeCopied ? icons.check : icons.copy}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: Preferences */}
        <div>
          <h2 className="section-header mb-3 px-2">Preferences</h2>
          <div className="hig-grouped-section flex items-center justify-between">
            <div>
              <p className="type-body font-medium" style={{ color: 'var(--foreground)' }}>Theme Mode</p>
              <p className="type-footnote mt-1" style={{ color: 'var(--muted-foreground)' }}>Switch between light and dark UI.</p>
            </div>

            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl type-footnote font-semibold transition-all duration-200 flex items-center gap-2 depth-press"
              style={{
                background: 'var(--glass-ultra-thin-bg)',
                border: '0.5px solid var(--glass-ultra-thin-border)',
                color: 'var(--foreground)',
                boxShadow: 'var(--specular-inner)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--muted)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-ultra-thin-bg)'; }}
            >
              {isDark ? icons.sun : icons.moon}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>

        {/* SECTION 4: Change Password */}
        <div>
          <h2 className="section-header mb-3 px-2">Security</h2>
          <div className="hig-grouped-section space-y-4">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '0.5px solid var(--glass-regular-border)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  color: 'var(--primary)',
                  border: '0.5px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                }}
              >
                {icons.lock}
              </div>
              <div>
                <p className="type-body font-medium" style={{ color: 'var(--foreground)' }}>Change Password</p>
                <p className="type-footnote mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Update your account password.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="type-footnote font-semibold px-1" style={{ color: 'var(--foreground)' }}>New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                    style={{ color: 'var(--muted-foreground)' }}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {newPassword && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-ultra-thin-bg)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: newPassword.length < 6 ? '33%' : newPassword.length < 10 ? '66%' : '100%',
                          background: newPassword.length < 6 ? 'var(--danger)' : newPassword.length < 10 ? 'var(--warning)' : 'var(--success)',
                        }}
                      />
                    </div>
                    <span
                      className="type-caption2 font-medium"
                      style={{ color: newPassword.length < 6 ? 'var(--danger)' : newPassword.length < 10 ? 'var(--warning)' : 'var(--success)' }}
                    >
                      {newPassword.length < 6 ? 'Too short' : newPassword.length < 10 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="type-footnote font-semibold px-1" style={{ color: 'var(--foreground)' }}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                    style={{ color: 'var(--muted-foreground)' }}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="type-caption2 px-1 pt-1" style={{ color: 'var(--danger)' }}>
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover-lift depth-press disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: 'var(--primary-foreground)',
                  boxShadow: 'var(--shadow-md), inset 0 0.5px 0 0 rgba(255,255,255,0.4)',
                }}
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
          <p className="section-subtitle px-2">Password must be at least 6 characters long.</p>
        </div>

        {/* SECTION 5: Danger Zone */}
        <div>
          <h2 className="section-header mb-3 px-2 text-danger" style={{ color: 'var(--danger)' }}>Sign Out</h2>
          <div className="hig-grouped-section" style={{ borderColor: 'color-mix(in srgb, var(--danger) 20%, var(--glass-regular-border))' }}>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer depth-press"
              style={{
                background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
                color: 'var(--danger)',
                border: '0.5px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 20%, transparent)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 12%, transparent)'}
            >
              {icons.logout}
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
