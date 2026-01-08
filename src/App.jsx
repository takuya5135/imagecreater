import React from 'react'
import Wizard from './components/Wizard'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>✨ Nano Banana AI</h1>
        <p>AI搭載 料理画像生成エキスパート</p>
        <p style={{ fontSize: '0.8rem', color: '#ffcc00' }}>Powered by Takuya H</p>
      </header>
      <main>
        <Wizard />
      </main>
    </div>
  )
}

export default App
