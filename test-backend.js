const axios = require('axios');

async function testBackend() {
  try {
    console.log('Testing backend...');
    
    // Test local backend
    const localResponse = await axios.get('http://localhost:4000/');
    console.log('✅ Local backend working:', localResponse.data);
    
    // Test Render backend
    const renderResponse = await axios.get('https://codeagent-wmko.onrender.com/');
    console.log('✅ Render backend working:', renderResponse.data);
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testBackend(); 