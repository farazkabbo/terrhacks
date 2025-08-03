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
        <header className="bg-slate-800/50 backdrop-blur-md border-b border-purple-500/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white hidden sm:block">NeuroGait</span>
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
                {(() => {
                  const highPriorityAlerts = alerts.filter(alert => alert.type === 'error' || alert.type === 'warning');
                  const hasHighPriority = highPriorityAlerts.length > 0;
                  return (
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                      hasHighPriority ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                    }`}></span>
                  );
                })()}
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Input Webcam */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Camera Input</h3>
                    <div className="aspect-video bg-slate-900/50 rounded-xl flex items-center justify-center border border-purple-500/20">
                      {isMonitoring ? (
                        WebcamComponent()
                      ) : (
                        <div className="text-center">
                          <Camera className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Input Camera</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Processed Output */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                    <div className="aspect-video bg-slate-900/50 rounded-xl flex items-center justify-center border border-purple-500/20">
                      {isMonitoring ? (
                        ProcessedImageComponent()
                      ) : (
                        <div className="text-center">
                          <Brain className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Processed Output</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                        <span className="text-gray-400">Queue Size</span>
                        <span className={`font-semibold ${
                          processingQueue.current > 3 ? 'text-red-400' : 
                          processingQueue.current > 1 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {processingQueue.current}
                        </span>
                      </div>
                      {droppedFrames > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Dropped</span>
                          <span className="text-orange-400 font-semibold">{droppedFrames}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Processing</span>
                        <span className={`font-semibold ${isMonitoring ? 'text-green-400' : 'text-gray-400'}`}>
                          {isMonitoring ? (isProcessing ? 'Active' : 'Ready') : 'Inactive'}
                        </span>
                      </div>
                      {processingStatus && (
                        <div className="text-xs text-gray-300 mt-2 p-2 bg-slate-700/50 rounded">
                          {processingStatus}
                        </div>
                      )}
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
                    <LineChart data={gaitData.slice(-50)} key={gaitData.length} >
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
                        dataKey="stride_length"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={false}
                        name="Stride Length (px)"
                        isAnimationActive={false}
                       />
                       {/* @ts-ignore */}
                      <Line
                        type="monotone"
                        dataKey="swing_length"
                        stroke="#EC4899"
                        strokeWidth={3}
                        dot={false}
                        name="Swing Length (px)"
                        isAnimationActive={false}
                       />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6 text-orange-400" />
                    <h3 className="text-xl font-bold text-white">Neural Risk Assessment</h3>
                  </div>
                  <div className="text-xs text-gray-400">
                    {gaitData && gaitData.length > 0 ? `Based on ${gaitData.length} samples` : 'Awaiting data...'}
                  </div>
                </div>
                <div className="space-y-5">
                  {riskData.map((item, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-200 font-medium">{item.category}</span>
                            <div className="text-right">
                              <span className="text-white font-bold text-lg">{Math.round(item.risk)}%</span>
                              <div className={`text-xs px-2 py-1 rounded-full inline-block ml-2 ${
                                item.risk < 20 ? 'bg-green-500/20 text-green-300' :
                                item.risk < 40 ? 'bg-yellow-500/20 text-yellow-300' :
                                item.risk < 70 ? 'bg-orange-500/20 text-orange-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {item.status || 'Unknown'}
                              </div>
                            </div>
                          </div>
                          {(item as any).indicators && (
                            <p className="text-xs text-gray-400 mt-1">{(item as any).indicators}</p>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ${item.color}`}
                          style={{ width: `${Math.max(2, item.risk)}%` }}
                        />
                      </div>
                    </div>
                  ))}
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
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Alerts */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-white">Recent Alerts</h3>
                    {(() => {
                      const highPriorityCount = alerts.filter(alert => alert.type === 'error' || alert.type === 'warning').length;
                      if (highPriorityCount > 0) {
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            alerts.some(alert => alert.type === 'error') 
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}>
                            {highPriorityCount} Priority
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
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