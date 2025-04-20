import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, Calendar, DollarSign, Mail, AlertTriangle, Check, X, ChevronDown, Settings, Search, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SubscriptionTracker() {
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem('subscriptions');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Netflix', price: 15.99, cycle: 'monthly', nextPayment: '2025-05-15', color: 'bg-red-500', icon: '🎬' },
      { id: 2, name: 'Spotify', price: 9.99, cycle: 'monthly', nextPayment: '2025-05-10', color: 'bg-green-500', icon: '🎵' },
      { id: 3, name: 'Adobe CC', price: 52.99, cycle: 'monthly', nextPayment: '2025-04-28', color: 'bg-purple-500', icon: '🎨' }
    ];
  });
  
  const [newSubscription, setNewSubscription] = useState({ name: '', price: '', cycle: 'monthly', nextPayment: '', color: 'bg-blue-500', icon: '📱' });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifications, setNotifications] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const icons = ['📱', '🎵', '🎬', '📚', '🎮', '☁️', '📰', '📺', '🎨', '💪', '🏠', '🔒'];
  const notificationSound = useRef(new Audio('https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js'));
  
  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);
  
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);
  
  // Check for upcoming payments
  useEffect(() => {
    const checkReminders = () => {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = subscriptions.filter(sub => {
        const daysUntil = getDaysUntil(sub.nextPayment);
        return daysUntil <= 3 && daysUntil >= 0;
      });
      
      upcoming.forEach(sub => {
        const existingReminder = reminders.find(r => r.subscriptionId === sub.id && r.date === sub.nextPayment);
        if (!existingReminder) {
          const daysUntil = getDaysUntil(sub.nextPayment);
          const newNotification = {
            id: Date.now() + Math.random(),
            message: `${sub.name} payment due in ${daysUntil === 0 ? 'today' : daysUntil + ' days'}`,
            type: 'warning',
            subscription: sub
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          if (Notification.permission === 'granted') {
            new Notification('Subscription Reminder', {
              body: newNotification.message,
              icon: 'https://cdnjs.cloudflare.com/ajax/libs/simple-icons/8.8.0/simpleicons.svg'
            });
          }
          
          setReminders(prev => [...prev, { 
            id: Date.now(), 
            subscriptionId: sub.id,
            date: sub.nextPayment
          }]);
        }
      });
    };
    
    // Check for reminders when component mounts and every hour
    checkReminders();
    const interval = setInterval(checkReminders, 3600000);
    
    return () => clearInterval(interval);
  }, [subscriptions, reminders]);
  
  // Request notification permission
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  // Theme handling
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };
  
  const getDaysUntil = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };
  
  const calculateMonthlyTotal = () => {
    return subscriptions.reduce((acc, sub) => {
      let monthlyPrice = parseFloat(sub.price);
      if (sub.cycle === 'yearly') monthlyPrice /= 12;
      else if (sub.cycle === 'weekly') monthlyPrice *= 4.33;
      else if (sub.cycle === 'quarterly') monthlyPrice /= 3;
      return acc + monthlyPrice;
    }, 0);
  };
  
  const calculateAnnualTotal = () => {
    return subscriptions.reduce((acc, sub) => {
      let annualPrice = parseFloat(sub.price);
      if (sub.cycle === 'monthly') annualPrice *= 12;
      else if (sub.cycle === 'weekly') annualPrice *= 52;
      else if (sub.cycle === 'quarterly') annualPrice *= 4;
      return acc + annualPrice;
    }, 0);
  };
  
  const addSubscription = () => {
    if (!newSubscription.name || !newSubscription.price || !newSubscription.nextPayment) {
      addNotification('Please fill in all required fields', 'error');
      return;
    }
    
    const newSub = {
      ...newSubscription,
      id: Date.now(),
      price: parseFloat(newSubscription.price)
    };
    
    setSubscriptions([...subscriptions, newSub]);
    setNewSubscription({ name: '', price: '', cycle: 'monthly', nextPayment: '', color: 'bg-blue-500', icon: '📱' });
    setIsAddingNew(false);
    addNotification(`Added ${newSub.name} subscription`, 'success');
  };
  
  const updateNextPaymentDate = (id) => {
    setSubscriptions(subscriptions.map(sub => {
      if (sub.id === id) {
        const nextDate = new Date(sub.nextPayment);
        
        if (sub.cycle === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (sub.cycle === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else if (sub.cycle === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (sub.cycle === 'quarterly') {
          nextDate.setMonth(nextDate.getMonth() + 3);
        }
        
        return { ...sub, nextPayment: nextDate.toISOString().split('T')[0] };
      }
      return sub;
    }));
  };
  
  const deleteSubscription = (id) => {
    setSubscriptions(subscriptions.filter(sub => sub.id !== id));
    setReminders(reminders.filter(reminder => reminder.subscriptionId !== id));
    setShowDeleteConfirm(null);
    addNotification('Subscription deleted', 'info');
  };
  
  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(current => current.filter(n => n.id !== newNotification.id));
    }, 5000);
  };
  
  const dismissNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };
  
  const sendReminder = (subscription) => {
    // For email - in a real app, this would connect to an email service
    // This simulates the action with a notification
    const daysUntil = getDaysUntil(subscription.nextPayment);
    const message = `Email reminder sent for ${subscription.name} payment due in ${daysUntil === 0 ? 'today' : daysUntil + ' days'}`;
    addNotification(message, 'success');
    
    if (Notification.permission === 'granted') {
      new Notification('Subscription Reminder Sent', {
        body: message,
        icon: 'https://cdnjs.cloudflare.com/ajax/libs/simple-icons/8.8.0/simpleicons.svg'
      });
    }
  };
  
  const sortedSubscriptions = [...subscriptions]
    .filter(sub => sub.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.nextPayment) - new Date(b.nextPayment);
      } else if (sortBy === 'price-asc') {
        return a.price - b.price;
      } else if (sortBy === 'price-desc') {
        return b.price - a.price;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success': return <Check className="text-green-500" />;
      case 'error': return <X className="text-red-500" />;
      case 'warning': return <AlertTriangle className="text-yellow-500" />;
      default: return <Bell className="text-blue-500" />;
    }
  };
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'} transition-all duration-500`}>
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg text-white"
        >
          <div className="flex items-center space-x-4">
            <span className="text-3xl">📊</span>
            <h1 className="text-2xl font-bold">Subscriptio</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode} 
              className="p-2 rounded-full hover:bg-white/20 transition-all"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsRemindersOpen(!isRemindersOpen)}
              className="relative p-2 rounded-full hover:bg-white/20 transition-all"
              aria-label="View notifications"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center bg-white/20 rounded-full px-3 py-1">
              <span className="text-sm font-medium mr-2">Total Monthly:</span>
              <span className="text-sm font-bold">{formatCurrency(calculateMonthlyTotal())}</span>
            </div>
          </div>
        </motion.div>
        
        {/* Notifications dropdown */}
        <AnimatePresence>
          {isRemindersOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute right-4 top-20 w-80 max-h-96 overflow-y-auto z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 font-medium">
                Notifications
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No notifications
                </div>
              ) : (
                <div>
                  {notifications.map(notification => (
                    <motion.div 
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3"
                    >
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{notification.message}</p>
                        {notification.subscription && (
                          <button 
                            onClick={() => {
                              sendReminder(notification.subscription);
                              dismissNotification(notification.id);
                            }}
                            className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                          >
                            Send email reminder
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => dismissNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                  <div className="p-2 text-center">
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="col-span-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <h2 className="text-xl font-bold mb-2">Monthly Spend</h2>
            <div className="text-3xl font-bold mb-4">{formatCurrency(calculateMonthlyTotal())}</div>
            <div className="flex items-center gap-2">
              <DollarSign size={18} />
              <span>Monthly average per subscription: {formatCurrency(calculateMonthlyTotal() / (subscriptions.length || 1))}</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="col-span-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
          >
            <h2 className="text-xl font-bold mb-2">Annual Spend</h2>
            <div className="text-3xl font-bold mb-4">{formatCurrency(calculateAnnualTotal())}</div>
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>Total subscriptions: {subscriptions.length}</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="col-span-1 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
          >
            <h2 className="text-xl font-bold mb-2">Upcoming Payments</h2>
            <div className="text-3xl font-bold mb-4">
              {subscriptions.filter(sub => getDaysUntil(sub.nextPayment) <= 7 && getDaysUntil(sub.nextPayment) >= 0).length}
            </div>
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <span>Due in the next 7 days</span>
            </div>
          </motion.div>
        </div>
        
        {/* Filter and Sort Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="date">Sort by date</option>
              <option value="price-asc">Price (low to high)</option>
              <option value="price-desc">Price (high to low)</option>
              <option value="name">Name</option>
            </select>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
            >
              <Plus size={18} />
              <span>Add New</span>
            </motion.button>
          </div>
        </div>
        
        {/* Subscriptions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {sortedSubscriptions.map(subscription => (
              <motion.div 
                key={subscription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`relative overflow-hidden rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${subscription.color}`}></div>
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{subscription.icon}</span>
                      <h3 className="text-lg font-bold">{subscription.name}</h3>
                    </div>
                    <div className="flex">
                      <button 
                        onClick={() => setShowDeleteConfirm(subscription.id)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 size={18} className="text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Price:</span>
                      <span className="font-semibold">{formatCurrency(subscription.price)}/{subscription.cycle.replace('ly', '')}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Next payment:</span>
                      <span 
                        className={`font-semibold ${getDaysUntil(subscription.nextPayment) <= 3 ? 'text-red-500' : getDaysUntil(subscription.nextPayment) <= 7 ? 'text-yellow-500' : ''}`}
                      >
                        {new Date(subscription.nextPayment).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        {getDaysUntil(subscription.nextPayment) === 0 
                          ? 'Due today' 
                          : getDaysUntil(subscription.nextPayment) < 0 
                            ? 'Overdue' 
                            : `${getDaysUntil(subscription.nextPayment)} days left`}
                      </span>
                      <span>
                        {subscription.cycle === 'monthly' 
                          ? formatCurrency(subscription.price * 12) + '/year' 
                          : subscription.cycle === 'yearly' 
                            ? formatCurrency(subscription.price / 12) + '/month' 
                            : subscription.cycle === 'weekly'
                              ? formatCurrency(subscription.price * 4.33) + '/month'
                              : formatCurrency(subscription.price / 3) + '/month'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <button 
                      onClick={() => {
                        updateNextPaymentDate(subscription.id);
                        addNotification(`Marked ${subscription.name} as paid`, 'success');
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as Paid
                    </button>
                    <button 
                      onClick={() => sendReminder(subscription)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Send Reminder
                    </button>
                  </div>
                </div>
                
                {/* Delete confirmation */}
                <AnimatePresence>
                  {showDeleteConfirm === subscription.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gray-900/80 flex items-center justify-center p-6"
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 w-full max-w-xs">
                        <h4 className="font-bold mb-3">Delete this subscription?</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This action cannot be undone.</p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-2 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => deleteSubscription(subscription.id)}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {sortedSubscriptions.length === 0 && !isAddingNew && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">No subscriptions found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {filter ? `No results for "${filter}"` : "You haven't added any subscriptions yet"}
            </p>
            <button 
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
            >
              <Plus size={18} />
              <span>Add Your First Subscription</span>
            </button>
          </motion.div>
        )}
        
        {/* Add New Subscription Form Modal */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsAddingNew(false);
              }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold">Add New Subscription</h2>
                </div>
                
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subscription Name</label>
                    <input 
                      type="text" 
                      value={newSubscription.name}
                      onChange={(e) => setNewSubscription({...newSubscription, name: e.target.value})}
                      placeholder="e.g. Netflix, Spotify..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Price</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input 
                        type="number" 
                        value={newSubscription.price}
                        onChange={(e) => setNewSubscription({...newSubscription, price: e.target.value})}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Billing Cycle</label>
                    <select 
                      value={newSubscription.cycle}
                      onChange={(e) => setNewSubscription({...newSubscription, cycle: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Next Payment Date</label>
                    <input 
                      type="date"
                      value={newSubscription.nextPayment}
                      onChange={(e) => setNewSubscription({...newSubscription, nextPayment: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <div className="grid grid-cols-8 gap-2">
                      {colors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewSubscription({...newSubscription, color})}
                          className={`w-8 h-8 rounded-full ${color} ${newSubscription.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Icon</label>
                    <div className="grid grid-cols-6 gap-2">
                      {icons.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewSubscription({...newSubscription, icon})}
                          className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 ${newSubscription.icon === icon ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <button 
                    onClick={() => setIsAddingNew(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addSubscription}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Add Subscription
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Toast Notifications */}
        <div className="fixed bottom-5 right-5 space-y-3 z-40">
          <AnimatePresence>
            {notifications.slice(0, 3).map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className={`min-w-64 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
                  notification.type === 'success' ? 'bg-green-500' :
                  notification.type === 'error' ? 'bg-red-500' :
                  notification.type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                } text-white`}
              >
                <div>
                  {getNotificationIcon(notification.type)}
                </div>
                <p className="flex-1">{notification.message}</p>
                <button 
                  onClick={() => dismissNotification(notification.id)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Footer */}
      <footer className={`mt-12 py-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} text-center`}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Subscriptio - Made with ❤️ - {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}