// Simple router implementation

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.currentComponent = null;
        
        // Listen for popstate events (back/forward buttons)
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname);
        });
        
        // Handle initial route
        this.handleRoute(window.location.pathname);
    }
    
    addRoute(path, component) {
        this.routes.set(path, component);
    }
    
    navigate(path) {
        if (path !== window.location.pathname) {
            window.history.pushState({}, '', path);
            this.handleRoute(path);
        }
    }
    
    handleRoute(path) {
        // Clean up current component
        if (this.currentComponent && this.currentComponent.destroy) {
            this.currentComponent.destroy();
        }
        
        // Find matching route
        let matchedRoute = null;
        let params = {};
        
        for (const [routePath, component] of this.routes) {
            const match = this.matchRoute(routePath, path);
            if (match) {
                matchedRoute = component;
                params = match.params;
                break;
            }
        }
        
        if (matchedRoute) {
            this.currentRoute = path;
            this.currentComponent = new matchedRoute(params);
        } else {
            // Handle 404
            this.currentComponent = new NotFoundPage();
        }
    }
    
    matchRoute(routePath, actualPath) {
        const routeParts = routePath.split('/').filter(part => part);
        const actualParts = actualPath.split('/').filter(part => part);
        
        if (routeParts.length !== actualParts.length) {
            return null;
        }
        
        const params = {};
        
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const actualPart = actualParts[i];
            
            if (routePart.startsWith(':')) {
                // Parameter
                const paramName = routePart.slice(1);
                params[paramName] = actualPart;
            } else if (routePart !== actualPart) {
                // Exact match required
                return null;
            }
        }
        
        return { params };
    }
}

// Page components
class BasePage extends Component {
    constructor(params = {}) {
        const container = document.getElementById('app-container');
        super(container);
        this.params = params;
        this.firebaseListeners = [];
        this.render();
    }
    
    addFirebaseListener(listenerId) {
        this.firebaseListeners.push(listenerId);
    }
    
    destroy() {
        // Clean up Firebase listeners
        this.firebaseListeners.forEach(listenerId => {
            window.firebaseUtils.unsubscribeFromCollection(listenerId);
        });
        this.firebaseListeners = [];
        
        super.destroy();
    }
}

class IndexPage extends BasePage {
    constructor(params) {
        super(params);
        this.state = {
            tasks: [],
            folders: [],
            currentDate: null,
            showInitialDatePicker: true,
            searchQuery: '',
            searchResults: { mainTasks: [], folderTasks: [] },
            todaysTasks: [],
            foldersWithTodaysTasks: [],
            isSearching: false
        };
        
        this.debouncedSearch = debounce(this.searchAllTasks.bind(this), 300);
    }
    
    render() {
        if (this.state.showInitialDatePicker) {
            this.showInitialDatePicker();
            return;
        }
        
        this.element.innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
                <div class="container mx-auto px-4 py-8 max-w-7xl">
                    <!-- Header Section -->
                    <div class="mb-8">
                        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div class="space-y-2">
                                <h1 class="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                                    Task Manager
                                </h1>
                                <p class="text-slate-400 text-lg">
                                    Organize your work with professional task management
                                </p>
                            </div>
                            
                            <div class="flex flex-col sm:flex-row gap-3">
                                <button class="btn btn-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6" id="add-task-btn">
                                    ${createIcon('plus', 'w-5 h-5 mr-2')}
                                    Create Task
                                </button>
                                <button class="btn btn-lg btn-outline border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-12 px-6 transition-all duration-300" id="add-folder-btn">
                                    ${createIcon('folder-plus', 'w-5 h-5 mr-2')}
                                    New Folder
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Search Section -->
                    <div id="search-section" style="display: none;"></div>

                    <!-- Folders with Today's Tasks Alert -->
                    <div id="todays-folders-alert" style="display: none;"></div>

                    <!-- Stats Cards -->
                    <div id="stats-section"></div>

                    <!-- Content Sections -->
                    <div id="content-sections"></div>
                </div>
                
                <!-- Scroll to Bottom Button -->
                <button class="scroll-bottom-btn" id="scroll-bottom-btn">
                    ${createIcon('arrow-down', 'w-5 h-5')}
                </button>
            </div>
        `;
        
        this.setupEventListeners();
        this.loadData();
    }
    
    setupEventListeners() {
        // Header buttons
        this.addEventListener(this.element.querySelector('#add-task-btn'), 'click', () => {
            this.showDatePicker();
        });
        
        this.addEventListener(this.element.querySelector('#add-folder-btn'), 'click', () => {
            this.showFolderInput();
        });
        
        // Scroll to bottom button
        this.addEventListener(this.element.querySelector('#scroll-bottom-btn'), 'click', () => {
            scrollToBottom();
        });
    }
    
    loadData() {
        if (!this.state.currentDate) return;
        
        // Subscribe to tasks
        const tasksListenerId = window.firebaseUtils.subscribeToCollection('tasks', (tasks) => {
            this.updateTasks(tasks);
        }, 'serialNumber');
        this.addFirebaseListener(tasksListenerId);
        
        // Subscribe to folders
        const foldersListenerId = window.firebaseUtils.subscribeToCollection('folders', (folders) => {
            this.updateFolders(folders);
        }, 'createdAt');
        this.addFirebaseListener(foldersListenerId);
    }
    
    updateTasks(tasks) {
        this.state.tasks = tasks;
        this.updateTodaysTasks();
        this.renderStats();
        this.renderContent();
        this.renderSearch();
        
        if (this.state.searchQuery) {
            this.debouncedSearch(this.state.searchQuery);
        }
    }
    
    updateFolders(folders) {
        this.state.folders = folders;
        this.checkFoldersForTodaysTasks();
        this.renderStats();
        this.renderContent();
        this.renderSearch();
        
        if (this.state.searchQuery) {
            this.debouncedSearch(this.state.searchQuery);
        }
    }
    
    updateTodaysTasks() {
        if (!this.state.currentDate) return;
        
        const today = new Date(this.state.currentDate);
        today.setHours(0, 0, 0, 0);
        
        this.state.todaysTasks = this.state.tasks.filter(task => {
            const taskDate = new Date(task.currentDate);
            taskDate.setHours(0, 0, 0, 0);
            const auraDates = generateAuraDates(new Date(task.createdAt), new Date(task.endDate));
            return auraDates.some(auraDate => {
                const compareDate = new Date(auraDate);
                compareDate.setHours(0, 0, 0, 0);
                return compareDate.getTime() === today.getTime();
            }) && taskDate.getTime() === today.getTime();
        });
    }
    
    async checkFoldersForTodaysTasks() {
        if (!this.state.currentDate) return;
        
        const compareDate = new Date(this.state.currentDate);
        compareDate.setHours(0, 0, 0, 0);
        
        const foldersWithTasks = [];
        
        for (const folder of this.state.folders) {
            const folderCollectionName = `folder-${folder.id}`;
            try {
                const folderTasks = await window.firebaseUtils.getDocuments(folderCollectionName, 'serialNumber');
                
                const todaysTasksInFolder = folderTasks.filter(task => {
                    const taskDate = new Date(task.currentDate);
                    taskDate.setHours(0, 0, 0, 0);
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
        
        this.state.foldersWithTodaysTasks = foldersWithTasks;
        this.renderTodaysFoldersAlert();
    }
    
    async searchAllTasks(searchString) {
        if (!searchString.trim()) {
            this.state.searchResults = { mainTasks: [], folderTasks: [] };
            this.renderContent();
            return;
        }
        
        this.state.isSearching = true;
        const searchTerm = searchString.toLowerCase().trim();
        
        try {
            // Search main tasks
            const mainTaskResults = this.state.tasks.filter(task => {
                const taskNumber = task.serialNumber.toString();
                const hashTaskNumber = `#${taskNumber}`;
                
                if (searchTerm === taskNumber || searchTerm === hashTaskNumber || 
                    searchTerm.startsWith('#') && searchTerm.slice(1) === taskNumber) {
                    return true;
                }
                
                if (task.text1 && task.text1.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                return false;
            });
            
