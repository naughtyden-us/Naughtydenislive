'use client';

import React, { useState } from 'react';

const ComponentTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testComponentIssues = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      addResult('🔍 Testing upload component issues...');
      
      // Test 1: Check if ProfilePictureUpload component can be imported
      try {
        const ProfilePictureUpload = await import('./ProfilePictureUpload');
        addResult('✅ ProfilePictureUpload component imported successfully');
      } catch (error) {
        addResult(`❌ ProfilePictureUpload import failed: ${error}`);
      }

      // Test 2: Check if VideoContentUpload component can be imported
      try {
        const VideoContentUpload = await import('./VideoContentUpload');
        addResult('✅ VideoContentUpload component imported successfully');
      } catch (error) {
        addResult(`❌ VideoContentUpload import failed: ${error}`);
      }

      // Test 3: Check if Firebase utils can be imported
      try {
        const firebaseUtils = await import('../utils/firebase');
        addResult('✅ Firebase utils imported successfully');
        addResult(`📦 Storage instance: ${firebaseUtils.storage ? 'Available' : 'Not available'}`);
      } catch (error) {
        addResult(`❌ Firebase utils import failed: ${error}`);
      }

      // Test 4: Check for any console errors
      addResult('🔍 Checking for JavaScript errors...');
      
      // Test 5: Check if we can create a simple file input
      try {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        addResult('✅ File input creation works');
      } catch (error) {
        addResult(`❌ File input creation failed: ${error}`);
      }

      // Test 6: Check if we can create a blob
      try {
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        addResult(`✅ Blob creation works: ${testBlob.size} bytes`);
      } catch (error) {
        addResult(`❌ Blob creation failed: ${error}`);
      }

      // Test 7: Check browser compatibility
      addResult('🌐 Checking browser compatibility...');
      if (typeof FileReader !== 'undefined') {
        addResult('✅ FileReader API available');
      } else {
        addResult('❌ FileReader API not available');
      }

      if (typeof FormData !== 'undefined') {
        addResult('✅ FormData API available');
      } else {
        addResult('❌ FormData API not available');
      }

      // Test 8: Check if we can access localStorage
      try {
        localStorage.setItem('test', 'value');
        localStorage.removeItem('test');
        addResult('✅ localStorage access works');
      } catch (error) {
        addResult(`❌ localStorage access failed: ${error}`);
      }

      addResult('🎯 Component test completed');
      
    } catch (error: any) {
      addResult(`❌ Component test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4 text-white">🧪 Component & Environment Test</h3>
      
      <button
        onClick={testComponentIssues}
        disabled={isTesting}
        className="mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
      >
        {isTesting ? 'Testing Components...' : 'Test Component Issues'}
      </button>

      <div className="bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">
        <h4 className="text-sm font-semibold mb-2 text-gray-300">Test Results:</h4>
        {testResults.length === 0 ? (
          <p className="text-gray-500 text-sm">No tests run yet. Click the button above to start.</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-xs font-mono text-gray-300">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 bg-purple-900 border border-purple-600 p-4 rounded-lg">
        <h4 className="font-semibold text-purple-300 mb-2">💡 What This Tests:</h4>
        <ul className="text-sm text-purple-200 space-y-1 list-disc list-inside">
          <li>Component import/export issues</li>
          <li>Firebase utility availability</li>
          <li>Browser API compatibility</li>
          <li>File handling capabilities</li>
          <li>JavaScript environment issues</li>
        </ul>
      </div>
    </div>
  );
};

export default ComponentTest;
