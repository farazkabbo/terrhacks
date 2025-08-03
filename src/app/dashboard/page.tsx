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
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [gaitMetrics, setGaitMetrics] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const { user, isLoaded } = useUser();
  
  const webcamRef = useRef<Webcam>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTime = useRef<number>(0);
  const processingQueue = useRef<number>(0);

/* @ts-ignore */
  const [gaitData, setGaitData] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update stable alerts periodically
  useEffect(() => {
    if (gaitData.length > 0) {
      // Trigger alert recalculation every 5 seconds when monitoring
      const alertTimer = setInterval(() => {
        if (isMonitoring) {
          lastAlertUpdate.current = 0; // Force update on next generateAlerts call
        }
      }, ALERT_UPDATE_INTERVAL);
      
      return () => clearInterval(alertTimer);
    }
  }, [isMonitoring, gaitData.length]);

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
          
          // Decrease processing queue count
          processingQueue.current = Math.max(0, processingQueue.current - 1);
          setIsProcessing(processingQueue.current > 0);
          
          if (response.status === 'success') {
            setProcessingStatus(`Frame ${response.frame_count}: ${response.dimensions?.width}x${response.dimensions?.height} (Queue: ${processingQueue.current})`);
            
            // Update processed image if available
            if (response.processed_image) {
              setProcessedImage(response.processed_image);
            }
            
            // Update gait metrics if available
            if (response.gait_metrics) {
              setGaitMetrics(response.gait_metrics);
            }

            if(response.past_metrics){
              console.log("GETTING PAST METRICS!")
              /* @ts-ignore */
              setGaitData(response.past_metrics.map((e, i) => ({ ...e, date: i })))
            }
          } else if (response.status === 'error') {
            setProcessingStatus(`Error: ${response.message}`);
          }
        } catch (error) {
          console.log('Raw server message:', event.data);
          processingQueue.current = Math.max(0, processingQueue.current - 1);
          setIsProcessing(processingQueue.current > 0);
          setProcessingStatus('Frame processed successfully');
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsStatus('disconnected');
        setProcessingStatus('Disconnected from AI server');
        setProcessedImage(null);
        setGaitMetrics(null);
        setGaitData([]);
        setIsProcessing(false);
        setDroppedFrames(0);
        processingQueue.current = 0;
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
    setProcessedImage(null);
    setGaitMetrics(null);
    setGaitData([]);
    setStableAlerts([]); // Clear stable alerts on disconnect
    setIsProcessing(false);
    setDroppedFrames(0);
    processingQueue.current = 0;
    lastAlertUpdate.current = 0; // Reset alert timer
  }, []);

  // Capture and send frame function with smart throttling
  const captureAndSendFrame = useCallback(() => {
    if (webcamRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const now = Date.now();
      
      // Skip frame if backend is too busy (more than 3 frames in queue)
      if (processingQueue.current > 3) {
        setDroppedFrames(prev => prev + 1);
        console.log(`Frame dropped - queue too full (${processingQueue.current})`);
        return;
      }
      
      // Throttle to max 30 FPS when processing queue is building up
      const minInterval = processingQueue.current > 1 ? 33 : 50; // 30 FPS or 20 FPS
      if (now - lastFrameTime.current < minInterval) {
        return;
      }
      
      try {
        const imageSrc = webcamRef.current.getScreenshot({
          width: 640,
          height: 480
        });
        
        if (imageSrc) {
          const message = {
            type: 'gait_analysis',
            image: imageSrc,
            timestamp: new Date().toISOString(),
            user_id: user?.id || 'anonymous',
            frame_id: frameCount // Add frame ID for tracking
          };
          
          wsRef.current.send(JSON.stringify(message));
          setFrameCount(prev => prev + 1);
          lastFrameTime.current = now;
          processingQueue.current += 1;
          setIsProcessing(true);
        }
      } catch (error) {
        console.error('Error capturing/sending frame:', error);
        setProcessingStatus('Error capturing frame');
      }
    }
  }, [user?.id, frameCount]);

  // Start/stop monitoring with frame streaming
  const toggleMonitoring = useCallback(() => {
    if (!isMonitoring) {
      // Start monitoring
      connectWebSocket();
      setIsMonitoring(true);
      setFrameCount(0);
      
      // Start frame capture interval (every 50ms = 20 FPS, with smart throttling)
      intervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 50);
      
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
        <div>Queue: {processingQueue.current}</div>
        {droppedFrames > 0 && (
          <div className="text-orange-300">Dropped: {droppedFrames}</div>
        )}
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

  const ProcessedImageComponent = () => (
    <div className="relative w-full h-full">
      {processedImage ? (
        <img 
          src={processedImage} 
          alt="Processed with landmarks" 
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div className="w-full h-full bg-slate-900/50 rounded-xl flex items-center justify-center border border-purple-500/20">
          <div className="text-center">
            <Brain className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">AI Processing View</p>
            <p className="text-gray-500 text-sm mt-2">Landmarks will appear here</p>
          </div>
        </div>
      )}
      
      {/* Gait metrics overlay */}
      {gaitMetrics && (
        <div className="absolute bottom-4 left-4 bg-black/70 rounded-lg p-3 text-white text-sm">
          <div className="mb-2 text-green-400 font-semibold">Gait Analysis</div>
          {gaitMetrics.avg_stride && (
            <div>Avg Stride: {Math.round(gaitMetrics.avg_stride)}px</div>
          )}
          {gaitMetrics.avg_swing && (
            <div>Avg Swing: {Math.round(gaitMetrics.avg_swing)}px</div>
          )}
          <div className="text-xs text-gray-300 mt-1">
            Frame: {gaitMetrics.frame_count}
          </div>
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

  // Calculate dynamic risk assessment based on gait data
  const calculateRiskAssessment = useCallback(() => {
    if (!gaitData || gaitData.length < 10) {
      // Not enough data for assessment
      return [
        { category: 'Parkinson\'s Disease', risk: 0, color: 'bg-gray-500', status: 'Insufficient Data' },
        { category: 'Cerebral Small Vessel Disease', risk: 0, color: 'bg-gray-500', status: 'Insufficient Data' },
        { category: 'General Cognitive Decline', risk: 0, color: 'bg-gray-500', status: 'Insufficient Data' }
      ];
    }

    // Get recent data (last 20 points for analysis)
    const recentData = gaitData.slice(-20);
    
    // Calculate metrics
    const avgStrideLength = recentData.reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / recentData.length;
    const avgSwingLength = recentData.reduce((sum, d) => sum + Math.abs(d.swing_length || 0), 0) / recentData.length;
    
    // Calculate variability (standard deviation)
    const strideMean = avgStrideLength;
    const swingMean = avgSwingLength;
    const strideVariability = Math.sqrt(
      recentData.reduce((sum, d) => sum + Math.pow(Math.abs(d.stride_length || 0) - strideMean, 2), 0) / recentData.length
    );
    const swingVariability = Math.sqrt(
      recentData.reduce((sum, d) => sum + Math.pow(Math.abs(d.swing_length || 0) - swingMean, 2), 0) / recentData.length
    );

    // Baseline thresholds (these would be calibrated based on user's baseline in a real system)
    const normalStrideRange = [-130, 130]; // pixels - would be calibrated per user
    const normalSwingRange = [-80, 80];   // pixels - would be calibrated per user
    const normalVariabilityThreshold = 35; // pixels

    // Calculate risk factors
    let parkinsonRisk = 0;
    let csvdRisk = 0;
    let generalDeclineRisk = 0;

    // Parkinson's Disease indicators
    // - Reduced stride length (shuffling gait)
    // - High variability in gait pattern
    // - Asymmetric swing patterns
    if (avgStrideLength < normalStrideRange[0]) {
      parkinsonRisk += 30; // Significantly reduced stride length
    } else if (avgStrideLength < normalStrideRange[0] * 1.2) {
      parkinsonRisk += 15; // Moderately reduced stride length
    }
    
    if (strideVariability > normalVariabilityThreshold) {
      parkinsonRisk += 25; // High gait variability
    }

    if (avgSwingLength < normalSwingRange[0]) {
      parkinsonRisk += 20; // Reduced arm swing
    }

    // CSVD (Cerebral Small Vessel Disease) indicators
    // - Gradual reduction in stride length
    // - Less pronounced than Parkinson's but consistent
    if (avgStrideLength < normalStrideRange[0] * 1.3) {
      csvdRisk += 20; // Mild to moderate stride reduction
    }
    
    if (strideVariability > normalVariabilityThreshold * 0.8) {
      csvdRisk += 15; // Moderate gait variability
    }

    // Check for trend (would need more historical data in practice)
    if (recentData.length >= 10) {
      const firstHalf = recentData.slice(0, 10);
      const secondHalf = recentData.slice(-10);
      const firstHalfAvg = firstHalf.reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / secondHalf.length;
      
      if (firstHalfAvg > secondHalfAvg * 1.1) {
        csvdRisk += 25; // Declining trend in stride length
      }
    }

    // General Cognitive Decline indicators
    // - Overall reduced mobility
    // - Inconsistent patterns
    if (avgStrideLength < normalStrideRange[1] * 0.8 && avgSwingLength < normalSwingRange[1] * 0.8) {
      generalDeclineRisk += 20; // Overall reduced mobility
    }
    
    if (strideVariability > normalVariabilityThreshold * 1.2 || swingVariability > normalVariabilityThreshold * 1.2) {
      generalDeclineRisk += 30; // High inconsistency in movement patterns
    }

    // Cap risks at 100%
    parkinsonRisk = Math.min(100, Math.max(0, parkinsonRisk));
    csvdRisk = Math.min(100, Math.max(0, csvdRisk));
    generalDeclineRisk = Math.min(100, Math.max(0, generalDeclineRisk));

    // Determine status and colors based on risk levels
    const getRiskColor = (risk: number) => {
      if (risk < 20) return 'bg-green-500';
      if (risk < 40) return 'bg-yellow-500';
      if (risk < 70) return 'bg-orange-500';
      return 'bg-red-500';
    };

    const getRiskStatus = (risk: number) => {
      if (risk < 20) return 'Low Risk';
      if (risk < 40) return 'Moderate Risk';
      if (risk < 70) return 'High Risk';
      return 'Critical Risk';
    };

    return [
      { 
        category: 'Parkinson\'s Disease', 
        risk: parkinsonRisk, 
        color: getRiskColor(parkinsonRisk),
        status: getRiskStatus(parkinsonRisk),
        indicators: avgStrideLength < normalStrideRange[0] ? 'Reduced stride length detected' : 'Normal stride patterns'
      },
      { 
        category: 'Cerebral Small Vessel Disease', 
        risk: csvdRisk, 
        color: getRiskColor(csvdRisk),
        status: getRiskStatus(csvdRisk),
        indicators: strideVariability > normalVariabilityThreshold * 0.8 ? 'Gait variability detected' : 'Stable gait patterns'
      },
      { 
        category: 'General Cognitive Decline', 
        risk: generalDeclineRisk, 
        color: getRiskColor(generalDeclineRisk),
        status: getRiskStatus(generalDeclineRisk),
        indicators: (strideVariability > normalVariabilityThreshold * 1.2) ? 'Inconsistent movement patterns' : 'Consistent mobility'
      }
    ];
  }, [gaitData]);

  // Update risk data based on real-time analysis
  const riskData = calculateRiskAssessment();

  // State to store stable alerts that don't change constantly
  const [stableAlerts, setStableAlerts] = useState<any[]>([]);
  const lastAlertUpdate = useRef<number>(0);
  const ALERT_UPDATE_INTERVAL = 5000; // Update alerts every 5 seconds max

  // Generate dynamic alerts based on gait analysis
  const generateAlerts = useCallback(() => {
    const now = Date.now();
    
    // Only update alerts every 5 seconds to avoid constant changes
    if (now - lastAlertUpdate.current < ALERT_UPDATE_INTERVAL && stableAlerts.length > 0) {
      return stableAlerts;
    }

    const alerts = [];
    let alertId = 1;

    if (!gaitData || gaitData.length < 5) {
      const newAlerts = [{
        id: alertId++,
        type: 'info',
        message: 'Gait analysis starting - collecting baseline data',
        time: 'Now'
      }];
      setStableAlerts(newAlerts);
      lastAlertUpdate.current = now;
      return newAlerts;
    }

    // Get current risk assessment data
    const currentRiskData = calculateRiskAssessment();
    
    // Add risk-based alerts for each category (with rounded values for stability)
    currentRiskData.forEach((riskItem) => {
      const roundedRisk = Math.round(riskItem.risk / 5) * 5; // Round to nearest 5% to reduce fluctuation
      
      if (roundedRisk > 70) {
        alerts.push({
          id: alertId++,
          type: 'error', // High risk alert
          message: `HIGH RISK: ${riskItem.category} risk at ${roundedRisk}% - Immediate attention recommended`,
          time: 'Risk Assessment'
        });
      } else if (roundedRisk > 40) {
        alerts.push({
          id: alertId++,
          type: 'warning', // Warning alert
          message: `WARNING: ${riskItem.category} risk elevated to ${roundedRisk}% - Monitor closely`,
          time: 'Risk Assessment'
        });
      }
    });

    const recentData = gaitData.slice(-10);
    const avgStrideLength = recentData.reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / recentData.length;
    const avgSwingLength = recentData.reduce((sum, d) => sum + Math.abs(d.swing_length || 0), 0) / recentData.length;

    // Calculate variability
    const strideMean = avgStrideLength;
    const strideVariability = Math.sqrt(
      recentData.reduce((sum, d) => sum + Math.pow(Math.abs(d.stride_length || 0) - strideMean, 2), 0) / recentData.length
    );

    // Check for concerning gait patterns (with thresholds to prevent constant alerts)
    const roundedStrideLength = Math.round(avgStrideLength / 10) * 10; // Round to nearest 10px
    const roundedSwingLength = Math.round(avgSwingLength / 10) * 10;
    const roundedVariability = Math.round(strideVariability / 10) * 10;

    // Only alert for significant stride length reductions
    if (roundedStrideLength < 80 && roundedStrideLength > 0) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        message: `Significantly reduced stride length detected (${roundedStrideLength}px) - Potential shuffling gait`,
        time: 'Live analysis'
      });
    } else if (roundedStrideLength < 100 && roundedStrideLength >= 80) {
      alerts.push({
        id: alertId++,
        type: 'info',
        message: `Moderately reduced stride length observed (${roundedStrideLength}px)`,
        time: 'Live analysis'
      });
    }

    if (roundedVariability > 50) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        message: 'High gait variability detected - irregular walking pattern',
        time: 'Live analysis'
      });
    }

    if (roundedSwingLength < 60 && roundedSwingLength > 0) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        message: `Reduced arm swing detected (${roundedSwingLength}px) - Possible mobility issue`,
        time: 'Live analysis'
      });
    }

    // Trend analysis (if we have enough data) - only check significant changes
    if (gaitData.length >= 20) {
      const oldData = gaitData.slice(-20, -10);
      const newData = gaitData.slice(-10);
      const oldAvg = oldData.reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / oldData.length;
      const newAvg = newData.reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / newData.length;
      
      const changePercent = Math.round(((newAvg - oldAvg) / oldAvg) * 100);
      
      if (changePercent < -15) {
        alerts.push({
          id: alertId++,
          type: 'error',
          message: `CRITICAL: Rapid stride decline (${Math.abs(changePercent)}% decrease) - Seek medical attention`,
          time: 'Trend analysis'
        });
      } else if (changePercent < -10) {
        alerts.push({
          id: alertId++,
          type: 'warning',
          message: `Stride length declining (${Math.abs(changePercent)}% decrease)`,
          time: 'Trend analysis'
        });
      } else if (changePercent > 15) {
        alerts.push({
          id: alertId++,
          type: 'success',
          message: `Significant stride improvement (${changePercent}% increase)`,
          time: 'Trend analysis'
        });
      } else if (changePercent > 10) {
        alerts.push({
          id: alertId++,
          type: 'success',
          message: `Stride length improving (${changePercent}% increase)`,
          time: 'Trend analysis'
        });
      }
    }

    // If no high-priority alerts, show positive feedback
    const hasHighPriorityAlerts = alerts.some(alert => alert.type === 'error' || alert.type === 'warning');
    if (!hasHighPriorityAlerts) {
      alerts.push({
        id: alertId++,
        type: 'success',
        message: 'Gait patterns within acceptable ranges - Continue monitoring',
        time: 'Live analysis'
      });
    }

    // Add system status
    alerts.push({
      id: alertId++,
      type: 'info',
      message: `Analysis based on ${gaitData.length} gait measurements`,
      time: 'System status'
    });

    const finalAlerts = alerts.slice(0, 5); // Limit to 5 most recent/important alerts
    
    // Update stable alerts and timestamp
    setStableAlerts(finalAlerts);
    lastAlertUpdate.current = now;
    
    return finalAlerts;
  }, [gaitData, calculateRiskAssessment, stableAlerts]);

  const alerts = generateAlerts();

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'info': return 'border-blue-500 bg-blue-500/10';
      case 'success': return 'border-green-500 bg-green-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
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
        <header className="bg-slate-800/60 backdrop-blur-md border-b border-purple-500/30 px-6 py-4 shadow-lg shadow-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-violet-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <Activity className="w-7 h-7 text-white relative z-10" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent hidden sm:block">NeuroGait</span>
              </Link>
              <div className="border-l border-purple-500/30 pl-4">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Dashboard</h1>
                <p className="text-gray-400 text-sm flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Welcome message */}
              <div className="hidden md:block text-right">
                <p className="text-gray-300 text-sm">Welcome back,</p>
                <p className="text-white font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
              </div>
              
              <button className="p-3 text-gray-400 hover:text-white transition-all duration-300 relative group hover:bg-purple-500/10 rounded-xl">
                <Bell className="w-5 h-5" />
                {(() => {
                  const highPriorityAlerts = alerts.filter(alert => alert.type === 'error' || alert.type === 'warning');
                  const hasHighPriority = highPriorityAlerts.length > 0;
                  return (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                      hasHighPriority ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse shadow-lg shadow-red-500/50' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                    }`}>
                      {alerts.length}
                    </span>
                  );
                })()}
              </button>
              
              <button className="p-3 text-gray-400 hover:text-white transition-all duration-300 hover:bg-purple-500/10 rounded-xl">
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
          <aside className="w-64 bg-slate-800/40 backdrop-blur-sm border-r border-purple-500/30 p-6 space-y-6 shadow-2xl">
            <nav className="space-y-3">
              <a href="#" className="flex items-center space-x-3 text-white bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl px-4 py-3 shadow-lg shadow-purple-500/20 border border-purple-500/30">
                <Activity className="w-5 h-5" />
                <span className="font-semibold">Dashboard</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl px-4 py-3 transition-all duration-300 group">
                <Camera className="w-5 h-5 group-hover:text-purple-400 transition-colors" />
                <span>Live Monitoring</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl px-4 py-3 transition-all duration-300 group">
                <TrendingUp className="w-5 h-5 group-hover:text-green-400 transition-colors" />
                <span>Gait Trends</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl px-4 py-3 transition-all duration-300 group">
                <Calendar className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                <span>Report History</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl px-4 py-3 transition-all duration-300 group">
                <Settings className="w-5 h-5 group-hover:text-orange-400 transition-colors" />
                <span>Settings</span>
              </a>
            </nav>

            {/* User Info Card */}
            <div className="bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-pink-500/20 rounded-2xl p-5 border border-purple-500/40 shadow-xl shadow-purple-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
              <div className="flex items-center space-x-3 mb-4 relative z-10">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-12 h-12 ring-2 ring-purple-400/50 shadow-lg"
                    }
                  }}
                />
                <div>
                  <h4 className="text-white font-semibold text-sm">{user?.firstName || 'User'}</h4>
                  <p className="text-purple-200 text-xs">Active Session</p>
                </div>
              </div>
              <SignOutButton>
                <button className="flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300 text-sm bg-slate-700/30 hover:bg-slate-600/50 rounded-lg px-3 py-2 w-full justify-center group">
                  <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Sign Out</span>
                </button>
              </SignOutButton>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-indigo-500/10 rounded-2xl p-5 border border-cyan-500/30 shadow-xl shadow-cyan-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">Pro Tip</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Maintain consistent monitoring for the most accurate baseline and early detection.</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 space-y-6">
            {/* Welcome + Metrics Section in one line */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {/* Welcome Section - spans 3 columns */}
              <div className="col-span-3 bg-gradient-to-br from-purple-500/15 via-violet-500/10 to-pink-500/15 rounded-3xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                  <div className="mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-400 via-violet-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30 mx-auto mb-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                      <Activity className="w-10 h-10 text-white relative z-10" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent mb-4 tracking-tight">
                    Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}!
                  </h2>
                  <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
                    Your advanced gait monitoring system is ready and operational.<br />
                    <span className="text-purple-300 font-medium">Let's continue monitoring your neurological health metrics.</span>
                  </p>
                  <div className="flex items-center space-x-2 mt-4 text-sm text-purple-300">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>System Active</span>
                  </div>
                </div>
              </div>
              {/* Current Metrics - spans 1 column */}
              <div className="col-span-1 space-y-4 flex flex-col justify-center">
                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 shadow-xl shadow-purple-500/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">System Status</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                        <span className="text-gray-300 text-sm">WebSocket</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            wsStatus === 'connected' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' :
                            wsStatus === 'error' ? 'bg-red-400 shadow-lg shadow-red-400/50' : 'bg-amber-400 shadow-lg shadow-amber-400/50'
                          }`}></div>
                          <span className={`font-semibold text-sm ${
                            wsStatus === 'connected' ? 'text-emerald-400' :
                            wsStatus === 'error' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                        <span className="text-gray-300 text-sm">Frames Processed</span>
                        <span className="text-white font-bold text-lg">{frameCount}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                        <span className="text-gray-300 text-sm">Queue</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            processingQueue.current > 3 ? 'bg-red-400 animate-pulse' : 
                            processingQueue.current > 1 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}></div>
                          <span className={`font-semibold text-sm ${
                            processingQueue.current > 3 ? 'text-red-400' : 
                            processingQueue.current > 1 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {processingQueue.current}
                          </span>
                        </div>
                      </div>
                      {droppedFrames > 0 && (
                        <div className="flex justify-between items-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                          <span className="text-orange-300 text-sm">Dropped Frames</span>
                          <span className="text-orange-400 font-semibold">{droppedFrames}</span>
                        </div>
                      )}
                    </div>
                    {processingStatus && (
                      <div className="mt-4 text-xs text-gray-400 p-3 bg-slate-800/50 rounded-xl border border-slate-600/30">
                        {processingStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Monitoring Status & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Live Status - Made bigger */}
              <div className="lg:col-span-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Live Monitoring</h2>
                        <p className="text-gray-400">Real-time gait analysis and AI processing</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-700/50 rounded-2xl px-4 py-3 border border-slate-600/30">
                      <div className={`w-4 h-4 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-gray-500'}`}></div>
                      <span className={`font-semibold ${isMonitoring ? 'text-emerald-400' : 'text-gray-400'}`}>{isMonitoring ? 'Active' : 'Inactive'}</span>
                      {isMonitoring && (
                        <div className="text-xs text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                          LIVE
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Input Webcam */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                          <Camera className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Camera Input</h3>
                      </div>
                      <div className="aspect-[4/3] bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-2xl overflow-hidden border border-purple-500/30 shadow-xl relative">
                        {isMonitoring ? (
                          WebcamComponent()
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Camera className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-gray-400 text-sm font-medium">Camera Ready</p>
                              <p className="text-gray-500 text-xs mt-1">Click start to begin monitoring</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Processed Output */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                          <Brain className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                      </div>
                      <div className="aspect-[4/3] bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-2xl overflow-hidden border border-purple-500/30 shadow-xl relative">
                        {isMonitoring ? (
                          ProcessedImageComponent()
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Brain className="w-8 h-8 text-white" />
                              </div>
                              <p className="text-gray-400 text-sm font-medium">AI Processing View</p>
                              <p className="text-gray-500 text-xs mt-1">Landmarks and analysis will appear here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-6">
                    <button
                      onClick={toggleMonitoring}
                      className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl relative overflow-hidden ${
                        isMonitoring 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/30' 
                          : 'bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 hover:from-purple-600 hover:via-violet-600 hover:to-pink-600 text-white shadow-purple-500/30'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                      {isMonitoring ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      <span className="text-lg relative z-10">{isMonitoring ? 'Stop' : 'Start'} Monitoring</span>
                    </button>
                    <button className="flex items-center space-x-3 px-8 py-4 rounded-2xl border-2 border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 hover:border-purple-400 shadow-xl hover:shadow-purple-500/20 group">
                      <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                      <span className="font-semibold">Calibrate System</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Gait Trends */}
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Gait Trends</h3>
                        <p className="text-gray-400 text-sm">Real-time movement analysis</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-600/30">
                      Last 50 samples
                    </div>
                  </div>
                  <div className="h-80 rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 p-4 border border-slate-600/30">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gaitData.slice(-50)} key={gaitData.length} margin={{ top: 10, right: 30, left: 20, bottom: 50 }}>
                        <defs>
                          <linearGradient id="strideGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="swingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9CA3AF" 
                          fontSize={12}
                          label={{ value: 'Time (samples)', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          fontSize={12}
                          label={{ value: 'Movement (pixels)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #6366F1',
                            borderRadius: '12px',
                            color: '#F3F4F6',
                            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.2)'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="stride_length"
                          stroke="#8B5CF6"
                          strokeWidth={3}
                          dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2, fill: '#8B5CF6' }}
                          name="Stride Length (px)"
                          isAnimationActive={false}
                          fill="url(#strideGradient)"
                         />
                        <Line
                          type="monotone"
                          dataKey="swing_length"
                          stroke="#EC4899"
                          strokeWidth={3}
                          dot={{ fill: '#EC4899', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#EC4899', strokeWidth: 2, fill: '#EC4899' }}
                          name="Swing Length (px)"
                          isAnimationActive={false}
                          fill="url(#swingGradient)"
                         />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Neural Risk Assessment</h3>
                        <p className="text-gray-400 text-sm">AI-powered neurological analysis</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-600/30">
                      {gaitData && gaitData.length > 0 ? `${gaitData.length} samples` : 'Awaiting data...'}
                    </div>
                  </div>
                  <div className="space-y-6">
                    {riskData.map((item, index) => (
                      <div key={index} className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-200 font-semibold text-lg">{item.category}</span>
                              <div className="text-right flex items-center space-x-3">
                                <span className="text-white font-bold text-2xl">{Math.round(item.risk)}%</span>
                                <div className={`text-xs px-3 py-2 rounded-full font-semibold border ${
                                  item.risk < 20 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                  item.risk < 40 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                  item.risk < 70 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                  'bg-red-500/20 text-red-300 border-red-500/30'
                                }`}>
                                  {item.status || 'Unknown'}
                                </div>
                              </div>
                            </div>
                            {(item as any).indicators && (
                              <p className="text-sm text-gray-400 mt-2 bg-slate-700/30 rounded-lg p-3">{(item as any).indicators}</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-4 overflow-hidden shadow-inner border border-slate-600/30">
                          <div
                            className={`h-4 rounded-full transition-all duration-1000 shadow-lg ${item.color} relative overflow-hidden`}
                            style={{ width: `${Math.max(3, item.risk)}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Dynamic recommendation based on highest risk */}
                {(() => {
                  const maxRisk = Math.max(...riskData.map(r => r.risk));
                  const highestRiskCondition = riskData.find(r => r.risk === maxRisk);
                  
                  if (maxRisk === 0) {
                    return (
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                        <p className="text-blue-300 text-sm">
                          <strong>Status:</strong> Collecting baseline data. Continue monitoring for accurate assessment.
                        </p>
                      </div>
                    );
                  } else if (maxRisk < 30) {
                    return (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                        <p className="text-green-300 text-sm">
                          <strong>Status:</strong> Gait patterns appear normal. Continue regular monitoring for preventive care.
                        </p>
                      </div>
                    );
                  } else if (maxRisk < 60) {
                    return (
                      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                        <p className="text-yellow-300 text-sm">
                          <strong>Recommendation:</strong> Elevated risk detected for {highestRiskCondition?.category}. 
                          Consider scheduling a neurological consultation for early intervention.
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-6 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg border border-red-500/30">
                        <p className="text-red-300 text-sm">
                          <strong>Urgent:</strong> High risk patterns detected for {highestRiskCondition?.category}. 
                          Immediate medical consultation recommended for comprehensive neurological evaluation.
                        </p>
                      </div>
                    );
                  }
                })()}
                
                {/* Gait Analysis Insights */}
                {gaitData && gaitData.length > 10 && (
                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                    <h4 className="text-sm font-semibold text-purple-300 mb-2">Current Gait Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400">Avg Stride:</span>
                        <span className="text-white ml-2">
                          {Math.round(gaitData.slice(-10).reduce((sum, d) => sum + Math.abs(d.stride_length || 0), 0) / 10)}px
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Avg Swing:</span>
                        <span className="text-white ml-2">
                          {Math.round(gaitData.slice(-10).reduce((sum, d) => sum + Math.abs(d.swing_length || 0), 0) / 10)}px
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Alerts and Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Alerts */}
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Recent Alerts</h3>
                        <p className="text-gray-400 text-sm">Real-time notifications</p>
                      </div>
                      {(() => {
                        const highPriorityCount = alerts.filter(alert => alert.type === 'error' || alert.type === 'warning').length;
                        if (highPriorityCount > 0) {
                          return (
                            <span className={`px-3 py-2 rounded-xl text-xs font-bold border shadow-lg ${
                              alerts.some(alert => alert.type === 'error') 
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20'
                            }`}>
                              {highPriorityCount} Priority
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <button className="text-purple-400 hover:text-purple-300 transition-all duration-300 text-sm font-medium bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2 rounded-xl border border-purple-500/30">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-5 rounded-2xl border-l-4 shadow-lg relative overflow-hidden ${getAlertColor(alert.type)} transition-all duration-300 hover:scale-[1.02]`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
                        <div className="flex items-start space-x-4 relative z-10">
                          <div className="mt-1">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium leading-relaxed">{alert.message}</p>
                            <div className="flex items-center justify-between mt-3">
                              <p className="text-gray-400 text-xs">{alert.time}</p>
                              <div className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                alert.type === 'error' ? 'bg-red-500/20 text-red-300' :
                                alert.type === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                                alert.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>
                                {alert.type.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Quick Actions</h3>
                      <p className="text-gray-400 text-sm">Essential tools and shortcuts</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="group flex flex-col items-center space-y-3 p-6 bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-pink-500/20 rounded-2xl border border-purple-500/40 hover:from-purple-500/30 hover:via-violet-500/20 hover:to-pink-500/30 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/30 transition-all">
                        <Download className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white font-semibold relative z-10">Export Report</span>
                      <span className="text-gray-400 text-xs text-center relative z-10">Download analysis data</span>
                    </button>
                    <button className="group flex flex-col items-center space-y-3 p-6 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-indigo-500/20 rounded-2xl border border-blue-500/40 hover:from-blue-500/30 hover:via-cyan-500/20 hover:to-indigo-500/30 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-all">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white font-semibold relative z-10">Schedule Test</span>
                      <span className="text-gray-400 text-xs text-center relative z-10">Book consultation</span>
                    </button>
                    <button className="group flex flex-col items-center space-y-3 p-6 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-teal-500/20 rounded-2xl border border-emerald-500/40 hover:from-emerald-500/30 hover:via-green-500/20 hover:to-teal-500/30 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-all">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white font-semibold relative z-10">Configure</span>
                      <span className="text-gray-400 text-xs text-center relative z-10">System settings</span>
                    </button>
                    <button className="group flex flex-col items-center space-y-3 p-6 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-red-500/20 rounded-2xl border border-orange-500/40 hover:from-orange-500/30 hover:via-amber-500/20 hover:to-red-500/30 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-orange-500/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-500/30 transition-all">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white font-semibold relative z-10">History</span>
                      <span className="text-gray-400 text-xs text-center relative z-10">View past data</span>
                    </button>
                  </div>
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
            <p className="text-gray-300 mb-8">You need to sign in to access the NeuroGate dashboard.</p>
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