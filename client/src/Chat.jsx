import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './css/Chat.css';

// Initialize socket connection
const socket = io('http://localhost:3001');

export default function Chat() {
  const [channel, setChannel] = useState('general');
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState(null);

  // Setup socket listeners on mount
  useEffect(() => {
    socket.on('owner', (o) => setOwner(o));
    socket.on('message', (msg) => setMessages((m) => [...m, msg]));
    socket.on('participants', (p) => setParticipants(p));

    // Cleanup listeners on unmount
    return () => {
      socket.off('message');
      socket.off('participants');
    };
  }, []);

  // Emit join event to server
  const join = () => {
    socket.emit('join', { channel, username });
  };

  // Emit message event to server
  const send = () => {
    if (!text) return;
    socket.emit('message', { channel, text, username });
    setText('');
  };

  // Filter participants by search query
  const filteredParticipants = participants.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="chat-dark-container">
      {/* Sidebar for username and channel selection */}
      <div className="chat-sidebar">
        <h2 className="chat-logo">Name</h2>
        <div className="chat-join">
          {/* Username input */}
          <input
            className="chat-input-name"
            placeholder="Enter your username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <h2 className="chat-logo">Server</h2>
          {/* Channel input */}
          <input
            className="chat-input"
            placeholder="Enter server name..."
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          />
          {/* Join button */}
          <button className="chat-button" onClick={join}>
            Join
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        <h2 className="chat-title">Channel: {channel || '—'}</h2>

        {/* Messages list */}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className="chat-message">
              {m.system ? (
                <i className="chat-system">{m.text}</i>
              ) : (
                <>
                  <b className="chat-username">{m.username}:</b> {m.text}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Message input and send button */}
        <div className="chat-input-area">
          <input
            className="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                send();
              }
            }}
            placeholder="Type your message..."
          />
          <button className="chat-button" onClick={send}>
            Send
          </button>
        </div>
      </div>

      {/* Right sidebar for participants */}
      <div className="chat-rightbar">
        <h3 className="chat-subtitle">Participants</h3>
        {/* Search input for participants */}
        <input
          className="list-of-participants"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* Filtered participants list */}
        <ul className="chat-participants-list">
          {filteredParticipants.map((p, i) => (
            <li key={i} className="chat-participant">
              {p}
              {/* Show kick button only for owner and not for self */}
              {username === owner && p !== owner && (
                <button
                  className="remove-btn"
                  onClick={() => {
                    socket.emit('kick', { channel, target: p });
                  }}
                >
                  ❌
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
