import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateAuraDates, formatDate } from '../utils/auraCalculation';
import DatePicker from './DatePicker';
import InitialDatePicker from './InitialDatePicker';
import TaskItem from './TaskItem';
import { ArrowLeft, Plus, Folder, CheckSquare, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const FolderPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showInitialDatePicker, setShowInitialDatePicker] = useState(true);
  const [currentDate, setCurrentDate] = useState(null);
  const [lastEndDate, setLastEndDate] = useState(null);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [otherTasks, setOtherTasks] = useState([]);

  const collectionName = `folder-${folderId}`;

  useEffect(() => {
    // Only fetch data after current date is set
    if (!currentDate) return;

    const tasksQuery = query(collection(db, collectionName), orderBy('serialNumber', 'asc'));
    const unsubscribe = onSnapshot(tasksQuery, (querySnapshot) => {
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update today's tasks based on currentDate
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);

      const todayTasks = tasksData.filter(task => {
        const taskDate = new Date(task.currentDate);
        taskDate.setHours(0, 0, 0, 0);
        // Generate aura dates for this task
        const auraDates = generateAuraDates(new Date(task.createdAt), new Date(task.endDate));
        // Check if today is an aura date and matches currentDate
        return auraDates.some(auraDate => {
          const compareDate = new Date(auraDate);
          compareDate.setHours(0, 0, 0, 0);
          return compareDate.getTime() === today.getTime();
        }) && taskDate.getTime() === today.getTime();
      });

      const otherTasks = tasksData.filter(task => {
        const taskDate = new Date(task.currentDate);
        taskDate.setHours(0, 0, 0, 0);
        const auraDates = generateAuraDates(new Date(task.createdAt), new Date(task.endDate));
        return !(auraDates.some(auraDate => {
          const compareDate = new Date(auraDate);
          compareDate.setHours(0, 0, 0, 0);
          return compareDate.getTime() === today.getTime();
        }) && taskDate.getTime() === today.getTime());
      });

      setTasks(tasksData);
      setTodaysTasks(todayTasks);
      setOtherTasks(otherTasks);
    });

    return () => unsubscribe();
  }, [collectionName, currentDate]);

  const handleInitialDateSelect = (date) => {
    setCurrentDate(date);
    setShowInitialDatePicker(false);
  };

  const handleDateSelect = async (currentDate, endDate) => {
    try {
      // Create new Date objects to avoid any reference issues
      const startDate = new Date(currentDate);
      const endDateObj = new Date(endDate);
      
      // Set hours to 0 for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDateObj.setHours(0, 0, 0, 0);
      
      // Generate aura dates for this specific task
      const auraDates = generateAuraDates(startDate, endDateObj);
      const serialNumber = tasks.length + 1;

      // Make sure we have at least 2 aura dates
      if (auraDates.length < 2) {
        throw new Error('Not enough aura dates generated');
      }

      // Find the next aura date after the start date
      let nextAuraDate = null;
      for (let i = 0; i < auraDates.length; i++) {
        const auraDate = new Date(auraDates[i]);
        auraDate.setHours(0, 0, 0, 0);
        if (auraDate > startDate) {
          nextAuraDate = auraDate;
          break;
        }
      }

      // If no next aura date found, use the second aura date
      if (!nextAuraDate && auraDates.length >= 2) {
        nextAuraDate = new Date(auraDates[1]);
        nextAuraDate.setHours(0, 0, 0, 0);
      }

      // Log the aura dates for debugging
      console.log('Task #' + serialNumber + ' Aura dates:', auraDates.map(date => formatDate(date)));
      console.log('Using next aura date:', formatDate(nextAuraDate));

      // Create the task with the next aura date
      await addDoc(collection(db, collectionName), {
        serialNumber,
        endDate: endDateObj.toISOString(),
        currentDate: nextAuraDate.toISOString(),
        currentAuraIndex: 1,
        text1: '',
        text2: '',
        image1: null,
        image2: null,
        createdAt: startDate.toISOString(),
        lastUpdated: null
      });

      setShowDatePicker(false);
      setLastEndDate(endDateObj);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdate = () => {
    setTasks(prev => [...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Folder className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                      Folder Tasks
                    </h1>
                    <p className="text-slate-400 text-lg">
                      Manage tasks within this project folder
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowDatePicker(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tasks in this folder</p>
                  <p className="text-2xl font-bold text-white">{tasks.length}</p>
                </div>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-auto">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Today's Tasks</p>
                  <p className="text-2xl font-bold text-white">{todaysTasks.length}</p>
                </div>
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30 ml-auto">
                  Due Today
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Completion Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {tasks.length > 0 ? Math.round(((tasks.length - todaysTasks.length) / tasks.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Tasks Section */}
        {todaysTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <h2 className="text-2xl font-semibold text-white">Today's Tasks</h2>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                {todaysTasks.length} due today
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {todaysTasks.map((task) => (
                <div key={task.id} className="relative">
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="bg-amber-500 text-amber-900 border-amber-600 shadow-lg">
                      Due Today
                    </Badge>
                  </div>
                  <TaskItem 
                    task={task} 
                    collectionName={collectionName}
                    onUpdate={handleUpdate}
                    currentDate={currentDate}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Tasks Grid */}
        {tasks.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-semibold text-white">All Tasks</h2>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {tasks.length} total
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  collectionName={collectionName}
                  onUpdate={handleUpdate}
                  currentDate={currentDate}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Tasks Yet</h3>
              <p className="text-slate-400 mb-6">Create your first task in this folder to get started</p>
              <Button 
                onClick={() => setShowDatePicker(true)} 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DatePicker
            onDateSelect={handleDateSelect}
            onCancel={() => setShowDatePicker(false)}
            defaultDate={lastEndDate}
          />
        )}

        {/* Initial Date Picker */}
        {showInitialDatePicker && (
          <InitialDatePicker onDateSelect={handleInitialDateSelect} />
        )}
      </div>
    </div>
  );
};

export default FolderPage;