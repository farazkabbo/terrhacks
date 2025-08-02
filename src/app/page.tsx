"use client"
import React, { useState, useEffect } from 'react';
import { Camera, Shield, Activity, Brain, Users, CheckCircle, ArrowRight, Play, Star, Menu, X } from 'lucide-react';
import { useUser, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

const GaitGuardLanding = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      // Calculate scroll progress
      const scrolled = window.scrollY;
      const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((scrolled / maxHeight) * 100);
      
      // Intersection observer for animations
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInView) {
          setIsVisible(prev => ({ ...prev, [index]: true }));
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    handleScroll(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const features = [
    {
      icon: <Camera className="w-8 h-8" />,
      title: "Non-Invasive Monitoring",
      description: "Uses your existing webcam or smart camera for continuous gait analysis",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Detection",
      description: "Advanced algorithms detect subtle changes in walking patterns",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: "Real-Time Analysis",
      description: "Instant feedback with live pose detection and movement tracking",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Early Intervention",
      description: "Detect signs years before traditional methods for better outcomes",
      color: "from-orange-500 to-red-500"
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Neurologist",
      text: "GaitGuard has revolutionized how we monitor our patients at home.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Family Caregiver",
      text: "Peace of mind knowing we'll catch changes early.",
      rating: 5
    }
  ];

  const FloatingParticles = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-purple-500 rounded-full opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .bg-mesh {
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%);
        }
        .glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <FloatingParticles />
      
      {/* Animated Background Gradient */}
      <div 
        className="fixed inset-0 opacity-50 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
        }}
      />

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled ? 'bg-slate-900/95 backdrop-blur-md border-b border-purple-500/20 shadow-2xl' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 animate-slide-in-left">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-glow">
                <Activity className="w-6 h-6 text-white animate-bounce-subtle" />
              </div>
              <span className="text-2xl font-bold text-white">GaitGuard AI</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8 animate-slide-in-right">
              <a href="#features" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group">
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group">
                How It Works
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group">
                Testimonials
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
              
              <SignedOut>
                <Link href="/sign-up">
                  <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50">
                    Get Started
                  </button>
                </Link>
              </SignedOut>
              
              <SignedIn>
                <Link href="/dashboard">
                  <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50">
                    Dashboard
                  </button>
                </Link>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
              </SignedIn>
            </div>

            <button 
              className="md:hidden text-white transition-transform duration-300 hover:scale-110"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Enhanced Mobile Menu */}
        <div className={`md:hidden transition-all duration-500 ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="bg-slate-900/95 backdrop-blur-md border-t border-purple-500/20">
            <div className="px-4 py-4 space-y-4">
              {['Features', 'How It Works', 'Testimonials'].map((item, index) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`} 
                  className="block text-gray-300 hover:text-white transition-all duration-300 transform hover:translate-x-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              
              <SignedOut>
                <Link href="/sign-up" className="block">
                  <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105">
                    Get Started
                  </button>
                </Link>
              </SignedOut>
              
              <SignedIn>
                <Link href="/dashboard" className="block">
                  <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 mb-2">
                    Dashboard
                  </button>
                </Link>
                <div className="flex justify-center">
                  <UserButton />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left animate-on-scroll opacity-0 animate-slide-in-left">
              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
                Detect <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse-slow">
                  Neurological Changes
                </span> Years Earlier
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                GaitGuard AI monitors walking patterns through your webcam, using advanced AI to detect early signs of Parkinson's and Alzheimer's disease for timely intervention.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <SignedOut>
                  <Link href="/sign-up">
                    <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center space-x-2 group">
                      <span>Start Free Trial</span>
                      <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </Link>
                </SignedOut>
                
                <SignedIn>
                  <Link href="/dashboard">
                    <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center space-x-2 group">
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </Link>
                </SignedIn>
                
                <button className="border-2 border-purple-500 text-purple-400 px-8 py-4 rounded-full text-lg font-semibold hover:bg-purple-500 hover:text-white transition-all duration-300 transform hover:scale-110 flex items-center justify-center space-x-2 group glass">
                  <Play className="w-5 h-5 transition-transform duration-300 group-hover:scale-125" />
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>
            
            <div className="relative animate-on-scroll opacity-0 animate-slide-in-right">
              <div className="relative z-10 glass rounded-3xl p-8 animate-glow">
                <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse-slow"></div>
                  <div className="text-center relative z-10">
                    <Camera className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-bounce-subtle" />
                    <p className="text-gray-300">Live Gait Monitoring</p>
                  </div>
                  {/* Scanning Effect */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Normal", value: "Gait Status", color: "text-green-400" },
                    { label: "1.2m/s", value: "Speed", color: "text-blue-400" },
                    { label: "0.65m", value: "Stride", color: "text-purple-400" }
                  ].map((item, index) => (
                    <div 
                      key={index}
                      className="bg-slate-800/50 rounded-lg p-3 text-center transition-all duration-300 hover:bg-slate-700/50 hover:scale-105 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.2}s` }}
                    >
                      <div className={`${item.color} font-bold text-lg transition-all duration-300 hover:scale-110`}>{item.label}</div>
                      <div className="text-gray-400 text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Animated Background Blurs */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-20 animate-pulse-slow"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-10 animate-bounce-subtle"></div>
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-pink-500 rounded-full blur-3xl opacity-10 animate-bounce-subtle" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-mesh relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Advanced AI for <span className="text-purple-400 animate-pulse-slow">Healthcare</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our cutting-edge technology transforms how we detect and monitor neurodegenerative diseases
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group animate-on-scroll animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="glass rounded-2xl p-8 hover:bg-white/10 transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 hover:rotate-1 relative overflow-hidden">
                  {/* Animated gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl`}></div>
                  
                  <div className="relative z-10">
                    <div className="text-purple-400 mb-6 group-hover:text-pink-400 transition-all duration-300 transform group-hover:scale-125 group-hover:rotate-12">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>

                  {/* Hover effect lines */}
                  <div className="absolute top-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-500"></div>
                  <div className="absolute bottom-0 right-0 w-0 h-0.5 bg-gradient-to-l from-purple-500 to-pink-500 group-hover:w-full transition-all duration-500 delay-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              How <span className="text-purple-400">GaitGuard AI</span> Works
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Simple setup, powerful insights, life-changing early detection
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 relative">
            {/* Connecting Lines */}
            <div className="hidden lg:block absolute top-1/2 left-1/3 w-1/3 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 animate-pulse"></div>
            <div className="hidden lg:block absolute top-1/2 right-1/3 w-1/3 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>

            {[
              {
                step: "01",
                title: "Setup & Connect",
                description: "Connect your webcam or upload walking videos. Our system calibrates to your unique gait pattern.",
                icon: <Camera className="w-12 h-12" />
              },
              {
                step: "02",
                title: "AI Analysis",
                description: "Advanced pose detection tracks 33+ body landmarks, analyzing stride, balance, and movement patterns.",
                icon: <Brain className="w-12 h-12" />
              },
              {
                step: "03",
                title: "Early Alerts",
                description: "Receive notifications when gait changes suggest early signs of neurological conditions.",
                icon: <Shield className="w-12 h-12" />
              }
            ].map((item, index) => (
              <div key={index} className="text-center relative animate-on-scroll animate-fade-in-up" style={{ animationDelay: `${index * 0.3}s` }}>
                <div className="relative inline-block mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-bold text-2xl mb-6 relative z-10 transform transition-all duration-500 hover:scale-125 animate-glow">
                    {item.step}
                  </div>
                  
                  {/* Floating icon */}
                  <div className="absolute -top-2 -right-2 text-purple-400 animate-bounce-subtle" style={{ animationDelay: `${index * 0.5}s` }}>
                    {item.icon}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-pink-400 hover:bg-clip-text transition-all duration-300">
                  {item.title}
                </h3>
                <p className="text-gray-300 leading-relaxed hover:text-gray-200 transition-colors duration-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Trusted by <span className="text-purple-400">Healthcare Professionals</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="glass rounded-2xl p-8 hover:bg-white/10 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 group animate-on-scroll animate-fade-in-up"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-5 h-5 text-yellow-400 fill-current transition-all duration-300 hover:scale-125 animate-bounce-subtle" 
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <p className="text-gray-300 text-lg mb-6 italic group-hover:text-gray-200 transition-colors duration-300">
                  "{testimonial.text}"
                </p>
                <div className="transform transition-all duration-300 group-hover:translate-x-2">
                  <div className="font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                    {testimonial.name}
                  </div>
                  <div className="text-purple-400">{testimonial.role}</div>
                </div>

                {/* Quote decoration */}
                <div className="absolute top-4 right-4 text-6xl text-purple-500/20 font-serif opacity-0 group-hover:opacity-100 transition-opacity duration-500">"</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-mesh relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Why Choose <span className="text-purple-400">GaitGuard AI</span>?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CheckCircle className="w-8 h-8" />,
                title: "99.2% Accuracy",
                description: "Clinical-grade precision in detecting gait abnormalities"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "10,000+ Users",
                description: "Trusted by families and healthcare providers worldwide"
              },
              {
                icon: <Activity className="w-8 h-8" />,
                title: "24/7 Monitoring",
                description: "Continuous surveillance for immediate alerts"
              }
            ].map((benefit, index) => (
              <div 
                key={index}
                className="text-center group animate-on-scroll animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white mb-6 transform transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 animate-glow">
                  {benefit.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                  {benefit.title}
                </h3>
                <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl animate-bounce-subtle"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full blur-3xl animate-bounce-subtle" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse-slow"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 animate-fade-in-up">
            Start Protecting Your Health Today
          </h2>
          <p className="text-xl text-purple-100 mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Join thousands of families using GaitGuard AI for early detection and peace of mind
          </p>
          
          <SignedOut>
            <Link href="/sign-up">
              <button className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl flex items-center justify-center space-x-2 mx-auto group animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </Link>
          </SignedOut>
          
          <SignedIn>
            <Link href="/dashboard">
              <button className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl flex items-center justify-center space-x-2 mx-auto group animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2 animate-on-scroll opacity-0 animate-slide-in-left">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-glow">
                  <Activity className="w-6 h-6 text-white animate-bounce-subtle" />
                </div>
                <span className="text-2xl font-bold text-white">GaitGuard AI</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md hover:text-gray-300 transition-colors duration-300">
                Advanced AI-powered gait monitoring for early detection of neurodegenerative diseases.
              </p>
            </div>
            
            <div className="animate-on-scroll opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                {['Features', 'Pricing', 'Documentation'].map((item, index) => (
                  <li key={item}>
                    <a 
                      href="#" 
                      className="hover:text-white transition-all duration-300 transform hover:translate-x-2 inline-block"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="animate-on-scroll opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <h4 className="font-bold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                {['Help Center', 'Contact Us', 'Privacy Policy'].map((item, index) => (
                  <li key={item}>
                    <a 
                      href="#" 
                      className="hover:text-white transition-all duration-300 transform hover:translate-x-2 inline-block"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center animate-on-scroll opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <p className="text-gray-400 hover:text-gray-300 transition-colors duration-300">
              © 2025 GaitGuard AI. All rights reserved.
            </p>
          </div>
        </div>

        {/* Animated footer decoration */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse"></div>
      </footer>

      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-800 z-50">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button 
          className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-110 animate-bounce-subtle flex items-center justify-center group"
          onClick={scrollToTop}
        >
          <ArrowRight className="w-6 h-6 text-white transform -rotate-90 group-hover:rotate-0 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
};

export default GaitGuardLanding;