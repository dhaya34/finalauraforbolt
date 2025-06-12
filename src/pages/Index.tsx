import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateAuraDates, formatDate } from '../utils/auraCalculation';
import DatePicker from '../components/DatePicker';
import InitialDatePicker from '../components/InitialDatePicker';
import TaskItem from '../components/TaskItem';
import { Plus, FolderPlus, Layout, Folder, CheckSquare, ArrowDown, Trash2, Calendar, Clock, Search, X, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from '../hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showInitialDatePicker, setShowInitialDatePicker] = useState(true);
  const [currentDate, setCurrentDate] = useState(null);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [lastEndDate, setLastEndDate] = useState(null);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [foldersWithTodaysTasks, setFoldersWithTodaysTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchResults, setSearchResults] = useState({ mainTasks: [], folderTasks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [otherTasks, setOtherTasks] = useState([]);

  useEffect(() => {
    // Only fetch data after current date is set
    if (!currentDate) return;

    const tasksQuery = query(collection(db, 'tasks'), orderBy('serialNumber', 'asc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (querySnapshot) => {
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

    const foldersQuery = query(collection(db, 'folders'), orderBy('createdAt'));
    const unsubscribeFolders = onSnapshot(foldersQuery, (querySnapshot) => {
      const foldersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFolders(foldersData);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeFolders();
    };
  }, [currentDate]);

  // Enhanced search function that searches across all tasks and folders
  const searchAllTasks = async (searchString) => {
    if (!searchString.trim()) {
      setSearchResults({ mainTasks: [], folderTasks: [] });
      setFilteredTasks(tasks);
      return;
    }

    setIsSearching(true);
    const searchTerm = searchString.toLowerCase().trim();
    
    try {
      // Search main tasks
      const mainTaskResults = tasks.filter(task => {
        const taskNumber = task.serialNumber.toString();
        const hashTaskNumber = `#${taskNumber}`;
        
        // Check if searchString matches task number with or without #
        if (searchTerm === taskNumber || searchTerm === hashTaskNumber || 
            searchTerm.startsWith('#') && searchTerm.slice(1) === taskNumber) {
          return true;
        }
        
        // Also search in task text content
        if (task.text1 && task.text1.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        return false;
      });

      // Search folder tasks
      const folderTaskResults = [];
      
      for (const folder of folders) {
        const folderCollectionName = `folder-${folder.id}`;
        try {
          const folderTasksQuery = query(collection(db, folderCollectionName), orderBy('serialNumber'));
          const querySnapshot = await getDocs(folderTasksQuery);
          
          const folderTasks = [];
          querySnapshot.forEach((doc) => {
            folderTasks.push({ id: doc.id, ...doc.data() });
          });
          
          const matchingFolderTasks = folderTasks.filter(task => {
            const taskNumber = task.serialNumber.toString();
            const hashTaskNumber = `#${taskNumber}`;
            
            // Check if searchString matches task number with or without #
            if (searchTerm === taskNumber || searchTerm === hashTaskNumber || 
                searchTerm.startsWith('#') && searchTerm.slice(1) === taskNumber) {
              return true;
            }
            
            // Also search in task text content
            if (task.text1 && task.text1.toLowerCase().includes(searchTerm)) {
              return true;
            }
            
            if (task.text2 && task.text2.toLowerCase().includes(searchTerm)) {
              return true;
            }
            
            return false;
          });

          if (matchingFolderTasks.length > 0) {
            folderTaskResults.push({
              folder: folder,
              tasks: matchingFolderTasks
            });
          }
        } catch (error) {
          console.error(`Error searching tasks in folder ${folder.name}:`, error);
        }
      }

      setSearchResults({
        mainTasks: mainTaskResults,
        folderTasks: folderTaskResults
      });
      
      setFilteredTasks(mainTaskResults);
      
    } catch (error) {
      console.error('Error searching tasks:', error);
      toast({
        title: "Search Error",
        description: "Failed to search tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Filter tasks based on search searchString
  useEffect(() => {
    searchAllTasks(searchQuery);
  }, [searchQuery, tasks, folders]);

  // Check for today's tasks in all folders
  useEffect(() => {
    const checkFoldersForTodaysTasks = async () => {
      if (!currentDate) return;

      const compareDate = new Date(currentDate);
      compareDate.setHours(0, 0, 0, 0);
      
      const foldersWithTasks = [];
      
      for (const folder of folders) {
        const folderCollectionName = `folder-${folder.id}`;
        try {
          const folderTasksQuery = query(collection(db, folderCollectionName), orderBy('serialNumber'));
          const querySnapshot = await getDocs(folderTasksQuery);
          
          const folderTasks = [];
          querySnapshot.forEach((doc) => {
            folderTasks.push({ id: doc.id, ...doc.data() });
          });
          
          const todaysTasksInFolder = folderTasks.filter(task => {
            const taskDate = new Date(task.currentDate);
            taskDate.setHours(0, 0, 0, 0);
            
            // Only show task if current date matches exactly
            return taskDate.getTime() === compareDate.getTime();
          });
          
          if (todaysTasksInFolder.length > 0) {
            foldersWithTasks.push({
              ...folder,
              todaysTaskCount: todaysTasksInFolder.length,
              todaysTaskNumbers: todaysTasksInFolder.map(task => task.serialNumber)
            });
          }
        } catch (error) {
          console.error(`Error checking tasks for folder ${folder.name}:`, error);
        }
      }
      
      setFoldersWithTodaysTasks(foldersWithTasks);
    };

    if (folders.length > 0) {
      checkFoldersForTodaysTasks();
    }
  }, [folders, currentDate]);

  const updateTaskSerialNumbers = async () => {
    try {
      const tasksQuery = query(collection(db, 'tasks'), orderBy('serialNumber'));
      const querySnapshot = await getDocs(tasksQuery);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach((docSnapshot, index) => {
        const newSerialNumber = index + 1;
        batch.update(doc(db, 'tasks', docSnapshot.id), {
          serialNumber: newSerialNumber
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating serial numbers:', error);
      toast({
        title: "Error",
        description: "Failed to update task numbers. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddTask = () => setShowDatePicker(true);
  const handleAddFolder = () => setShowFolderInput(true);

  const handleFolderSave = async (e) => {
    e.preventDefault();
    if (folderName.trim()) {
      try {
        if (editingFolder) {
          const folderRef = doc(db, 'folders', editingFolder.id);
          await updateDoc(folderRef, {
            name: folderName.trim()
          });
        } else {
          await addDoc(collection(db, 'folders'), {
            name: folderName.trim(),
            createdAt: new Date().toISOString()
          });
        }
        setFolderName('');
        setShowFolderInput(false);
        setEditingFolder(null);
      } catch (error) {
        console.error('Error saving folder:', error);
        toast({
          title: "Error",
          description: "Failed to save folder. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this folder?')) {
      try {
        await deleteDoc(doc(db, 'folders', folderId));
      } catch (error) {
        console.error('Error deleting folder:', error);
      }
    }
  };

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

      // Use the second aura date as the initial current date
      const secondAuraDate = new Date(auraDates[1]);
      secondAuraDate.setHours(0, 0, 0, 0);

      // Log the aura dates for debugging
      console.log('Task #' + serialNumber + ' Aura dates:', auraDates.map(date => formatDate(date)));
      console.log('Using second aura date:', formatDate(secondAuraDate));

      // Create the task with the second aura date
      await addDoc(collection(db, 'tasks'), {
        serialNumber,
        endDate: endDateObj.toISOString(),
        currentDate: secondAuraDate.toISOString(),
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

  const handleTaskUpdate = async () => {
    await updateTaskSerialNumbers();
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  const handleEditFolder = (folder, e) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setShowFolderInput(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const navigateToTask = (folderId) => {
    navigate(`/folder/${folderId}`);
  };

  const getTotalSearchResults = () => {
    return searchResults.mainTasks.length + 
           searchResults.folderTasks.reduce((total, folderResult) => total + folderResult.tasks.length, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Task Manager
              </h1>
              <p className="text-slate-400 text-lg">
                Organize your work with professional task management
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAddTask}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Task
              </Button>
              <Button
                onClick={handleAddFolder}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-12 px-6 transition-all duration-300"
                size="lg"
              >
                <FolderPlus className="w-5 h-5 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
        </div>

        {/* Search Section */}
        {(tasks.length > 0 || folders.length > 0) && (
          <div className="mb-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Search className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Search Tasks</h3>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by task number (e.g., #1, #4) or content..."
                        className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {searchQuery && (
                      <div className="mt-2 space-y-2">
                        <p className="text-slate-400 text-sm">
                          Found {getTotalSearchResults()} task{getTotalSearchResults() !== 1 ? 's' : ''} matching "{searchQuery}"
                          {isSearching && <span className="ml-2 text-blue-400">Searching...</span>}
                        </p>
                        
                        {/* Search Results Summary */}
                        {searchResults.folderTasks.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {searchResults.folderTasks.map((folderResult) => (
                              <Button
                                key={folderResult.folder.id}
                                onClick={() => navigateToTask(folderResult.folder.id)}
                                variant="outline"
                                size="sm"
                                className="border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/70 transition-all duration-200"
                              >
                                <Folder className="w-4 h-4 mr-2" />
                                {folderResult.folder.name}
                                <Badge className="ml-2 bg-blue-500 text-blue-900 border-blue-600">
                                  {folderResult.tasks.length} task{folderResult.tasks.length > 1 ? 's' : ''}
                                </Badge>
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Folders with Today's Tasks Alert */}
        {foldersWithTodaysTasks.length > 0 && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-amber-300 mb-2">
                      Folders with Tasks Due Today
                    </h3>
                    <p className="text-amber-200/80 text-sm mb-4">
                      The following folders have tasks scheduled for today. Click on any folder to review them.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {foldersWithTodaysTasks.map((folder) => (
                        <Button
                          key={folder.id}
                          onClick={() => navigate(`/folder/${folder.id}`)}
                          variant="outline"
                          className="border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/70 transition-all duration-200"
                        >
                          <Folder className="w-4 h-4 mr-2" />
                          {folder.name}
                          <Badge className="ml-2 bg-amber-500 text-amber-900 border-amber-600">
                            {folder.todaysTaskCount} task{folder.todaysTaskCount > 1 ? 's' : ''}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Active Tasks</p>
                  <p className="text-2xl font-bold text-white">{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Folder className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Folders</p>
                  <p className="text-2xl font-bold text-white">{folders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Layout className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Items</p>
                  <p className="text-2xl font-bold text-white">{tasks.length + folders.length}</p>
                </div>
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
                  <div className="text-sm text-amber-300 mt-1">
                    {todaysTasks.length > 0 ? (
                      todaysTasks.map(task => `#${task.serialNumber}`).join(', ')
                    ) : (
                      <span className="text-slate-400">No tasks for today</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
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
                      collectionName="tasks"
                      onUpdate={handleTaskUpdate}
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
                    collectionName="tasks"
                    onUpdate={handleTaskUpdate}
                    currentDate={currentDate}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layout className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Get Started</h3>
                <p className="text-slate-400 mb-6">Create your first task or folder to begin organizing your work</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleAddTask} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                  <Button onClick={handleAddFolder} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Folders Section */}
          {folders.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-semibold text-white">Project Folders</h2>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {folders.length} folders
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {folders.map((folder) => {
                  const folderWithTodaysTasks = foldersWithTodaysTasks.find(f => f.id === folder.id);
                  const hasSearchResults = searchQuery && searchResults.folderTasks.some(fr => fr.folder.id === folder.id);
                  
                  return (
                    <Card 
                      key={folder.id}
                      className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group hover:shadow-xl backdrop-blur-sm relative ${
                        folderWithTodaysTasks ? 'hover:shadow-amber-500/10 ring-1 ring-amber-500/20' : 
                        hasSearchResults ? 'hover:shadow-blue-500/10 ring-1 ring-blue-500/20' :
                        'hover:shadow-purple-500/10'
                      }`}
                      onClick={() => navigate(`/folder/${folder.id}`)}
                    >
                      {folderWithTodaysTasks && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge className="bg-amber-500 text-amber-900 border-amber-600 shadow-lg">
                            {folderWithTodaysTasks.todaysTaskCount} due today
                          </Badge>
                        </div>
                      )}
                      
                      {hasSearchResults && !folderWithTodaysTasks && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge className="bg-blue-500 text-blue-900 border-blue-600 shadow-lg">
                            {searchResults.folderTasks.find(fr => fr.folder.id === folder.id)?.tasks.length} found
                          </Badge>
                        </div>
                      )}
                      
                      <CardContent className="p-6 relative">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-lg group-hover:bg-purple-500/30 transition-colors ${
                            folderWithTodaysTasks ? 'bg-amber-500/20' : 
                            hasSearchResults ? 'bg-blue-500/20' :
                            'bg-purple-500/20'
                          }`}>
                            <Folder className={`w-6 h-6 ${
                              folderWithTodaysTasks ? 'text-amber-400' : 
                              hasSearchResults ? 'text-blue-400' :
                              'text-purple-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold group-hover:text-purple-300 transition-colors ${
                              folderWithTodaysTasks ? 'text-amber-300' : 
                              hasSearchResults ? 'text-blue-300' :
                              'text-white'
                            }`}>
                              {folder.name}
                            </h3>
                            <p className="text-slate-400 text-sm">
                              {folderWithTodaysTasks ? 
                                `Tasks #${folderWithTodaysTasks.todaysTaskNumbers.join(', #')} due today` : 
                                hasSearchResults ?
                                `${searchResults.folderTasks.find(fr => fr.folder.id === folder.id)?.tasks.length} search results` :
                                'Click to open'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={(e) => handleEditFolder(folder, e)}
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scroll to Bottom Button */}
        <Button
          onClick={scrollToBottom}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-12 h-12 flex items-center justify-center"
          size="icon"
        >
          <ArrowDown className="w-5 h-5" />
        </Button>

        {/* Modals */}
        {showDatePicker && (
          <DatePicker
            onDateSelect={handleDateSelect}
            onCancel={() => setShowDatePicker(false)}
            defaultDate={lastEndDate}
          />
        )}

        {showFolderInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingFolder ? 'Edit Folder' : 'Create New Folder'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleFolderSave}>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowFolderInput(false);
                        setEditingFolder(null);
                        setFolderName('');
                      }}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {editingFolder ? 'Save Changes' : 'Create Folder'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Initial Date Picker */}
        {showInitialDatePicker && (
          <InitialDatePicker onDateSelect={handleInitialDateSelect} />
        )}
      </div>
    </div>
  );
};

export default Index;