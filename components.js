// Component classes and functions

// Base Component class
class Component {
    constructor(element) {
        this.element = element;
        this.state = {};
        this.listeners = [];
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.listeners.push({ element, event, handler });
    }

    removeEventListeners() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
    }

    destroy() {
        this.removeEventListeners();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    render() {
        // Override in subclasses
    }
}

// Modal Component
class Modal extends Component {
    constructor(content, options = {}) {
        const overlay = createElement('div', 'modal-overlay');
        super(overlay);
        
        this.options = {
            closable: true,
            ...options
        };
        
        this.contentElement = createElement('div', 'modal-content');
        this.contentElement.innerHTML = content;
        this.element.appendChild(this.contentElement);
        
        if (this.options.closable) {
            this.addEventListener(this.element, 'click', (e) => {
                if (e.target === this.element) {
                    this.close();
                }
            });
            
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape') {
                    this.close();
                }
            });
        }
    }

    show() {
        document.getElementById('modal-container').appendChild(this.element);
        document.body.style.overflow = 'hidden';
        return this;
    }

    close() {
        document.body.style.overflow = '';
        this.destroy();
        if (this.options.onClose) {
            this.options.onClose();
        }
    }
}

// Confirm Dialog Component
class ConfirmDialog extends Modal {
    constructor(message, onConfirm, onCancel) {
        const content = `
            <div class="confirm-dialog-card">
                <div class="confirm-dialog-header">
                    <div class="confirm-dialog-icon">
                        ${createIcon('alert-triangle', 'w-8 h-8 text-yellow-400')}
                    </div>
                    <h3 class="text-white text-xl font-semibold">Confirm Action</h3>
                </div>
                
                <div class="confirm-dialog-content">
                    <p class="confirm-dialog-message">${message}</p>
                    
                    <div class="confirm-dialog-buttons">
                        <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="cancel-btn">
                            ${createIcon('x', 'w-4 h-4 mr-2')}
                            Cancel
                        </button>
                        <button class="btn bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white" id="confirm-btn">
                            ${createIcon('check', 'w-4 h-4 mr-2')}
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        super(content, { closable: false });
        
        this.addEventListener(this.element.querySelector('#cancel-btn'), 'click', () => {
            this.close();
            if (onCancel) onCancel();
        });
        
        this.addEventListener(this.element.querySelector('#confirm-btn'), 'click', () => {
            this.close();
            if (onConfirm) onConfirm();
        });
    }
}

// Date Picker Component
class DatePicker extends Modal {
    constructor(onDateSelect, onCancel, defaultDate = null, options = {}) {
        const isInitial = options.isInitial || false;
        const title = isInitial ? 'Enter Current Date' : 'Select Dates';
        const description = isInitial ? 'Please enter the current date to continue' : 'Choose the start date and end date for this task';
        
        const content = `
            <div class="date-picker-card">
                <div class="date-picker-header">
                    <div class="date-picker-icon">
                        ${createIcon('calendar', 'w-8 h-8 text-blue-400')}
                    </div>
                    <h3 class="text-white text-xl font-semibold">${title}</h3>
                    <p class="text-slate-400 text-sm">${description}</p>
                </div>
                
                <div class="date-picker-content">
                    <div class="date-picker-field space-y-2">
                        <label class="date-picker-label">${isInitial ? 'Current Date' : 'Start Date'}</label>
                        <input type="date" id="start-date" class="date-picker-input" ${defaultDate ? `value="${formatDateInput(defaultDate)}"` : ''}>
                    </div>

                    ${!isInitial ? `
                        <div class="date-picker-field space-y-2">
                            <label class="date-picker-label">End Date</label>
                            <input type="date" id="end-date" class="date-picker-input">
                            <p class="date-picker-help">Must be start date or a future date</p>
                        </div>
                    ` : ''}
                    
                    <div class="date-picker-buttons">
                        ${!isInitial ? `
                            <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="cancel-btn">
                                ${createIcon('x', 'w-4 h-4 mr-2')}
                                Cancel
                            </button>
                        ` : ''}
                        <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" id="ok-btn" disabled>
                            ${createIcon('check', 'w-4 h-4 mr-2')}
                            ${isInitial ? 'Continue' : 'Create Task'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        super(content, { closable: !isInitial });
        
        this.isInitial = isInitial;
        this.startDateInput = this.element.querySelector('#start-date');
        this.endDateInput = this.element.querySelector('#end-date');
        this.okBtn = this.element.querySelector('#ok-btn');
        this.cancelBtn = this.element.querySelector('#cancel-btn');
        
        this.setupEventListeners(onDateSelect, onCancel);
        this.updateButtonState();
    }
    
    setupEventListeners(onDateSelect, onCancel) {
        this.addEventListener(this.startDateInput, 'change', () => {
            this.updateButtonState();
            if (!this.isInitial && this.endDateInput) {
                this.endDateInput.min = this.startDateInput.value || new Date().toISOString().split('T')[0];
            }
        });
        
        if (this.endDateInput) {
            this.addEventListener(this.endDateInput, 'change', () => {
                this.updateButtonState();
            });
        }
        
        this.addEventListener(this.okBtn, 'click', () => {
            if (this.isInitial) {
                if (this.startDateInput.value) {
                    this.close();
                    onDateSelect(new Date(this.startDateInput.value));
                }
            } else {
                if (this.startDateInput.value && this.endDateInput.value) {
                    const startDate = new Date(this.startDateInput.value);
                    const endDate = new Date(this.endDateInput.value);
                    
                    // Generate aura dates to validate
                    const auraDates = generateAuraDates(startDate, endDate);
                    
                    if (auraDates.length < 2) {
                        showToast({
                            title: 'Invalid Date Range',
                            description: 'Please select a date range that allows for at least 2 aura dates',
                            variant: 'destructive'
                        });
                        return;
                    }
                    
                    this.close();
                    onDateSelect(startDate, endDate);
                }
            }
        });
        
        if (this.cancelBtn) {
            this.addEventListener(this.cancelBtn, 'click', () => {
                this.close();
                if (onCancel) onCancel();
            });
        }
    }
    
    updateButtonState() {
        if (this.isInitial) {
            this.okBtn.disabled = !this.startDateInput.value;
        } else {
            this.okBtn.disabled = !this.startDateInput.value || !this.endDateInput.value;
        }
    }
}

// Text Popup Component
class TextPopup extends Modal {
    constructor(text, onSave, isEditing = false) {
        const content = `
            <div class="text-popup-desktop">
                <div class="text-popup-card">
                    <div class="text-popup-header">
                        <h3 class="text-white text-xl font-semibold" id="popup-title">
                            ${isEditing ? 'Edit Text' : 'View Text'}
                        </h3>
                        <button class="btn btn-ghost text-slate-400 hover:text-white" id="close-btn">
                            ${createIcon('x', 'w-5 h-5')}
                        </button>
                    </div>

                    <div class="text-popup-content">
                        <textarea id="text-editor" class="text-popup-textarea" placeholder="Enter your text here..." style="display: ${isEditing ? 'block' : 'none'}">${text || ''}</textarea>
                        
                        <div id="text-viewer" class="text-popup-view" style="display: ${isEditing ? 'none' : 'block'}">
                            <pre class="text-popup-text">${text || 'No text available'}</pre>
                        </div>

                        <div class="text-popup-footer">
                            <div id="view-buttons" style="display: ${isEditing ? 'none' : 'flex'}">
                                <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="close-view-btn">
                                    Close
                                </button>
                                <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" id="edit-btn">
                                    ${createIcon('edit', 'w-4 h-4 mr-2')}
                                    Edit Text
                                </button>
                            </div>
                            
                            <div id="edit-buttons" style="display: ${isEditing ? 'flex' : 'none'}">
                                <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="cancel-edit-btn">
                                    Cancel
                                </button>
                                <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" id="save-btn">
                                    ${createIcon('save', 'w-4 h-4 mr-2')}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="text-popup-mobile">
                <div class="text-popup-card">
                    <div class="text-popup-header">
                        <h3 class="text-white text-xl font-semibold" id="popup-title-mobile">
                            ${isEditing ? 'Edit Text' : 'View Text'}
                        </h3>
                        <button class="btn btn-ghost text-slate-400 hover:text-white" id="close-btn-mobile">
                            ${createIcon('x', 'w-5 h-5')}
                        </button>
                    </div>

                    <div class="text-popup-content">
                        <textarea id="text-editor-mobile" class="text-popup-textarea" placeholder="Enter your text here..." style="display: ${isEditing ? 'block' : 'none'}">${text || ''}</textarea>
                        
                        <div id="text-viewer-mobile" class="text-popup-view" style="display: ${isEditing ? 'none' : 'block'}">
                            <pre class="text-popup-text">${text || 'No text available'}</pre>
                        </div>

                        <div class="text-popup-footer">
                            <div id="view-buttons-mobile" style="display: ${isEditing ? 'none' : 'flex'}">
                                <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="close-view-btn-mobile">
                                    Close
                                </button>
                                <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" id="edit-btn-mobile">
                                    ${createIcon('edit', 'w-4 h-4 mr-2')}
                                    Edit Text
                                </button>
                            </div>
                            
                            <div id="edit-buttons-mobile" style="display: ${isEditing ? 'flex' : 'none'}">
                                <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="cancel-edit-btn-mobile">
                                    Cancel
                                </button>
                                <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" id="save-btn-mobile">
                                    ${createIcon('save', 'w-4 h-4 mr-2')}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        super(content);
        
        this.isEditing = isEditing;
        this.originalText = text;
        this.onSave = onSave;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Desktop event listeners
        this.addEventListener(this.element.querySelector('#close-btn'), 'click', () => this.close());
        this.addEventListener(this.element.querySelector('#close-view-btn'), 'click', () => this.close());
        this.addEventListener(this.element.querySelector('#edit-btn'), 'click', () => this.enterEditMode());
        this.addEventListener(this.element.querySelector('#cancel-edit-btn'), 'click', () => this.exitEditMode());
        this.addEventListener(this.element.querySelector('#save-btn'), 'click', () => this.saveText());
        
        // Mobile event listeners
        this.addEventListener(this.element.querySelector('#close-btn-mobile'), 'click', () => this.close());
        this.addEventListener(this.element.querySelector('#close-view-btn-mobile'), 'click', () => this.close());
        this.addEventListener(this.element.querySelector('#edit-btn-mobile'), 'click', () => this.enterEditMode());
        this.addEventListener(this.element.querySelector('#cancel-edit-btn-mobile'), 'click', () => this.exitEditMode());
        this.addEventListener(this.element.querySelector('#save-btn-mobile'), 'click', () => this.saveText());
    }
    
    enterEditMode() {
        this.isEditing = true;
        
        // Desktop
        this.element.querySelector('#popup-title').textContent = 'Edit Text';
        this.element.querySelector('#text-editor').style.display = 'block';
        this.element.querySelector('#text-viewer').style.display = 'none';
        this.element.querySelector('#view-buttons').style.display = 'none';
        this.element.querySelector('#edit-buttons').style.display = 'flex';
        
        // Mobile
        this.element.querySelector('#popup-title-mobile').textContent = 'Edit Text';
        this.element.querySelector('#text-editor-mobile').style.display = 'block';
        this.element.querySelector('#text-viewer-mobile').style.display = 'none';
        this.element.querySelector('#view-buttons-mobile').style.display = 'none';
        this.element.querySelector('#edit-buttons-mobile').style.display = 'flex';
    }
    
    exitEditMode() {
        this.isEditing = false;
        
        // Reset text to original
        this.element.querySelector('#text-editor').value = this.originalText || '';
        this.element.querySelector('#text-editor-mobile').value = this.originalText || '';
        
        // Desktop
        this.element.querySelector('#popup-title').textContent = 'View Text';
        this.element.querySelector('#text-editor').style.display = 'none';
        this.element.querySelector('#text-viewer').style.display = 'block';
        this.element.querySelector('#view-buttons').style.display = 'flex';
        this.element.querySelector('#edit-buttons').style.display = 'none';
        
        // Mobile
        this.element.querySelector('#popup-title-mobile').textContent = 'View Text';
        this.element.querySelector('#text-editor-mobile').style.display = 'none';
        this.element.querySelector('#text-viewer-mobile').style.display = 'block';
        this.element.querySelector('#view-buttons-mobile').style.display = 'flex';
        this.element.querySelector('#edit-buttons-mobile').style.display = 'none';
    }
    
    saveText() {
        const desktopText = this.element.querySelector('#text-editor').value;
        const mobileText = this.element.querySelector('#text-editor-mobile').value;
        const newText = desktopText || mobileText;
        
        this.close();
        if (this.onSave) {
            this.onSave(newText);
        }
    }
}

// Image Upload Component
class ImageUpload extends Component {
    constructor(container, label, image, onImageChange) {
        super(container);
        this.label = label;
        this.image = image;
        this.onImageChange = onImageChange;
        this.focused = false;
        this.dragOver = false;
        
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        const hasImage = !!this.image;
        
        this.element.innerHTML = `
            <div class="space-y-2">
                <div class="image-upload-container ${hasImage ? 'has-image' : ''} ${this.focused ? 'focused' : ''} ${this.dragOver ? 'drag-over' : ''}" 
                     tabindex="0" id="upload-area">
                    ${hasImage ? `
                        <div class="flex flex-col items-center justify-center space-y-3 text-center p-6">
                            <div class="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                ${createIcon('image', 'w-8 h-8 text-green-400')}
                            </div>
                            <div>
                                <p class="text-green-300 font-medium">Image Uploaded</p>
                                <div class="flex items-center justify-center space-x-4 mt-3">
                                    <button class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white" id="view-btn">
                                        ${createIcon('eye', 'w-4 h-4 mr-2')}
                                        View Image
                                    </button>
                                    <button class="btn btn-sm bg-slate-600 hover:bg-slate-500 text-white" id="replace-btn">
                                        ${createIcon('upload', 'w-4 h-4 mr-2')}
                                        Replace
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center space-y-3 text-center p-6">
                            <div class="p-3 rounded-lg transition-colors ${this.dragOver ? 'bg-blue-500/30' : this.focused ? 'bg-slate-600/70' : 'bg-slate-600/50'}">
                                ${createIcon('upload', `w-8 h-8 transition-colors ${this.dragOver ? 'text-blue-400' : this.focused ? 'text-slate-300' : 'text-slate-400'}`)}
                            </div>
                            <div>
                                <span class="text-slate-300 font-medium block">${this.label}</span>
                                <span class="text-slate-500 text-xs mt-1 block">
                                    ${this.focused ? 'Now you can paste an image or click upload below' : 'Click to select, then paste or upload'}
                                </span>
                                ${this.focused ? `
                                    <button class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white mt-3" id="upload-btn">
                                        ${createIcon('upload', 'w-4 h-4 mr-2')}
                                        Click to Upload
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `}
                </div>
                
                <input type="file" accept="image/*" class="hidden" id="file-input">
            </div>
        `;
    }
    
    setupEventListeners() {
        const uploadArea = this.element.querySelector('#upload-area');
        const fileInput = this.element.querySelector('#file-input');
        
        // Focus events
        this.addEventListener(uploadArea, 'focus', () => {
            this.focused = true;
            this.render();
            this.setupEventListeners();
        });
        
        this.addEventListener(uploadArea, 'blur', () => {
            this.focused = false;
            this.render();
            this.setupEventListeners();
        });
        
        // Drag and drop events
        this.addEventListener(uploadArea, 'dragover', (e) => {
            e.preventDefault();
            this.dragOver = true;
            this.render();
            this.setupEventListeners();
        });
        
        this.addEventListener(uploadArea, 'dragleave', () => {
            this.dragOver = false;
            this.render();
            this.setupEventListeners();
        });
        
        this.addEventListener(uploadArea, 'drop', (e) => {
            e.preventDefault();
            this.dragOver = false;
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        
        // Click events
        this.addEventListener(uploadArea, 'click', (e) => {
            if (this.image) {
                this.showImageViewer();
            }
        });
        
        // File input
        this.addEventListener(fileInput, 'change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileSelect(e.target.files[0]);
            }
            e.target.value = '';
        });
        
        // Paste events
        this.addEventListener(uploadArea, 'paste', (e) => {
            if (!this.focused) return;
            
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    this.handleFileSelect(blob);
                    break;
                }
            }
        });
        
