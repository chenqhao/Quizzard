'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { ClipboardText } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Envelope } from '@phosphor-icons/react/dist/ssr/Envelope';
import { Hourglass } from '@phosphor-icons/react/dist/ssr/Hourglass';
import { Users } from '@phosphor-icons/react/dist/ssr/Users';
import { Handshake } from '@phosphor-icons/react/dist/ssr/Handshake';

export default function FriendsPage() {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [friendCode, setFriendCode] = useState('');
  const [addCode, setAddCode] = useState('');
  const [friends, setFriends] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadAll = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      // Get own friend code
      const { data: profile } = await supabase
        .from('profiles')
        .select('friend_code')
        .eq('id', u.id)
        .single();
      setFriendCode(profile?.friend_code || '');

      // Get all friendships involving this user
      const { data: allFriendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${u.id},friend_id.eq.${u.id}`);

      if (allFriendships) {
        const accepted = allFriendships.filter(f => f.status === 'accepted');
        const incoming = allFriendships.filter(f => f.status === 'pending' && f.friend_id === u.id);
        const outgoing = allFriendships.filter(f => f.status === 'pending' && f.user_id === u.id);

        // Load profiles for all related users
        const otherIds = allFriendships.map(f => f.user_id === u.id ? f.friend_id : f.user_id);
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, friend_code')
            .in('id', otherIds);

          const profileMap = {};
          profiles?.forEach(p => { profileMap[p.id] = p; });

          setFriends(accepted.map(f => {
            const otherId = f.user_id === u.id ? f.friend_id : f.user_id;
            return { ...f, profile: profileMap[otherId] || {} };
          }));

          setPendingIncoming(incoming.map(f => ({
            ...f, profile: profileMap[f.user_id] || {}
          })));

          setPendingOutgoing(outgoing.map(f => ({
            ...f, profile: profileMap[f.friend_id] || {}
          })));
        }
      }
    } catch (err) {
      console.error('Load friends error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    const code = addCode.trim().toUpperCase();
    if (!code) return;
    setAdding(true);

    try {
      // Look up the friend by their code
      const { data: friendProfile, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, full_name, friend_code')
        .eq('friend_code', code)
        .single();

      if (lookupErr || !friendProfile) {
        showMessage('No user found with that code. Double-check and try again.', 'error');
        setAdding(false);
        return;
      }

      if (friendProfile.id === user.id) {
        showMessage("That's your own code!", 'error');
        setAdding(false);
        return;
      }

      // Check for existing friendship
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`);

      if (existing && existing.length > 0) {
        const f = existing[0];
        if (f.status === 'accepted') {
          showMessage('You are already friends!', 'error');
        } else {
          showMessage('A friend request already exists.', 'error');
        }
        setAdding(false);
        return;
      }

      // Send friend request
      const { error: insertErr } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendProfile.id,
          status: 'pending',
        });

      if (insertErr) throw insertErr;

      showMessage(`Friend request sent to ${friendProfile.full_name || 'user'}!`);
      setAddCode('');
      loadAll();
    } catch (err) {
      console.error('Add friend error:', err);
      showMessage('Failed to send friend request.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      showMessage('Friend request accepted!');
      loadAll();
    } catch (err) {
      showMessage('Failed to accept request.', 'error');
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      showMessage('Friend request declined.');
      loadAll();
    } catch (err) {
      showMessage('Failed to decline request.', 'error');
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      showMessage('Friend removed.');
      loadAll();
    } catch (err) {
      showMessage('Failed to remove friend.', 'error');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="h-40 rounded-2xl animate-shimmer" />
        <div className="h-64 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Friends
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Add friends by their unique code and share quizzes together.
        </p>
      </div>

      {/* Toast */}
      {message && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium animate-scale-in flex items-center gap-2"
          style={{
            background: message.type === 'error'
              ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
              : 'color-mix(in srgb, var(--success) 12%, transparent)',
            color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
            border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          }}
        >
          {message.type === 'error' ? <Warning weight="fill" size={16} /> : <Check weight="bold" size={16} />}
          {message.text}
        </div>
      )}

      {/* Your Friend Code */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
          Your Friend Code
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Share this code with friends so they can add you.
        </p>
        <div className="flex items-center gap-3">
          <div
            className="px-6 py-3 rounded-xl text-xl font-mono font-bold tracking-widest"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--secondary) 10%, transparent))',
              color: 'var(--primary)',
              border: '2px dashed var(--primary)',
            }}
          >
            {friendCode}
          </div>
          <button
            onClick={copyCode}
            className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${copied ? 'copy-flash' : ''}`}
            style={{
              background: copied ? 'var(--success)' : 'var(--primary)',
              color: copied ? 'var(--success-foreground)' : 'var(--primary-foreground)',
            }}
          >
            {copied ? (
              <span className="flex items-center gap-1.5"><Check weight="bold" size={16} /> Copied!</span>
            ) : (
              <span className="flex items-center gap-1.5"><ClipboardText weight="fill" size={16} /> Copy</span>
            )}
          </button>
        </div>
      </div>

      {/* Add Friend */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
          Add a Friend
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Enter your friend&apos;s unique code to send them a request.
        </p>
        <div className="flex gap-3">
          <input
            id="add-friend-input"
            type="text"
            value={addCode}
            onChange={(e) => setAddCode(e.target.value.toUpperCase())}
            placeholder="SQ-XXXXXX"
            className="flex-1 px-4 py-3 rounded-xl border text-sm font-mono tracking-wider outline-none transition-all"
            style={{
              background: 'var(--muted)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
          />
          <button
            id="send-friend-request-btn"
            onClick={handleAddFriend}
            disabled={adding || !addCode.trim()}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'var(--primary-foreground)',
            }}
          >
            {adding ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>

      {/* Pending Incoming */}
      {pendingIncoming.length > 0 && (
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Envelope weight="fill" size={20} className="text-[var(--primary)]" /> Pending Requests
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold badge-pulse"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {pendingIncoming.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingIncoming.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-xl animate-fade-in"
                style={{ background: 'var(--muted)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'var(--primary-foreground)' }}
                  >
                    {req.profile?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {req.profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                      {req.profile?.friend_code}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
                    style={{ background: 'var(--success)', color: 'var(--success-foreground)' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
                    style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Outgoing */}
      {pendingOutgoing.length > 0 && (
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Hourglass weight="fill" size={20} className="text-[var(--warning)]" /> Sent Requests
          </h2>
          <div className="space-y-3">
            {pendingOutgoing.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--muted)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--muted-foreground)', color: 'var(--background)' }}
                  >
                    {req.profile?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {req.profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Pending...</p>
                  </div>
                </div>
                <button
                  onClick={() => handleReject(req.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={{ color: 'var(--danger)' }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Users weight="fill" size={20} className="text-[var(--primary)]" /> Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-8">
            <span className="mb-3 flex justify-center text-[var(--muted-foreground)] opacity-50"><Handshake weight="regular" size={48} /></span>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No friends yet. Share your code or add someone!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend, i) => (
              <div
                key={friend.id}
                className={`flex items-center justify-between p-4 rounded-xl transition-all hover:bg-[var(--sidebar-accent)] animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{ background: 'var(--muted)', opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {friend.profile?.avatar_url ? (
                      <img
                        src={friend.profile.avatar_url}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border-2"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'var(--primary-foreground)' }}
                      >
                        {friend.profile?.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{ background: 'var(--success)', borderColor: 'var(--card)' }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {friend.profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                      {friend.profile?.friend_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="p-2 rounded-lg text-xs transition-all hover:bg-[var(--muted)] cursor-pointer"
                  style={{ color: 'var(--muted-foreground)' }}
                  title="Remove friend"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
