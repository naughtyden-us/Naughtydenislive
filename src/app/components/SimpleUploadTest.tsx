'use client';

import React, { useState } from 'react';

const SimpleUploadTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const testDirectUpload = async () => {
    setIsTesting(true);
    setTestResult('Testing direct Firebase Storage access...\n');
    
    try {
      // Import Firebase dynamically to avoid initialization issues
      const { initializeApp } = await import('firebase/app');
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      
      setTestResult(prev => prev + '✅ Firebase modules loaded\n');
      
      // Initialize Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyCQtWBB_PL4Gi8P5Td0RCgKc7tUQLzsATg",
        authDomain: "naughtyden-app.firebaseapp.com",
        projectId: "naughtyden-app",
        storageBucket: "naughtyden-app.appspot.com",
        messagingSenderId: "1038096287210",
        appId: "1:1038096287210:web:e2f569629036cd00125e93",
        measurementId: "G-RYREQGMGB1"
      };
      
      const app = initializeApp(firebaseConfig);
      const storage = getStorage(app);
      
      setTestResult(prev => prev + '✅ Firebase initialized\n');
      
      // Create test file
      const testContent = 'Test upload - ' + new Date().toISOString();
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      
      setTestResult(prev => prev + '✅ Test file created\n');
      
      // Try to upload
      const testFileName = `test-direct-upload-${Date.now()}.txt`;
      const testRef = ref(storage, testFileName);
      
      setTestResult(prev => prev + `📤 Attempting upload: ${testFileName}\n`);
      
      const snapshot = await uploadBytes(testRef, testBlob);
      setTestResult(prev => prev + '✅ Upload successful!\n');
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      setTestResult(prev => prev + `✅ Download URL: ${downloadURL.substring(0, 50)}...\n`);
      
      setTestResult(prev => prev + '🎉 SUCCESS! Firebase Storage is working!\n');
      setTestResult(prev => prev + '💡 The issue is likely Firebase Storage rules.\n');
      setTestResult(prev => prev + '🔧 Please update your Firebase Storage rules as shown above.\n');
      
    } catch (error: any) {
      setTestResult(prev => prev + `❌ Error: ${error.message}\n`);
      setTestResult(prev => prev + `❌ Error code: ${error.code}\n`);
      
      if (error.code === 'storage/unauthorized') {
        setTestResult(prev => prev + '🔒 CONFIRMED: Firebase Storage rules are blocking uploads!\n');
        setTestResult(prev => prev + '💡 You MUST update Firebase Storage rules to allow uploads.\n');
      } else {
        setTestResult(prev => prev + `🔍 Other error: ${error.code}\n`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4 text-white">Direct Firebase Storage Test</h3>
      
      <button
        onClick={testDirectUpload}
        disabled={isTesting}
        className="mb-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
      >
        {isTesting ? 'Testing...' : 'Test Direct Upload (Bypass Rules)'}
      </button>

      <div className="bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">
        <h4 className="text-sm font-semibold mb-2 text-gray-300">Test Results:</h4>
        {testResult ? (
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
            {testResult}
          </pre>
        ) : (
          <p className="text-gray-500 text-sm">Click the button above to test direct Firebase Storage access.</p>
        )}
      </div>
      
      <div className="mt-4 bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
        <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Important</h4>
        <p className="text-sm text-yellow-200">
          This test bypasses your app's authentication to directly test Firebase Storage. 
          If this works but your uploads don't, it confirms the issue is with Firebase Storage rules.
        </p>
      </div>
    </div>
  );
};

export default SimpleUploadTest;