        // Button events
        const uploadBtn = this.element.querySelector('#upload-btn');
        if (uploadBtn) {
            this.addEventListener(uploadBtn, 'click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                fileInput.click();
            });
        }
        
        const replaceBtn = this.element.querySelector('#replace-btn');
        if (replaceBtn) {
            this.addEventListener(replaceBtn, 'click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }
        
        const viewBtn = this.element.querySelector('#view-btn');
        if (viewBtn) {
            this.addEventListener(viewBtn, 'click', (e) => {
                e.stopPropagation();
                this.showImageViewer();
            });
        }
    }
    
    async handleFileSelect(file) {
        if (file && file.type.match('image.*')) {
            try {
                const imageData = await fileToBase64(file);
                this.image = imageData;
                if (this.onImageChange) {
                    this.onImageChange(imageData);
                }
                this.render();
                this.setupEventListeners();
            } catch (error) {
                console.error('Error processing image:', error);
                showToast({
                    title: 'Error',
                    description: 'Failed to process image. Please try again.',
                    variant: 'destructive'
                });
            }
        }
    }
    
    showImageViewer() {
        if (this.image) {
            new ImageViewer(this.image).show();
        }
    }
}

// Image Viewer Component
class ImageViewer extends Modal {
    constructor(imageUrl) {
        const content = `
            <div class="image-viewer-container">
                <div class="image-viewer-controls">
                    <div class="flex items-center space-x-2">
                        <button class="btn btn-sm bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600" id="zoom-in-btn">
                            ${createIcon('zoom-in', 'w-5 h-5')}
                        </button>
                        <button class="btn btn-sm bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600" id="zoom-out-btn">
                            ${createIcon('zoom-out', 'w-5 h-5')}
                        </button>
                        <button class="btn btn-sm bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600" id="reset-btn">
                            ${createIcon('rotate-ccw', 'w-5 h-5')}
                        </button>
                        <span class="text-white text-sm bg-slate-800/90 px-3 py-2 rounded-lg border border-slate-600" id="zoom-display">
                            100%
                        </span>
                    </div>
                    
                    <button class="btn btn-sm bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 rounded-full p-3" id="close-viewer-btn">
                        ${createIcon('x', 'w-6 h-6')}
                    </button>
                </div>
                
                <div class="image-viewer-content" id="image-container">
                    <div class="image-viewer-image-container">
                        <img src="${imageUrl}" alt="Uploaded content" class="image-viewer-image" id="viewer-image" draggable="false">
                    </div>
                </div>
                
                <div class="image-viewer-instructions">
                    <p class="text-slate-400 text-sm">
                        Scroll to zoom • Drag to pan • Press Esc to close
                    </p>
                </div>
            </div>
        `;
        
        super(content, { closable: true });
        
        this.zoom = 1;
        this.position = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        this.setupImageViewerEvents();
    }
    