            // Search folder tasks
            const folderTaskResults = [];
            
            for (const folder of this.state.folders) {
                const folderCollectionName = `folder-${folder.id}`;
                try {
                    const folderTasks = await window.firebaseUtils.getDocuments(folderCollectionName, 'serialNumber');
                    
                    const matchingFolderTasks = folderTasks.filter(task => {
                        const taskNumber = task.serialNumber.toString();
                        const hashTaskNumber = `#${taskNumber}`;
                        
                        if (searchTerm === taskNumber || searchTerm === hashTaskNumber || 
                            searchTerm.startsWith('#') && searchTerm.slice(1) === taskNumber) {
                            return true;
                        }
                        
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
            
            this.state.searchResults = {
                mainTasks: mainTaskResults,
                folderTasks: folderTaskResults
            };
            
            this.renderContent();
            
        } catch (error) {
            console.error('Error searching tasks:', error);
            showToast({
                title: "Search Error",
                description: "Failed to search tasks. Please try again.",
                variant: "destructive"
            });
        } finally {
            this.state.isSearching = false;
        }
    }
    
    renderSearch() {
        const searchSection = this.element.querySelector('#search-section');
        
        if (this.state.tasks.length > 0 || this.state.folders.length > 0) {
            searchSection.style.display = 'block';
            searchSection.innerHTML = `
                <div class="mb-8">
                    <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                        <div class="card-content p-6">
                            <div class="flex items-center space-x-4">
                                <div class="p-3 bg-blue-500/20 rounded-lg">
                                    ${createIcon('search', 'w-6 h-6 text-blue-400')}
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-white mb-2">Search Tasks</h3>
                                    <div class="relative">
                                        <input type="text" id="search-input" value="${this.state.searchQuery}" 
                                               placeholder="Search by task number (e.g., #1, #4) or content..."
                                               class="input w-full pr-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400">
                                        ${this.state.searchQuery ? `
                                            <button class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors" id="clear-search-btn">
                                                ${createIcon('x', 'w-5 h-5')}
                                            </button>
                                        ` : ''}
                                    </div>
                                    ${this.state.searchQuery ? `
                                        <div class="mt-2 space-y-2">
                                            <p class="text-slate-400 text-sm">
                                                Found ${this.getTotalSearchResults()} task${this.getTotalSearchResults() !== 1 ? 's' : ''} matching "${this.state.searchQuery}"
                                                ${this.state.isSearching ? '<span class="ml-2 text-blue-400">Searching...</span>' : ''}
                                            </p>
                                            
                                            ${this.state.searchResults.folderTasks.length > 0 ? `
                                                <div class="flex flex-wrap gap-2 mt-3">
                                                    ${this.state.searchResults.folderTasks.map(folderResult => `
                                                        <button class="btn btn-sm btn-outline border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/70 transition-all duration-200" 
                                                                onclick="router.navigate('/folder/${folderResult.folder.id}')">
                                                            ${createIcon('folder', 'w-4 h-4 mr-2')}
                                                            ${folderResult.folder.name}
                                                            <span class="badge badge-secondary bg-blue-500 text-blue-900 border-blue-600 ml-2">
                                                                ${folderResult.tasks.length} task${folderResult.tasks.length > 1 ? 's' : ''}
                                                            </span>
                                                            ${createIcon('external-link', 'w-3 h-3 ml-1')}
                                                        </button>
                                                    `).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Setup search event listeners
            const searchInput = searchSection.querySelector('#search-input');
            this.addEventListener(searchInput, 'input', (e) => {
                this.state.searchQuery = e.target.value;
                this.debouncedSearch(this.state.searchQuery);
                this.renderSearch();
            });
            
            const clearBtn = searchSection.querySelector('#clear-search-btn');
            if (clearBtn) {
                this.addEventListener(clearBtn, 'click', () => {
                    this.state.searchQuery = '';
                    this.state.searchResults = { mainTasks: [], folderTasks: [] };
                    this.renderSearch();
                    this.renderContent();
                });
            }
        } else {
            searchSection.style.display = 'none';
        }
    }
    
    renderTodaysFoldersAlert() {
        const alertSection = this.element.querySelector('#todays-folders-alert');
        
        if (this.state.foldersWithTodaysTasks.length > 0) {
            alertSection.style.display = 'block';
            alertSection.innerHTML = `
                <div class="mb-8">
                    <div class="card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 backdrop-blur-sm">
                        <div class="card-content p-6">
                            <div class="flex items-start space-x-4">
                                <div class="p-3 bg-amber-500/20 rounded-lg">
                                    ${createIcon('clock', 'w-6 h-6 text-amber-400')}
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-amber-300 mb-2">
                                        Folders with Tasks Due Today
                                    </h3>
                                    <p class="text-amber-200/80 text-sm mb-4">
                                        The following folders have tasks scheduled for today. Click on any folder to review them.
                                    </p>
                                    <div class="flex flex-wrap gap-3">
                                        ${this.state.foldersWithTodaysTasks.map(folder => `
                                            <button class="btn btn-outline border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/70 transition-all duration-200"
                                                    onclick="router.navigate('/folder/${folder.id}')">
                                                ${createIcon('folder', 'w-4 h-4 mr-2')}
                                                ${folder.name}
                                                <span class="badge bg-amber-500 text-amber-900 border-amber-600 ml-2">
                                                    ${folder.todaysTaskCount} task${folder.todaysTaskCount > 1 ? 's' : ''}
                                                </span>
                                            </button>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            alertSection.style.display = 'none';
        }
    }
    
    renderStats() {
        const statsSection = this.element.querySelector('#stats-section');
        
        statsSection.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-blue-500/20 rounded-lg">
                                ${createIcon('check-square', 'w-6 h-6 text-blue-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Active Tasks</p>
                                <p class="text-2xl font-bold text-white">${this.state.tasks.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-purple-500/20 rounded-lg">
                                ${createIcon('folder', 'w-6 h-6 text-purple-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Folders</p>
                                <p class="text-2xl font-bold text-white">${this.state.folders.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-green-500/20 rounded-lg">
                                ${createIcon('layout', 'w-6 h-6 text-green-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Total Items</p>
                                <p class="text-2xl font-bold text-white">${this.state.tasks.length + this.state.folders.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-amber-500/20 rounded-lg">
                                ${createIcon('calendar', 'w-6 h-6 text-amber-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Today's Tasks</p>
                                <div class="text-sm text-amber-300 mt-1">
                                    ${this.state.todaysTasks.length > 0 ? 
                                        this.state.todaysTasks.map(task => `#${task.serialNumber}`).join(', ') :
                                        '<span class="text-slate-400">No tasks for today</span>'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderContent() {
        const contentSection = this.element.querySelector('#content-sections');
        
        const displayTasks = this.state.searchQuery ? this.state.searchResults.mainTasks : this.state.tasks;
        
        let content = '<div class="space-y-8">';
        
        // Today's Tasks Section
        if (this.state.todaysTasks.length > 0 && !this.state.searchQuery) {
            content += `
                <div class="mb-8">
                    <div class="flex items-center space-x-3 mb-6">
                        <h2 class="text-2xl font-semibold text-white">Today's Tasks</h2>
                        <span class="badge badge-secondary bg-amber-500/20 text-amber-300 border-amber-500/30">
                            ${this.state.todaysTasks.length} due today
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" id="todays-tasks-grid">
                        ${this.state.todaysTasks.map(task => this.renderTaskCard(task, true)).join('')}
                    </div>
                </div>
            `;
        }
        
        // All Tasks Grid
        if (displayTasks.length > 0) {
            content += `
                <div class="space-y-6">
                    <div class="flex items-center space-x-3">
                        <h2 class="text-2xl font-semibold text-white">${this.state.searchQuery ? 'Search Results' : 'All Tasks'}</h2>
                        <span class="badge badge-secondary bg-purple-500/20 text-purple-300 border-purple-500/30">
                            ${displayTasks.length} ${this.state.searchQuery ? 'found' : 'total'}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" id="all-tasks-grid">
                        ${displayTasks.map(task => this.renderTaskCard(task)).join('')}
                    </div>
                </div>
            `;
        } else if (!this.state.searchQuery) {
            content += `
                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-12 text-center">
                        <div class="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            ${createIcon('layout', 'w-8 h-8 text-slate-400')}
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-2">Get Started</h3>
                        <p class="text-slate-400 mb-6">Create your first task or folder to begin organizing your work</p>
                        <div class="flex flex-col sm:flex-row gap-3 justify-center">
                            <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onclick="indexPage.showDatePicker()">
                                ${createIcon('plus', 'w-4 h-4 mr-2')}
                                Create Task
                            </button>
                            <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-800" onclick="indexPage.showFolderInput()">
                                ${createIcon('folder-plus', 'w-4 h-4 mr-2')}
                                New Folder
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Folders Section
        if (this.state.folders.length > 0) {
            content += `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <h2 class="text-2xl font-semibold text-white">Project Folders</h2>
                            <span class="badge badge-secondary bg-purple-500/20 text-purple-300 border-purple-500/30">
                                ${this.state.folders.length} folders
                            </span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="folders-grid">
                        ${this.state.folders.map(folder => this.renderFolderCard(folder)).join('')}
                    </div>
                </div>
            `;
        }
        
        content += '</div>';
        contentSection.innerHTML = content;
        
        // Setup task components
        this.setupTaskComponents();
    }
    
    renderTaskCard(task, isToday = false) {
        return `
            <div class="relative" data-task-id="${task.id}">
                ${isToday ? `
                    <div class="absolute -top-2 -right-2 z-10">
                        <span class="badge bg-amber-500 text-amber-900 border-amber-600 shadow-lg">
                            Due Today
                        </span>
                    </div>
                ` : ''}
                <div class="task-item-card ${isToday ? 'today' : ''}">
                    <div class="card-content p-6">
                        <!-- Task content will be rendered by TaskItem component -->
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFolderCard(folder) {
        const folderWithTodaysTasks = this.state.foldersWithTodaysTasks.find(f => f.id === folder.id);
        const hasSearchResults = this.state.searchQuery && this.state.searchResults.folderTasks.some(fr => fr.folder.id === folder.id);
        
        return `
            <div class="card bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group hover:shadow-xl backdrop-blur-sm relative ${
                folderWithTodaysTasks ? 'hover:shadow-amber-500/10 ring-1 ring-amber-500/20' : 
                hasSearchResults ? 'hover:shadow-blue-500/10 ring-1 ring-blue-500/20' :
                'hover:shadow-purple-500/10'
            }" onclick="router.navigate('/folder/${folder.id}')">
                ${folderWithTodaysTasks ? `
                    <div class="absolute -top-2 -right-2 z-10">
                        <span class="badge bg-amber-500 text-amber-900 border-amber-600 shadow-lg">
                            ${folderWithTodaysTasks.todaysTaskCount} due today
                        </span>
                    </div>
                ` : ''}
                
                ${hasSearchResults && !folderWithTodaysTasks ? `
                    <div class="absolute -top-2 -right-2 z-10">
                        <span class="badge bg-blue-500 text-blue-900 border-blue-600 shadow-lg">
                            ${this.state.searchResults.folderTasks.find(fr => fr.folder.id === folder.id)?.tasks.length} found
                        </span>
                    </div>
                ` : ''}
                
                <div class="card-content p-6 relative">
                    <div class="flex items-center space-x-3">
                        <div class="p-3 rounded-lg group-hover:bg-purple-500/30 transition-colors ${
                            folderWithTodaysTasks ? 'bg-amber-500/20' : 
                            hasSearchResults ? 'bg-blue-500/20' :
                            'bg-purple-500/20'
                        }">
                            ${createIcon('folder', `w-6 h-6 ${
                                folderWithTodaysTasks ? 'text-amber-400' : 
                                hasSearchResults ? 'text-blue-400' :
                                'text-purple-400'
                            }`)}
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold group-hover:text-purple-300 transition-colors ${
                                folderWithTodaysTasks ? 'text-amber-300' : 
                                hasSearchResults ? 'text-blue-300' :
                                'text-white'
                            }">
                                ${folder.name}
                            </h3>
                            <p class="text-slate-400 text-sm">
                                ${folderWithTodaysTasks ? 
                                    `Tasks #${folderWithTodaysTasks.todaysTaskNumbers.join(', #')} due today` : 
                                    hasSearchResults ?
                                    `${this.state.searchResults.folderTasks.find(fr => fr.folder.id === folder.id)?.tasks.length} search results` :
                                    'Click to open'
                                }
                            </p>
                        </div>
                    </div>
                    
                    <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn btn-sm btn-ghost text-slate-400 hover:text-white" onclick="event.stopPropagation(); indexPage.editFolder('${folder.id}', '${folder.name}')">
                            ${createIcon('edit', 'w-4 h-4')}
                        </button>
                        <button class="btn btn-sm btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10" onclick="event.stopPropagation(); indexPage.deleteFolder('${folder.id}')">
                            ${createIcon('trash', 'w-4 h-4')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupTaskComponents() {
        // Setup TaskItem components for each task
        const taskElements = this.element.querySelectorAll('[data-task-id]');
        taskElements.forEach(taskElement => {
            const taskId = taskElement.dataset.taskId;
            const task = this.state.tasks.find(t => t.id === taskId);
            if (task) {
                const taskContent = taskElement.querySelector('.card-content');
                new TaskItemComponent(taskContent, task, 'tasks', () => this.handleTaskUpdate(), this.state.currentDate);
            }
        });
    }
    
    getTotalSearchResults() {
        return this.state.searchResults.mainTasks.length + 
               this.state.searchResults.folderTasks.reduce((total, folderResult) => total + folderResult.tasks.length, 0);
    }
    
    showInitialDatePicker() {
        new DatePicker(
            (date) => {
                this.state.currentDate = date;
                this.state.showInitialDatePicker = false;
                this.render();
            },
            null,
            null,
            { isInitial: true }
        ).show();
    }
    
    showDatePicker() {
        new DatePicker(
            (startDate, endDate) => this.handleDateSelect(startDate, endDate),
            () => {},
            this.state.lastEndDate
        ).show();
    }
    
    showFolderInput(editingFolder = null) {
        const content = `
            <div class="card bg-slate-800 border-slate-700 max-w-md w-full">
                <div class="card-header">
                    <h3 class="card-title text-white">
                        ${editingFolder ? 'Edit Folder' : 'Create New Folder'}
                    </h3>
                </div>
                <div class="card-content space-y-4">
                    <form id="folder-form">
                        <input type="text" id="folder-name" value="${editingFolder ? editingFolder.name : ''}" 
                               placeholder="Enter folder name..." 
                               class="input w-full bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" 
                               autofocus>
                        <div class="flex justify-end gap-3 mt-4">
                            <button type="button" class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700" id="cancel-folder-btn">
                                Cancel
                            </button>
                            <button type="submit" class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                ${editingFolder ? 'Save Changes' : 'Create Folder'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        const modal = new Modal(content).show();
        
        const form = modal.element.querySelector('#folder-form');
        const nameInput = modal.element.querySelector('#folder-name');
        const cancelBtn = modal.element.querySelector('#cancel-folder-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            if (name) {
                try {
                    if (editingFolder) {
                        await window.firebaseUtils.updateDocument('folders', editingFolder.id, { name });
                    } else {
                        await window.firebaseUtils.addDocument('folders', {
                            name,
                            createdAt: new Date().toISOString()
                        });
                    }
                    modal.close();
                } catch (error) {
                    console.error('Error saving folder:', error);
                    showToast({
                        title: "Error",
                        description: "Failed to save folder. Please try again.",
                        variant: "destructive"
                    });
                }
            }
        });
        
        cancelBtn.addEventListener('click', () => modal.close());
    }
    
    async handleDateSelect(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            const auraDates = generateAuraDates(start, end);
            const serialNumber = this.state.tasks.length + 1;
            
            if (auraDates.length < 2) {
                throw new Error('Not enough aura dates generated');
            }
            
            const secondAuraDate = new Date(auraDates[1]);
            secondAuraDate.setHours(0, 0, 0, 0);
            
            console.log('Task #' + serialNumber + ' Aura dates:', auraDates.map(date => formatDate(date)));
            console.log('Using second aura date:', formatDate(secondAuraDate));
            
            await window.firebaseUtils.addDocument('tasks', {
                serialNumber,
                endDate: end.toISOString(),
                currentDate: secondAuraDate.toISOString(),
                currentAuraIndex: 1,
                text1: '',
                text2: '',
                image1: null,
                image2: null,
                createdAt: start.toISOString(),
                lastUpdated: null
            });
            
            this.state.lastEndDate = end;
        } catch (error) {
            console.error('Error adding task:', error);
            showToast({
                title: "Error",
                description: "Failed to create task. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleTaskUpdate() {
        try {
            await window.firebaseUtils.updateTaskSerialNumbers('tasks');
        } catch (error) {
            console.error('Error updating task serial numbers:', error);
        }
    }
    
    editFolder(folderId, folderName) {
        this.showFolderInput({ id: folderId, name: folderName });
    }
    
    async deleteFolder(folderId) {
        new ConfirmDialog(
            'Are you sure you want to delete this folder?',
            async () => {
                try {
                    await window.firebaseUtils.deleteDocument('folders', folderId);
                } catch (error) {
                    console.error('Error deleting folder:', error);
                    showToast({
                        title: "Error",
                        description: "Failed to delete folder. Please try again.",
                        variant: "destructive"
                    });
                }
            }
        ).show();
    }
}

class FolderPage extends BasePage {
    constructor(params) {
        super(params);
        this.folderId = params.folderId;
        this.collectionName = `folder-${this.folderId}`;
        this.state = {
            tasks: [],
            currentDate: null,
            showInitialDatePicker: true,
            todaysTasks: [],
            otherTasks: [],
            lastEndDate: null
        };
    }
    
    render() {
        if (this.state.showInitialDatePicker) {
            this.showInitialDatePicker();
            return;
        }
        
        this.element.innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
                <div class="container mx-auto px-4 py-8 max-w-7xl">
                    <!-- Header -->
                    <div class="mb-8">
                        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div class="space-y-4">
                                <button class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white w-fit" onclick="router.navigate('/')">
                                    ${createIcon('arrow-left', 'w-4 h-4 mr-2')}
                                    Back to Dashboard
                                </button>
                                
                                <div class="space-y-2">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-3 bg-purple-500/20 rounded-lg">
                                            ${createIcon('folder', 'w-8 h-8 text-purple-400')}
                                        </div>
                                        <div>
                                            <h1 class="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                                                Folder Tasks
                                            </h1>
                                            <p class="text-slate-400 text-lg">
                                                Manage tasks within this project folder
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex flex-col sm:flex-row gap-3">
                                <button class="btn btn-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6" id="add-task-btn">
                                    ${createIcon('plus', 'w-5 h-5 mr-2')}
                                    Add Task
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div id="stats-section"></div>

                    <!-- Content -->
                    <div id="content-section"></div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.loadData();
    }
    
    setupEventListeners() {
        this.addEventListener(this.element.querySelector('#add-task-btn'), 'click', () => {
            this.showDatePicker();
        });
    }
    
    loadData() {
        if (!this.state.currentDate) return;
        
        const listenerId = window.firebaseUtils.subscribeToCollection(this.collectionName, (tasks) => {
            this.updateTasks(tasks);
        }, 'serialNumber');
        this.addFirebaseListener(listenerId);
    }
    
    updateTasks(tasks) {
        this.state.tasks = tasks;
        this.updateTodaysTasks();
        this.renderStats();
        this.renderContent();
    }
    
    updateTodaysTasks() {
        if (!this.state.currentDate) return;
        
        const today = new Date(this.state.currentDate);
        today.setHours(0, 0, 0, 0);
        
        this.state.todaysTasks = this.state.tasks.filter(task => {
            const taskDate = new Date(task.currentDate);
            taskDate.setHours(0, 0, 0, 0);
            const auraDates = generateAuraDates(new Date(task.createdAt), new Date(task.endDate));
            return auraDates.some(auraDate => {
                const compareDate = new Date(auraDate);
                compareDate.setHours(0, 0, 0, 0);
                return compareDate.getTime() === today.getTime();
            }) && taskDate.getTime() === today.getTime();
        });
        
        this.state.otherTasks = this.state.tasks.filter(task => {
            const taskDate = new Date(task.currentDate);
            taskDate.setHours(0, 0, 0, 0);
            const auraDates = generateAuraDates(new Date(task.createdAt), new Date(task.endDate));
            return !(auraDates.some(auraDate => {
                const compareDate = new Date(auraDate);
                compareDate.setHours(0, 0, 0, 0);
                return compareDate.getTime() === today.getTime();
            }) && taskDate.getTime() === today.getTime());
        });
    }
    
    renderStats() {
        const statsSection = this.element.querySelector('#stats-section');
        
        statsSection.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-purple-500/20 rounded-lg">
                                ${createIcon('check-square', 'w-6 h-6 text-purple-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Tasks in this folder</p>
                                <p class="text-2xl font-bold text-white">${this.state.tasks.length}</p>
                            </div>
                            <span class="badge badge-secondary bg-purple-500/20 text-purple-300 border-purple-500/30 ml-auto">
                                Active
                            </span>
                        </div>
                    </div>
                </div>

                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-amber-500/20 rounded-lg">
                                ${createIcon('calendar', 'w-6 h-6 text-amber-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Today's Tasks</p>
                                <p class="text-2xl font-bold text-white">${this.state.todaysTasks.length}</p>
                            </div>
                            <span class="badge badge-secondary bg-amber-500/20 text-amber-300 border-amber-500/30 ml-auto">
                                Due Today
                            </span>
                        </div>
                    </div>
                </div>

                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-3 bg-green-500/20 rounded-lg">
                                ${createIcon('check-square', 'w-6 h-6 text-green-400')}
                            </div>
                            <div>
                                <p class="text-slate-400 text-sm">Completion Rate</p>
                                <p class="text-2xl font-bold text-white">
                                    ${this.state.tasks.length > 0 ? Math.round(((this.state.tasks.length - this.state.todaysTasks.length) / this.state.tasks.length) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderContent() {
        const contentSection = this.element.querySelector('#content-section');
        
        let content = '';
        
        // Today's Tasks Section
        if (this.state.todaysTasks.length > 0) {
            content += `
                <div class="mb-8">
                    <div class="flex items-center space-x-3 mb-6">
                        <h2 class="text-2xl font-semibold text-white">Today's Tasks</h2>
                        <span class="badge badge-secondary bg-amber-500/20 text-amber-300 border-amber-500/30">
                            ${this.state.todaysTasks.length} due today
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" id="todays-tasks-grid">
                        ${this.state.todaysTasks.map(task => this.renderTaskCard(task, true)).join('')}
                    </div>
                </div>
            `;
        }
        
        // All Tasks Grid
        if (this.state.tasks.length > 0) {
            content += `
                <div class="space-y-6">
                    <div class="flex items-center space-x-3">
                        <h2 class="text-2xl font-semibold text-white">All Tasks</h2>
                        <span class="badge badge-secondary bg-purple-500/20 text-purple-300 border-purple-500/30">
                            ${this.state.tasks.length} total
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" id="all-tasks-grid">
                        ${this.state.tasks.map(task => this.renderTaskCard(task)).join('')}
                    </div>
                </div>
            `;
        } else {
            content += `
                <div class="card bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                    <div class="card-content p-12 text-center">
                        <div class="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            ${createIcon('check-square', 'w-8 h-8 text-slate-400')}
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-2">No Tasks Yet</h3>
                        <p class="text-slate-400 mb-6">Create your first task in this folder to get started</p>
                        <button class="btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" onclick="folderPage.showDatePicker()">
                            ${createIcon('plus', 'w-4 h-4 mr-2')}
                            Add First Task
                        </button>
                    </div>
                </div>
            `;
        }
        
        contentSection.innerHTML = content;
        this.setupTaskComponents();
    }
    
    renderTaskCard(task, isToday = false) {
        return `
            <div class="relative" data-task-id="${task.id}">
                ${isToday ? `
                    <div class="absolute -top-2 -right-2 z-10">
                        <span class="badge bg-amber-500 text-amber-900 border-amber-600 shadow-lg">
                            Due Today
                        </span>
                    </div>
                ` : ''}
                <div class="task-item-card ${isToday ? 'today' : ''}">
                    <div class="card-content p-6">
                        <!-- Task content will be rendered by TaskItem component -->
                    </div>
                </div>
            </div>
        `;
    }
    
    setupTaskComponents() {
        const taskElements = this.element.querySelectorAll('[data-task-id]');
        taskElements.forEach(taskElement => {
            const taskId = taskElement.dataset.taskId;
            const task = this.state.tasks.find(t => t.id === taskId);
            if (task) {
                const taskContent = taskElement.querySelector('.card-content');
                new TaskItemComponent(taskContent, task, this.collectionName, () => this.handleTaskUpdate(), this.state.currentDate);
            }
        });
    }
    
    showInitialDatePicker() {
        new DatePicker(
            (date) => {
                this.state.currentDate = date;
                this.state.showInitialDatePicker = false;
                this.render();
            },
            null,
            null,
            { isInitial: true }
        ).show();
    }
    
    showDatePicker() {
        new DatePicker(
            (startDate, endDate) => this.handleDateSelect(startDate, endDate),
            () => {},
            this.state.lastEndDate
        ).show();
    }
    
    async handleDateSelect(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            const auraDates = generateAuraDates(start, end);
            const serialNumber = this.state.tasks.length + 1;
            
            if (auraDates.length < 2) {
                throw new Error('Not enough aura dates generated');
            }
            
            let nextAuraDate = null;
            for (let i = 0; i < auraDates.length; i++) {
                const auraDate = new Date(auraDates[i]);
                auraDate.setHours(0, 0, 0, 0);
                if (auraDate > start) {
                    nextAuraDate = auraDate;
                    break;
                }
            }
            
            if (!nextAuraDate && auraDates.length >= 2) {
                nextAuraDate = new Date(auraDates[1]);
                nextAuraDate.setHours(0, 0, 0, 0);
            }
            
            console.log('Task #' + serialNumber + ' Aura dates:', auraDates.map(date => formatDate(date)));
            console.log('Using next aura date:', formatDate(nextAuraDate));
            
            await window.firebaseUtils.addDocument(this.collectionName, {
                serialNumber,
                endDate: end.toISOString(),
                currentDate: nextAuraDate.toISOString(),
                currentAuraIndex: 1,
                text1: '',
                text2: '',
                image1: null,
                image2: null,
                createdAt: start.toISOString(),
                lastUpdated: null
            });
            
            this.state.lastEndDate = end;
        } catch (error) {
            console.error('Error adding task:', error);
            showToast({
                title: "Error",
                description: "Failed to create task. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleTaskUpdate() {
        // No need to update serial numbers for folder tasks
    }
}

class NotFoundPage extends BasePage {
    render() {
        this.element.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="text-center">
                    <h1 class="text-4xl font-bold mb-4">404</h1>
                    <p class="text-xl text-gray-600 mb-4">Oops! Page not found</p>
                    <button class="btn btn-outline" onclick="router.navigate('/')">
                        Return to Home
                    </button>
                </div>
            </div>
        `;
    }
}

// Task Item Component
class TaskItemComponent extends Component {
    constructor(element, task, collectionName, onUpdate, currentDate) {
        super(element);
        this.task = task;
        this.collectionName = collectionName;
        this.onUpdate = onUpdate;
        this.currentDate = currentDate;
        this.isFolderTask = collectionName.includes('folder');
        this.state = {
            showTextInput: !task.text1,
            showText2Input: false,
            showText2: false,
            isUpdating: false
        };
        
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        const isToday = this.isToday();
        
        this.element.innerHTML = `
            <!-- Header -->
            <div class="task-item-header">
                <div class="task-item-info">
                    <div class="task-item-number">
                        <span class="task-item-number-text">${this.task.serialNumber}</span>
                    </div>
                    <div class="task-item-details">
                        <h3>Task #${this.task.serialNumber}</h3>
                        <div class="task-item-date">
                            ${createIcon('calendar', 'w-3 h-3 mr-1')}
                            Next: ${formatDate(this.getCurrentDate())}
                        </div>
                    </div>
                </div>
                
                <div class="task-item-actions">
                    <button class="btn btn-sm btn-outline border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors" 
                            id="not-done-btn" ${this.state.isUpdating ? 'disabled' : ''}>
                        ${createIcon('x', 'w-4 h-4')}
                    </button>
                    <button class="btn btn-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white" 
                            id="done-btn" ${this.state.isUpdating ? 'disabled' : ''}>
                        ${createIcon('check', 'w-4 h-4')}
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="task-item-content space-y-4">
                <!-- Primary Text -->
                ${this.state.showTextInput ? `
                    <div class="space-y-3">
                        <textarea id="text-input" placeholder="Enter task description..." 
                                  class="task-item-textarea">${this.task.text1 || ''}</textarea>
                        <div class="flex justify-end">
                            <button class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border border-blue-700" id="save-text-btn">
                                Save Description
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="task-item-text-section" id="text-section">
                        <div class="task-item-text-content">
                            ${createIcon('message-square', 'w-5 h-5 text-blue-400 group-hover:text-blue-300')}
                            <div class="flex-1">
                                <p class="text-slate-300 group-hover:text-white transition-colors">
                                    ${this.task.text1 ? truncateText(this.task.text1) : 'Click to add description...'}
                                </p>
                                ${this.task.text1 ? '<p class="task-item-text-help">Click to view full text</p>' : ''}
                            </div>
                        </div>
                    </div>
                `}

                <!-- Secondary Text (for folder items) -->
                ${this.isFolderTask ? `
                    ${this.state.showText2Input ? `
                        <div class="space-y-3">
                            <textarea id="text2-input" placeholder="Enter additional notes..." 
                                      class="task-item-textarea">${this.task.text2 || ''}</textarea>
                            <div class="flex justify-end">
                                <button class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border border-blue-700" id="save-text2-btn">
                                    Save Notes
                                </button>
                            </div>
                        </div>
                    ` : this.state.showText2 && this.task.text2 ? `
                        <div class="task-item-text-section" id="text2-section">
                            <div class="task-item-text-content">
                                ${createIcon('message-square', 'w-5 h-5 text-purple-400 group-hover:text-purple-300')}
                                <div class="flex-1">
                                    <p class="text-slate-300 group-hover:text-white transition-colors">
                                        ${truncateText(this.task.text2)}
                                    </p>
                                    <p class="task-item-text-help">Additional notes</p>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <button class="btn btn-outline w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white border-dashed" id="toggle-text2-btn">
                            ${this.state.showText2 ? createIcon('eye-off', 'w-4 h-4 mr-2') : createIcon('eye', 'w-4 h-4 mr-2')}
                            ${this.state.showText2 ? 'Hide Additional Notes' : 'Show Additional Notes'}
                        </button>
                    `}
                ` : ''}

                <!-- Images Section - Only show for main page tasks -->
                ${!this.isFolderTask ? `
                    <div class="task-item-images-section space-y-3">
                        <div class="task-item-images-title">
                            ${createIcon('image', 'w-4 h-4 text-slate-400')}
                            <span class="text-slate-400 text-sm font-medium">Attachments</span>
                        </div>
                        <div class="task-item-images-grid">
                            <div id="image1-upload"></div>
                            <div id="image2-upload"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Setup image uploads for main page tasks
        if (!this.isFolderTask) {
            this.setupImageUploads();
        }
    }
    
    setupEventListeners() {
        // Action buttons
        this.addEventListener(this.element.querySelector('#not-done-btn'), 'click', () => {
            new ConfirmDialog(
                'Move this task to next phase?',
                () => this.handleNotDone()
            ).show();
        });
        
        this.addEventListener(this.element.querySelector('#done-btn'), 'click', () => {
            new ConfirmDialog(
                'Mark this task as completed?',
                () => this.handleDone()
            ).show();
        });
        
        // Text sections
        const textSection = this.element.querySelector('#text-section');
        if (textSection) {
            this.addEventListener(textSection, 'click', () => {
                new TextPopup(this.task.text1, (newText) => this.handleTextEdit(newText)).show();
            });
        }
        
        const text2Section = this.element.querySelector('#text2-section');
        if (text2Section) {
            this.addEventListener(text2Section, 'click', () => {
                new TextPopup(this.task.text2, (newText) => this.handleText2Edit(newText)).show();
            });
        }
        
        // Text input save buttons
        const saveTextBtn = this.element.querySelector('#save-text-btn');
        if (saveTextBtn) {
            this.addEventListener(saveTextBtn, 'click', () => this.handleSaveText());
        }
        
        const saveText2Btn = this.element.querySelector('#save-text2-btn');
        if (saveText2Btn) {
            this.addEventListener(saveText2Btn, 'click', () => this.handleSaveText2());
        }
        
        // Toggle text2 button
        const toggleText2Btn = this.element.querySelector('#toggle-text2-btn');
        if (toggleText2Btn) {
            this.addEventListener(toggleText2Btn, 'click', () => {
                if (!this.state.showText2) {
                    this.state.showText2 = true;
                    if (!this.task.text2) {
                        this.state.showText2Input = true;
                    }
                } else {
                    this.state.showText2 = false;
                    this.state.showText2Input = false;
                }
                this.render();
                this.setupEventListeners();
            });
        }
    }
    
    setupImageUploads() {
        const image1Container = this.element.querySelector('#image1-upload');
        const image2Container = this.element.querySelector('#image2-upload');
        
        if (image1Container) {
            new ImageUpload(
                image1Container,
                `${createIcon('image', 'w-5 h-5')} Image 1`,
                this.task.image1,
                (imageData) => this.handleImageUpdate('image1', imageData)
            );
        }
        
        if (image2Container) {
            new ImageUpload(
                image2Container,
                `${createIcon('image', 'w-5 h-5')} Image 2`,
                this.task.image2,
                (imageData) => this.handleImageUpdate('image2', imageData)
            );
        }
    }
    
    getCurrentDate() {
        return new Date(this.task.currentDate);
    }
    
    isToday() {
        const taskDate = new Date(this.task.currentDate);
        taskDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(this.currentDate);
        compareDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === compareDate.getTime();
    }
    
    async handleSaveText() {
        try {
            const textInput = this.element.querySelector('#text-input');
            await window.firebaseUtils.updateDocument(this.collectionName, this.task.id, { 
                text1: textInput.value 
            });
            this.task.text1 = textInput.value;
            this.state.showTextInput = false;
            this.render();
            this.setupEventListeners();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error('Error saving text:', error);
            showToast({
                title: "Error",
                description: "Failed to save text. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleSaveText2() {
        try {
            const text2Input = this.element.querySelector('#text2-input');
            await window.firebaseUtils.updateDocument(this.collectionName, this.task.id, { 
                text2: text2Input.value 
            });
            this.task.text2 = text2Input.value;
            this.state.showText2Input = false;
            this.render();
            this.setupEventListeners();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error('Error saving text2:', error);
            showToast({
                title: "Error",
                description: "Failed to save notes. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleTextEdit(newText) {
        try {
            await window.firebaseUtils.updateDocument(this.collectionName, this.task.id, { 
                text1: newText 
            });
            this.task.text1 = newText;
            this.render();
            this.setupEventListeners();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error('Error updating text:', error);
            showToast({
                title: "Error",
                description: "Failed to update text. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleText2Edit(newText) {
        try {
            await window.firebaseUtils.updateDocument(this.collectionName, this.task.id, { 
                text2: newText 
            });
            this.task.text2 = newText;
            this.render();
            this.setupEventListeners();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error('Error updating text2:', error);
            showToast({
                title: "Error",
                description: "Failed to update notes. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleImageUpdate(imageKey, imageData) {
        try {
            await window.firebaseUtils.updateDocument(this.collectionName, this.task.id, { 
                [imageKey]: imageData 
            });
            this.task[imageKey] = imageData;
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error('Error updating image:', error);
            showToast({
                title: "Error",
                description: "Failed to update image. Please try again.",
                variant: "destructive"
            });
        }
    }
    
    async handleNotDone() {
        if (this.state.isUpdating) return;
        
        try {
            this.state.isUpdating = true;
            this.render();
            this.setupEventListeners();
            
            const auraDates = generateAuraDates(new Date(this.task.createdAt), new Date(this.task.endDate));
            const currentDate = new Date(this.task.currentDate);
            currentDate.setHours(0, 0, 0, 0);
            
            let nextAuraDate = null;
            let currentIndex = -1;
            
            // Find current date's index in aura dates
            for (let i = 0; i < auraDates.length; i++) {
                const auraDate = new Date(auraDates[i]);
                auraDate.setHours(0, 0, 0, 0);
                
                if (auraDate.getTime() === currentDate.getTime()) {
                    currentIndex = i;
                    break;
                }
            }
            
            // Get next aura date
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
                nextAuraDate = auraDates[currentIndex + 1];
            }
            
            if (nextAuraDate && nextAuraDate <= new Date(this.task.endDate)) {
                await window.firebaseUtils.updateDocument(this.collectionName, this.task.id, {
                    currentDate: nextAuraDate.toISOString(),
                    lastUpdated: new Date().toISOString()
                });
                
                this.task.currentDate = nextAuraDate.toISOString();
                this.task.lastUpdated = new Date().toISOString();
                
                if (this.onUpdate) this.onUpdate();
            }
        } catch (error) {
            console.error('Error updating task:', error);
            showToast({
                title: "Error",
                description: "Failed to update task. Please try again.",
                variant: "destructive"
            });
        } finally {
            this.state.isUpdating = false;
            this.render();
            this.setupEventListeners();
        }
    }
    
    async handleDone() {
        if (this.state.isUpdating) return;
        
        try {
            this.state.isUpdating = true;
            await window.firebaseUtils.deleteDocument(this.collectionName, this.task.id);
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast({
                title: "Error",
                description: "Failed to complete task. Please try again.",
                variant: "destructive"
            });
        } finally {
            this.state.isUpdating = false;
        }
    }
}

// Create router instance and setup routes
const router = new Router();
router.addRoute('/', IndexPage);
router.addRoute('/folder/:folderId', FolderPage);

// Export to global scope
window.router = router;
window.IndexPage = IndexPage;
window.FolderPage = FolderPage;
window.NotFoundPage = NotFoundPage;
window.TaskItemComponent = TaskItemComponent;

// Store page instances for global access
window.indexPage = null;
window.folderPage = null;

// Update page instances when routes change
const originalHandleRoute = router.handleRoute.bind(router);
router.handleRoute = function(path) {
    originalHandleRoute(path);
    
    if (this.currentComponent instanceof IndexPage) {
        window.indexPage = this.currentComponent;
        window.folderPage = null;
    } else if (this.currentComponent instanceof FolderPage) {
        window.folderPage = this.currentComponent;
        window.indexPage = null;
    }
};