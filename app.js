// Main application initialization

class App {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    async init() {
        try {
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Initialize the application
            this.setupGlobalErrorHandling();
            this.setupServiceWorker();
            
            this.initialized = true;
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showInitializationError(error);
        }
    }
    
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            const checkFirebase = () => {
                if (window.db && window.firebaseUtils) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            checkFirebase();
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (!window.db || !window.firebaseUtils) {
                    reject(new Error('Firebase initialization timeout'));
                }
            }, 10000);
        });
    }
    
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
        });
    }
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
    
    handleError(error) {
        // Only show user-facing errors for network issues or critical failures
        if (error.message && (
            error.message.includes('network') ||
            error.message.includes('fetch') ||
            error.message.includes('Firebase')
        )) {
            showToast({
                title: 'Connection Error',
                description: 'Please check your internet connection and try again.',
                variant: 'destructive'
            });
        }
    }
    
    showInitializationError(error) {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
                <div class="card bg-slate-800 border-slate-700 max-w-md w-full mx-4">
                    <div class="card-content p-8 text-center">
                        <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            ${createIcon('alert-triangle', 'w-8 h-8 text-red-400')}
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-2">Initialization Error</h3>
                        <p class="text-slate-400 mb-6">
                            Failed to initialize the application. Please refresh the page and try again.
                        </p>
                        <button class="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                                onclick="window.location.reload()">
                            Refresh Page
                        </button>
                        <details class="mt-4 text-left">
                            <summary class="text-slate-400 text-sm cursor-pointer">Error Details</summary>
                            <pre class="text-xs text-slate-500 mt-2 bg-slate-900 p-2 rounded overflow-auto">${error.message || error}</pre>
                        </details>
                    </div>
                </div>
            </div>
        `;
    }
    
    destroy() {
        if (window.firebaseUtils) {
            window.firebaseUtils.destroy();
        }
        
        if (window.router && window.router.currentComponent) {
            window.router.currentComponent.destroy();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});

// Export for global access
window.App = App;