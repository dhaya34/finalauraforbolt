import React from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const TextPopup = ({ text, onClose, onSave, isEditing = false }) => {
  const [editText, setEditText] = React.useState(text);
  const [editMode, setEditMode] = React.useState(isEditing);

  const handleSave = () => {
    if (editMode) {
      onSave(editText);
    }
    onClose();
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const popup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Desktop (laptop) container */}
      <div
        className="hidden lg:block bg-transparent p-1 rounded-lg"
        style={{
          width: '78vw',
          height: '65vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          minWidth: '1200px',
          minHeight: '650px',
        }}
      >
        <Card className="bg-slate-800 border-slate-700 w-full h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-white">
              {editMode ? 'Edit Text' : 'View Text'}
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
            {editMode ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none overflow-x-auto whitespace-pre"
                placeholder="Enter your text here..."
              />
            ) : (
              <div className="flex-1 overflow-auto bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <pre className="text-slate-200 whitespace-pre break-words leading-relaxed w-full h-full overflow-x-auto">
                  {text || 'No text available'}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              {editMode ? (
                <>
                  <Button
                    onClick={() => setEditMode(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleEdit}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Text
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile (Android) container */}
      <div
        className="block lg:hidden bg-transparent p-1 rounded-lg"
        style={{
          width: '95vw',
          height: '90vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          minWidth: '0px',
          minHeight: '0px',
        }}
      >
        <Card className="bg-slate-800 border-slate-700 w-full h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-white">
              {editMode ? 'Edit Text' : 'View Text'}
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
            {editMode ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none overflow-x-auto whitespace-pre"
                placeholder="Enter your text here..."
              />
            ) : (
              <div className="flex-1 overflow-auto bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <pre className="text-slate-200 whitespace-pre break-words leading-relaxed w-full h-full overflow-x-auto">
                  {text || 'No text available'}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              {editMode ? (
                <>
                  <Button
                    onClick={() => setEditMode(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleEdit}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Text
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
};

export default TextPopup;
