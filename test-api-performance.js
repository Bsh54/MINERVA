/**
 * Script de test de performance pour l'API DeepSeek
 * Teste les requêtes simultanées et mesure les temps de réponse
 */

const API_URL = 'https://ds2api-tau-woad.vercel.app/v1/chat/completions';
const API_KEY = 'sk-ds2api-key-1-your-custom-key';

// Prompt de test simple
const TEST_PROMPT = `Explique brièvement le concept de photosynthèse en 2-3 phrases.`;

/**
 * Fait une requête à l'API
 */
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

/**
 * Lance plusieurs requêtes en parallèle
 */
async function testParallelRequests(count) {
  console.log(`\n🚀 Lancement de ${count} requêtes en parallèle...\n`);

  const startTime = Date.now();
  const promises = [];

  for (let i = 1; i <= count; i++) {
    promises.push(makeRequest(i));
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // Analyse des résultats
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('📊 RÉSULTATS:');
  console.log('─'.repeat(60));
  console.log(`✅ Succès: ${successful.length}/${count}`);
  console.log(`❌ Échecs: ${failed.length}/${count}`);
  console.log(`⏱️  Temps total: ${totalDuration}ms`);

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const totalTokens = successful.reduce((sum, r) => sum + r.tokensUsed, 0);

    console.log(`\n📈 STATISTIQUES DES REQUÊTES RÉUSSIES:`);
    console.log(`   Durée moyenne: ${Math.round(avgDuration)}ms`);
    console.log(`   Durée min: ${minDuration}ms`);
    console.log(`   Durée max: ${maxDuration}ms`);
    console.log(`   Tokens totaux utilisés: ${totalTokens}`);
    console.log(`   Tokens moyens par requête: ${Math.round(totalTokens / successful.length)}`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ ERREURS:`);
    failed.forEach(r => {
      console.log(`   Requête #${r.requestId}: ${r.error}`);
    });
  }

  return {
    total: count,
    successful: successful.length,
    failed: failed.length,
    totalDuration,
    results
  };
}

/**
 * Test progressif avec augmentation du nombre de requêtes
 */
async function runProgressiveTest() {
  console.log('🧪 TEST DE PERFORMANCE API DEEPSEEK');
  console.log('═'.repeat(60));
  console.log(`Heure de début: ${new Date().toLocaleString()}`);

  const testSizes = [1, 3, 5, 10, 15, 20];
  const allResults = [];

  for (const size of testSizes) {
    const result = await testParallelRequests(size);
    allResults.push({ size, ...result });

    // Pause entre les tests pour ne pas surcharger
    if (size < testSizes[testSizes.length - 1]) {
      console.log('\n⏸️  Pause de 2 secondes...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Résumé final
  console.log('\n\n📋 RÉSUMÉ FINAL');
  console.log('═'.repeat(60));
  console.log('Taille | Succès | Échecs | Temps total | Taux de succès');
  console.log('─'.repeat(60));

  allResults.forEach(r => {
    const successRate = ((r.successful / r.total) * 100).toFixed(1);
    console.log(
      `${String(r.size).padStart(6)} | ` +
      `${String(r.successful).padStart(6)} | ` +
      `${String(r.failed).padStart(6)} | ` +
      `${String(r.totalDuration + 'ms').padStart(11)} | ` +
      `${successRate}%`
    );
  });

  console.log('\n✅ Test terminé!');
}

// Lancer le test
runProgressiveTest().catch(console.error);
