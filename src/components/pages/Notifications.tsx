import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Loader2, Send, CheckCheck, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToInvitations,
  subscribeToNotifications,
  respondToInvitation,
  getProfile,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Invitation,
  Notification as NotificationType
} from '@/services/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface NotificationsProps {
  onNavigateToMessages?: (conversationId: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ onNavigateToMessages }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [incoming, setIncoming] = useState<Invitation[]>([]);
  const [outgoing, setOutgoing] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invitations' | 'all'>('invitations');

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    const unsubInvitations = subscribeToInvitations(user.uid, (inc, out) => {
  setIncoming(inc);
  setOutgoing(out);
  setLoading(false);
});


    const unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubInvitations();
      unsubNotifications();
    };
  }, [user]);

  const handleRespond = async (invitation: Invitation, accept: boolean) => {
    if (!user) return;
    setProcessingId(invitation.id);

    try {
      if (accept) {
        const profile = await getProfile(user.uid);
        if (profile?.teamId) {
          toast.error('You are already in a team. Leave your current team before joining another.');
          setProcessingId(null);
          return;
        }
      }

      await respondToInvitation(
        invitation.id,
        accept ? 'accepted' : 'rejected',
        accept ? invitation.teamId : undefined,
        accept ? user.uid : undefined,
        accept ? 'Member' : undefined
      );

      toast.success(accept ? `Joined ${invitation.teamName}!` : 'Invitation declined');
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      toast.error(error.message || 'Failed to respond to invitation');
    }

    setProcessingId(null);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    if (!notification.read) await handleMarkAsRead(notification.id);
    if (notification.type === 'MESSAGE' && notification.conversationId && onNavigateToMessages) {
      onNavigateToMessages(notification.conversationId);
    }
  };

  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-base p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              className="btn-secondary text-sm"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Invitations ({incoming.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({notifications.length})
          </button>
        </div>
      </div>

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <div className="card-base p-8 text-center">
              <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            incoming.map((inv) => (
              <div key={inv.id} className="card-base p-4">
                <div className="flex items-start gap-3">
                  {/* Sender Avatar */}
                  <img
  src={`https://api.dicebear.com/7.x/initials/svg?seed=${inv.fromUserName}`}
  alt={inv.fromUserName}
  className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
  onClick={() => navigate(`/profile/${inv.fromUserId}`)}
/>
<p
  className="text-foreground mb-1 cursor-pointer font-semibold"
  onClick={() => navigate(`/profile/${inv.fromUserId}`)}
>
  {inv.fromUserName} invited you to join
</p>


                  <div className="flex-1 min-w-0">
                    <p
                      className="text-foreground mb-1 cursor-pointer font-semibold"
                      onClick={() => navigate(`/profile/${inv.fromUserId}`)}
                    >
                      {inv.fromUserName} invited you to join
                    </p>

                    {/* Team Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <img
  src={`https://api.dicebear.com/7.x/initials/svg?seed=${inv.teamName}`}
  alt={inv.teamName}
  className="w-6 h-6 rounded-md object-cover cursor-pointer hover:opacity-80 transition"
  onClick={() => navigate(`/teams/${inv.teamId}`)}
/>
                      <strong className="text-sm">{inv.teamName}</strong>
                    </div>

                    {inv.message && (
                      <p className="text-sm text-muted-foreground italic mb-2">
                        "{inv.message}"
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mb-3">
                      {formatTimestamp(inv.createdAt)}
                    </p>

                    {/* Buttons aligned neatly */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRespond(inv, true)}
                        disabled={processingId === inv.id}
                        className="btn-primary text-sm flex items-center gap-1.5"
                      >
                        {processingId === inv.id ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Accept
                      </button>

                      <button
                        onClick={() => handleRespond(inv, false)}
                        disabled={processingId === inv.id}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* All Notifications Tab remains unchanged */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="card-base p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`card-base p-4 cursor-pointer transition-colors ${
                  !notif.read ? 'bg-primary/5 border-primary/20' : 'hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      notif.type === 'MESSAGE'
                        ? 'bg-skill-mobile/10 text-skill-mobile'
                        : notif.type === 'ACCEPTED'
                        ? 'bg-primary/10 text-primary'
                        : notif.type === 'REJECTED'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-accent/10 text-accent'
                    }`}
                  >
                    {notif.type === 'MESSAGE' && <MessageCircle className="w-4 h-4" />}
                    {notif.type === 'INVITE' && <Send className="w-4 h-4" />}
                    {notif.type === 'ACCEPTED' && <CheckCheck className="w-4 h-4" />}
                    {notif.type === 'REJECTED' && <X className="w-4 h-4" />}
                    {!['MESSAGE','INVITE','ACCEPTED','REJECTED'].includes(notif.type) && <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground mb-1">
                      <strong>{notif.fromUserName}</strong> {notif.message || notif.type}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(notif.createdAt)}
                      </p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