    setupImageViewerEvents() {
        const image = this.element.querySelector('#viewer-image');
        const container = this.element.querySelector('#image-container');
        const zoomDisplay = this.element.querySelector('#zoom-display');
        
        // Zoom buttons
        this.addEventListener(this.element.querySelector('#zoom-in-btn'), 'click', () => {
            this.zoom = Math.min(this.zoom + 0.25, 5);
            this.updateImage();
        });
        
        this.addEventListener(this.element.querySelector('#zoom-out-btn'), 'click', () => {
            this.zoom = Math.max(this.zoom - 0.25, 0.1);
            this.updateImage();
        });
        
        this.addEventListener(this.element.querySelector('#reset-btn'), 'click', () => {
            this.zoom = 1;
            this.position = { x: 0, y: 0 };
            this.updateImage();
        });
        
        this.addEventListener(this.element.querySelector('#close-viewer-btn'), 'click', () => {
            this.close();
        });
        
        // Mouse events for dragging
        this.addEventListener(container, 'mousedown', (e) => {
            if (this.zoom > 1) {
                this.isDragging = true;
                this.dragStart = {
                    x: e.clientX - this.position.x,
                    y: e.clientY - this.position.y
                };
            }
        });
        
        this.addEventListener(container, 'mousemove', (e) => {
            if (this.isDragging && this.zoom > 1) {
                this.position = {
                    x: e.clientX - this.dragStart.x,
                    y: e.clientY - this.dragStart.y
                };
                this.updateImage();
            }
        });
        
        this.addEventListener(container, 'mouseup', () => {
            this.isDragging = false;
        });
        
        this.addEventListener(container, 'mouseleave', () => {
            this.isDragging = false;
        });
        
        // Wheel event for zooming
        this.addEventListener(container, 'wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.zoom = Math.min(this.zoom + 0.25, 5);
            } else {
                this.zoom = Math.max(this.zoom - 0.25, 0.1);
            }
            this.updateImage();
        });
        
        this.updateImage();
    }
    
    updateImage() {
        const image = this.element.querySelector('#viewer-image');
        const zoomDisplay = this.element.querySelector('#zoom-display');
        
        const transform = `scale(${this.zoom}) translate(${this.position.x}px, ${this.position.y}px)`;
        image.style.transform = transform;
        image.style.transformOrigin = 'center center';
        image.style.transition = this.isDragging ? 'none' : 'transform 0.1s ease-out';
        
        if (this.zoom <= 1) {
            image.style.maxWidth = '100%';
            image.style.maxHeight = '100%';
            image.style.width = undefined;
            image.style.height = undefined;
        } else {
            image.style.maxWidth = 'none';
            image.style.maxHeight = 'none';
            image.style.width = 'auto';
            image.style.height = 'auto';
        }
        
        zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
    }
}

// Export components to global scope
window.Component = Component;
window.Modal = Modal;
window.ConfirmDialog = ConfirmDialog;
window.DatePicker = DatePicker;
window.TextPopup = TextPopup;
window.ImageUpload = ImageUpload;
window.ImageViewer = ImageViewer;