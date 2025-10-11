'use client';

import React, { useEffect, useState } from 'react';

declare global {
    interface Window {
        Veriff?: any;
        veriffSDK?: any;
    }
}

interface InlineVeriffKYCProps {
    onVerificationComplete: (status: 'success' | 'failed' | 'pending') => void;
    onClose: () => void;
}

const InlineVeriffKYC: React.FC<InlineVeriffKYCProps> = ({ onVerificationComplete, onClose }) => {
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
                
                // Wait for the DOM element to be available
                const waitForElement = () => {
                    return new Promise<void>((resolve, reject) => {
                        const checkElement = () => {
                            const veriffRoot = document.getElementById('inline-veriff-root');
                            if (veriffRoot) {
                                console.log('Inline Veriff root element found');
                                resolve();
                            } else {
                                console.log('Waiting for inline-veriff-root element...');
                                setTimeout(checkElement, 50);
                            }
                        };
                        checkElement();
                        
                        setTimeout(() => {
                            reject(new Error('Inline Veriff root element not found after timeout'));
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
                    parentId: 'inline-veriff-root',
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

    if (error) {
        return (
            <div className="bg-gray-900 rounded-lg p-4 border border-red-600">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-red-400">Verification Error</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-gray-300 text-sm mb-4">{error}</p>
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-sm font-bold"
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
                        className="px-4 py-2 rounded-lg border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors text-sm"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-lg p-4 border border-pink-600">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Identity Verification</h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div className="space-y-3">
                <div className="bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Verification Process</h4>
                    <p className="text-gray-300 text-xs mb-3">
                        Complete your identity verification to become a verified creator.
                    </p>
                    <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-green-400 flex-shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Valid government-issued ID required</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-green-400 flex-shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Camera access for photo verification</span>
                        </div>
                    </div>
                </div>
                
                <div id="inline-veriff-root" className="min-h-[300px] bg-gray-800 rounded-lg w-full">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full min-h-[300px]">
                            <div className="text-center p-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500 mx-auto mb-3"></div>
                                <p className="text-gray-300 text-sm">Loading verification...</p>
                            </div>
                        </div>
                    ) : isInitialized ? (
                        <div className="p-2">
                            <div className="text-center mb-3">
                                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-green-900 text-green-300 text-xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Verification ready
                                </div>
                            </div>
                            {/* Veriff will inject its interface here */}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[300px]">
                            <div className="text-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-pink-500 mx-auto mb-3"></div>
                                <p className="text-gray-400 text-sm">Initializing...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InlineVeriffKYC;
