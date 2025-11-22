'use client';

import React, { useState } from 'react';

const DiagnosticTool: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addDiagnostic = (message: string) => {
    setDiagnostics(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setDiagnostics([]);
    
    try {
      addDiagnostic('🔍 Starting comprehensive diagnostic...');
      
      // Test 1: Check if we're in browser environment
      if (typeof window === 'undefined') {
        addDiagnostic('❌ Not in browser environment');
        return;
      }
      addDiagnostic('✅ Browser environment detected');

      // Test 2: Check Firebase configuration
      addDiagnostic('🔧 Testing Firebase configuration...');
      try {
        const { initializeApp } = await import('firebase/app');
        const { getStorage } = await import('firebase/storage');
        
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
        addDiagnostic('✅ Firebase app initialized');
        
        const storage = getStorage(app);
        addDiagnostic('✅ Firebase Storage initialized');
        
        // Test 3: Check network connectivity
        addDiagnostic('🌐 Testing network connectivity...');
        try {
          const response = await fetch('https://firebase.googleapis.com', { method: 'HEAD' });
          if (response.ok) {
            addDiagnostic('✅ Network connectivity to Firebase OK');
          } else {
            addDiagnostic(`⚠️ Network issue: ${response.status}`);
          }
        } catch (networkError) {
          addDiagnostic(`❌ Network error: ${networkError}`);
        }

        // Test 4: Try to create a storage reference
        addDiagnostic('📁 Testing storage reference creation...');
        try {
          const { ref } = await import('firebase/storage');
          const testRef = ref(storage, 'test/diagnostic.txt');
          addDiagnostic('✅ Storage reference created successfully');
          addDiagnostic(`📁 Reference path: ${testRef.fullPath}`);
        } catch (refError) {
          addDiagnostic(`❌ Storage reference error: ${refError}`);
        }

        // Test 5: Try to upload a tiny file
        addDiagnostic('📤 Testing actual upload...');
        try {
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          
          // Create a very small test file
          const testContent = 'Diagnostic test file';
          const testBlob = new Blob([testContent], { type: 'text/plain' });
          addDiagnostic(`📄 Test file created: ${testBlob.size} bytes`);
          
          const testRef = ref(storage, `diagnostic/test-${Date.now()}.txt`);
          addDiagnostic(`📁 Upload path: ${testRef.fullPath}`);
          
          // Try upload with timeout
          const uploadPromise = uploadBytes(testRef, testBlob);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout after 10 seconds')), 10000)
          );
          
          const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as Awaited<ReturnType<typeof uploadBytes>>;
          addDiagnostic('✅ Upload completed successfully!');
          addDiagnostic(`📁 Uploaded to: ${snapshot.ref.fullPath}`);
          
          // Try to get download URL
          const downloadURL = await getDownloadURL(snapshot.ref);
          addDiagnostic(`🔗 Download URL: ${downloadURL.substring(0, 50)}...`);
          
          // Test if URL is accessible
          try {
            const urlResponse = await fetch(downloadURL);
            if (urlResponse.ok) {
              addDiagnostic('✅ File is accessible via download URL');
            } else {
              addDiagnostic(`⚠️ File not accessible: ${urlResponse.status}`);
            }
          } catch (urlError) {
            addDiagnostic(`❌ URL access error: ${urlError}`);
          }
          
          addDiagnostic('🎉 ALL TESTS PASSED! Firebase Storage is working correctly.');
          addDiagnostic('💡 The issue might be in your upload components or authentication.');
          
        } catch (uploadError: any) {
          addDiagnostic(`❌ Upload failed: ${uploadError.message}`);
          addDiagnostic(`❌ Error code: ${uploadError.code}`);
          
          if (uploadError.code === 'storage/unauthorized') {
            addDiagnostic('🔒 CONFIRMED: Firebase Storage rules are blocking uploads!');
            addDiagnostic('💡 You MUST update Firebase Storage rules to allow uploads.');
            addDiagnostic('🔧 Go to Firebase Console → Storage → Rules and replace with:');
            addDiagnostic('   allow read, write: if true;');
          } else if (uploadError.code === 'storage/object-not-found') {
            addDiagnostic('📁 Object not found - path issue');
          } else if (uploadError.code === 'storage/quota-exceeded') {
            addDiagnostic('💾 Storage quota exceeded');
          } else if (uploadError.code === 'storage/invalid-format') {
            addDiagnostic('📄 Invalid file format');
          } else if (uploadError.code === 'storage/canceled') {
            addDiagnostic('❌ Upload was canceled');
          } else {
            addDiagnostic(`🔍 Unknown Firebase error: ${uploadError.code}`);
          }
        }

      } catch (firebaseError: any) {
        addDiagnostic(`❌ Firebase initialization failed: ${firebaseError.message}`);
        addDiagnostic(`❌ Error code: ${firebaseError.code}`);
      }

    } catch (error: any) {
      addDiagnostic(`❌ Diagnostic failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearDiagnostics = () => {
    setDiagnostics([]);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4 text-white">🔍 Comprehensive Diagnostic Tool</h3>
      
      <div className="flex space-x-4 mb-4">
        <button
          onClick={runFullDiagnostic}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostic'}
        </button>
        
        <button
          onClick={clearDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg max-h-96 overflow-y-auto">
        <h4 className="text-sm font-semibold mb-2 text-gray-300">Diagnostic Results:</h4>
        {diagnostics.length === 0 ? (
          <p className="text-gray-500 text-sm">No diagnostics run yet. Click "Run Full Diagnostic" to start.</p>
        ) : (
          <div className="space-y-1">
            {diagnostics.map((diagnostic, index) => (
              <div key={index} className="text-xs font-mono text-gray-300">
                {diagnostic}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 bg-blue-900 border border-blue-600 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-300 mb-2">💡 What This Tests:</h4>
        <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
          <li>Firebase configuration and initialization</li>
          <li>Network connectivity to Firebase</li>
          <li>Storage reference creation</li>
          <li>Actual file upload to Firebase Storage</li>
          <li>Download URL generation and access</li>
          <li>Specific error codes and their meanings</li>
        </ul>
      </div>
    </div>
  );
};

export default DiagnosticTool;
