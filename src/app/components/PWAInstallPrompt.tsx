'use client';

import React, { useEffect, useState } from 'react';

declare global {
    interface Window {
        deferredPrompt?: any;
    }
}

const PWAInstallPrompt: React.FC = () => {
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        const beforeInstallHandler = (e: any) => {
            e.preventDefault();
            window.deferredPrompt = e;
            setCanInstall(true);
        };
        window.addEventListener('beforeinstallprompt', beforeInstallHandler);
        return () => window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
    }, []);

    if (!canInstall) return null;

    return (
        <div className="fixed bottom-4 inset-x-0 flex justify-center z-[200] px-4">
            <div className="bg-gray-900 text-white border border-pink-600 rounded-xl shadow-lg p-4 max-w-md w-full flex items-center justify-between gap-3">
                <div className="text-sm">
                    <div className="font-bold">Install Naughty Den</div>
                    <div className="text-gray-400">Add the app to your home screen for a faster experience.</div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                        onClick={() => setCanInstall(false)}
                    >
                        Not now
                    </button>
                    <button
                        className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 font-bold"
                        onClick={async () => {
                            const promptEvent = window.deferredPrompt;
                            if (!promptEvent) return;
                            promptEvent.prompt();
                            await promptEvent.userChoice;
                            window.deferredPrompt = null;
                            setCanInstall(false);
                        }}
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;


