import { useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [logs, setLogs] = useState([])
  // NEW: State for the stats dashboard
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    blocked: 0
  })

  // Function to add a log entry to the screen
  const addLog = (type, msg) => {
    const id = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toLocaleTimeString().split(' ')[0]
    setLogs(prev => [{ id, type, msg, time: timestamp }, ...prev].slice(0, 10)) // Increased log history to 10
  }

  // 1. Buy Logic
  const buyItem = async () => {
    // Update Total Count immediately
    setStats(prev => ({ ...prev, total: prev.total + 1 }))

    try {
      // Hit your local Backend API
      await axios.post('http://localhost:3000/buy', {})
      
      addLog('success', 'SUCCESS: Order Placed!')
      // Update Success Count
      setStats(prev => ({ ...prev, success: prev.success + 1 }))
      
    } catch (err) {
      if (err.response && err.response.status === 429) {
        addLog('error', 'BLOCKED: Rate Limit Hit!')
        // Update Blocked Count
        setStats(prev => ({ ...prev, blocked: prev.blocked + 1 }))
      } else {
        addLog('error', `ERROR: ${err.message}`)
      }
    }
  }

  // 2. Spam Logic
  const spamServer = () => {
    addLog('neutral', 'SYSTEM: Initiating Spam Attack...')
    for (let i = 0; i < 12; i++) {
      setTimeout(buyItem, i * 150) 
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f0f0f', 
      color: '#e0e0e0', 
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '50px'
    }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
        API Rate Limiter Dashboard
      </h1>

      {/* NEW: Stats Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '20px', 
        width: '800px', // Matches the wider layout
        marginBottom: '30px'
      }}>
        <StatBox label="Total Requests" value={stats.total} color="#3498db" />
        <StatBox label="Successful" value={stats.success} color="#2ecc71" />
        <StatBox label="Blocked (429)" value={stats.blocked} color="#e74c3c" />
      </div>
      
      {/* Control Panel */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button 
          onClick={buyItem} 
          style={{ 
            padding: '15px 40px', 
            fontSize: '1.1rem', 
            cursor: 'pointer',
            background: '#2c3e50',
            color: 'white',
            border: '1px solid #34495e',
            borderRadius: '5px',
            transition: '0.2s'
          }}>
          Buy 1 Item
        </button>
        
        <button 
          onClick={spamServer} 
          style={{ 
            padding: '15px 40px', 
            fontSize: '1.1rem', 
            cursor: 'pointer',
            background: '#7f1d1d', // Darker red
            color: '#fca5a5', // Light red text
            border: '1px solid #991b1b',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}>
          Spam Buy
        </button>
      </div>

      {/* Live Logs */}
      <div style={{ 
        width: '800px', // WIDENED from 500px to 800px
        background: '#1a1a1a', 
        padding: '20px', 
        borderRadius: '10px', 
        border: '1px solid #333',
        minHeight: '400px' // Added minimum height so it doesn't jump around
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#888' }}>Live Traffic Logs:</h3>
          <button onClick={() => setLogs([])} style={{ background:'transparent', border:'none', color:'#555', cursor:'pointer' }}>Clear</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <AnimatePresence>
            {logs.map(log => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '4px',
                  background: log.type === 'success' ? 'rgba(46, 204, 113, 0.1)' 
                            : log.type === 'error' ? 'rgba(231, 76, 60, 0.1)' 
                            : '#262626',
                  borderLeft: log.type === 'success' ? '4px solid #2ecc71' 
                            : log.type === 'error' ? '4px solid #e74c3c' 
                            : '4px solid #7f8c8d',
                  color: log.type === 'success' ? '#2ecc71' 
                       : log.type === 'error' ? '#e74c3c' 
                       : '#aaa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}
              >
                <span>{log.msg}</span>
                <span style={{ color: '#555', fontSize: '0.8rem' }}>{log.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && <div style={{textAlign:'center', color:'#444', marginTop:'50px'}}>No traffic detected...</div>}
        </div>
      </div>
    </div>
  )
}

// Helper Component for the Stats (keeps code clean)
const StatBox = ({ label, value, color }) => (
  <div style={{ 
    background: '#1a1a1a', 
    padding: '20px', 
    borderRadius: '8px', 
    border: '1px solid #333',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px', textTransform:'uppercase' }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{value}</div>
  </div>
)

export default App