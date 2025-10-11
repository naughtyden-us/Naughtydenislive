'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyKYCPage() {
  const router = useRouter();

  useEffect(() => {
    const startVerification = async () => {
      try {
        const veriff = Veriff({
          host: 'https://stationapi.veriff.com',
          apiKey: 'e1d937eb-266f-4fc4-8489-8f69a7f39a7d',
          parentId: 'veriff-root',
          onSession: function(err, response) {
            window.veriffSDK.createVeriffFrame({ url: response.verification.url });
          },
        });

        veriff.mount();
      } catch (error) {
        console.error('Veriff initialization failed:', error);
        // You might want to handle this error more gracefully, e.g., show an error message
      }
    };

    // Load the Veriff SDK script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.veriff.me/sdk/js/1.5/veriff.min.js';
    script.onload = () => {
      const incontextScript = document.createElement('script');
      incontextScript.src = 'https://cdn.veriff.me/incontext/js/v1/veriff.js';
      incontextScript.onload = startVerification;
      document.body.appendChild(incontextScript);
    };
    document.body.appendChild(script);

    // Clean up function
    return () => {
      document.body.removeChild(script);
      // Clean up the incontextScript if it was added
      const incontextScript = document.querySelector('script[src*="incontext"]');
      if (incontextScript) {
        document.body.removeChild(incontextScript);
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="text-center p-8">
        <h1 className="text-3xl font-bold mb-4">KYC Verification</h1>
        <p className="text-gray-300 mb-6">Please follow the steps to verify your identity.</p>
        <div id="veriff-root"></div>
        <button
          onClick={() => router.back()}
          className="mt-8 px-6 py-3 rounded-lg border border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
