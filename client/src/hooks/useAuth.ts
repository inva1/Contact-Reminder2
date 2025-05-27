import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { User } from '../types'; // Assuming a shared User type, or define it here

// Define User type if not already globally available
// interface User {
//   id: number; // Changed from userId to id to match backend response from register/login
//   username: string;
// }

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { login: contextLogin, logout: contextLogout, token, user, isAuthenticated, isLoading } = context;

  const register = async (usernameInput: string, passwordInput: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register');
    }
    // Optionally, log in the user directly after registration
    // Or redirect to login page
    return data; 
  };

  const login = async (usernameInput: string, passwordInput: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to login');
    }
    
    // Assuming the backend login returns { token, user: { id, username } }
    // And AuthContext's login expects (token, { userId, username })
    // We need to parse the user from the token or get it from the login response.
    // For now, assuming login response includes user details.
    // If user details are not in login response, they might need to be fetched separately or decoded from JWT.
    // The backend currently returns { message: "Login successful", token }
    // The token contains { userId, username }
    // We need to decode the token to get user data or modify backend to return user data.
    // For simplicity, let's assume we decode the token here (basic decoding, not verification)
    
    let loggedInUser: User | null = null;
    try {
        const payloadBase64 = data.token.split('.')[1];
        const decodedJson = atob(payloadBase64);
        const decodedPayload = JSON.parse(decodedJson);
        loggedInUser = { userId: decodedPayload.userId, username: decodedPayload.username };
    } catch (e) {
        console.error("Failed to decode token for user data:", e);
        throw new Error("Login succeeded, but failed to parse user data from token.");
    }

    if (!loggedInUser) {
        throw new Error("Login succeeded, but user data could not be extracted from token.");
    }

    contextLogin(data.token, loggedInUser); // Use context's login
    return data;
  };

  const logout = () => {
    contextLogout(); // Use context's logout
    // Navigation to login page can be handled here or by ProtectedRoute components
  };
  
  const getToken = () => token;

  // isAuthenticated is directly from context
  // user (currentUser) is directly from context
  
  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    getToken,
    // getCurrentUser: () => user, // This is just `user` from context
  };
};
