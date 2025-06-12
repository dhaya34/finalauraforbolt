import React, { useState } from 'react';
import { Calendar, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { generateAuraDates } from '../utils/auraCalculation';

const DatePicker = ({ onDateSelect, onCancel, defaultDate }) => {
  const [currentDate, setCurrentDate] = useState(
    defaultDate ? defaultDate.toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState('');

  const handleOk = () => {
    if (currentDate && endDate) {
      const startDate = new Date(currentDate);
      const endDateObj = new Date(endDate);
      
      // Generate aura dates
      const auraDates = generateAuraDates(startDate, endDateObj);
      
      // Make sure we have at least 2 aura dates
      if (auraDates.length < 2) {
        alert('Please select a date range that allows for at least 2 aura dates');
        return;
      }
      
      // Pass the start date and end date to the parent component
      onDateSelect(startDate, endDateObj);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-white">Select Dates</CardTitle>
          <p className="text-slate-400 text-sm">Choose the start date and end date for this task</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={currentDate || today}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-slate-500 text-xs">Must be start date or a future date</p>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleOk}
              disabled={!currentDate || !endDate}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatePicker;
