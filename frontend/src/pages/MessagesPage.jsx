import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImagePlus,
  Mic,
  Search,
  Send,
  Smile,
  Sparkles,
  X,
  MessageCircle,
  Circle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

const formatRelativeTime = (value) => {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(delta / 3600000);
  const days = Math.floor(delta / 86400000);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
};

const formatDateDivider = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const sameYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (sameDay) return 'Today';
  if (sameYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatClockTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

const getOtherParticipants = (conversation, currentUserId) =>
  (conversation?.participants || []).filter((participant) => participant?._id !== currentUserId);

const getConversationPreview = (conversation) => {
  const lastMessage = conversation?.lastMessage;
  if (!lastMessage) return 'Start the conversation';
  if (lastMessage.media?.length) return lastMessage.media.length > 1 ? `${lastMessage.media.length} media items` : 'Photo';
  if (lastMessage.text) return lastMessage.text;
  return 'Sent a message';
};

const getConversationTime = (conversation) => formatRelativeTime(conversation?.lastMessage?.createdAt || conversation?.updatedAt);

const hasUnreadMessage = (conversation, currentUserId) => {
  const lastMessage = conversation?.lastMessage;
  if (!lastMessage || !currentUserId) return false;
  const senderId = lastMessage.sender?._id || lastMessage.sender;
  if (String(senderId) === String(currentUserId)) return false;
  return !(lastMessage.seenBy || []).some((seenId) => String(seenId) === String(currentUserId));
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

const makeFallbackPeople = (people = [], conversations = [], currentUserId) => {
  const merged = new Map();

  [...people, ...conversations.flatMap((conversation) => getOtherParticipants(conversation, null))].forEach((person) => {
    if (!person?._id) return;
    if (currentUserId && String(person._id) === String(currentUserId)) return;
    merged.set(person._id, person);
  });

  return [...merged.values()];
};

const randomSeed = (value) =>
  value
    .split('')
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);

const fallbackPreview = (username) => {
  const items = [
    'Sent a reel',
    'Typing something new',
    'Shared a photo',
    'Reacted to your story',
    'Ready to chat',
    'Just now online',
  ];
  return items[randomSeed(username) % items.length];
};

const fallbackTime = (username) => {
  const minutes = (randomSeed(username) % 240) + 1;
  const timestamp = Date.now() - minutes * 60000;
  return formatRelativeTime(timestamp);
};

export default function MessagesPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [activeUserId, setActiveUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const attachmentInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingStopTimerRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation._id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const activeParticipant = useMemo(() => getOtherParticipants(activeConversation, user?._id)[0] || null, [activeConversation, user?._id]);

  const conversationByUserId = useMemo(() => {
    const map = new Map();
    conversations.forEach((conversation) => {
      getOtherParticipants(conversation, user?._id).forEach((participant) => {
        map.set(participant._id, conversation);
      });
    });
    return map;
  }, [conversations, user?._id]);

  const visiblePeople = useMemo(() => {
    const basePeople = searchQuery.trim() ? searchResults : makeFallbackPeople(people, conversations, user?._id);
    const query = searchQuery.trim().toLowerCase();
    const merged = basePeople.filter((person) => {
      if (!query) return true;
      const text = `${person.name || ''} ${person.username || ''} ${person.bio || ''}`.toLowerCase();
      return text.includes(query);
    });

    const enriched = merged.map((person) => {
      const conversation = conversationByUserId.get(person._id) || null;
      return {
        ...person,
        conversation,
      };
    });

    return enriched.sort((left, right) => {
      const leftConversation = left.conversation;
      const rightConversation = right.conversation;
      if (leftConversation && !rightConversation) return -1;
      if (!leftConversation && rightConversation) return 1;
      const leftTime = new Date(leftConversation?.updatedAt || 0).getTime();
      const rightTime = new Date(rightConversation?.updatedAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [people, conversations, searchResults, searchQuery, conversationByUserId]);

  const openConversationForUser = async (person) => {
    if (!person?._id) return;

    const existingConversation = conversationByUserId.get(person._id);
    if (existingConversation) {
      setActiveConversationId(existingConversation._id);
      setActiveUserId(person._id);
      return;
    }

    try {
      const { data } = await api.post('/chats/conversations', { recipientId: person._id });
      const conversation = data.conversation;

      setConversations((current) => [conversation, ...current.filter((item) => item._id !== conversation._id)]);
      setActiveConversationId(conversation._id);
      setActiveUserId(person._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not open conversation');
    }
  };

  useEffect(() => {
    const loadInbox = async () => {
      setLoadingConversations(true);
      setLoadingPeople(true);
      try {
        const [conversationResponse, peopleResponse] = await Promise.all([
          api.get('/chats/conversations'),
          api.get('/search/users', { params: { q: '' } }),
        ]);

        const nextConversations = conversationResponse.data.conversations || [];
        const nextPeople = (peopleResponse.data.users || []).filter((person) => String(person._id) !== String(user?._id));

        setConversations(nextConversations);
        setPeople(nextPeople.sort(() => Math.random() - 0.5));

        if (!activeConversationId) {
          const firstConversation = nextConversations[0];
          const firstPerson = nextPeople[0];
          if (firstConversation) {
            setActiveConversationId(firstConversation._id);
            setActiveUserId(getOtherParticipants(firstConversation, user?._id)[0]?._id || '');
          } else if (firstPerson) {
            await openConversationForUser(firstPerson);
          }
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not load conversations');
      } finally {
        setLoadingConversations(false);
        setLoadingPeople(false);
      }
    };

    loadInbox();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchResults([]);
        return;
      }

      try {
        const { data } = await api.get('/search/users', { params: { q: query } });
        setSearchResults((data.users || []).sort(() => Math.random() - 0.5));
      } catch (_error) {
        setSearchResults([]);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setTypingIndicator(false);
      return undefined;
    }

    let ignore = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const [messagesResponse] = await Promise.all([
          api.get(`/chats/conversations/${activeConversationId}/messages`),
          api.patch(`/chats/conversations/${activeConversationId}/seen`).catch(() => null),
        ]);

        if (ignore) return;
        setMessages(messagesResponse.data.messages || []);
        setTypingIndicator(false);
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || 'Could not load messages');
        }
      } finally {
        if (!ignore) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!socket || !activeConversationId) return undefined;

    socket.emit('conversation:join', activeConversationId);

    const handleNewMessage = (incomingMessage) => {
      const conversationId = incomingMessage.conversation?._id || incomingMessage.conversation;
      const incomingConversationId = String(conversationId);

      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation._id === incomingConversationId
            ? {
                ...conversation,
                lastMessage: incomingMessage,
                updatedAt: new Date().toISOString(),
              }
            : conversation
        );

        return next.sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
      });

      if (incomingConversationId === String(activeConversationId)) {
        setMessages((current) => (current.some((message) => message._id === incomingMessage._id) ? current : [...current, incomingMessage]));
      }
    };

    const handleTypingUpdate = ({ conversationId, userId, typing }) => {
      if (String(conversationId) !== String(activeConversationId)) return;
      if (String(userId) === String(user?._id)) return;
      setTypingIndicator(Boolean(typing));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:update', handleTypingUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [socket, activeConversationId, user?._id]);

  useEffect(() => {
    if (!socket || !activeConversationId || !user?._id) return undefined;

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    if (!messageText.trim()) {
      socket.emit('typing:stop', {
        conversationId: activeConversationId,
        userId: user._id,
      });
      setTypingIndicator(false);
      return undefined;
    }

    socket.emit('typing:start', {
      conversationId: activeConversationId,
      userId: user._id,
    });

    typingStopTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', {
        conversationId: activeConversationId,
        userId: user._id,
      });
    }, 900);

    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
    };
  }, [messageText, activeConversationId, socket, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeConversationId, typingIndicator]);

  const handleConversationSelect = async (person) => {
    setActiveUserId(person._id);
    await openConversationForUser(person);
    setMessageText('');
    setAttachmentPreview(null);
  };

  const openAttachmentPicker = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image uploads are supported in the composer');
      return;
    }

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setAttachmentPreview({
        name: file.name,
        url: previewUrl,
        type: 'image',
      });
      toast.success('Image attached');
    } catch (_error) {
      toast.error('Could not attach the file');
    }
  };

  const clearAttachment = () => {
    setAttachmentPreview(null);
  };

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!activeConversationId || (!text && !attachmentPreview)) return;

    try {
      const payload = { text };
      if (attachmentPreview) {
        payload.media = [{ url: attachmentPreview.url, type: 'image' }];
      }

      const { data } = await api.post(`/chats/conversations/${activeConversationId}/messages`, payload);
      const sentMessage = data.message;

      setMessages((current) => (current.some((message) => message._id === sentMessage._id) ? current : [...current, sentMessage]));
      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation._id === activeConversationId
            ? {
                ...conversation,
                lastMessage: sentMessage,
                updatedAt: new Date().toISOString(),
              }
            : conversation
        );
        return next.sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
      });

      setPeople((current) =>
        current.map((person) =>
          person._id === activeUserId
            ? {
                ...person,
                conversation: {
                  ...(person.conversation || {}),
                  lastMessage: sentMessage,
                  updatedAt: new Date().toISOString(),
                },
              }
            : person
        )
      );

      setSearchResults((current) =>
        current.map((person) =>
          person._id === activeUserId
            ? {
                ...person,
                conversation: {
                  ...(person.conversation || {}),
                  lastMessage: sentMessage,
                  updatedAt: new Date().toISOString(),
                },
              }
            : person
        )
      );

      setMessageText('');
      setAttachmentPreview(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send message');
    }
  };

  const renderMessageMedia = (message) => {
    if (!message.media?.length) return null;

    return (
      <div className="dm-media-grid">
        {message.media.map((mediaItem, index) => (
          <div key={`${message._id}-${mediaItem.url}-${index}`} className="dm-media-item">
            {mediaItem.type === 'video' ? (
              <video src={mediaItem.url} controls className="dm-media-content" />
            ) : (
              <img src={mediaItem.url} alt="message media" className="dm-media-content" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const threadItems = [];
  let previousDivider = '';

  messages.forEach((message) => {
    const divider = formatDateDivider(message.createdAt);
    if (divider !== previousDivider) {
      threadItems.push({ type: 'divider', label: divider, key: `divider-${message._id}` });
      previousDivider = divider;
    }
    threadItems.push({ type: 'message', message, key: message._id });
  });

  return (
    <div className="dm-shell">
      <section className="dm-sidebar glass-card">
        <div className="dm-sidebar-head">
          <div className="dm-sidebar-user">
            <div className="dm-avatar dm-avatar-large">
              <img src={user?.avatar || '/avatar-placeholder.svg'} alt={user?.username || 'You'} />
            </div>
            <div className="dm-sidebar-user-copy">
              <strong>{user?.name || user?.username || 'Messages'}</strong>
              <span>@{user?.username || 'you'}</span>
            </div>
          </div>
          <button
            type="button"
            className="dm-icon-button"
            aria-label="Active chats"
          >
            <Sparkles size={18} />
          </button>
        </div>

        <label className="dm-search-shell" aria-label="Search conversations">
          <Search size={17} className="dm-search-icon" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            className="dm-search-input"
          />
        </label>

        <div className="dm-list-panel">
          <div className="dm-list-head">
            <h2>Messages</h2>
            <span className="dm-list-meta">
              <Sparkles size={14} />
              {loadingConversations ? 'Loading…' : `${visiblePeople.length} chats`}
            </span>
          </div>

          <div className="dm-thread-list">
            {visiblePeople.length ? (
              visiblePeople.map((person) => (
                <motion.button
                  key={person._id}
                  type="button"
                  className={`dm-thread-row ${activeUserId === person._id ? 'active' : ''}`}
                  onClick={() => handleConversationSelect(person)}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.16 }}
                >
                  <div className="dm-avatar dm-avatar-thread">
                    <img src={person.avatar || '/avatar-placeholder.svg'} alt={person.username} />
                    {person.isOnline ? <span className="dm-online-dot" /> : <span className="dm-offline-dot" />}
                  </div>
                  <div className="dm-thread-copy">
                    <div className="dm-thread-topline">
                      <strong>{person.name || person.username}</strong>
                      <span>{person.conversation ? getConversationTime(person.conversation) : fallbackTime(person.username || person._id)}</span>
                    </div>
                    <div className="dm-thread-subline">
                      <p>@{person.username}</p>
                      <span>{person.conversation ? getConversationPreview(person.conversation) : fallbackPreview(person.username || person._id)}</span>
                    </div>
                  </div>
                  {person.conversation && hasUnreadMessage(person.conversation, user?._id) ? <span className="dm-unread-dot" aria-label="Unread message" /> : null}
                </motion.button>
              ))
            ) : (
              <div className="dm-empty-state dm-empty-list">
                <MessageCircle size={26} />
                <strong>No matches</strong>
                <p>Search users or clear the filter to see active chats.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dm-chat glass-card">
        {activeConversation && activeParticipant ? (
          <>
            <div className="dm-chat-header">
              <div className="dm-chat-profile">
                <div className="dm-avatar dm-avatar-medium">
                  <img src={activeParticipant.avatar || '/avatar-placeholder.svg'} alt={activeParticipant.username || 'chat'} />
                  {activeParticipant.isOnline ? <span className="dm-online-dot" /> : null}
                </div>
                <div className="dm-chat-profile-copy">
                  <strong>{activeParticipant.name || activeParticipant.username}</strong>
                  <span>{activeParticipant.isOnline ? 'Active now' : `Last seen ${formatRelativeTime(activeParticipant.lastSeen) || 'recently'}`}</span>
                </div>
              </div>

              <div className="dm-chat-actions"></div>
            </div>

            <div className="dm-thread-scroll">
              {loadingMessages ? (
                <div className="dm-empty-state dm-loading-state">
                  <div className="dm-skeleton-line" />
                  <div className="dm-skeleton-line short" />
                </div>
              ) : null}

              {threadItems.map((item) => {
                if (item.type === 'divider') {
                  return (
                    <div key={item.key} className="dm-divider-row">
                      <span>{item.label}</span>
                    </div>
                  );
                }

                const message = item.message;
                const isMine = String(message.sender?._id || message.sender) === String(user?._id);

                return (
                  <motion.div
                    key={item.key}
                    className={`dm-message-row ${isMine ? 'mine' : 'theirs'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {!isMine ? (
                      <div className="dm-avatar dm-avatar-message">
                        <img src={activeParticipant.avatar || '/avatar-placeholder.svg'} alt={activeParticipant.username || 'participant'} />
                      </div>
                    ) : null}
                    <div className="dm-message-bubble-wrap">
                      <div className={`dm-message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                        {message.text ? <p>{message.text}</p> : null}
                        {renderMessageMedia(message)}
                        <span className="dm-message-time">{formatClockTime(message.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {typingIndicator ? (
                <motion.div className="dm-message-row theirs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="dm-avatar dm-avatar-message">
                    <img src={activeParticipant.avatar || '/avatar-placeholder.svg'} alt={activeParticipant.username || 'participant'} />
                  </div>
                  <div className="dm-message-bubble theirs typing">
                    <div className="dm-typing-dots" aria-label="Typing indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </motion.div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="dm-composer-area">
              <AnimatePresence>
                {attachmentPreview ? (
                  <motion.div
                    className="dm-attachment-preview"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                  >
                    <img src={attachmentPreview.url} alt={attachmentPreview.name} />
                    <div>
                      <strong>{attachmentPreview.name}</strong>
                      <span>Image ready to send</span>
                    </div>
                    <button type="button" className="dm-icon-button small" onClick={clearAttachment} aria-label="Remove attachment">
                      <X size={14} />
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="dm-composer-shell">
                <button type="button" className="dm-icon-button" onClick={() => toast('Emoji picker coming soon')} aria-label="Emoji picker">
                  <Smile size={18} />
                </button>
                <button type="button" className="dm-icon-button" onClick={openAttachmentPicker} aria-label="Attach image">
                  <ImagePlus size={18} />
                </button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/*"
                  className="dm-hidden-input"
                  onChange={handleAttachment}
                />
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="dm-compose-input"
                />
                <button type="button" className="dm-icon-button" onClick={() => toast('Voice message capture coming soon')} aria-label="Voice message">
                  <Mic size={18} />
                </button>
                <button type="button" className="dm-send-button" onClick={handleSendMessage} aria-label="Send message">
                  <Send size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="dm-empty-state dm-chat-empty">
            <div className="dm-empty-badge">
              <MessageCircle size={28} />
            </div>
            <strong>Select a conversation</strong>
            <p>Pick a chat from the left panel to open a modern DM thread.</p>
          </div>
        )}
      </section>
    </div>
  );
}
