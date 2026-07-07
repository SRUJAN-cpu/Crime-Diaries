import './App.css';
import { AuthGate } from './components/AuthGate';
import { ChatApp } from './components/ChatApp';

function App() {
  return <AuthGate>{(user, signOut) => <ChatApp user={user} onSignOut={signOut} />}</AuthGate>;
}

export default App;
