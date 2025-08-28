// Test file to check environment variables
console.log('Environment variables test:');
console.log('NEXT_PUBLIC_FMP_API_KEY:', process.env.NEXT_PUBLIC_FMP_API_KEY);
console.log('API key length:', process.env.NEXT_PUBLIC_FMP_API_KEY ? process.env.NEXT_PUBLIC_FMP_API_KEY.length : 'undefined');
console.log('API key starts with:', process.env.NEXT_PUBLIC_FMP_API_KEY ? process.env.NEXT_PUBLIC_FMP_API_KEY.substring(0, 10) + '...' : 'undefined');