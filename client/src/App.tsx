import React, { useState, useEffect } from 'react';
import Player from './Player';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<{ username: string; email: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('http://localhost:3003/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoggedInUser({ username: data.username, email: data.email });
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchUserProfile();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3003/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          setIsLoggedIn(true);
          fetchUserProfile();
        } else {
          setError('Token not received');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3003/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        setIsRegistering(false);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Server tidak merespon. Pastikan server backend berjalan.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setLoggedInUser(null);
    setShowUserMenu(false);
  };

  if (isLoggedIn) {
    return (
      <div className="App">
        <div className="user-bar">
          <button className="user-button" onClick={() => setShowUserMenu(prev => !prev)}>
            {loggedInUser?.username || 'User'}
          </button>
          {showUserMenu && (
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          )}
        </div>
        <Player user={loggedInUser} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="App">
      <div className="auth-container">
        <h1>Music App</h1>
        
        {isRegistering ? (
          <form onSubmit={handleRegister}>
            <h2>Register</h2>
            <input 
              type="username" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
            <button type="submit">Register</button>
            <p>
              Already have an account? <button type="button" onClick={() => setIsRegistering(false)}>Login</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <h2>Login</h2>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
            <button type="submit">Login</button>
            <p>
              Don't have an account? <button type="button" onClick={() => setIsRegistering(true)}>Register</button>
            </p>
          </form>
        )}
        
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default App;
