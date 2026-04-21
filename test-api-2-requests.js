/**
 * Test avec 2 requêtes simultanées uniquement
 */

const API_URL = 'https://ds2api-tau-woad.vercel.app/v1/chat/completions';
const API_KEY = 'sk-ds2api-key-1-your-custom-key';

const TEST_PROMPT = `Explique brièvement le concept de photosynthèse en 2-3 phrases.`;

async function makeRequest(requestId) {
  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: TEST_PROMPT
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        requestId,
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      requestId,
      success: true,
      duration,
      tokensUsed,
      responseLength: data.choices?.[0]?.message?.content?.length || 0
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      requestId,
      success: false,
      duration: endTime - startTime,
      error: error.message
    };
  }
}

async function testTwoRequests(iteration) {
  console.log(`\n🚀 Test #${iteration} - 2 requêtes en parallèle...`);

  const startTime = Date.now();
  const promises = [makeRequest(1), makeRequest(2)];
  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`   ✅ Succès: ${successful.length}/2`);
  console.log(`   ❌ Échecs: ${failed.length}/2`);
  console.log(`   ⏱️  Temps total: ${totalDuration}ms`);

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.log(`   📊 Durée moyenne: ${Math.round(avgDuration)}ms`);
  }

  if (failed.length > 0) {
    console.log(`   ❌ Erreurs:`);
    failed.forEach(r => {
      console.log(`      Requête #${r.requestId}: ${r.error}`);
    });
  }

  return {
    iteration,
    successful: successful.length,
    failed: failed.length,
    totalDuration
  };
}

async function runMultipleTests() {
  console.log('🧪 TEST DE STABILITÉ - 2 REQUÊTES SIMULTANÉES');
  console.log('═'.repeat(60));
  console.log(`Heure de début: ${new Date().toLocaleString()}`);
  console.log('\nOn va lancer 10 tests de 2 requêtes avec pause de 3s entre chaque\n');

  const allResults = [];

  for (let i = 1; i <= 10; i++) {
    const result = await testTwoRequests(i);
    allResults.push(result);

    if (i < 10) {
      console.log('   ⏸️  Pause de 3 secondes...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Résumé
  console.log('\n\n📋 RÉSUMÉ FINAL');
  console.log('═'.repeat(60));

  const totalSuccess = allResults.reduce((sum, r) => sum + r.successful, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalRequests = allResults.length * 2;
  const successRate = ((totalSuccess / totalRequests) * 100).toFixed(1);

  console.log(`Total de requêtes: ${totalRequests}`);
  console.log(`Succès: ${totalSuccess} (${successRate}%)`);
  console.log(`Échecs: ${totalFailed}`);

  const avgTime = allResults.reduce((sum, r) => sum + r.totalDuration, 0) / allResults.length;
  console.log(`Temps moyen par batch de 2: ${Math.round(avgTime)}ms`);

  console.log('\n✅ Test terminé!');
}

runMultipleTests().catch(console.error);
