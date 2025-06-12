import React, { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateAuraDates, formatDate } from '../utils/auraCalculation';
import TextPopup from './TextPopup';
import ImageUpload from './ImageUpload';
import ConfirmDialog from './ConfirmDialog';
import { Eye, Check, X, Image, MessageSquare, Calendar, EyeOff } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

const TaskItem = ({ task, collectionName, onUpdate, currentDate }) => {
  const [showTextPopup, setShowTextPopup] = useState(false);
  const [showText2Popup, setShowText2Popup] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const [editingText, setEditingText] = useState(false);
  const [editingText2, setEditingText2] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [text2Input, setText2Input] = useState('');
  const [showTextInput, setShowTextInput] = useState(!task.text1);
  const [showText2Input, setShowText2Input] = useState(false);
  const [showText2, setShowText2] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if this is a folder task (not main page task)
  const isFolderTask = collectionName.includes('folder');

  const truncateText = (text, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleSaveText = async () => {
    try {
      const taskRef = doc(db, collectionName, task.id);
      await updateDoc(taskRef, { text1: textInput });
      setShowTextInput(false);
      setTextInput('');
      onUpdate();
    } catch (error) {
      console.error('Error saving text:', error);
    }
  };

  const handleSaveText2 = async () => {
    try {
      const taskRef = doc(db, collectionName, task.id);
      await updateDoc(taskRef, { text2: text2Input });
      setShowText2Input(false);
      setText2Input('');
      onUpdate();
    } catch (error) {
      console.error('Error saving text2:', error);
    }
  };

  const handleTextEdit = async (newText) => {
    try {
      const taskRef = doc(db, collectionName, task.id);
      await updateDoc(taskRef, { text1: newText });
      onUpdate();
    } catch (error) {
      console.error('Error updating text:', error);
    }
  };

  const handleText2Edit = async (newText) => {
    try {
      const taskRef = doc(db, collectionName, task.id);
      await updateDoc(taskRef, { text2: newText });
      onUpdate();
    } catch (error) {
      console.error('Error updating text2:', error);
    }
  };

  const handleImageUpdate = async (imageKey, imageData) => {
    try {
      const taskRef = doc(db, collectionName, task.id);
      await updateDoc(taskRef, { [imageKey]: imageData });
      onUpdate();
    } catch (error) {
      console.error('Error updating image:', error);
    }
  };

  const updateCurrentDate = useCallback(async () => {
    if (!currentDate) return;
    
    const taskDate = new Date(task.currentDate);
    const compareDate = new Date(currentDate);
    
    // Set hours to 0 for accurate date comparison
    taskDate.setHours(0, 0, 0, 0);
    compareDate.setHours(0, 0, 0, 0);
    
    // If the site's current date is later than the task's current date
    // and we haven't reached the end date, update the task's date
    if (compareDate > taskDate && compareDate <= new Date(task.endDate)) {
      try {
        const taskRef = doc(db, collectionName, task.id);
        await updateDoc(taskRef, {
          currentDate: compareDate.toISOString()
        });
      } catch (error) {
        console.error('Error updating task date:', error);
      }
    }
  }, [task.currentDate, task.endDate, task.id, collectionName, currentDate]);

  useEffect(() => {
    updateCurrentDate();
  }, [updateCurrentDate]);

  const getCurrentDate = () => {
    return new Date(task.currentDate);
  };

  const isToday = () => {
    const taskDate = new Date(task.currentDate);
    taskDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(currentDate);
    compareDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === compareDate.getTime();
  };

  const handleNotDone = async () => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      const auraDates = generateAuraDates(new Date(task.createdAt), new Date(task.endDate));
      const currentDate = new Date(task.currentDate);
      
      // Set hours to 0 for accurate date comparison
      currentDate.setHours(0, 0, 0, 0);
      
      let nextAuraDate = null;
      let currentIndex = -1;

      // First find the current date's index in aura dates
      for (let i = 0; i < auraDates.length; i++) {
        const auraDate = new Date(auraDates[i]);
        auraDate.setHours(0, 0, 0, 0);
        
        if (auraDate.getTime() === currentDate.getTime()) {
          currentIndex = i;
          break;
        }
      }

      // If current date is not in aura dates, find the next aura date after current date
      if (currentIndex === -1) {
        for (let i = 0; i < auraDates.length; i++) {
          const auraDate = new Date(auraDates[i]);
          auraDate.setHours(0, 0, 0, 0);
          if (auraDate > currentDate) {
            nextAuraDate = auraDates[i];
            break;
          }
        }
      } else if (currentIndex + 1 < auraDates.length) {
        // Get the next aura date if current date is in aura dates
        nextAuraDate = auraDates[currentIndex + 1];
      }
      
      if (nextAuraDate && nextAuraDate <= new Date(task.endDate)) {
        const taskRef = doc(db, collectionName, task.id);
        const updateData = {
          currentDate: nextAuraDate.toISOString(),
          lastUpdated: new Date().toISOString()
        };
        
        await updateDoc(taskRef, updateData);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDone = async () => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      await deleteDoc(doc(db, collectionName, task.id));
      onUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className={`bg-slate-800/60 border-slate-700 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10 ${isToday() ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">{task.serialNumber}</span>
            </div>
            <div>
              <h3 className="text-white font-medium">Task #{task.serialNumber}</h3>
              <div className="flex items-center text-slate-400 text-sm mt-1">
                <Calendar className="w-3 h-3 mr-1" />
                Next: {formatDate(getCurrentDate())}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowConfirm('notDone')}
              variant="outline"
              size="sm"
              disabled={isUpdating}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowConfirm('done')}
              size="sm"
              disabled={isUpdating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Primary Text */}
          {showTextInput ? (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter task description..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveText} 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700"
                >
                  Save Description
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setShowTextPopup(true)}
              className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 cursor-pointer transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                <div className="flex-1">
                  <p className="text-slate-300 group-hover:text-white transition-colors">
                    {task.text1 ? truncateText(task.text1) : 'Click to add description...'}
                  </p>
                  {task.text1 && (
                    <p className="text-slate-500 text-xs mt-1">Click to view full text</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Secondary Text (for folder items) */}
          {isFolderTask && (
            <>
              {showText2Input ? (
                <div className="space-y-3">
                  <textarea
                    value={text2Input}
                    onChange={(e) => setText2Input(e.target.value)}
                    placeholder="Enter additional notes..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveText2} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700">
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : showText2 && task.text2 ? (
                <div
                  onClick={() => setShowText2Popup(true)}
                  className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
                    <div className="flex-1">
                      <p className="text-slate-300 group-hover:text-white transition-colors">
                        {truncateText(task.text2)}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">Additional notes</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (!showText2) {
                      setShowText2(true);
                      if (!task.text2) {
                        setShowText2Input(true);
                      }
                    } else {
                      setShowText2(false);
                      setShowText2Input(false);
                    }
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white border-dashed"
                >
                  {showText2 ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showText2 ? 'Hide Additional Notes' : 'Show Additional Notes'}
                </Button>
              )}
            </>
          )}

          {/* Images Section - Only show for main page tasks (not folder tasks) */}
          {!isFolderTask && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Image className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-sm font-medium">Attachments</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUpload
                  label={
                    <span className="flex items-center justify-center space-x-2 text-slate-400">
                      <Image className="w-5 h-5" />
                      <span>Image 1</span>
                    </span>
                  }
                  image={task.image1}
                  onImageChange={(imageData) => handleImageUpdate('image1', imageData)}
                />
                <ImageUpload
                  label={
                    <span className="flex items-center justify-center space-x-2 text-slate-400">
                      <Image className="w-5 h-5" />
                      <span>Image 2</span>
                    </span>
                  }
                  image={task.image2}
                  onImageChange={(imageData) => handleImageUpdate('image2', imageData)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showTextPopup && (
          <TextPopup
            text={task.text1}
            onClose={() => setShowTextPopup(false)}
            onSave={handleTextEdit}
            isEditing={editingText}
          />
        )}

        {showText2Popup && (
          <TextPopup
            text={task.text2}
            onClose={() => setShowText2Popup(false)}
            onSave={handleText2Edit}
            isEditing={editingText2}
          />
        )}

        {showConfirm && (
          <ConfirmDialog
            message={showConfirm === 'done' ? 'Mark this task as completed?' : 'Move this task to next phase?'}
            onConfirm={() => {
              if (showConfirm === 'done') {
                handleDone();
              } else {
                handleNotDone();
              }
              setShowConfirm(null);
            }}
            onCancel={() => setShowConfirm(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TaskItem;