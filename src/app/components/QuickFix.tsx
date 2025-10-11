'use client';

import React from 'react';

const QuickFix: React.FC = () => {
  const openFirebaseConsole = () => {
    window.open('https://console.firebase.google.com/project/naughtyden-app/storage/rules', '_blank');
  };

  return (
    <div className="bg-red-900 border border-red-600 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-red-300">🚨 URGENT: Firebase Storage Rules Fix</h3>
      
      <div className="space-y-4">
        <div className="bg-red-800 p-4 rounded-lg">
          <h4 className="font-semibold text-red-200 mb-2">Your uploads are stuck at 0% because Firebase Storage rules are blocking them!</h4>
          <p className="text-sm text-red-100">
            The default Firebase Storage rules require authentication, but your app isn't properly authenticated during uploads.
          </p>
        </div>

        <div className="bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-300 mb-2">🔧 IMMEDIATE FIX (2 minutes):</h4>
          <ol className="text-sm text-yellow-200 space-y-2 list-decimal list-inside">
            <li>Click the button below to open Firebase Console</li>
            <li>Go to Storage → Rules tab</li>
            <li>Replace ALL existing rules with this code:</li>
          </ol>
          
          <div className="mt-3 bg-gray-900 p-3 rounded">
            <pre className="text-xs text-gray-300 overflow-x-auto">
{`service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
          </div>
          
          <ol className="text-sm text-yellow-200 space-y-2 list-decimal list-inside mt-3" start={4}>
            <li>Click "Publish" button</li>
            <li>Come back and test uploads - they will work immediately!</li>
          </ol>
        </div>

        <button
          onClick={openFirebaseConsole}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
        >
          🔗 Open Firebase Console (Storage Rules)
        </button>

        <div className="bg-green-900 border border-green-600 p-4 rounded-lg">
          <h4 className="font-semibold text-green-300 mb-2">✅ After Fix:</h4>
          <ul className="text-sm text-green-200 space-y-1 list-disc list-inside">
            <li>Uploads will work immediately</li>
            <li>No more 0% freezing</li>
            <li>Real progress bars will show</li>
            <li>Files will upload to Firebase Storage</li>
          </ul>
        </div>

        <div className="bg-orange-900 border border-orange-600 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-300 mb-2">⚠️ Security Note:</h4>
          <p className="text-sm text-orange-200">
            The rules above allow anyone to upload (for testing). After confirming uploads work, 
            you should replace them with more secure rules that require authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickFix;
