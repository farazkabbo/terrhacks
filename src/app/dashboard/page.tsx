"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  Camera, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Download, 
  Settings, 
  User, 
  Bell, 
  Play, 
  Pause, 
  RefreshCw,
  Heart,
  Brain,
  Clock,
  CheckCircle,
  LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useUser, SignedIn, SignedOut, UserButton, SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import Webcam from 'react-webcam';

const GaitGuardDashboard = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [frameCount, setFrameCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const { user, isLoaded } = useUser();
  
  const webcamRef = useRef<Webcam>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws/image');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsStatus('connected');
        setProcessingStatus('Connected to AI server');
      };
      
      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log('Server response:', response);
          
          if (response.status === 'success') {
            setProcessingStatus(`Frame processed: ${response.dimensions?.width}x${response.dimensions?.height}`);
          } else if (response.status === 'error') {
            setProcessingStatus(`Error: ${response.message}`);
          }
        } catch (error) {
          console.log('Raw server message:', event.data);
          setProcessingStatus('Frame processed successfully');
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsStatus('disconnected');
        setProcessingStatus('Disconnected from AI server');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
        setProcessingStatus('Connection error');
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsStatus('error');
      setProcessingStatus('Failed to connect to AI server');
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsStatus('disconnected');
    setProcessingStatus('');
  }, []);

  // Capture and send frame function
  const captureAndSendFrame = useCallback(() => {
    if (webcamRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          const message = {
            type: 'gait_analysis',
            image: imageSrc,
            timestamp: new Date().toISOString(),
            user_id: user?.id || 'anonymous'
          };
          
          wsRef.current.send(JSON.stringify(message));
          setFrameCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error capturing/sending frame:', error);
        setProcessingStatus('Error capturing frame');
      }
    }
  }, [user?.id]);

  // Start/stop monitoring with frame streaming
  const toggleMonitoring = useCallback(() => {
    if (!isMonitoring) {
      // Start monitoring
      connectWebSocket();
      setIsMonitoring(true);
      setFrameCount(0);
      
      // Start frame capture interval (every 500ms = 2 FPS)
      intervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 20);
      
    } else {
      // Stop monitoring
      setIsMonitoring(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      disconnectWebSocket();
    }
  }, [isMonitoring, connectWebSocket, disconnectWebSocket, captureAndSendFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  const WebcamComponent = () => (
    <div className="relative w-full h-full">
      <Webcam
        ref={webcamRef}
        className="w-full h-full object-cover rounded-xl"
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 640,
          height: 480,
          facingMode: "user"
        }}
      />
      
      {/* Overlay with status information */}
      <div className="absolute top-4 left-4 bg-black/50 rounded-lg p-2 text-white text-sm">
        <div className="flex items-center space-x-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${
            wsStatus === 'connected' ? 'bg-green-500' : 
            wsStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span>AI Server: {wsStatus}</span>
        </div>
        <div>Frames sent: {frameCount}</div>
        {processingStatus && (
          <div className="text-xs text-gray-300 mt-1">{processingStatus}</div>
        )}
      </div>
      
      {/* Recording indicator */}
      {isMonitoring && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500/80 rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-medium">RECORDING</span>
        </div>
      )}
    </div>
  );


  // Show loading while Clerk loads
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Mock data for charts
  const gaitData = [
    { date: '2025-01-25', strideLength: 0.68, gaitSpeed: 1.2, balance: 0.85 },
    { date: '2025-01-26', strideLength: 0.66, gaitSpeed: 1.15, balance: 0.82 },
    { date: '2025-01-27', strideLength: 0.65, gaitSpeed: 1.18, balance: 0.83 },
    { date: '2025-01-28', strideLength: 0.63, gaitSpeed: 1.1, balance: 0.78 },
    { date: '2025-01-29', strideLength: 0.62, gaitSpeed: 1.05, balance: 0.75 },
    { date: '2025-01-30', strideLength: 0.61, gaitSpeed: 1.0, balance: 0.72 },
    { date: '2025-01-31', strideLength: 0.59, gaitSpeed: 0.95, balance: 0.68 }
  ];

  const riskData = [
    { category: 'Parkinson\'s', risk: 25, color: 'bg-yellow-500' },
    { category: 'Alzheimer\'s', risk: 15, color: 'bg-blue-500' },
    { category: 'General Decline', risk: 35, color: 'bg-red-500' }
  ];

  const alerts = [
    { id: 1, type: 'warning', message: 'Stride length decreased by 12% over past week', time: '2 hours ago' },
    { id: 2, type: 'info', message: 'Weekly report ready for download', time: '1 day ago' },
    { id: 3, type: 'success', message: 'Baseline calibration completed', time: '3 days ago' }
  ];

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'info': return 'border-blue-500 bg-blue-500/10';
      case 'success': return 'border-green-500 bg-green-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Bell className="w-5 h-5 text-blue-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <SignedIn>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-md border-b border-purple-500/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white hidden sm:block">GaitGuard AI</span>
              </Link>
              <div className="border-l border-gray-600 pl-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 text-sm">{currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Welcome message */}
              <div className="hidden md:block text-right">
                <p className="text-gray-300 text-sm">Welcome back,</p>
                <p className="text-white font-semibold">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
              </div>
              
              <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Clerk UserButton with custom styling */}
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 ring-2 ring-purple-500/30 hover:ring-purple-500/50 transition-all",
                    userButtonPopoverCard: "bg-slate-800 border border-purple-500/20",
                    userButtonPopoverActions: "bg-slate-800",
                    userButtonPopoverActionButton: "text-gray-300 hover:text-white hover:bg-slate-700",
                    userButtonPopoverActionButtonText: "text-gray-300 hover:text-white",
                    userButtonPopoverFooter: "hidden"
                  }
                }}
                userProfileMode="navigation"
                userProfileUrl="/user-profile"
              />
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-800/30 backdrop-blur-sm border-r border-purple-500/20 p-6 space-y-6">
            <nav className="space-y-2">
              <a href="#" className="flex items-center space-x-3 text-white bg-purple-500/20 rounded-lg px-3 py-2">
                <Activity className="w-5 h-5" />
                <span>Dashboard</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg px-3 py-2 transition-colors">
                <Camera className="w-5 h-5" />
                <span>Live Monitoring</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg px-3 py-2 transition-colors">
                <TrendingUp className="w-5 h-5" />
                <span>Reports</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg px-3 py-2 transition-colors">
                <Calendar className="w-5 h-5" />
                <span>History</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg px-3 py-2 transition-colors">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </a>
            </nav>

            {/* User Info Card */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center space-x-3 mb-3">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
                <div>
                  <h4 className="text-white font-semibold text-sm">{user?.firstName || 'User'}</h4>
                  <p className="text-gray-300 text-xs">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
              <SignOutButton>
                <button className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </SignOutButton>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
              <h3 className="text-white font-semibold mb-2">Quick Tip</h3>
              <p className="text-gray-300 text-sm">Maintain consistent monitoring for the most accurate baseline.</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}!
              </h2>
              <p className="text-gray-300">
                Your gait monitoring system is ready. Let's keep track of your health metrics.
              </p>
            </div>

            {/* Monitoring Status & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Live Status */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Live Monitoring</h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className="text-gray-400">{isMonitoring ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="aspect-video bg-slate-900/50 rounded-xl mb-6 flex items-center justify-center border border-purple-500/20">
                  {isMonitoring ? (
                    WebcamComponent() // Render Webcam component when monitoring is active
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Click start to begin monitoring</p>
                      <p className="text-gray-500 text-sm mt-2">Signed in as {user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={toggleMonitoring}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                      isMonitoring 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                    }`}
                  >
                    {isMonitoring ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    <span>{isMonitoring ? 'Stop' : 'Start'} Monitoring</span>
                  </button>
                  <button className="flex items-center space-x-2 px-6 py-3 rounded-full border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all">
                    <RefreshCw className="w-5 h-5" />
                    <span>Calibrate</span>
                  </button>
                </div>
              </div>

              {/* Current Metrics */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <Heart className="w-6 h-6 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">Current Status</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">WebSocket</span>
                      <span className={`font-semibold ${
                        wsStatus === 'connected' ? 'text-green-400' :
                        wsStatus === 'error' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Frames Sent</span>
                      <span className="text-white font-semibold">{frameCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Processing</span>
                      <span className={`font-semibold ${isMonitoring ? 'text-green-400' : 'text-gray-400'}`}>
                        {isMonitoring ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {processingStatus && (
                      <div className="text-xs text-gray-300 mt-2 p-2 bg-slate-700/50 rounded">
                        {processingStatus}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <Brain className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">AI Insights</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-300 text-sm">Decline pattern detected in stride consistency</p>
                    </div>
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-300 text-sm">Recommend increasing monitoring frequency</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Gait Trends */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Gait Trends</h3>
                  <div className="flex space-x-2">
                    {['7d', '30d', '90d'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setSelectedTimeRange(range)}
                        className={`px-3 py-1 rounded-lg text-sm transition-all ${
                          selectedTimeRange === range
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gaitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #6366F1',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="strideLength"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6' }}
                        name="Stride Length (m)"
                      />
                      <Line
                        type="monotone"
                        dataKey="gaitSpeed"
                        stroke="#EC4899"
                        strokeWidth={3}
                        dot={{ fill: '#EC4899' }}
                        name="Gait Speed (m/s)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center space-x-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Risk Assessment</h3>
                </div>
                <div className="space-y-4">
                  {riskData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">{item.category}</span>
                        <span className="text-white font-semibold">{item.risk}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            item.category === 'Parkinson\'s' ? 'bg-yellow-500' :
                            item.category === 'Alzheimer\'s' ? 'bg-blue-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.risk}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                  <p className="text-orange-300 text-sm">
                    <strong>Recommendation:</strong> Schedule consultation with healthcare provider for comprehensive evaluation.
                  </p>
                </div>
              </div>
            </div>

            {/* Alerts and Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Alerts */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Recent Alerts</h3>
                  <button className="text-purple-400 hover:text-purple-300 transition-colors">
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.type)}`}
                    >
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="text-white text-sm">{alert.message}</p>
                          <p className="text-gray-400 text-xs mt-1">{alert.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 transition-all">
                    <Download className="w-8 h-8 text-purple-400" />
                    <span className="text-white text-sm">Export Report</span>
                  </button>
                  <button className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all">
                    <Calendar className="w-8 h-8 text-blue-400" />
                    <span className="text-white text-sm">Schedule Test</span>
                  </button>
                  <button className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30 transition-all">
                    <Settings className="w-8 h-8 text-green-400" />
                    <span className="text-white text-sm">Configure</span>
                  </button>
                  <button className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30 hover:from-orange-500/30 hover:to-red-500/30 transition-all">
                    <Clock className="w-8 h-8 text-orange-400" />
                    <span className="text-white text-sm">History</span>
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SignedIn>
  );
};

// Fallback component for signed out users
const DashboardWrapper = () => {
  return (
    <>
      <SignedIn>
        <GaitGuardDashboard />
      </SignedIn>
      
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Access Restricted</h1>
            <p className="text-gray-300 mb-8">You need to sign in to access the GaitGuard AI dashboard.</p>
            <div className="space-y-4">
              <Link href="/sign-in">
                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all">
                  Sign In
                </button>
              </Link>
              <Link href="/">
                <button className="w-full border border-purple-500 text-purple-400 px-6 py-3 rounded-full font-semibold hover:bg-purple-500 hover:text-white transition-all">
                  Back to Home
                </button>
              </Link>
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
};

export default DashboardWrapper;