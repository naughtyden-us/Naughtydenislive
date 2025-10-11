'use client';

import React, { useEffect, useState } from 'react';

declare global {
    interface Window {
        Veriff?: any;
        veriffSDK?: any;
    }
}

interface VeriffKYCProps {
    onClose: () => void;
    onVerificationComplete: (status: 'success' | 'failed' | 'pending') => void;
}

const VeriffKYC: React.FC<VeriffKYCProps> = ({ onClose, onVerificationComplete }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const loadVeriffScripts = () => {
            return new Promise<void>((resolve, reject) => {
                // Check if scripts are already loaded
                if (window.Veriff && window.veriffSDK) {
                    console.log('Veriff scripts already loaded');
                    resolve();
                    return;
                }

                console.log('Loading Veriff SDK scripts...');

                // Load first script
                const script1 = document.createElement('script');
                script1.src = 'https://cdn.veriff.me/sdk/js/1.5/veriff.min.js';
                script1.onload = () => {
                    console.log('First Veriff script loaded successfully');
                    // Load second script
                    const script2 = document.createElement('script');
                    script2.src = 'https://cdn.veriff.me/incontext/js/v1/veriff.js';
                    script2.onload = () => {
                        console.log('Second Veriff script loaded successfully');
                        // Wait a bit for scripts to initialize
                        setTimeout(() => {
                            if (window.Veriff && window.veriffSDK) {
                                console.log('Veriff SDK ready');
                                resolve();
                            } else {
                                console.error('Veriff SDK not available after loading scripts');
                                reject(new Error('Veriff SDK not available'));
                            }
                        }, 100);
                    };
                    script2.onerror = (error) => {
                        console.error('Failed to load second Veriff script:', error);
                        reject(new Error('Failed to load Veriff SDK - second script failed'));
                    };
                    document.head.appendChild(script2);
                };
                script1.onerror = (error) => {
                    console.error('Failed to load first Veriff script:', error);
                    reject(new Error('Failed to load Veriff SDK - first script failed'));
                };
                document.head.appendChild(script1);
            });
        };

        const initializeVeriff = async () => {
            try {
                console.log('Starting Veriff initialization...');
                
                // Start loading scripts immediately
                const scriptsPromise = loadVeriffScripts();
                
                // Wait for the DOM element to be available (should be immediate now)
                const waitForElement = () => {
                    return new Promise<void>((resolve, reject) => {
                        const checkElement = () => {
                            const veriffRoot = document.getElementById('veriff-root');
                            if (veriffRoot) {
                                console.log('Veriff root element found');
                                resolve();
                            } else {
                                console.log('Waiting for veriff-root element...');
                                setTimeout(checkElement, 50); // Faster checking
                            }
                        };
                        checkElement();
                        
                        // Timeout after 2 seconds (reduced from 5)
                        setTimeout(() => {
                            reject(new Error('Veriff root element not found after timeout'));
                        }, 2000);
                    });
                };
                
                // Wait for both scripts and element
                await Promise.all([scriptsPromise, waitForElement()]);
                
                console.log('Initializing Veriff with API key...');
                // Initialize Veriff with the correct implementation
                const veriff = window.Veriff({
                    host: 'https://stationapi.veriff.com',
                    apiKey: 'e1d937eb-266f-4fc4-8489-8f69a7f39a7d',
                    parentId: 'veriff-root',
                    onSession: function(err: any, response: any) {
                        console.log('Veriff session response:', response);
                        if (err) {
                            console.error('Veriff session error:', err);
                            setError(`Failed to create verification session: ${err.message || 'Unknown error'}`);
                            setIsLoading(false);
                            return;
                        }
                        
                        if (response && response.verification && response.verification.url) {
                            console.log('Verification URL received:', response.verification.url);
                            // Use the correct method to create the frame
                            window.veriffSDK.createVeriffFrame({ url: response.verification.url });
                            setIsLoading(false);
                            setIsInitialized(true);
                        } else {
                            console.error('No verification URL in response:', response);
                            setError('Failed to get verification URL. Please try again.');
                            setIsLoading(false);
                        }
                    },
                    onFinished: function(err: any, code: any, person: any) {
                        console.log('Veriff verification finished:', { err, code, person });
                        if (err) {
                            console.error('Verification error:', err);
                            onVerificationComplete('failed');
                        } else if (code === 'SUCCESS') {
                            console.log('Verification successful');
                            onVerificationComplete('success');
                        } else {
                            console.log('Verification failed with code:', code);
                            onVerificationComplete('failed');
                        }
                        onClose();
                    }
                });

                console.log('Setting Veriff parameters...');
                // Set parameters and mount Veriff
                veriff.setParams({
                    vendorData: ' '
                });
                
                console.log('Mounting Veriff...');
                veriff.mount();

                console.log('Veriff initialization completed');
                setIsLoading(false);
            } catch (err) {
                console.error('Veriff initialization error:', err);
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(`Failed to load verification system: ${errorMessage}. Please check your internet connection and try again.`);
                setIsLoading(false);
            }
        };

        initializeVeriff();
    }, [onClose, onVerificationComplete]);

    const handleClose = () => {
        onClose();
    };

    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[101] p-4">
                <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md mx-4 text-white text-center shadow-lg border border-pink-600">
                    <div className="flex justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.731 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.007H12v-.007z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Verification Error</h2>
                    <p className="mb-6 text-gray-300">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={handleClose}
                            className="w-full px-6 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors font-bold"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                setError(null);
                                setIsLoading(true);
                                setIsInitialized(false);
                                window.location.reload();
                            }}
                            className="w-full px-6 py-3 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[101] p-2 sm:p-4">
            <div className="bg-gray-900 rounded-lg p-4 sm:p-8 w-full max-w-6xl mx-2 sm:mx-4 text-white shadow-lg border border-pink-600 max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">Identity Verification</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-sm sm:text-base">Verification Process</h3>
                        <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                            Please complete the identity verification process to become a verified creator. 
                            You'll need a valid government-issued ID and a device with a camera.
                        </p>
                        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-400">
                            <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span>Valid government-issued ID required</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span>Camera access for photo verification</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                <span>Process takes 2-3 minutes</span>
                            </div>
                        </div>
                    </div>
                    
                    <div id="veriff-root" className="min-h-[400px] sm:min-h-[500px] bg-gray-800 rounded-lg w-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full min-h-[400px]">
                                <div className="text-center p-4">
                                    <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
                                    <p className="text-gray-300 text-sm sm:text-base">Loading verification system...</p>
                                    <p className="text-gray-400 text-xs sm:text-sm mt-2">This may take a few moments</p>
                                </div>
                            </div>
                        ) : isInitialized ? (
                            <div className="p-2 sm:p-4">
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center px-3 py-2 rounded-lg bg-green-900 text-green-300 text-xs sm:text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Verification interface ready
                                    </div>
                                </div>
                                {/* Veriff will inject its interface here */}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[400px]">
                                <div className="text-center p-4">
                                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
                                    <p className="text-gray-400 text-sm sm:text-base">Initializing verification interface...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VeriffKYC;
