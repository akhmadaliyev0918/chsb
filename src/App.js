import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'https://chsbserver.onrender.com/api'; // Backend asosiy manzili

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('chatUser')));
  const [fullName, setFullName] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Foydalanuvchini ro'yxatdan o'tkazish yoki tizimga kiritish
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setRegistrationError('Ism va familiya kiritilishi shart!');
      return;
    }
    try {
      // Backendda: app.use("/api/user", userRoutes); va userRoutes ichida /register
      const response = await axios.post(`${API_BASE_URL}/user/register`, { fullName });
      setUser(response.data);
      localStorage.setItem('chatUser', JSON.stringify(response.data));
      setFullName('');
      setRegistrationError('');
    } catch (error) {
      console.error('Ro\'yxatdan o\'tishda xatolik:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setRegistrationError(error.response.data.message);
      } else {
        setRegistrationError('Ro\'yxatdan o\'tishda noma\'lum xatolik.');
      }
    }
  };

  // Xabarlarni yuklash
  const fetchMessages = async () => {
    if (!user) return;
    try {
      // Backendda: app.use("/api/message", messageRoutes); va messageRoutes ichida GET '/'
      const response = await axios.get(`${API_BASE_URL}/message/`); // Oxiridagi '/' ixtiyoriy bo'lishi mumkin, server sozlamasiga bog'liq
      console.log('Yuklangan xabarlar:', response.data);
      setMessages(response.data);
    } catch (error) {
      console.error('Xabarlarni yuklashda xatolik:', error);
      // Agar 404 bo'lsa, serverda /api/message yo'li yoki GET metodi yo'qligini tekshiring
    }
  };

  // Komponent yuklanganda va user o'zgarganda xabarlarni yuklash
  useEffect(() => {
    if (user) {
      fetchMessages();
      const intervalId = setInterval(fetchMessages, 5000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  // Yangi xabar kelganda pastga scroll qilish
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Xabar yuborish
  // App.js dan parcha
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return; // Frontend tekshiruvi

    try {
      // Line 79:
      const response = await axios.post(`${API_BASE_URL}/message`, {
        text: newMessage, // 'text' yuborilyapti
        userId: user.data._id, // 'userId' yuborilyapti (user._id orqali)
      });
      fetchMessages();
      setNewMessage('');
    } catch (error) { // Line 86:
      console.error('Xabar yuborishda xatolik:', error);
      // Xatolik javobini batafsilroq ko'rish uchun:
      if (error.response) {
        console.log(user.data._id, "----------------------------")
        console.log(newMessage, "----------------------------")
        console.error('Server javobi (data):', error.response.data);
        console.error('Server javobi (status):', error.response.status);
        console.error('Server javobi (headers):', error.response.headers);
      } else if (error.request) {
        console.error('So\'rov yuborildi, lekin javob olinmadi:', error.request);
      } else {
        console.error('So\'rovni sozlashda xatolik:', error.message);
      }
    }
  };

  // Xabarni o'chirish
  const handleDeleteMessage = async (messageId) => {
    if (!user) return;
    try {
      // Backendda: app.use("/api/message", messageRoutes); va messageRoutes ichida DELETE '/:messageId'
      await axios.delete(`${API_BASE_URL}/message/${messageId}`, { // <-- O'ZGARTIRILDI: "messages" -> "message"
        data: { userId: user._id }
      });
      fetchMessages();
    } catch (error) {
      console.error('Xabarni o\'chirishda xatolik:', error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      }
      // Agar 404 bo'lsa, serverda /api/message/:messageId yo'li yoki DELETE metodi yo'qligini tekshiring
    }
  };

  // Tizimdan chiqish
  const handleLogout = () => {
    localStorage.removeItem('chatUser');
    setUser(null);
    setMessages([]);
  };


  if (!user) {
    return (
      <div className="app-container">
        <form onSubmit={handleRegister} className="registration-form">
          <h2>Chatga Xush Kelibsiz!</h2>
          <p>Davom etish uchun ism va familiyangizni kiriting:</p>
          <input
            type="text"
            placeholder="Ism Familiya"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {registrationError && <p className="error-message">{registrationError}</p>}
          <button type="submit">Chatga Kirish</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="chat-container">
        <div className="chat-header">
          <h3>Umumiy Chat</h3>
          <p>Salom, {user.fullName}! <button onClick={handleLogout} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#1877f2', cursor: 'pointer', textDecoration: 'underline' }}>Chiqish</button></p>
        </div>
        <div className="messages-list">
          {Array.isArray(messages) && messages.map((msg) => ( // messages massiv ekanligini tekshirish
            <div
              key={msg._id}
              className={`message-item ${msg.user && msg.user._id === user._id ? 'sent' : 'received'}`}
            >
              <div>
                {msg.user && msg.user._id !== user._id && (
                  <div className="message-sender">{msg.userName || (msg.user && msg.user.fullName)}</div>
                )}
                <div className="message-content">
                  {msg.text}
                </div>
                {msg.user && msg.user._id === user._id && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="delete-button"
                    title="O'chirish"
                  >
                    O'chirish
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            placeholder="Xabar yozing..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit" disabled={!newMessage.trim()}>Yuborish</button>
        </form>
      </div>
    </div>
  );
}

export default App;
